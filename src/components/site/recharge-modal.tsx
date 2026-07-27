"use client";

import { useState } from "react";
import { useLanguage } from "@/components/i18n/language-provider";
import { startTopup } from "@/lib/auth/api-client";

const PRESETS = [1000, 2000, 5000]; // 10, 20, 50 €

/**
 * Modal de recarga. Con Stripe configurado redirige a la página de pago; en
 * modo demo acredita el saldo al momento y llama a `onDone`.
 */
export function RechargeModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useLanguage();
  const [amountCents, setAmountCents] = useState(2000);
  const [custom, setCustom] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const effective =
    custom.trim() !== ""
      ? Math.round(Number(custom.replace(",", ".")) * 100)
      : amountCents;

  async function pay() {
    if (!Number.isFinite(effective) || effective < 100) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await startTopup(effective);
      if (res.mode === "stripe") {
        setMessage(t.available.rechargeRedirect);
        window.location.href = res.url; // a la página segura de Stripe
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

  const euros = (c: number) => `${(c / 100).toFixed(0)} €`;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-6 shadow-card">
        <h3 className="font-cinzel text-xl font-semibold text-ink">
          {t.available.rechargeTitle}
        </h3>

        <p className="mt-4 text-[0.85rem] text-ink-soft">
          {t.available.rechargeChoose}
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setAmountCents(c);
                setCustom("");
              }}
              className={
                custom === "" && amountCents === c
                  ? "rounded-xl border-2 border-accent1 bg-accent1/10 py-2.5 text-sm font-semibold text-accent1"
                  : "rounded-xl border border-line py-2.5 text-sm text-ink-soft hover:border-accent1/50"
              }
            >
              {euros(c)}
            </button>
          ))}
        </div>

        <label className="mt-4 block text-[0.85rem] text-ink-soft">
          {t.available.rechargeCustom}
        </label>
        <input
          type="number"
          min="1"
          step="1"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="—"
          className="mt-1 h-11 w-full rounded-xl border border-line bg-surface px-4 text-ink focus-visible:border-accent1 focus-visible:outline-none"
        />

        {message && (
          <p className="mt-3 text-[0.85rem] text-teal">{message}</p>
        )}

        <button
          type="button"
          onClick={pay}
          disabled={loading || effective < 100}
          className="btn-flame mt-5 w-full justify-center px-5 py-3 disabled:opacity-60"
        >
          {loading ? "…" : `${t.available.rechargePay} ${euros(effective)}`}
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
