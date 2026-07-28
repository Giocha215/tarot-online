"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/i18n/language-provider";
import * as api from "@/lib/auth/api-client";
import type { Appointment, AvailabilityBlock } from "@/lib/auth/api-client";
import { LOCALE_MAP } from "@/lib/i18n";

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // lunes … domingo

function toHHMM(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(
    min % 60,
  ).padStart(2, "0")}`;
}
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Editor del horario de trabajo semanal de la asesora (hora de Portugal). */
export function ScheduleEditor() {
  const { t, lang } = useLanguage();
  const locale = LOCALE_MAP[lang];
  const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api
      .fetchAvailability()
      .then((a) => setBlocks(a.blocks))
      .catch(() => {});
  }, []);

  const dayLabel = useCallback(
    (w: number) =>
      new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(
        new Date(Date.UTC(2024, 0, 7 + w)),
      ),
    [locale],
  );

  const byDay = useMemo(() => {
    const map = new Map<number, AvailabilityBlock[]>();
    for (const w of WEEK_ORDER) map.set(w, []);
    for (const b of blocks) map.get(b.weekday)?.push(b);
    for (const list of map.values())
      list.sort((a, b) => a.startMinute - b.startMinute);
    return map;
  }, [blocks]);

  const addRange = (weekday: number) =>
    setBlocks((prev) => [
      ...prev,
      { weekday, startMinute: 540, endMinute: 780 },
    ]);

  const removeRange = (b: AvailabilityBlock) =>
    setBlocks((prev) => prev.filter((x) => x !== b));

  const updateRange = (
    b: AvailabilityBlock,
    field: "startMinute" | "endMinute",
    value: number,
  ) =>
    setBlocks((prev) =>
      prev.map((x) => (x === b ? { ...x, [field]: value } : x)),
    );

  const save = async () => {
    // Solo franjas válidas (fin > inicio).
    const valid = blocks.filter((b) => b.endMinute > b.startMinute);
    setSaving(true);
    setSaved(false);
    try {
      const a = await api.setAvailability(valid);
      setBlocks(a.blocks);
      setSaved(true);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface/70 p-6 shadow-soft">
      <h2 className="font-cinzel text-[1.1rem] font-semibold text-ink">
        {t.schedule.title}
      </h2>
      <p className="mt-1 text-[0.82rem] text-ink-soft">{t.schedule.subtitle}</p>

      <div className="mt-4 space-y-3">
        {WEEK_ORDER.map((w) => {
          const ranges = byDay.get(w) ?? [];
          return (
            <div
              key={w}
              className="flex flex-col gap-2 rounded-xl border border-line bg-soft/30 p-3 sm:flex-row sm:items-start"
            >
              <span className="w-28 shrink-0 pt-1.5 text-[0.85rem] font-medium capitalize text-ink">
                {dayLabel(w)}
              </span>
              <div className="flex flex-1 flex-col gap-2">
                {ranges.length === 0 && (
                  <span className="py-1.5 text-[0.8rem] text-subtle">
                    {t.schedule.closed}
                  </span>
                )}
                {ranges.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={toHHMM(b.startMinute)}
                      onChange={(e) =>
                        updateRange(b, "startMinute", toMinutes(e.target.value))
                      }
                      className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[0.85rem] text-ink focus-visible:border-accent1 focus-visible:outline-none"
                    />
                    <span className="text-ink-soft">–</span>
                    <input
                      type="time"
                      value={toHHMM(b.endMinute)}
                      onChange={(e) =>
                        updateRange(b, "endMinute", toMinutes(e.target.value))
                      }
                      className="rounded-lg border border-line bg-surface px-2 py-1.5 text-[0.85rem] text-ink focus-visible:border-accent1 focus-visible:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeRange(b)}
                      className="ml-1 text-ink-soft hover:text-red-500"
                      aria-label="Quitar"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => addRange(w)}
                  className="self-start text-[0.78rem] font-medium text-accent1 hover:underline"
                >
                  + {t.schedule.addRange}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="btn-flame mt-4 h-11 w-full justify-center px-5 disabled:opacity-60"
      >
        {saving ? "…" : t.schedule.save}
      </button>
      {saved && (
        <p className="mt-2 text-[0.82rem] text-teal">{t.schedule.saved}</p>
      )}
    </section>
  );
}

/** Agenda de la asesora: sus próximas citas (hora local). */
export function AdvisorAgenda() {
  const { t, lang } = useLanguage();
  const locale = LOCALE_MAP[lang];
  const [items, setItems] = useState<Appointment[]>([]);

  useEffect(() => {
    const load = () =>
      api
        .fetchAdvisorAppointments()
        .then(({ appointments }) => setItems(appointments))
        .catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const fmt = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface/70 p-6 shadow-soft">
      <h2 className="font-cinzel text-[1.1rem] font-semibold text-ink">
        {t.schedule.agendaTitle}
      </h2>
      {items.length === 0 ? (
        <p className="mt-3 text-[0.9rem] text-ink-soft">
          {t.schedule.agendaEmpty}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((a) => (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-soft/40 px-4 py-3"
            >
              <span className="text-[0.9rem] text-ink">
                {fmt.format(new Date(a.startAt))}
              </span>
              <span className="text-[0.85rem] text-ink-soft">
                {t.schedule.withLabel} {a.clientName} ·{" "}
                {a.channel === "chat" ? t.channels.chat : t.channels.videochamada}{" "}
                · {a.durationMin}
                {t.video.minutes}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
