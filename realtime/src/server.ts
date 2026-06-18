import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

import { authenticateSocketToken } from "./auth.js";
import { config } from "./config.js";
import { canAccessDisputeCase, disputeRoomName } from "./dispute-access.js";

type BroadcastBody = {
  room: string;
  event: string;
  payload: unknown;
};

const app = express();
app.use(express.json({ limit: "256kb" }));

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigins,
    credentials: true,
  },
  path: "/socket.io",
});

io.use(async (socket, next) => {
  const token =
    typeof socket.handshake.auth?.token === "string"
      ? socket.handshake.auth.token
      : undefined;

  const user = await authenticateSocketToken(token);
  if (!user) {
    next(new Error("Unauthorized"));
    return;
  }

  socket.data.user = user;
  next();
});

io.on("connection", (socket) => {
  const user = socket.data.user as Awaited<ReturnType<typeof authenticateSocketToken>>;

  socket.on("dispute:join", async (payload: { refundCaseId?: string }, ack?: (result: { ok: boolean; error?: string }) => void) => {
    const refundCaseId = payload?.refundCaseId?.trim();
    if (!refundCaseId || !user) {
      ack?.({ ok: false, error: "Invalid dispute id" });
      return;
    }

    const allowed = await canAccessDisputeCase(user, refundCaseId);
    if (!allowed) {
      ack?.({ ok: false, error: "Access denied" });
      return;
    }

    await socket.join(disputeRoomName(refundCaseId));
    ack?.({ ok: true });
  });

  socket.on("dispute:leave", async (payload: { refundCaseId?: string }) => {
    const refundCaseId = payload?.refundCaseId?.trim();
    if (!refundCaseId) return;
    await socket.leave(disputeRoomName(refundCaseId));
  });
});

app.get("/health", (_request, response) => {
  response.status(200).json({ ok: true, service: "onlinemandawee-realtime" });
});

app.post("/internal/broadcast", (request, response) => {
  const secret = request.header("x-realtime-secret");
  if (!secret || secret !== config.realtimeInternalSecret) {
    response.status(401).json({ error: "Unauthorized" });
    return;
  }

  const body = request.body as BroadcastBody;
  if (!body?.room || !body?.event || body.payload === undefined) {
    response.status(400).json({ error: "Invalid broadcast body" });
    return;
  }

  if (!body.room.startsWith("dispute:")) {
    response.status(400).json({ error: "Invalid room" });
    return;
  }

  io.to(body.room).emit(body.event, body.payload);
  response.status(200).json({ ok: true });
});

httpServer.listen(config.port, () => {
  console.log(`[realtime] listening on port ${config.port}`);
});
