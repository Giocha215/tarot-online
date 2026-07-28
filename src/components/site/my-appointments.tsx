"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { useVideoCall } from "@/components/video/video-provider";
import * as api from "@/lib/auth/api-client";
import type { Appointment } from "@/lib/auth/api-client";
import { LOCALE_MAP } from "@/lib/i18n";

const GRACE_MS = 5 * 60_000;

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

/** Próximas citas del cliente: cancelar o entrar cuando llega la hora. */
export function MyAppointments({ refreshKey }: { refreshKey: number }) {
  const { t, lang } = useLanguage();
  const locale = LOCALE_MAP[lang];
  const { isAuthenticated, reload, user } = useAuth();
  const video = useVideoCall();
  const [items, setItems] = useState<Appointment[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!isAuthenticated) return;
    api
      .fetchMyAppointments()
      .then(({ appointments }) => setItems(appointments))
      .catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  // Reevalúa la ventana de "Entrar" y refresca cada 20 s.
  useEffect(() => {
    const id = setInterval(() => {
      setNow(Date.now());
      load();
    }, 20_000);
    return () => clearInterval(id);
  }, [load]);

  if (!isAuthenticated || items.length === 0) return null;

  const dayFmt = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  async function enter(a: Appointment) {
    setBusy(a.id);
    try {
      const res = await api.startAppointment(a.id);
      video.enterSession({ ...res, balanceCents: user?.balanceCents ?? 0 });
    } catch {
      load();
    } finally {
      setBusy(null);
    }
  }

  async function cancel(a: Appointment) {
    setBusy(a.id);
    try {
      await api.cancelAppointment(a.id);
      void reload();
      load();
    } catch {
      /* ignore */
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mb-6 rounded-2xl border border-line bg-surface/70 p-5 shadow-soft">
      <h3 className="font-cinzel text-[1.05rem] font-semibold text-ink">
        {t.booking.myTitle}
      </h3>
      <ul className="mt-3 space-y-2">
        {items.map((a) => {
          const start = new Date(a.startAt).getTime();
          const end = new Date(a.endAt).getTime();
          const open = now >= start - GRACE_MS && now <= end;
          return (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-soft/40 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="text-[0.9rem] font-medium text-ink">
                  {a.consultantName} ·{" "}
                  {a.channel === "chat"
                    ? t.channels.chat
                    : t.channels.videochamada}
                </p>
                <p className="text-[0.8rem] text-ink-soft">
                  {dayFmt.format(new Date(a.startAt))} · {a.durationMin}
                  {t.video.minutes} · {euros(a.totalCents)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {open ? (
                  <button
                    type="button"
                    onClick={() => enter(a)}
                    disabled={busy === a.id}
                    className="btn-flame px-4 py-2 text-sm disabled:opacity-50"
                  >
                    {t.booking.enter}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => cancel(a)}
                    disabled={busy === a.id}
                    className="rounded-full border border-line px-4 py-2 text-sm text-ink-soft hover:border-red-400 hover:text-red-500 disabled:opacity-50"
                  >
                    {t.booking.cancel}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
