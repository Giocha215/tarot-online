"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/components/i18n/language-provider";
import * as api from "@/lib/auth/api-client";
import { LOCALE_MAP } from "@/lib/i18n";

export interface Notif {
  id: string;
  text: string;
  ts: number;
  read: boolean;
}

// ------------------------------------------------------------------
// Efectos de aviso (sonido + parpadeo del título de la pestaña)
// ------------------------------------------------------------------

function playBeep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.start();
    osc.stop(ctx.currentTime + 0.46);
    setTimeout(() => void ctx.close(), 700);
  } catch {
    /* el navegador puede bloquear audio sin gesto previo: se ignora */
  }
}

let flashTimer: ReturnType<typeof setInterval> | null = null;
let baseTitle = "";
function flashTitle(label: string) {
  if (typeof document === "undefined") return;
  if (flashTimer) {
    clearInterval(flashTimer);
    document.title = baseTitle;
  }
  baseTitle = document.title;
  let on = false;
  let count = 0;
  flashTimer = setInterval(() => {
    document.title = on ? baseTitle : `🔔 ${label}`;
    on = !on;
    if (++count >= 8 && flashTimer) {
      clearInterval(flashTimer);
      flashTimer = null;
      document.title = baseTitle;
    }
  }, 800);
}

// ------------------------------------------------------------------
// Hook: detecta consultas nuevas y reservas nuevas y genera avisos
// ------------------------------------------------------------------

export function useAdvisorNotifications(activeSessionId: string | null) {
  const { t } = useLanguage();
  const [items, setItems] = useState<Notif[]>([]);
  const prevSession = useRef<string | null>(null);
  const seenAppts = useRef<Set<string> | null>(null);
  const seededSession = useRef(false);

  const push = useCallback((text: string) => {
    setItems((prev) =>
      [
        {
          id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
          text,
          ts: Date.now(),
          read: false,
        },
        ...prev,
      ].slice(0, 40),
    );
    playBeep();
    flashTitle(text);
    if (
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      try {
        new Notification("Tarot · Oráculo da Maria", { body: text });
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Consulta iniciada: activeSessionId pasa de null a un id.
  useEffect(() => {
    const cur = activeSessionId;
    // No avisar de la sesión ya activa al abrir el panel.
    if (!seededSession.current) {
      seededSession.current = true;
      prevSession.current = cur;
      return;
    }
    if (cur && cur !== prevSession.current) {
      push(t.notif.sessionStarted);
    }
    prevSession.current = cur;
  }, [activeSessionId, push, t]);

  // Reservas nuevas: se sondea la agenda y se comparan ids.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { appointments } = await api.fetchAdvisorAppointments();
        if (cancelled) return;
        if (seenAppts.current === null) {
          seenAppts.current = new Set(appointments.map((a) => a.id));
          return;
        }
        for (const a of appointments) {
          if (!seenAppts.current.has(a.id)) {
            seenAppts.current.add(a.id);
            push(`${t.notif.newBooking}: ${a.clientName}`);
          }
        }
      } catch {
        /* ignore */
      }
    };
    void load();
    const id = setInterval(load, 8000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [push, t]);

  const markAllRead = useCallback(
    () => setItems((prev) => prev.map((n) => ({ ...n, read: true }))),
    [],
  );

  const unread = items.filter((n) => !n.read).length;
  return { items, unread, markAllRead };
}

// ------------------------------------------------------------------
// Campana + panel desplegable
// ------------------------------------------------------------------

export function NotificationBell({
  n,
}: {
  n: ReturnType<typeof useAdvisorNotifications>;
}) {
  const { t, lang } = useLanguage();
  const locale = LOCALE_MAP[lang];
  const [open, setOpen] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">(
    "default",
  );

  useEffect(() => {
    if (typeof Notification === "undefined") setPerm("unsupported");
    else setPerm(Notification.permission);
  }, []);

  const timeFmt = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) n.markAllRead();
  };

  const requestPerm = async () => {
    if (typeof Notification === "undefined") return;
    const p = await Notification.requestPermission();
    setPerm(p);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface/70 text-ink hover:bg-surface"
        aria-label={t.notif.title}
      >
        <BellIcon className="h-5 w-5" />
        {n.unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[0.6rem] font-bold text-white">
            {n.unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-2xl border border-line bg-surface p-2 shadow-card">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-[0.85rem] font-semibold text-ink">
              {t.notif.title}
            </span>
          </div>

          {perm !== "granted" && perm !== "unsupported" && (
            <button
              type="button"
              onClick={requestPerm}
              className="mb-1 w-full rounded-lg border border-accent1/50 bg-accent1/5 px-3 py-2 text-[0.78rem] font-medium text-accent1 hover:bg-accent1/10"
            >
              {t.notif.enableDesktop}
            </button>
          )}

          <div className="max-h-80 overflow-y-auto">
            {n.items.length === 0 ? (
              <p className="px-2 py-6 text-center text-[0.85rem] text-ink-soft">
                {t.notif.empty}
              </p>
            ) : (
              <ul className="space-y-1">
                {n.items.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-soft/60"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent1" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.85rem] text-ink">{it.text}</p>
                      <p className="text-[0.68rem] text-subtle">
                        {timeFmt.format(new Date(it.ts))}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
