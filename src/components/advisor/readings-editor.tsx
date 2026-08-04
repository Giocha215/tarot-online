"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/i18n/language-provider";
import * as api from "@/lib/auth/api-client";
import type { Reading } from "@/lib/auth/api-client";

/** La asesora edita el precio y la disponibilidad de sus lecturas de Tarot. */
export function ReadingsEditor() {
  const { t } = useLanguage();
  const [readings, setReadings] = useState<Reading[]>([]);
  const [edits, setEdits] = useState<
    Record<string, { price: string; active: boolean }>
  >({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    api
      .fetchAdvisorReadings()
      .then(({ readings }) => {
        setReadings(readings);
        const e: Record<string, { price: string; active: boolean }> = {};
        for (const r of readings)
          e[r.id] = { price: (r.priceCents / 100).toFixed(2), active: r.active };
        setEdits(e);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveAll = async () => {
    setSaving(true);
    setSaved(false);
    try {
      for (const r of readings) {
        const e = edits[r.id];
        if (!e) continue;
        const cents = Math.round(Number(e.price.replace(",", ".")) * 100);
        if (
          Number.isFinite(cents) &&
          cents >= 0 &&
          (cents !== r.priceCents || e.active !== r.active)
        ) {
          await api.updateReading(r.id, cents, e.active);
        }
      }
      setSaved(true);
      load();
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  if (readings.length === 0) return null;

  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface/70 p-6 shadow-soft">
      <h2 className="font-cinzel text-[1.1rem] font-semibold text-ink">
        {t.booking.readingsManage}
      </h2>

      <div className="mt-4 space-y-2">
        {readings.map((r) => {
          const e = edits[r.id] ?? { price: "", active: r.active };
          return (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-soft/30 p-3"
            >
              <div className="min-w-[8rem] flex-1">
                <p className="text-[0.9rem] font-medium text-ink">{r.name}</p>
                <p className="text-[0.75rem] text-subtle">
                  {r.durationMin} {t.video.minutes}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.50"
                  min="0"
                  value={e.price}
                  onChange={(ev) => {
                    setSaved(false);
                    setEdits((prev) => ({
                      ...prev,
                      [r.id]: { ...e, price: ev.target.value },
                    }));
                  }}
                  className="h-10 w-24 rounded-lg border border-line bg-surface px-3 text-ink focus-visible:border-accent1 focus-visible:outline-none"
                />
                <span className="text-[0.8rem] text-ink-soft">€</span>
              </div>
              <label className="flex cursor-pointer items-center gap-1.5 text-[0.8rem] text-ink-soft">
                <input
                  type="checkbox"
                  checked={e.active}
                  onChange={(ev) => {
                    setSaved(false);
                    setEdits((prev) => ({
                      ...prev,
                      [r.id]: { ...e, active: ev.target.checked },
                    }));
                  }}
                  className="h-4 w-4 accent-accent1"
                />
                {t.booking.readingsActive}
              </label>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={saveAll}
        disabled={saving}
        className="btn-flame mt-4 h-11 w-full justify-center px-5 disabled:opacity-60"
      >
        {saving ? "…" : t.booking.readingsSave}
      </button>
      {saved && (
        <p className="mt-2 text-[0.82rem] text-teal">{t.booking.readingsSaved}</p>
      )}
    </section>
  );
}
