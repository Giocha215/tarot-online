"use client";

import { useCallback, useEffect, useState } from "react";
import { useLanguage } from "@/components/i18n/language-provider";
import * as api from "@/lib/auth/api-client";
import type { AdvisorOrder, Work } from "@/lib/auth/api-client";
import { LOCALE_MAP } from "@/lib/i18n";

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

/** La asesora edita el precio y la disponibilidad de sus trabajos. */
export function WorksEditor() {
  const { t } = useLanguage();
  const [works, setWorks] = useState<Work[]>([]);
  const [edits, setEdits] = useState<
    Record<string, { price: string; active: boolean }>
  >({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(() => {
    api
      .fetchAdvisorWorks()
      .then(({ works }) => {
        setWorks(works);
        const e: Record<string, { price: string; active: boolean }> = {};
        for (const w of works)
          e[w.id] = { price: (w.priceCents / 100).toFixed(2), active: w.active };
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
      for (const w of works) {
        const e = edits[w.id];
        if (!e) continue;
        const cents = Math.round(Number(e.price.replace(",", ".")) * 100);
        if (
          Number.isFinite(cents) &&
          cents >= 0 &&
          (cents !== w.priceCents || e.active !== w.active)
        ) {
          await api.updateWork(w.id, cents, e.active);
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

  if (works.length === 0) return null;

  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface/70 p-6 shadow-soft">
      <h2 className="font-cinzel text-[1.1rem] font-semibold text-ink">
        {t.works.manage}
      </h2>
      <div className="mt-4 space-y-2">
        {works.map((w) => {
          const e = edits[w.id] ?? { price: "", active: w.active };
          return (
            <div
              key={w.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-soft/30 p-3"
            >
              <p className="min-w-[8rem] flex-1 text-[0.9rem] font-medium text-ink">
                {w.name}
              </p>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={e.price}
                  onChange={(ev) => {
                    setSaved(false);
                    setEdits((prev) => ({
                      ...prev,
                      [w.id]: { ...e, price: ev.target.value },
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
                      [w.id]: { ...e, active: ev.target.checked },
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

/** Pedidos de trabajos que le han hecho a la asesora, con los datos del cliente. */
export function OrdersList() {
  const { t, lang } = useLanguage();
  const locale = LOCALE_MAP[lang];
  const [orders, setOrders] = useState<AdvisorOrder[]>([]);

  useEffect(() => {
    const load = () =>
      api
        .fetchAdvisorOrders()
        .then(({ orders }) => setOrders(orders))
        .catch(() => {});
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section className="mt-6 rounded-2xl border border-line bg-surface/70 p-6 shadow-soft">
      <h2 className="font-cinzel text-[1.1rem] font-semibold text-ink">
        {t.works.ordersTitle}
      </h2>
      {orders.length === 0 ? (
        <p className="mt-3 text-[0.9rem] text-ink-soft">{t.works.noOrders}</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {orders.map((o) => (
            <li
              key={o.id}
              className="rounded-xl border border-line bg-soft/40 px-4 py-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-ink">{o.workName}</span>
                <span className="font-cinzel font-semibold text-accent1">
                  {euros(o.priceCents)}
                </span>
              </div>
              <p className="mt-1 text-[0.85rem] text-ink-soft">
                <strong>{t.works.fullName}:</strong> {o.fullName}
                {o.birthdate && ` · ${o.birthdate}`}
              </p>
              {o.partnerName && (
                <p className="text-[0.85rem] text-ink-soft">
                  <strong>{t.works.partnerName}:</strong> {o.partnerName}
                  {o.partnerBirthdate && ` · ${o.partnerBirthdate}`}
                </p>
              )}
              {o.notes && (
                <p className="mt-0.5 text-[0.82rem] italic text-ink-soft">
                  “{o.notes}”
                </p>
              )}
              <p className="mt-1 text-[0.72rem] text-subtle">
                {dateFmt.format(new Date(o.createdAt))} · {o.clientEmail}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
