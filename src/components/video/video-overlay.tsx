"use client";

import { useState } from "react";
import { ChatRoom } from "@/components/chat/chat-room";
import { useLanguage } from "@/components/i18n/language-provider";
import { DURATIONS, useCountdown, useVideoCall } from "./video-provider";

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

function Backdrop({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-card">
        {children}
      </div>
    </div>
  );
}

export function VideoOverlay() {
  const { t } = useLanguage();
  const v = useVideoCall();
  const [duration, setDuration] = useState<number>(30);

  // ---------------------------------------------------------------- auth
  if (v.phase === "auth") {
    return (
      <Backdrop>
        <h3 className="font-cinzel text-xl font-semibold text-ink">
          {t.video.needLoginTitle}
        </h3>
        <p className="mt-2 text-[0.92rem] text-ink-soft">{t.video.needLoginText}</p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={v.goLogin} className="btn-flame flex-1 justify-center px-5 py-2.5">
            {t.video.goLogin}
          </button>
          <button
            type="button"
            onClick={v.goRegister}
            className="flex-1 rounded-full border border-line bg-surface px-5 py-2.5 text-sm font-medium text-ink hover:bg-soft"
          >
            {t.video.goRegister}
          </button>
        </div>
        <button
          type="button"
          onClick={v.dismiss}
          className="mt-3 w-full text-center text-[0.85rem] text-ink-soft hover:text-accent1"
        >
          {t.video.cancel}
        </button>
      </Backdrop>
    );
  }

  // -------------------------------------------------------------- choose
  if (v.phase === "choose" && v.pending) {
    const isChat = v.pending.channel === "chat";
    const rate = v.pending.priceCentsPerMinute;
    const cost = rate * duration;
    const affordable = v.balanceCents >= cost;
    const insufficient = v.errorCode === "INSUFFICIENT_BALANCE" || !affordable;

    return (
      <Backdrop>
        <p className="text-[0.8rem] uppercase tracking-wider text-accent1">
          {isChat ? t.chat.title : t.video.title}
        </p>
        <h3 className="mt-1 font-cinzel text-xl font-semibold text-ink">
          {v.pending.name}
        </h3>

        <p className="mt-4 text-[0.85rem] font-medium text-ink-soft">
          {t.video.chooseDuration}
        </p>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {DURATIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={
                d === duration
                  ? "rounded-lg border-2 border-accent1 bg-accent1/10 py-2 text-[0.8rem] font-semibold text-accent1"
                  : "rounded-lg border border-line py-2 text-[0.8rem] text-ink-soft hover:border-accent1/50"
              }
            >
              {d} {t.video.minutes}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-1 rounded-xl bg-soft/60 p-3 text-[0.9rem]">
          <div className="flex justify-between">
            <span className="text-ink-soft">
              {euros(rate)}
              {t.video.perMin} × {duration} {t.video.minutes}
            </span>
            <span className="font-semibold text-ink">{t.video.cost}: {euros(cost)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-soft">{t.video.balance}</span>
            <span className={affordable ? "text-ink" : "text-red-500"}>
              {euros(v.balanceCents)}
            </span>
          </div>
        </div>

        {/* errores que no son de saldo: consultora ocupada, red… */}
        {v.errorCode &&
          v.errorCode !== "INSUFFICIENT_BALANCE" &&
          !insufficient && (
            <p className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-[0.85rem] text-red-500">
              {v.errorCode === "CONSULTANT_UNAVAILABLE"
                ? t.video.unavailable
                : t.auth.errors.NETWORK}
            </p>
          )}

        {insufficient ? (
          <div className="mt-4">
            <p className="text-[0.85rem] text-red-500">{t.video.insufficient}</p>
            {/* Recarga demo: acredita el coste que falta redondeado a 10 €. */}
            <button
              type="button"
              onClick={() => v.topup(Math.max(1000, cost))}
              className="mt-2 w-full rounded-full border border-accent1 bg-accent1/10 px-5 py-2.5 text-sm font-semibold text-accent1 hover:bg-accent1/20"
            >
              {t.video.topup} · {t.video.demoNote}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => v.confirmStart(duration)}
            disabled={v.starting}
            className="btn-flame mt-5 w-full justify-center px-5 py-3 disabled:opacity-60"
          >
            {v.starting
              ? isChat
                ? t.chat.starting
                : t.video.starting
              : isChat
                ? t.chat.start
                : t.video.start}
          </button>
        )}

        <button
          type="button"
          onClick={v.dismiss}
          className="mt-3 w-full text-center text-[0.85rem] text-ink-soft hover:text-accent1"
        >
          {t.video.cancel}
        </button>
      </Backdrop>
    );
  }

  // -------------------------------------------------------------- active
  if (v.phase === "active" && v.active) {
    if (v.active.channel === "chat") return <ClientChatRoom />;
    return <CallRoom />;
  }

  // --------------------------------------------------------------- ended
  if (v.phase === "ended") {
    return (
      <Backdrop>
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent1/15 text-2xl">
            ⏳
          </div>
          <h3 className="mt-4 font-cinzel text-xl font-semibold text-ink">
            {t.video.endedTitle}
          </h3>
          <p className="mt-2 text-[0.92rem] text-ink-soft">{t.video.endedText}</p>
          <button
            type="button"
            onClick={v.dismiss}
            className="btn-flame mt-6 w-full justify-center px-5 py-2.5"
          >
            {t.video.close}
          </button>
        </div>
      </Backdrop>
    );
  }

  return null;
}

/** Chat del cliente: usa la sala de chat compartida con el rol "client". */
function ClientChatRoom() {
  const v = useVideoCall();
  if (!v.active) return null;
  return (
    <ChatRoom
      sessionId={v.active.sessionId}
      expiresAt={v.active.expiresAt}
      peerName={v.active.consultant.name}
      myRole="client"
      onExpire={v.endCall}
      onEnd={v.endCall}
    />
  );
}

/**
 * Sala de videollamada a pantalla completa: cabecera con temporizador y la
 * llamada embebida en un iframe. Con Jitsi el iframe muestra el vídeo en vivo;
 * si la sala no es embebible (Teams), se ofrece abrir en ventana nueva.
 */
function CallRoom() {
  const { t } = useLanguage();
  const v = useVideoCall();
  const remaining = useCountdown(v.active?.expiresAt ?? null, v.endCall);

  if (!v.active) return null;
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const low = remaining <= 60;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ink">
      {/* cabecera: consultora + temporizador + terminar */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal/60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal" />
          </span>
          <span className="text-[0.9rem] text-white/80">
            {t.video.inCall}{" "}
            <span className="font-semibold text-white">
              {v.active.consultant.name}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
          <span className="text-[0.72rem] uppercase tracking-wide text-white/50">
            {t.video.timeLeft}
          </span>
          <span
            className={`font-cinzel text-xl font-semibold tabular-nums ${
              low ? "animate-pulse text-red-400" : "text-gold"
            }`}
          >
            {mm}:{String(ss).padStart(2, "0")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {v.active.joinUrl && !v.active.embeddable && (
            <a
              href={v.active.joinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              {t.video.openTeams}
            </a>
          )}
          <button
            type="button"
            onClick={() => v.endCall()}
            className="rounded-full bg-red-500 px-5 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            {t.video.endCall}
          </button>
        </div>
      </header>

      {/* superficie de la llamada */}
      <div className="relative min-h-0 flex-1">
        {v.active.embeddable && v.active.joinUrl ? (
          <iframe
            title={t.video.title}
            src={
              v.active.joinUrl.includes("jit.si")
                ? `${v.active.joinUrl}#config.prejoinPageEnabled=false`
                : v.active.joinUrl
            }
            className="h-full w-full border-0"
            allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          />
        ) : (
          // Fallback para proveedores que no embeben (Teams).
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-3xl">
              🎥
            </div>
            <p className="max-w-sm text-white/70">{t.video.cannotEmbed}</p>
            {v.active.joinUrl && (
              <a
                href={v.active.joinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-flame px-6 py-3"
              >
                {t.video.openTab}
              </a>
            )}
          </div>
        )}
      </div>

      <footer className="shrink-0 bg-black/40 px-4 py-2 text-center text-[0.75rem] text-white/40">
        {t.video.micCam} · {t.video.demoNote}
      </footer>
    </div>
  );
}
