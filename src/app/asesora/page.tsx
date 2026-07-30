"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  NotificationBell,
  useAdvisorNotifications,
} from "@/components/advisor/notifications";
import { AdvisorAgenda, ScheduleEditor } from "@/components/advisor/scheduling";
import { Protected } from "@/components/auth/protected";
import { ChatRoom } from "@/components/chat/chat-room";
import { SunMark } from "@/components/site/icons";
import { useLanguage } from "@/components/i18n/language-provider";
import { BarChart3D } from "@/components/site/bar-chart-3d";
import { Logo } from "@/components/site/header";
import {
  fetchAdvisorSessions,
  fetchAdvisorStats,
  fetchAdvisorView,
  fetchRechargePrice,
  serverNow,
  setConsultantStatus,
  updateAdvisorRate,
  updateRechargePrice,
  type AdvisorSessions,
  type AdvisorStats,
  type AdvisorView,
} from "@/lib/auth/api-client";
import { LOCALE_MAP } from "@/lib/i18n";
import { ApiError } from "@/lib/auth/types";

const DURATIONS = [1, 15, 30, 45, 60] as const;

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

/** Cuenta atrás compartida con el cliente: deriva de expiresAt (reloj real). */
function useCountdown(expiresAt: string | null): number {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!expiresAt) return;
    const target = new Date(expiresAt).getTime();
    const tick = () =>
      setRemaining(Math.max(0, Math.round((target - serverNow()) / 1000)));
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
  const notif = useAdvisorNotifications(session?.id ?? null);
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

  // --- en chat: misma sala de chat que el cliente, rol asesora ---
  if (session?.channel === "chat") {
    return (
      <ChatRoom
        sessionId={session.id}
        expiresAt={session.expiresAt}
        peerName={t.chat.withClient}
        myRole="consultant"
        onExpire={load}
        showEnd={false}
      />
    );
  }

  // --- en llamada: misma sala Jitsi que el cliente + mismo temporizador ---
  if (session?.embeddable && session.joinUrl) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-ink">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/40 px-4 py-3">
          <span className="flex items-center gap-2.5">
            <SunMark className="h-6 w-6 text-accent1" />
            <span className="text-[0.9rem] font-semibold text-white">
              {t.video.advisorTitle} · {view?.consultant.name}
            </span>
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
            key={session.id}
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
          <div className="flex items-center gap-2.5">
            <NotificationBell n={notif} />
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-full border border-line bg-surface/70 px-4 py-2 text-sm font-medium text-ink hover:bg-surface"
            >
              {t.auth.logout}
            </button>
          </div>
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
        <div className="mt-8 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line py-10 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent1" />
          <p className="text-[0.9rem] text-ink-soft">{t.video.waitingClient}</p>
        </div>

        {/* agenda y horario de trabajo */}
        <AdvisorAgenda />
        <ScheduleEditor />

        {/* módulos: tarifas, facturación y sesiones */}
        <AdvisorDashboard />
      </main>
    </div>
  );
}

/** Módulos del panel: tarifas, gráficas de facturación y sesiones cobradas. */
function AdvisorDashboard() {
  const { t, lang } = useLanguage();
  const locale = LOCALE_MAP[lang];
  const [sessions, setSessions] = useState<AdvisorSessions | null>(null);
  const [stats, setStats] = useState<AdvisorStats | null>(null);
  const [rateEuros, setRateEuros] = useState("");
  const [rechargeEuros, setRechargeEuros] = useState("");
  const [savingRate, setSavingRate] = useState(false);
  const [rateSaved, setRateSaved] = useState(false);

  const load = useCallback(() => {
    fetchAdvisorSessions()
      .then((s) => {
        setSessions(s);
        setRateEuros((s.priceCentsPerMin / 100).toFixed(2));
      })
      .catch(() => {});
    fetchAdvisorStats()
      .then(setStats)
      .catch(() => {});
    fetchRechargePrice()
      .then(({ pricePerHourCents }) =>
        setRechargeEuros((pricePerHourCents / 100).toFixed(2)),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveRate = useCallback(async () => {
    setSavingRate(true);
    setRateSaved(false);
    try {
      const rateCents = Math.round(Number(rateEuros.replace(",", ".")) * 100);
      if (Number.isFinite(rateCents) && rateCents >= 10) {
        await updateAdvisorRate(rateCents);
      }
      const rechargeCents = Math.round(
        Number(rechargeEuros.replace(",", ".")) * 100,
      );
      if (Number.isFinite(rechargeCents) && rechargeCents >= 100) {
        await updateRechargePrice(rechargeCents);
      }
      setRateSaved(true);
      load();
    } catch {
      /* ignore */
    } finally {
      setSavingRate(false);
    }
  }, [rateEuros, rechargeEuros, load]);

  const rateCents = Math.round(Number(rateEuros.replace(",", ".")) * 100) || 0;

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-2">
      {/* --- tarifas --- */}
      <section className="rounded-2xl border border-line bg-surface/70 p-6 shadow-soft">
        <h2 className="font-cinzel text-[1.1rem] font-semibold text-ink">
          {t.video.dashRates}
        </h2>
        <div className="mt-4 flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[0.8rem] text-ink-soft">
              {t.video.ratePerMin}
            </label>
            <input
              type="number"
              step="0.10"
              min="0.10"
              value={rateEuros}
              onChange={(e) => {
                setRateEuros(e.target.value);
                setRateSaved(false);
              }}
              className="h-11 w-full rounded-xl border border-line bg-surface px-4 text-ink focus-visible:border-accent1 focus-visible:outline-none"
            />
          </div>
        </div>

        {/* precio por hora de la recarga (solo la asesora lo edita) */}
        <div className="mt-3">
          <label className="mb-1 block text-[0.8rem] text-ink-soft">
            {t.video.rechargePriceLabel}
          </label>
          <input
            type="number"
            step="0.50"
            min="1"
            value={rechargeEuros}
            onChange={(e) => {
              setRechargeEuros(e.target.value);
              setRateSaved(false);
            }}
            className="h-11 w-full rounded-xl border border-line bg-surface px-4 text-ink focus-visible:border-accent1 focus-visible:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={saveRate}
          disabled={savingRate}
          className="btn-flame mt-3 h-11 w-full justify-center px-5 disabled:opacity-60"
        >
          {savingRate ? "…" : t.video.saveRate}
        </button>
        {rateSaved && (
          <p className="mt-2 text-[0.82rem] text-teal">{t.video.rateSaved}</p>
        )}

        {/* previsualización de coste por duración */}
        <p className="mt-4 text-[0.8rem] text-ink-soft">{t.video.ratePreview}</p>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {DURATIONS.map((d) => (
            <div
              key={d}
              className="rounded-lg border border-line bg-soft/50 px-1 py-2 text-center"
            >
              <p className="text-[0.72rem] text-subtle">
                {d} {t.video.minutes}
              </p>
              <p className="text-[0.82rem] font-semibold text-accent1">
                {euros(rateCents * d)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* --- facturación total --- */}
      <section className="rounded-2xl border border-line bg-surface/70 p-6 shadow-soft">
        <h2 className="font-cinzel text-[1.1rem] font-semibold text-ink">
          {t.video.dashBilling}
        </h2>
        <div className="mt-4 flex gap-6">
          <div>
            <p className="text-[0.78rem] uppercase tracking-wide text-subtle">
              {t.video.totalBilled}
            </p>
            <p className="font-cinzel text-[1.8rem] font-semibold text-accent1">
              {euros(stats?.totalCents ?? 0)}
            </p>
          </div>
          <div>
            <p className="text-[0.78rem] uppercase tracking-wide text-subtle">
              {t.video.sessionsCount}
            </p>
            <p className="font-cinzel text-[1.8rem] font-semibold text-ink">
              {stats?.count ?? 0}
            </p>
          </div>
        </div>
      </section>

      {/* --- gráfica diaria --- */}
      <section className="rounded-2xl border border-line bg-surface/70 p-6 shadow-soft">
        <h2 className="font-cinzel text-[1rem] font-semibold text-ink">
          {t.video.daily}
        </h2>
        <div className="mt-3">
          <BarChart3D
            data={stats?.daily ?? []}
            emptyLabel={t.video.noData}
            locale={locale}
          />
        </div>
      </section>

      {/* --- gráfica mensual --- */}
      <section className="rounded-2xl border border-line bg-surface/70 p-6 shadow-soft">
        <h2 className="font-cinzel text-[1rem] font-semibold text-ink">
          {t.video.monthly}
        </h2>
        <div className="mt-3">
          <BarChart3D
            data={stats?.monthly ?? []}
            emptyLabel={t.video.noData}
            locale={locale}
          />
        </div>
      </section>

      {/* --- sesiones cobradas --- */}
      <section className="rounded-2xl border border-line bg-surface/70 p-6 shadow-soft lg:col-span-2">
        <h2 className="font-cinzel text-[1.1rem] font-semibold text-ink">
          {t.video.dashSessions}
        </h2>
        {sessions && sessions.sessions.length === 0 ? (
          <p className="mt-3 text-[0.9rem] text-ink-soft">{t.video.noData}</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[520px] text-left text-[0.86rem]">
              <thead className="bg-soft/60 text-[0.72rem] uppercase tracking-wide text-subtle">
                <tr>
                  <th className="px-4 py-2.5 font-medium">{t.video.colDate}</th>
                  <th className="px-4 py-2.5 font-medium">
                    {t.video.colDuration}
                  </th>
                  <th className="px-4 py-2.5 font-medium">{t.video.colAmount}</th>
                  <th className="px-4 py-2.5 font-medium">{t.video.colStatus}</th>
                </tr>
              </thead>
              <tbody>
                {sessions?.sessions.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <td className="px-4 py-2.5 text-ink-soft">
                      {new Date(s.startedAt).toLocaleDateString(locale, {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-ink-soft">
                      {s.durationMin} {t.video.minutes}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-ink">
                      {euros(s.totalCents)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={
                          s.status === "active"
                            ? "text-teal"
                            : s.status === "completed"
                              ? "text-ink-soft"
                              : "text-red-400"
                        }
                      >
                        {s.status === "active"
                          ? t.video.online
                          : s.status === "completed"
                            ? "✓"
                            : "✕"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
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
