"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

import type {
  DisputeMessagePayload,
  DisputeUpdatedPayload,
} from "@/domain/realtime/dispute-events";

const ACCESS_TOKEN_KEY = "accessToken";

type UseDisputeSocketOptions = {
  refundCaseId: string | null;
  enabled?: boolean;
  onMessage?: (message: DisputeMessagePayload) => void;
  onCaseUpdated?: (update: DisputeUpdatedPayload) => void;
  onConnectionChange?: (connected: boolean) => void;
};

export function useDisputeSocket({
  refundCaseId,
  enabled = true,
  onMessage,
  onCaseUpdated,
  onConnectionChange,
}: UseDisputeSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const joinedCaseRef = useRef<string | null>(null);
  const onMessageRef = useRef(onMessage);
  const onCaseUpdatedRef = useRef(onCaseUpdated);
  const onConnectionChangeRef = useRef(onConnectionChange);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onCaseUpdatedRef.current = onCaseUpdated;
    onConnectionChangeRef.current = onConnectionChange;
  }, [onCaseUpdated, onConnectionChange, onMessage]);

  useEffect(() => {
    const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL;
    if (!enabled || !refundCaseId || !realtimeUrl) {
      return;
    }

    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      return;
    }

    const socket = io(realtimeUrl, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    const handleConnect = () => {
      onConnectionChangeRef.current?.(true);
      socket.emit("dispute:join", { refundCaseId }, (result: { ok: boolean }) => {
        if (result?.ok) {
          joinedCaseRef.current = refundCaseId;
        }
      });
    };

    const handleDisconnect = () => {
      onConnectionChangeRef.current?.(false);
    };

    const handleMessage = (payload: DisputeMessagePayload) => {
      onMessageRef.current?.(payload);
    };

    const handleUpdated = (payload: DisputeUpdatedPayload) => {
      onCaseUpdatedRef.current?.(payload);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("dispute:message", handleMessage);
    socket.on("dispute:updated", handleUpdated);

    return () => {
      if (joinedCaseRef.current) {
        socket.emit("dispute:leave", { refundCaseId: joinedCaseRef.current });
        joinedCaseRef.current = null;
      }
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("dispute:message", handleMessage);
      socket.off("dispute:updated", handleUpdated);
      socket.disconnect();
      socketRef.current = null;
      onConnectionChangeRef.current?.(false);
    };
  }, [enabled, refundCaseId]);
}
