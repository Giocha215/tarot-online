"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Protected } from "@/components/auth/protected";
import { useLanguage } from "@/components/i18n/language-provider";
import { Logo } from "@/components/site/header";
import {
  fetchAdvisorView,
  setConsultantStatus,
  type AdvisorView,
} from "@/lib/auth/api-client";
import { ApiError } from "@/lib/auth/types";

/** Cuenta atrás compartida con el cliente: deriva de expiresAt (reloj real). */
function useCountdown(expiresAt: string | null): number {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const target = new Date(expiresAt).getTime();
    const tick = () =>
      setRemaining(Math.max(0, Math.round((target - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return remaining;
}

function AdvisorContent() {
  const { t } = useLanguage();
  const { logout } = useAuth();
  const [view, setView] = useState<AdvisorView | null>(null);
  const [notConsultant, setNotConsultant] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      setView(await fetchAdvisorView());
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) setNotConsultant(true);
    }
  }, []);

  // Sondea cada 3 s para detectar cuándo el cliente inicia/termina la llamada.
  // Además, al volver a la pestaña se refresca al instante: los navegadores
  // congelan los timers en pestañas en segundo plano, así que sin esto el
  // panel podría tardar en enterarse tras cambiar de ventana.
  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 3000);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", load);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", load);
    };
  }, [load]);

  const session = view?.activeSession ?? null;
  const remaining = useCountdown(session?.expiresAt ?? null);
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const low = remaining <= 15 && remaining > 0;

  const changeStatus = useCallback(
    async (status: "online" | "busy" | "offline") => {
      if (!view) return;
      try {
        await setConsultantStatus(view.consultant.slug, status);
        load();
      } catch {
        /* ignore */
      }
    },
    [view, load],
  );

  if (notConsultant) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-center text-ink-soft">{t.video.notConsultant}</p>
      </div>
    );
  }

  // --- en llamada: misma sala Jitsi que el cliente + mismo temporizador ---
  if (session?.embeddable && session.joinUrl) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-ink">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/40 px-4 py-3">
          <span className="text-[0.9rem] font-semibold text-white">
            {t.video.advisorTitle} · {view?.consultant.name}
          </span>
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
        </header>
        <div className="min-h-0 flex-1">
          <iframe
            title={t.video.title}
            src={
              session.joinUrl.includes("jit.si")
                ? `${session.joinUrl}#config.prejoinPageEnabled=false&userInfo.displayName=${encodeURIComponent(view?.consultant.name ?? "Asesora")}`
                : session.joinUrl
            }
            className="h-full w-full border-0"
            allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
          />
        </div>
        <footer className="shrink-0 bg-black/40 px-4 py-2 text-center text-[0.75rem] text-white/40">
          {t.video.micCam}
        </footer>
      </div>
    );
  }

  // --- panel de espera ---
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-base/85 backdrop-blur-md">
        <div className="container-tarot flex h-[72px] items-center justify-between">
          <Logo />
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-full border border-line bg-surface/70 px-4 py-2 text-sm font-medium text-ink hover:bg-surface"
          >
            {t.auth.logout}
          </button>
        </div>
      </header>

      <main className="container-tarot py-10">
        <h1 className="font-cinzel text-[1.7rem] font-semibold text-ink">
          {t.video.advisorTitle}
        </h1>
        {view && (
          <p className="mt-1 text-ink-soft">{view.consultant.name}</p>
        )}

        {/* estado */}
        <div className="mt-6 rounded-2xl border border-line bg-surface/70 p-6 shadow-soft">
          <p className="text-[0.85rem] uppercase tracking-wider text-ink-soft">
            {t.video.statusLabel}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["online", "busy", "offline"] as const).map((s) => {
              const active = view?.consultant.status === s;
              const label =
                s === "online"
                  ? t.video.online
                  : s === "busy"
                    ? t.video.busy
                    : t.video.offline;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeStatus(s)}
                  className={
                    active
                      ? "rounded-full border-2 border-accent1 bg-accent1/10 px-5 py-2 text-sm font-semibold text-accent1"
                      : "rounded-full border border-line px-5 py-2 text-sm text-ink-soft hover:border-accent1/50"
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* esperando cliente */}
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line py-14 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-accent1" />
          <p className="text-ink-soft">{t.video.waitingClient}</p>
        </div>
      </main>
    </div>
  );
}

export default function AdvisorPage() {
  return (
    <Protected>
      <AdvisorContent />
    </Protected>
  );
}
