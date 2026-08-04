"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { DURATIONS } from "@/components/video/video-provider";
import * as api from "@/lib/auth/api-client";
import { LOCALE_MAP } from "@/lib/i18n";
import { ApiError } from "@/lib/auth/types";
import { RechargeModal } from "./recharge-modal";

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

/**
 * Reserva de cita: el cliente elige canal, duración, día y hora libre. Los
 * huecos vienen del servidor en UTC y se muestran en la hora local. Al
 * confirmar se cobra por adelantado.
 */
export function BookingModal({
  consultantSlug,
  consultantName,
  reading,
  onClose,
  onBooked,
}: {
  consultantSlug: string;
  consultantName: string;
  /** Si se pasa una lectura, la reserva es a precio fijo (canal/duración fijos). */
  reading?: api.Reading;
  onClose: () => void;
  onBooked: () => void;
}) {
  const { t, lang } = useLanguage();
  const locale = LOCALE_MAP[lang];
  const { isAuthenticated, user, reload } = useAuth();

  const [channel, setChannel] = useState<"chat" | "video">(
    reading?.channel ?? "chat",
  );
  const [duration, setDuration] = useState(reading?.durationMin ?? 30);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [price, setPrice] = useState(0); // videollamada
  const [chatPrice, setChatPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecharge, setShowRecharge] = useState(false);

  // Carga los huecos al cambiar la duración (no dependen del canal).
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    setLoading(true);
    setSlot(null);
    setDay(null);
    api
      .fetchSlots(consultantSlug, duration)
      .then((r) => {
        if (cancelled) return;
        setSlots(r.slots);
        setPrice(r.priceCentsPerMin);
        setChatPrice(r.chatPriceCentsPerMin);
      })
      .catch(() => !cancelled && setSlots([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [consultantSlug, duration, isAuthenticated]);

  const dayFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        weekday: "short",
        day: "2-digit",
        month: "short",
      }),
    [locale],
  );
  const timeFmt = useMemo(
    () => new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }),
    [locale],
  );

  // Agrupa los huecos por día local.
  const byDay = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const iso of slots ?? []) {
      const key = new Date(iso).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(iso);
    }
    return map;
  }, [slots]);

  const days = useMemo(() => Array.from(byDay.keys()), [byDay]);
  useEffect(() => {
    if (days.length && !day) setDay(days[0]!);
  }, [days, day]);

  // Precio por minuto según el canal (chat/vídeo); si es lectura, precio fijo.
  const perMin = channel === "chat" ? chatPrice : price;
  const cost = reading ? reading.priceCents : perMin * duration;
  const affordable = (user?.balanceCents ?? 0) >= cost;

  async function confirm() {
    if (!slot) return;
    setBooking(true);
    setError(null);
    try {
      await api.bookAppointment({
        consultantSlug,
        channel,
        durationMin: duration,
        startAt: slot,
        readingServiceId: reading?.id,
      });
      setDone(true);
      void reload();
      onBooked();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.code);
      } else {
        setError("NETWORK");
      }
    } finally {
      setBooking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-card">
        <p className="text-[0.8rem] uppercase tracking-wider text-accent1">
          {t.booking.title}
        </p>
        <h3 className="mt-1 font-cinzel text-xl font-semibold text-ink">
          {consultantName}
        </h3>

        {!isAuthenticated ? (
          <p className="mt-4 text-[0.9rem] text-ink-soft">
            {t.video.needLoginText}
          </p>
        ) : done ? (
          <div className="mt-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal/15 text-2xl">
              ✓
            </div>
            <p className="mt-4 font-cinzel text-lg font-semibold text-ink">
              {t.booking.success}
            </p>
            {slot && (
              <p className="mt-1 text-[0.9rem] text-ink-soft">
                {dayFmt.format(new Date(slot))} · {timeFmt.format(new Date(slot))}
              </p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn-flame mt-6 w-full justify-center px-5 py-2.5"
            >
              {t.video.close}
            </button>
          </div>
        ) : (
          <>
            {reading ? (
              /* lectura de Tarot: nombre + duración + precio fijo */
              <div className="mt-4 flex items-center justify-between rounded-xl bg-soft/60 px-4 py-3">
                <div>
                  <p className="font-medium text-ink">{reading.name}</p>
                  <p className="text-[0.8rem] text-ink-soft">
                    {reading.durationMin} {t.video.minutes} ·{" "}
                    {reading.channel === "chat"
                      ? t.channels.chat
                      : t.channels.videochamada}
                  </p>
                </div>
                <span className="font-cinzel text-lg font-semibold text-accent1">
                  {euros(reading.priceCents)}
                </span>
              </div>
            ) : (
              <>
                {/* canal */}
                <p className="mt-4 text-[0.82rem] font-medium text-ink-soft">
                  {t.booking.channel}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {(["chat", "video"] as const).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => setChannel(ch)}
                      className={
                        ch === channel
                          ? "rounded-lg border-2 border-accent1 bg-accent1/10 py-2 text-[0.85rem] font-semibold text-accent1"
                          : "rounded-lg border border-line py-2 text-[0.85rem] text-ink-soft hover:border-accent1/50"
                      }
                    >
                      {ch === "chat" ? t.channels.chat : t.channels.videochamada}
                    </button>
                  ))}
                </div>

                {/* duración */}
                <p className="mt-4 text-[0.82rem] font-medium text-ink-soft">
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
                          ? "rounded-lg border-2 border-accent1 bg-accent1/10 py-2 text-[0.78rem] font-semibold text-accent1"
                          : "rounded-lg border border-line py-2 text-[0.78rem] text-ink-soft hover:border-accent1/50"
                      }
                    >
                      {d}
                      {t.video.minutes}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* día */}
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[0.82rem] font-medium text-ink-soft">
                {t.booking.chooseDay}
              </p>
              <span className="text-[0.68rem] text-subtle">
                {t.booking.localTimeNote}
              </span>
            </div>
            {loading ? (
              <p className="mt-3 text-center text-[0.85rem] text-ink-soft">…</p>
            ) : days.length === 0 ? (
              <p className="mt-3 text-center text-[0.85rem] text-ink-soft">
                {t.booking.noSlots}
              </p>
            ) : (
              <>
                <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                  {days.map((dk) => (
                    <button
                      key={dk}
                      type="button"
                      onClick={() => {
                        setDay(dk);
                        setSlot(null);
                      }}
                      className={
                        dk === day
                          ? "shrink-0 rounded-lg border-2 border-accent1 bg-accent1/10 px-3 py-1.5 text-[0.75rem] font-semibold text-accent1"
                          : "shrink-0 rounded-lg border border-line px-3 py-1.5 text-[0.75rem] text-ink-soft hover:border-accent1/50"
                      }
                    >
                      {dayFmt.format(new Date(dk))}
                    </button>
                  ))}
                </div>

                {/* horas del día elegido */}
                <p className="mt-4 text-[0.82rem] font-medium text-ink-soft">
                  {t.booking.chooseTime}
                </p>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {(byDay.get(day ?? "") ?? []).map((iso) => (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSlot(iso)}
                      className={
                        iso === slot
                          ? "rounded-lg border-2 border-accent1 bg-accent1/10 py-1.5 text-[0.78rem] font-semibold text-accent1"
                          : "rounded-lg border border-line py-1.5 text-[0.78rem] text-ink-soft hover:border-accent1/50"
                      }
                    >
                      {timeFmt.format(new Date(iso))}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* coste + saldo */}
            <div className="mt-4 space-y-1 rounded-xl bg-soft/60 p-3 text-[0.9rem]">
              <div className="flex justify-between">
                <span className="text-ink-soft">
                  {reading
                    ? reading.name
                    : `${euros(perMin)}${t.video.perMin} × ${duration} ${t.video.minutes}`}
                </span>
                <span className="font-semibold text-ink">
                  {t.video.cost}: {euros(cost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">{t.video.balance}</span>
                <span className={affordable ? "text-ink" : "text-red-500"}>
                  {euros(user?.balanceCents ?? 0)}
                </span>
              </div>
            </div>

            {error && error !== "INSUFFICIENT_BALANCE" && (
              <p className="mt-3 text-[0.85rem] text-red-500">
                {error === "SLOT_UNAVAILABLE"
                  ? t.booking.noSlots
                  : t.auth.errors.NETWORK}
              </p>
            )}

            {slot && !affordable ? (
              <button
                type="button"
                onClick={() => setShowRecharge(true)}
                className="mt-4 w-full rounded-full border border-accent1 bg-accent1/10 px-5 py-2.5 text-sm font-semibold text-accent1 hover:bg-accent1/20"
              >
                {t.video.insufficient}
              </button>
            ) : (
              <button
                type="button"
                onClick={confirm}
                disabled={!slot || booking}
                className="btn-flame mt-4 w-full justify-center px-5 py-3 disabled:opacity-50"
              >
                {booking ? t.booking.booking : `${t.booking.confirm} · ${euros(cost)}`}
              </button>
            )}
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full text-center text-[0.85rem] text-ink-soft hover:text-accent1"
        >
          {t.video.cancel}
        </button>
      </div>

      {showRecharge && (
        <RechargeModal
          onClose={() => setShowRecharge(false)}
          onDone={() => {
            void reload();
            setShowRecharge(false);
          }}
        />
      )}
    </div>
  );
}
