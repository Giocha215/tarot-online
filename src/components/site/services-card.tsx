"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { useVideoCall } from "@/components/video/video-provider";
import * as api from "@/lib/auth/api-client";
import type { Reading, Work } from "@/lib/auth/api-client";
import { BookingModal } from "./booking-modal";
import { CONSULTANTS } from "./data";
import { WorkOrderModal } from "./work-order-modal";

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

/**
 * Tercera tarjeta de "Disponibles ahora": dos botones (Tarot y Trabajos) que
 * abren un modal con un desplegable para elegir el servicio y continuar a
 * reservar (Tarot) o al formulario (Trabajos).
 */
export function ServicesCard() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const video = useVideoCall();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [picker, setPicker] = useState<null | "tarot" | "works">(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [work, setWork] = useState<Work | null>(null);

  const slug = CONSULTANTS[0]?.slug ?? "carmen-oxeu";
  const name = CONSULTANTS[0]?.name ?? "Maria";

  useEffect(() => {
    api.fetchReadings(slug).then(({ readings }) => setReadings(readings)).catch(() => {});
    api.fetchWorks(slug).then(({ works }) => setWorks(works)).catch(() => {});
  }, [slug]);

  const gate = (kind: "tarot" | "works") => {
    if (!isAuthenticated) {
      video.requestCall({ slug, name, priceCentsPerMinute: 0, channel: "video" });
      return;
    }
    setPicker(kind);
  };

  return (
    <article className="relative flex w-[320px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-soft">
      {/* fondo traslúcido: carta completa "El Sol" (éxito). */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.13]"
        style={{ backgroundImage: "url(/images/tarot/sun.jpg)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-surface/20"
      />

      {/* estrellas decorativas alrededor de la carta */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <span className="absolute left-4 top-6 animate-twinkle text-gold/70">✦</span>
        <span
          className="absolute right-5 top-10 animate-twinkle text-lg text-accent1/50"
          style={{ animationDelay: "1s" }}
        >
          ✦
        </span>
        <span
          className="absolute right-6 top-1/2 animate-twinkle text-xs text-gold/60"
          style={{ animationDelay: "2.4s" }}
        >
          ✦
        </span>
        <span
          className="absolute left-5 top-1/2 animate-twinkle text-gold/50"
          style={{ animationDelay: "1.6s" }}
        >
          ✦
        </span>
        <span
          className="absolute bottom-6 left-7 animate-twinkle text-sm text-accent1/40"
          style={{ animationDelay: "0.6s" }}
        >
          ✦
        </span>
        <span
          className="absolute bottom-8 right-8 animate-twinkle text-gold/70"
          style={{ animationDelay: "2s" }}
        >
          ✦
        </span>
      </div>

      <div className="relative flex flex-col">
        {/* mismo alto que el bloque de saldo de la tarjeta Recargar → el botón
            "Serviços de Tarot" queda alineado con "Recargar". */}
        <div className="flex h-[76px] items-center justify-center">
          <p className="font-serif text-2xl font-bold text-ink">
            {t.available.moreServices}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => gate("tarot")}
            className="btn-flame w-full justify-center px-5 py-3"
          >
            🔮 {t.booking.readingsTitle}
          </button>
          <button
            type="button"
            onClick={() => gate("works")}
            className="w-full rounded-full border border-accent1/60 bg-surface/80 px-5 py-3 text-sm font-semibold text-accent1 hover:bg-accent1/10"
          >
            🕯️ {t.works.title}
          </button>
        </div>
      </div>

      {picker === "tarot" && (
        <PickerModal
          title={t.booking.readingsTitle}
          placeholder={t.booking.pick}
          actionLabel={t.booking.confirm}
          options={readings.map((r) => ({
            id: r.id,
            label: r.name,
            sub: `${r.durationMin} ${t.video.minutes} · ${
              r.channel === "chat" ? t.channels.chat : t.channels.videochamada
            }`,
            priceCents: r.priceCents,
          }))}
          onClose={() => setPicker(null)}
          onPick={(id) => {
            const r = readings.find((x) => x.id === id) ?? null;
            setPicker(null);
            setReading(r);
          }}
        />
      )}

      {picker === "works" && (
        <PickerModal
          title={t.works.title}
          placeholder={t.works.pick}
          actionLabel={t.works.order}
          options={works.map((w) => ({
            id: w.id,
            label: w.name,
            sub: w.requiresCouple ? t.works.coupleHint : undefined,
            priceCents: w.priceCents,
          }))}
          onClose={() => setPicker(null)}
          onPick={(id) => {
            const w = works.find((x) => x.id === id) ?? null;
            setPicker(null);
            setWork(w);
          }}
        />
      )}

      {reading && (
        <BookingModal
          consultantSlug={slug}
          consultantName={name}
          reading={reading}
          onClose={() => setReading(null)}
          onBooked={() => {}}
        />
      )}
      {work && (
        <WorkOrderModal
          consultantSlug={slug}
          work={work}
          onClose={() => setWork(null)}
        />
      )}
    </article>
  );
}

interface Option {
  id: string;
  label: string;
  sub?: string;
  priceCents: number;
}

function PickerModal({
  title,
  placeholder,
  actionLabel,
  options,
  onPick,
  onClose,
}: {
  title: string;
  placeholder: string;
  actionLabel: string;
  options: Option[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [sel, setSel] = useState("");
  const chosen = options.find((o) => o.id === sel);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-card">
        <h3 className="font-cinzel text-xl font-semibold text-ink">{title}</h3>

        <label className="mt-4 block text-[0.82rem] font-medium text-ink-soft">
          {placeholder}
        </label>
        <select
          value={sel}
          onChange={(e) => setSel(e.target.value)}
          className="mt-2 h-11 w-full rounded-xl border border-line bg-surface px-3 text-ink focus-visible:border-accent1 focus-visible:outline-none"
        >
          <option value="">— {placeholder} —</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label} · {euros(o.priceCents)}
            </option>
          ))}
        </select>

        {chosen && (
          <div className="mt-4 rounded-xl bg-soft/60 p-4">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-medium text-ink">{chosen.label}</p>
              <span className="font-cinzel text-lg font-semibold text-accent1">
                {euros(chosen.priceCents)}
              </span>
            </div>
            {chosen.sub && (
              <p className="mt-0.5 text-[0.78rem] text-ink-soft">{chosen.sub}</p>
            )}
            <button
              type="button"
              onClick={() => onPick(chosen.id)}
              className="btn-flame mt-4 w-full justify-center px-5 py-2.5"
            >
              {actionLabel}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full text-center text-[0.85rem] text-ink-soft hover:text-accent1"
        >
          {t.video.cancel}
        </button>
      </div>
    </div>
  );
}
