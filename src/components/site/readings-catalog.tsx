"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { useVideoCall } from "@/components/video/video-provider";
import * as api from "@/lib/auth/api-client";
import type { Reading } from "@/lib/auth/api-client";
import { BookingModal } from "./booking-modal";
import { CONSULTANTS } from "./data";

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

/** Catálogo de lecturas de Tarot a precio fijo. El cliente reserva y paga. */
export function ReadingsCatalog() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const video = useVideoCall();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [selected, setSelected] = useState<Reading | null>(null);

  const slug = CONSULTANTS[0]?.slug ?? "carmen-oxeu";
  const name = CONSULTANTS[0]?.name ?? "Maria";

  useEffect(() => {
    api
      .fetchReadings(slug)
      .then(({ readings }) => setReadings(readings))
      .catch(() => {});
  }, [slug]);

  if (readings.length === 0) return null;

  return (
    <section id="tarot" className="container-tarot scroll-mt-24 pt-16">
      <h2 className="font-serif text-3xl text-ink sm:text-4xl">
        {t.booking.readingsTitle}
      </h2>
      <p className="mt-1 text-ink-soft">{t.booking.readingsSubtitle}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {readings.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-soft"
          >
            <div className="min-w-0">
              <p className="font-medium leading-snug text-ink">{r.name}</p>
              <p className="mt-0.5 text-[0.78rem] text-ink-soft">
                {r.durationMin} {t.video.minutes} ·{" "}
                {r.channel === "chat" ? t.channels.chat : t.channels.videochamada}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="font-cinzel text-lg font-semibold text-accent1">
                {euros(r.priceCents)}
              </span>
              <button
                type="button"
                onClick={() =>
                  isAuthenticated
                    ? setSelected(r)
                    : video.requestCall({
                        slug,
                        name,
                        priceCentsPerMinute: 0,
                        channel: "video",
                      })
                }
                className="rounded-full border border-accent1/60 bg-accent1/5 px-4 py-1.5 text-[0.78rem] font-semibold text-accent1 hover:bg-accent1/10"
              >
                {t.booking.confirm}
              </button>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <BookingModal
          consultantSlug={slug}
          consultantName={name}
          reading={selected}
          onClose={() => setSelected(null)}
          onBooked={() => {}}
        />
      )}
    </section>
  );
}
