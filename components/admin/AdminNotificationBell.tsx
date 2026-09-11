"use client";

import { Bell } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import type { AdminNotificationPayload } from "@/domain/admin/notification-types";
import { useAdminNotificationSocket } from "@/hooks/use-admin-notification-socket";
import { Link } from "@/i18n/navigation";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

const POLL_MS = 30_000;
const TOAST_MS = 3_000;

function formatRelativeTime(iso: string, locale: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (abs < 60) return rtf.format(diffSec, "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  return rtf.format(Math.round(diffSec / 86400), "day");
}

export function AdminNotificationBell() {
  const t = useTranslations("Dashboard.admin.notifications");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AdminNotificationPayload[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const refreshUnread = useCallback(async () => {
    try {
      const response = await fetchWithAuth("/api/admin/notifications/unread-count");
      const data = await parseApiResponse<{ count: number }>(response);
      setUnreadCount(data.count);
    } catch {
      // keep last known count
    }
  }, []);

  const refreshList = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth("/api/admin/notifications?limit=50");
      const data = await parseApiResponse<AdminNotificationPayload[]>(response);
      setItems(data);
      setUnreadCount(data.filter((row) => !row.read).length);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUnread();
    const timer = window.setInterval(() => {
      void refreshUnread();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [refreshUnread]);

  useEffect(() => {
    if (!open) return;
    void refreshList();
  }, [open, refreshList]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const handleRealtime = useCallback(
    (notification: AdminNotificationPayload) => {
      toast.info(notification.title, notification.body, { duration: TOAST_MS });
      setItems((current) => {
        if (current.some((row) => row.id === notification.id)) return current;
        return [notification, ...current].slice(0, 50);
      });
      setUnreadCount((count) => count + 1);
    },
    []
  );

  useAdminNotificationSocket({
    enabled: true,
    onNotification: handleRealtime,
  });

  const markRead = async (id: string) => {
    try {
      await fetchWithAuth(`/api/admin/notifications/${id}/read`, { method: "POST" });
      setItems((current) => {
        const wasUnread = current.some((row) => row.id === id && !row.read);
        if (wasUnread) {
          setUnreadCount((count) => Math.max(0, count - 1));
        }
        return current.map((row) => (row.id === id ? { ...row, read: true } : row));
      });
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    try {
      await fetchWithAuth("/api/admin/notifications/read-all", { method: "POST" });
      setItems((current) => current.map((row) => ({ ...row, read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative shrink-0" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-neutral-700 shadow-sm transition hover:border-neutral-300"
        aria-label={t("title")}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -end-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute end-0 top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-4 py-3">
            <p className="text-sm font-semibold text-neutral-900">{t("title")}</p>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={unreadCount === 0}
              className="text-xs font-semibold text-secondary disabled:opacity-40"
            >
              {t("markAllRead")}
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-500">{t("loading")}</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-neutral-500">{t("empty")}</p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => {
                        if (!item.read) void markRead(item.id);
                        setOpen(false);
                      }}
                      className={`block px-4 py-3 transition hover:bg-neutral-50 ${
                        item.read ? "bg-white" : "bg-secondary/[0.04]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-neutral-900">{item.title}</p>
                        {!item.read ? (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-secondary" />
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-neutral-600">{item.body}</p>
                      <p className="mt-1 text-[11px] text-neutral-400">
                        {formatRelativeTime(item.createdAt, locale)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
