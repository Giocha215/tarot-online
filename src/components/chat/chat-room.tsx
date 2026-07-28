"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/i18n/language-provider";
import { LOCALE_MAP } from "@/lib/i18n";
import { useCountdown } from "@/components/video/video-provider";
import { type ChatRole, useChatSocket } from "./use-chat-socket";

/**
 * Sala de chat a pantalla completa, común a cliente y asesora. La diferencia
 * es `myRole` (alinea los mensajes propios a la derecha) y si se muestra el
 * botón de terminar. El temporizador cierra la sesión al llegar a cero.
 */
export function ChatRoom({
  sessionId,
  expiresAt,
  peerName,
  myRole,
  onExpire,
  onEnd,
  showEnd = true,
}: {
  sessionId: string;
  expiresAt: string;
  peerName: string;
  myRole: ChatRole;
  onExpire: () => void;
  onEnd?: () => void;
  showEnd?: boolean;
}) {
  const { t, lang } = useLanguage();
  const { messages, connected, send } = useChatSocket(sessionId);
  const remaining = useCountdown(expiresAt, onExpire);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const low = remaining <= 60;

  const submit = () => {
    if (!text.trim()) return;
    send(text);
    setText("");
  };

  const timeFmt = new Intl.DateTimeFormat(LOCALE_MAP[lang], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-base">
      {/* cabecera */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line bg-surface/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {connected && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal/60" />
            )}
            <span
              className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                connected ? "bg-teal" : "bg-gray-400"
              }`}
            />
          </span>
          <span className="text-[0.9rem] text-ink-soft">
            {t.chat.inChat}{" "}
            <span className="font-semibold text-ink">{peerName}</span>
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-soft/70 px-4 py-1.5">
          <span className="text-[0.72rem] uppercase tracking-wide text-subtle">
            {t.video.timeLeft}
          </span>
          <span
            className={`font-cinzel text-lg font-semibold tabular-nums ${
              low ? "animate-pulse text-red-500" : "text-accent1"
            }`}
          >
            {mm}:{String(ss).padStart(2, "0")}
          </span>
        </div>

        {showEnd && (
          <button
            type="button"
            onClick={onEnd}
            className="rounded-full bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            {t.video.endCall}
          </button>
        )}
      </header>

      {/* mensajes */}
      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-5"
      >
        {messages.length === 0 && (
          <p className="mt-10 text-center text-[0.88rem] text-ink-soft">
            {connected ? t.chat.empty : t.chat.connecting}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.senderRole === myRole;
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2 text-[0.92rem] shadow-soft ${
                  mine
                    ? "rounded-br-sm bg-accent1 text-white"
                    : "rounded-bl-sm border border-line bg-surface text-ink"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p
                  className={`mt-0.5 text-right text-[0.6rem] ${
                    mine ? "text-white/70" : "text-subtle"
                  }`}
                >
                  {timeFmt.format(new Date(m.ts))}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* entrada */}
      <footer className="shrink-0 border-t border-line bg-surface/90 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder={t.chat.placeholder}
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-line bg-surface px-4 py-2.5 text-ink focus-visible:border-accent1 focus-visible:outline-none"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim() || !connected}
            className="btn-flame h-11 shrink-0 px-5 disabled:opacity-50"
          >
            {t.chat.send}
          </button>
        </div>
      </footer>
    </div>
  );
}
