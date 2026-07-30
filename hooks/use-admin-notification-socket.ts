"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";

import type { AdminNotificationPayload } from "@/domain/admin/notification-types";

const ACCESS_TOKEN_KEY = "accessToken";

type UseAdminNotificationSocketOptions = {
  enabled?: boolean;
  onNotification?: (notification: AdminNotificationPayload) => void;
};

export function useAdminNotificationSocket({
  enabled = true,
  onNotification,
}: UseAdminNotificationSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const onNotificationRef = useRef(onNotification);

  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    const realtimeUrl = process.env.NEXT_PUBLIC_REALTIME_URL;
    if (!enabled || !realtimeUrl) {
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
      socket.emit("admin:notifications:join", {}, (result: { ok?: boolean }) => {
        if (!result?.ok) {
          console.warn("[admin-notifications] failed to join room");
        }
      });
    };

    const handleCreated = (payload: AdminNotificationPayload) => {
      onNotificationRef.current?.(payload);
    };

    socket.on("connect", handleConnect);
    socket.on("admin.notification.created", handleCreated);

    return () => {
      socket.emit("admin:notifications:leave");
      socket.off("connect", handleConnect);
      socket.off("admin.notification.created", handleCreated);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled]);
}
