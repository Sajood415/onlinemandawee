"use client";

import { Loader2, Paperclip, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { DisputeMessage } from "@/components/refunds/refund-types";
import { formatRefundDate } from "@/components/refunds/format-refund-money";
import { useDisputeSocket } from "@/hooks/use-dispute-socket";
import { fetchWithAuth } from "@/lib/http/fetch-with-auth";
import { parseApiResponse } from "@/lib/http/parse-api-response";
import { toast } from "@/lib/utils/toast";

type DisputeChatPanelProps = {
  refundCaseId: string;
  locale: string;
  onCaseUpdated?: () => void;
};

export function DisputeChatPanel({
  refundCaseId,
  locale,
  onCaseUpdated,
}: DisputeChatPanelProps) {
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [draft, setDraft] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const scrollChatToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
  }, []);

  const handleChatScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldStickToBottomRef.current = distanceFromBottom < 80;
  };

  const loadMessages = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(`/api/refunds/${refundCaseId}/messages`);
      const data = await parseApiResponse<DisputeMessage[]>(response);
      setMessages(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [refundCaseId]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (loading || !shouldStickToBottomRef.current) return;
    scrollChatToBottom();
  }, [loading, messages, scrollChatToBottom]);

  useDisputeSocket({
    refundCaseId,
    onMessage: (payload) => {
      const container = scrollContainerRef.current;
      if (container) {
        const distanceFromBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight;
        shouldStickToBottomRef.current = distanceFromBottom < 80;
      }

      setMessages((current) => {
        if (current.some((message) => message.id === payload.id)) {
          return current;
        }
        return [...current, payload];
      });
    },
    onCaseUpdated: () => {
      onCaseUpdated?.();
    },
    onConnectionChange: setConnected,
  });

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("refundCaseId", refundCaseId);
      const response = await fetchWithAuth("/api/refunds/upload", {
        method: "POST",
        body: form,
      });
      const data = await parseApiResponse<{ url: string }>(response);
      setAttachmentUrl(data.url);
      toast.success("Attachment uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    const message = draft.trim();
    if (!message) return;

    setSending(true);
    try {
      const response = await fetchWithAuth(`/api/refunds/${refundCaseId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          attachmentUrl: attachmentUrl ?? undefined,
        }),
      });
      const created = await parseApiResponse<DisputeMessage>(response);
      setMessages((current) =>
        current.some((item) => item.id === created.id) ? current : [...current, created]
      );
      shouldStickToBottomRef.current = true;
      scrollChatToBottom();
      setDraft("");
      setAttachmentUrl(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-900">Dispute chat</h3>
        <span className="text-xs text-neutral-500">
          {connected ? "Live" : "Connecting…"}
        </span>
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleChatScroll}
        className="max-h-80 overflow-y-auto px-4 py-3 space-y-3"
      >
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-500">No messages yet.</p>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="rounded-lg bg-neutral-50 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-neutral-900">
                  {message.senderUser.fullName}{" "}
                  <span className="font-normal text-neutral-500">({message.senderRole})</span>
                </p>
                <span className="text-xs text-neutral-500">
                  {formatRefundDate(message.createdAt, locale)}
                </span>
              </div>
              <p className="mt-1 text-sm text-neutral-700 whitespace-pre-wrap">{message.message}</p>
              {message.attachmentUrl ? (
                <a
                  href={message.attachmentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
                >
                  View attachment
                </a>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div className="border-t border-neutral-200 px-4 py-3 space-y-2">
        {attachmentUrl ? (
          <p className="text-xs text-neutral-600">
            Attachment ready.{" "}
            <button
              type="button"
              className="font-semibold text-primary hover:underline"
              onClick={() => setAttachmentUrl(null)}
            >
              Remove
            </button>
          </p>
        ) : null}
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          placeholder="Write a message…"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <div className="flex items-center justify-between gap-2">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleUpload(file);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
              Attach
            </button>
          </div>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending || !draft.trim()}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
