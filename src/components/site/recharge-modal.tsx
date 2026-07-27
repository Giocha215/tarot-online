"use client";

import { useState } from "react";
import { useLanguage } from "@/components/i18n/language-provider";
import { startTopup } from "@/lib/auth/api-client";

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const DEFAULT_PRICE_PER_HOUR = 20; // €/hora, editable

/**
 * Modal de recarga por horas. Un precio por hora editable y opciones de 1 a
 * 10 horas; el importe = precio/hora × horas. Con Stripe redirige a la página
 * de pago; en modo demo acredita al momento.
 */
export function RechargeModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useLanguage();
  const [pricePerHour, setPricePerHour] = useState(String(DEFAULT_PRICE_PER_HOUR));
  const [hours, setHours] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const perHourCents = Math.round(Number(pricePerHour.replace(",", ".")) * 100) || 0;
  const amountCents = perHourCents * hours;

  async function pay() {
    if (!Number.isFinite(amountCents) || amountCents < 100) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await startTopup(amountCents);
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

        {/* precio por hora editable */}
        <label className="mt-4 block text-[0.85rem] text-ink-soft">
          {t.available.rechargePerHour}
        </label>
        <input
          type="number"
          min="1"
          step="0.50"
          value={pricePerHour}
          onChange={(e) => setPricePerHour(e.target.value)}
          className="mt-1 h-11 w-full rounded-xl border border-line bg-surface px-4 text-ink focus-visible:border-accent1 focus-visible:outline-none"
        />

        {/* horas: 1 a 10 */}
        <p className="mt-4 text-[0.85rem] text-ink-soft">
          {t.available.rechargeChooseHours}
        </p>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {HOURS.map((h) => {
            const selected = h === hours;
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
                  {euros(perHourCents * h)}
                </span>
              </button>
            );
          })}
        </div>

        {message && <p className="mt-3 text-[0.85rem] text-teal">{message}</p>}

        <button
          type="button"
          onClick={pay}
          disabled={loading || amountCents < 100}
          className="btn-flame mt-5 w-full justify-center px-5 py-3 disabled:opacity-60"
        >
          {loading
            ? "…"
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
