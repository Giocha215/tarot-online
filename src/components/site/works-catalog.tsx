"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { useVideoCall } from "@/components/video/video-provider";
import * as api from "@/lib/auth/api-client";
import type { Work } from "@/lib/auth/api-client";
import { ApiError } from "@/lib/auth/types";
import { CONSULTANTS } from "./data";
import { RechargeModal } from "./recharge-modal";

function euros(cents: number): string {
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

/** Catálogo de trabajos/rituales a precio fijo. El cliente paga y envía datos. */
export function WorksCatalog() {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const video = useVideoCall();
  const [works, setWorks] = useState<Work[]>([]);
  const [selected, setSelected] = useState<Work | null>(null);

  const slug = CONSULTANTS[0]?.slug ?? "carmen-oxeu";
  const name = CONSULTANTS[0]?.name ?? "Maria";

  useEffect(() => {
    api
      .fetchWorks(slug)
      .then(({ works }) => setWorks(works))
      .catch(() => {});
  }, [slug]);

  if (works.length === 0) return null;

  return (
    <section id="trabalhos" className="container-tarot scroll-mt-24 pt-16">
      <h2 className="font-serif text-3xl text-ink sm:text-4xl">
        {t.works.title}
      </h2>
      <p className="mt-1 text-ink-soft">{t.works.subtitle}</p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {works.map((w) => (
          <div
            key={w.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-soft"
          >
            <div className="min-w-0">
              <p className="font-medium leading-snug text-ink">{w.name}</p>
              {w.requiresCouple && (
                <p className="mt-0.5 text-[0.72rem] text-subtle">
                  {t.works.coupleHint}
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <span className="font-cinzel text-lg font-semibold text-accent1">
                {euros(w.priceCents)}
              </span>
              <button
                type="button"
                onClick={() =>
                  isAuthenticated
                    ? setSelected(w)
                    : video.requestCall({
                        slug,
                        name,
                        priceCentsPerMinute: 0,
                        channel: "video",
                      })
                }
                className="rounded-full border border-accent1/60 bg-accent1/5 px-4 py-1.5 text-[0.78rem] font-semibold text-accent1 hover:bg-accent1/10"
              >
                {t.works.order}
              </button>
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <WorkOrderModal
          consultantSlug={slug}
          work={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </section>
  );
}

function WorkOrderModal({
  consultantSlug,
  work,
  onClose,
}: {
  consultantSlug: string;
  work: Work;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const { user, reload } = useAuth();

  const [fullName, setFullName] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [partnerBirthdate, setPartnerBirthdate] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRecharge, setShowRecharge] = useState(false);

  const affordable = (user?.balanceCents ?? 0) >= work.priceCents;
  const valid =
    fullName.trim().length >= 2 &&
    /^\d{4}-\d{2}-\d{2}$/.test(birthdate) &&
    (!work.requiresCouple ||
      (partnerName.trim().length >= 2 &&
        /^\d{4}-\d{2}-\d{2}$/.test(partnerBirthdate)));

  async function submit() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await api.placeOrder({
        consultantSlug,
        workServiceId: work.id,
        fullName: fullName.trim(),
        birthdate,
        partnerName: work.requiresCouple ? partnerName.trim() : undefined,
        partnerBirthdate: work.requiresCouple ? partnerBirthdate : undefined,
        notes: notes.trim() || undefined,
      });
      setDone(true);
      void reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.code : "NETWORK");
    } finally {
      setBusy(false);
    }
  }

  const inputCls =
    "h-11 w-full rounded-xl border border-line bg-surface px-4 text-ink focus-visible:border-accent1 focus-visible:outline-none";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-surface p-6 shadow-card">
        <h3 className="font-cinzel text-xl font-semibold text-ink">{work.name}</h3>
        <p className="mt-1 font-cinzel text-lg font-semibold text-accent1">
          {euros(work.priceCents)}
        </p>

        {done ? (
          <div className="mt-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal/15 text-2xl">
              ✓
            </div>
            <p className="mt-4 text-[0.95rem] text-ink-soft">{t.works.success}</p>
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
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-[0.8rem] text-ink-soft">
                  {t.works.fullName}
                </label>
                <input
                  className={inputCls}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-[0.8rem] text-ink-soft">
                  {t.works.birthdate}
                </label>
                <input
                  type="date"
                  className={inputCls}
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                />
              </div>
              {work.requiresCouple && (
                <>
                  <div>
                    <label className="mb-1 block text-[0.8rem] text-ink-soft">
                      {t.works.partnerName}
                    </label>
                    <input
                      className={inputCls}
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[0.8rem] text-ink-soft">
                      {t.works.partnerBirthdate}
                    </label>
                    <input
                      type="date"
                      className={inputCls}
                      value={partnerBirthdate}
                      onChange={(e) => setPartnerBirthdate(e.target.value)}
                    />
                  </div>
                </>
              )}
              <div>
                <label className="mb-1 block text-[0.8rem] text-ink-soft">
                  {t.works.notes}
                </label>
                <textarea
                  rows={2}
                  className="min-h-[44px] w-full resize-none rounded-xl border border-line bg-surface px-4 py-2.5 text-ink focus-visible:border-accent1 focus-visible:outline-none"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 flex justify-between rounded-xl bg-soft/60 p-3 text-[0.9rem]">
              <span className="text-ink-soft">{t.video.balance}</span>
              <span className={affordable ? "text-ink" : "text-red-500"}>
                {euros(user?.balanceCents ?? 0)}
              </span>
            </div>

            {error && error !== "INSUFFICIENT_BALANCE" && (
              <p className="mt-3 text-[0.85rem] text-red-500">
                {t.auth.errors.NETWORK}
              </p>
            )}

            {!affordable ? (
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
                onClick={submit}
                disabled={!valid || busy}
                className="btn-flame mt-4 w-full justify-center px-5 py-3 disabled:opacity-50"
              >
                {busy
                  ? t.works.submitting
                  : `${t.works.submit} · ${euros(work.priceCents)}`}
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
