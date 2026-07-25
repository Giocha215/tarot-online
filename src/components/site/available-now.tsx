"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/i18n/language-provider";
import { useVideoCall } from "@/components/video/video-provider";
import { fetchConsultants } from "@/lib/auth/api-client";
import type { Dict } from "@/lib/i18n";
import { CONSULTANTS, type Consultant } from "./data";
import {
  ArrowRight,
  Chat,
  ChevronLeft,
  ChevronRight,
  Clock,
  Phone,
  Star,
  Video,
} from "./icons";

function ChannelButton({
  icon,
  label,
  price,
  tone,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  price: string;
  tone: "flame" | "teal";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2.5 text-ink-soft transition-all active:scale-[0.98]",
        disabled
          ? "cursor-not-allowed opacity-40 grayscale"
          : "hover:brightness-105",
        tone === "flame"
          ? "shadow-[0_8px_18px_-10px_hsl(var(--c-accent)/0.8)]"
          : "shadow-[0_8px_18px_-10px_hsl(var(--c-teal)/0.8)]",
      )}
      style={{
        backgroundImage:
          tone === "flame"
            ? "linear-gradient(135deg, hsl(var(--c-accent-2)), hsl(var(--c-accent)))"
            : "linear-gradient(135deg, hsl(var(--c-teal)), hsl(var(--c-teal) / 0.75))",
      }}
    >
      <span className="flex items-center gap-1.5 text-[0.82rem] font-semibold">
        {icon}
        {label}
      </span>
      <span className="text-[0.68rem] font-medium opacity-90">{price}</span>
    </button>
  );
}

function ConsultantCard({
  c,
  t,
  status,
}: {
  c: Consultant;
  t: Dict;
  /** Estado real en vivo; undefined mientras carga. */
  status?: "online" | "busy" | "offline";
}) {
  const tr = t.consultants[c.slug];
  const video = useVideoCall();
  const online = status === "online" || status === undefined;

  // Color y etiqueta del indicador según el estado.
  const dot =
    status === "busy"
      ? "bg-amber-500"
      : status === "offline"
        ? "bg-gray-400"
        : "bg-teal";
  const statusLabel =
    status === "busy"
      ? t.video.busy
      : status === "offline"
        ? t.video.offline
        : t.video.online;

  return (
    <article className="flex w-[320px] shrink-0 snap-start flex-col rounded-2xl border border-line bg-surface p-4 shadow-soft transition-shadow hover:shadow-card">
      <div className="flex items-start gap-3">
        <div className="relative">
          <img
            src={c.avatar}
            alt={c.name}
            className="h-16 w-16 rounded-2xl object-cover ring-1 ring-line"
            loading="lazy"
          />
          <span
            className={cn(
              "absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-surface",
              dot,
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-serif text-xl leading-tight text-ink">
              {c.name}
            </h3>
            <span
              className={cn(
                "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wide",
                status === "busy"
                  ? "bg-amber-500/12 text-amber-600"
                  : status === "offline"
                    ? "bg-gray-400/15 text-gray-500"
                    : "bg-teal/12 text-teal",
              )}
            >
              <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
              {statusLabel}
            </span>
          </div>
          {c.isNew && (
            <span className="mt-1 inline-block rounded-full bg-accent1/12 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-accent1">
              {t.available.novo}
            </span>
          )}
          <p className="mt-1 line-clamp-2 text-[0.8rem] leading-snug text-subtle">
            {tr?.specialties}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-[0.78rem]">
        <span className="inline-flex items-center gap-1 text-teal">
          <Clock className="h-3.5 w-3.5" /> {t.available.respondeEm}
        </span>
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-[0.82rem]">
        <Star className="h-4 w-4 text-gold" />
        <span className="font-semibold text-ink">{c.rating.toFixed(1)}</span>
        <span className="text-subtle">({c.reviews})</span>
      </div>

      <p className="mt-2 line-clamp-2 min-h-[2.6rem] rounded-lg bg-soft/60 px-3 py-2 text-[0.8rem] italic text-ink-soft">
        “{tr?.quote}”
        {tr?.ago && <span className="not-italic text-subtle"> · {tr.ago}</span>}
      </p>

      <div className="mt-3 flex gap-2">
        <ChannelButton
          icon={<Chat className="h-3.5 w-3.5" />}
          label={t.channels.chat}
          price="1,00€/min"
          tone="flame"
        />
        <ChannelButton
          icon={<Phone className="h-3.5 w-3.5" />}
          label={t.channels.telefone}
          price="1,20€/min"
          tone="flame"
        />
        <ChannelButton
          icon={<Video className="h-3.5 w-3.5" />}
          label={online ? t.channels.videochamada : statusLabel}
          price={online ? "5,00€/min" : "—"}
          tone="teal"
          disabled={!online}
          onClick={() =>
            video.requestCall({
              slug: c.slug,
              name: c.name,
              priceCentsPerMinute: 500,
            })
          }
        />
      </div>
    </article>
  );
}

export function AvailableNow() {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  // Estado real de cada consultora (slug -> estado), refrescado en vivo.
  const [statuses, setStatuses] = useState<
    Record<string, "online" | "busy" | "offline">
  >({});

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchConsultants()
        .then(({ consultants }) => {
          if (cancelled) return;
          const map: Record<string, "online" | "busy" | "offline"> = {};
          for (const c of consultants) map[c.slug] = c.status;
          setStatuses(map);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const scrollBy = (dir: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 340, behavior: "smooth" });
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollLeft / 340);
      setActive(Math.min(idx, CONSULTANTS.length - 1));
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section id="consultores" className="container-tarot scroll-mt-24 pt-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-serif text-3xl text-ink sm:text-4xl">
            {t.available.titlePre}{" "}
            <span className="serif-accent">{t.available.titleAccent}</span>
          </h2>
          <p className="mt-1 text-ink-soft">{t.available.subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="#consultores"
            className="hidden items-center gap-1 text-sm font-medium text-accent1 hover:underline sm:inline-flex"
          >
            {t.available.verTodos} <ArrowRight className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:bg-soft"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink transition-colors hover:bg-soft"
            aria-label="Seguinte"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="no-scrollbar mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
      >
        {CONSULTANTS.map((c) => (
          <ConsultantCard key={c.slug} c={c} t={t} status={statuses[c.slug]} />
        ))}
      </div>

      {/* dots */}
      <div className="mt-4 flex justify-center gap-1.5">
        {CONSULTANTS.map((c, i) => (
          <span
            key={c.slug}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === active ? "w-6 bg-accent1" : "w-1.5 bg-line",
            )}
          />
        ))}
      </div>
    </section>
  );
}
