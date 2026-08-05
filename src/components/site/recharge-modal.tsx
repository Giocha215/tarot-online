"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/components/i18n/language-provider";
import {
  fetchRechargePrice,
  startTopup,
  startTopupAmount,
} from "@/lib/auth/api-client";

const MAX_CENTS = 100_000; // 1000 €

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/**
 * Modal de recarga por horas. El precio por hora lo fija la asesora (solo
 * lectura aquí); el cliente solo elige cuántas horas. El importe lo calcula
 * el servidor, así que el cliente no puede manipularlo.
 */
export function RechargeModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useLanguage();
  const [pricePerHourCents, setPricePerHourCents] = useState<number | null>(null);
  const [hours, setHours] = useState(1);
  const [customEuros, setCustomEuros] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchRechargePrice()
      .then(({ pricePerHourCents }) => setPricePerHourCents(pricePerHourCents))
      .catch(() => setPricePerHourCents(2000));
  }, []);

  const perHour = pricePerHourCents ?? 0;
  // Importe personalizado (si se escribe) tiene prioridad sobre las horas.
  const customCents = Math.round(
    Number(customEuros.replace(",", ".")) * 100,
  );
  const usingCustom = Number.isFinite(customCents) && customCents >= 100;
  const amountCents = usingCustom
    ? Math.min(customCents, MAX_CENTS)
    : perHour * hours;

  async function pay() {
    setLoading(true);
    setMessage(null);
    try {
      const res = usingCustom
        ? await startTopupAmount(amountCents)
        : await startTopup(hours);
      if (res.mode === "stripe") {
        setMessage(t.available.rechargeRedirect);
        window.location.href = res.url;
      } else {
        setMessage(t.available.rechargeOk);
        onDone();
        setTimeout(onClose, 900);
      }
    } catch {
      setMessage(t.auth.errors.NETWORK);
    } finally {
      setLoading(false);
    }
  }

  const euros = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-card">
        <h3 className="font-cinzel text-xl font-semibold text-ink">
          {t.available.rechargeTitle}
        </h3>

        {/* precio por hora (solo lectura; lo fija la asesora) */}
        <div className="mt-4 flex items-baseline justify-between rounded-xl bg-soft/60 px-4 py-3">
          <span className="text-[0.85rem] text-ink-soft">
            {t.available.rechargePerHour}
          </span>
          <span className="font-cinzel text-lg font-semibold text-accent1">
            {pricePerHourCents === null ? "…" : euros(perHour)}
          </span>
        </div>

        {/* horas: 1 a 10 */}
        <p className="mt-4 text-[0.85rem] text-ink-soft">
          {t.available.rechargeChooseHours}
        </p>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {HOURS.map((h) => {
            const selected = h === hours && !usingCustom;
            return (
              <button
                key={h}
                type="button"
                onClick={() => setHours(h)}
                className={
                  selected
                    ? "flex flex-col items-center rounded-lg border-2 border-accent1 bg-accent1/10 px-1 py-2"
                    : "flex flex-col items-center rounded-lg border border-line px-1 py-2 hover:border-accent1/50"
                }
              >
                <span
                  className={`text-[0.9rem] font-semibold ${
                    selected ? "text-accent1" : "text-ink"
                  }`}
                >
                  {h}h
                </span>
                <span className="text-[0.62rem] text-subtle">
                  {euros(perHour * h)}
                </span>
              </button>
            );
          })}
        </div>

        {/* importe personalizado (hasta 1000 €) */}
        <p className="mt-4 text-[0.85rem] text-ink-soft">
          {t.available.rechargeCustom}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="1000"
            step="1"
            inputMode="decimal"
            value={customEuros}
            onChange={(e) => setCustomEuros(e.target.value)}
            placeholder="0"
            className="h-11 w-full rounded-xl border border-line bg-surface px-4 text-ink focus-visible:border-accent1 focus-visible:outline-none"
          />
          <span className="text-ink-soft">€</span>
        </div>
        <p className="mt-1 text-[0.68rem] text-subtle">máx. 1000 €</p>

        {message && <p className="mt-3 text-[0.85rem] text-teal">{message}</p>}

        <button
          type="button"
          onClick={pay}
          disabled={loading || pricePerHourCents === null || amountCents < 100}
          className="btn-flame mt-5 w-full justify-center px-5 py-3 disabled:opacity-60"
        >
          {loading
            ? "…"
            : usingCustom
              ? `${t.available.rechargePay} · ${euros(amountCents)}`
              : `${t.available.rechargePay} ${hours} ${t.available.rechargeHours} · ${euros(amountCents)}`}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full text-center text-[0.85rem] text-ink-soft hover:text-accent1"
        >
          {t.available.rechargeCancel}
        </button>
      </div>
    </div>
  );
}
