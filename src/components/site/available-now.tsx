"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { useLanguage } from "@/components/i18n/language-provider";
import { useVideoCall } from "@/components/video/video-provider";
import { fetchConsultants } from "@/lib/auth/api-client";
import type { Dict } from "@/lib/i18n";
import { BookingModal } from "./booking-modal";
import { CONSULTANTS, type Consultant } from "./data";
import { MyAppointments } from "./my-appointments";
import { RechargeModal } from "./recharge-modal";
import { RotatingPhotos3D } from "./rotating-photos";
import {
  ArrowRight,
  Chat,
  ChevronLeft,
  ChevronRight,
  Clock,
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
  activeDurationMin,
  priceCentsPerMin,
  chatPriceCentsPerMin,
  onBooked,
}: {
  c: Consultant;
  t: Dict;
  /** Estado real en vivo; undefined mientras carga. */
  status?: "online" | "busy" | "offline";
  /** Minutos de la consulta en curso cuando está ocupada. */
  activeDurationMin?: number | null;
  /** Precio por minuto de la videollamada; undefined mientras carga. */
  priceCentsPerMin?: number;
  /** Precio por minuto del chat; undefined mientras carga. */
  chatPriceCentsPerMin?: number;
  /** Se llama al reservar una cita, para refrescar "Mis citas". */
  onBooked: () => void;
}) {
  const tr = t.consultants[c.slug];
  const video = useVideoCall();
  const { isAuthenticated } = useAuth();
  const [showBooking, setShowBooking] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const online = status === "online" || status === undefined;
  const hasPhotos = (c.photos?.length ?? 0) > 1;
  const bio = hasPhotos ? t.available.advisorBio : undefined;

  // Precios por minuto reales (de la API), distintos para vídeo y chat.
  // Mientras carga usamos 500 como referencia; el importe lo recalcula el servidor.
  const euroMin = (cents: number) =>
    `${(cents / 100).toFixed(2).replace(".", ",")}€/min`;
  const perMinCents = priceCentsPerMin ?? 500;
  const chatPerMinCents = chatPriceCentsPerMin ?? 500;
  const pricePerMinLabel = euroMin(perMinCents);
  const chatPriceLabel = euroMin(chatPerMinCents);

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
      <div className="flex items-center gap-3">
        <div className="relative">
          {hasPhotos ? (
            <button
              type="button"
              onClick={() => setShowPhoto(true)}
              className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent1"
              aria-label={c.name}
              title={c.name}
            >
              <RotatingPhotos3D photos={c.photos!} size={128} alt={c.name} />
            </button>
          ) : (
            <img
              src={c.avatar}
              alt={c.name}
              className="h-16 w-16 rounded-2xl object-cover ring-1 ring-line"
              loading="lazy"
            />
          )}
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
        {status === "busy" && activeDurationMin ? (
          <span className="inline-flex items-center gap-1 text-amber-600">
            <Clock className="h-3.5 w-3.5" /> {t.available.busyIn} &gt;
            {activeDurationMin} {t.video.minutes}
          </span>
        ) : hasPhotos ? null : (
          <span className="inline-flex items-center gap-1 text-teal">
            <Clock className="h-3.5 w-3.5" /> {t.available.respondeEm}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-1.5 text-[0.82rem]">
        <Star className="h-4 w-4 text-gold" />
        <span className="font-semibold text-ink">{c.rating.toFixed(1)}</span>
        <span className="text-subtle">({c.reviews})</span>
      </div>

      {!hasPhotos && (
        <p className="mt-2 line-clamp-2 min-h-[2.6rem] rounded-lg bg-soft/60 px-3 py-2 text-[0.8rem] italic text-ink-soft">
          “{tr?.quote}”
          {tr?.ago && <span className="not-italic text-subtle"> · {tr.ago}</span>}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <ChannelButton
          icon={<Chat className="h-3.5 w-3.5" />}
          label={online ? t.channels.chat : statusLabel}
          price={online ? chatPriceLabel : "—"}
          tone="flame"
          disabled={!online}
          onClick={() =>
            video.requestCall({
              slug: c.slug,
              name: c.name,
              priceCentsPerMinute: chatPerMinCents,
              channel: "chat",
            })
          }
        />
        <ChannelButton
          icon={<Video className="h-3.5 w-3.5" />}
          label={online ? t.channels.videochamada : statusLabel}
          price={online ? pricePerMinLabel : "—"}
          tone="teal"
          disabled={!online}
          onClick={() =>
            video.requestCall({
              slug: c.slug,
              name: c.name,
              priceCentsPerMinute: perMinCents,
              channel: "video",
            })
          }
        />
      </div>

      {/* agendar cita (disponible aunque esté ocupada u offline) */}
      <button
        type="button"
        onClick={() =>
          isAuthenticated
            ? setShowBooking(true)
            : video.requestCall({
                slug: c.slug,
                name: c.name,
                priceCentsPerMinute: perMinCents,
                channel: "chat",
              })
        }
        className="mt-2 w-full rounded-full border border-accent1/60 bg-accent1/5 px-4 py-2 text-[0.82rem] font-semibold text-accent1 hover:bg-accent1/10"
      >
        {t.booking.agendar}
      </button>

      {showBooking && (
        <BookingModal
          consultantSlug={c.slug}
          consultantName={c.name}
          onClose={() => setShowBooking(false)}
          onBooked={onBooked}
        />
      )}

      {/* modal flotante: foto 3D en grande + bio */}
      {showPhoto && hasPhotos && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"
          onClick={() => setShowPhoto(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl border border-line bg-surface px-8 py-10 text-center shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setShowPhoto(false)}
              className="absolute right-4 top-4 text-lg text-ink-soft hover:text-accent1"
              aria-label={t.video.close}
            >
              ✕
            </button>
            <div className="photo3d-float mx-auto w-fit">
              <RotatingPhotos3D photos={c.photos!} size={240} alt={c.name} />
            </div>
            <h3 className="mt-8 font-cinzel text-2xl font-semibold text-ink">
              {c.name}
            </h3>
            {bio && (
              <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
                {bio}
              </p>
            )}
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[0.85rem]">
              <Star className="h-4 w-4 text-gold" />
              <span className="font-semibold text-ink">
                {c.rating.toFixed(1)}
              </span>
              <span className="text-subtle">({c.reviews})</span>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}

/** Ficha de crédito: saldo del usuario, recargar y una frase inspiradora. */
function CreditCard({ t }: { t: Dict }) {
  const { isAuthenticated, user, reload } = useAuth();
  const video = useVideoCall();
  const [showRecharge, setShowRecharge] = useState(false);

  const euros = (cents: number) =>
    `${(cents / 100).toFixed(2).replace(".", ",")} €`;

  const handleRecharge = () => {
    if (!isAuthenticated) {
      // Reutiliza el gate de login del flujo de vídeo.
      video.requestCall({
        slug: "carmen-oxeu",
        name: "",
        priceCentsPerMinute: 500,
        channel: "video",
      });
      return;
    }
    setShowRecharge(true);
  };

  return (
    <article className="flex w-[320px] shrink-0 snap-start flex-col rounded-2xl border border-line bg-surface p-5 shadow-soft">
      {/* crédito + recargar */}
      <div className="flex flex-col gap-2 rounded-xl bg-soft/60 p-4">
        <div>
          <p className="text-[0.78rem] text-ink-soft">
            {isAuthenticated ? t.available.creditLabel : t.available.loginForCredit}
          </p>
          {isAuthenticated && (
            <p className="font-cinzel text-[1.7rem] font-semibold text-accent1">
              {euros(user?.balanceCents ?? 0)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleRecharge}
          className="btn-flame justify-center px-5 py-2.5"
        >
          {t.available.recharge}
        </button>
      </div>

      {showRecharge && (
        <RechargeModal
          onClose={() => setShowRecharge(false)}
          onDone={() => reload()}
        />
      )}

      {/* frase espiritual */}
      <div className="mt-4 flex flex-1 items-center">
        <p className="font-serif text-[0.98rem] italic leading-relaxed text-ink-soft">
          “{t.available.spiritualPhrase}”
        </p>
      </div>
    </article>
  );
}

export function AvailableNow() {
  const { t } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [apptRefresh, setApptRefresh] = useState(0);
  // Estado real de cada consultora (slug -> estado + duración), en vivo.
  const [statuses, setStatuses] = useState<
    Record<
      string,
      {
        status: "online" | "busy" | "offline";
        activeDurationMin: number | null;
        priceCentsPerMin: number;
        chatPriceCentsPerMin: number;
      }
    >
  >({});

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetchConsultants()
        .then(({ consultants }) => {
          if (cancelled) return;
          const map: Record<
            string,
            {
              status: "online" | "busy" | "offline";
              activeDurationMin: number | null;
              priceCentsPerMin: number;
              chatPriceCentsPerMin: number;
            }
          > = {};
          for (const c of consultants)
            map[c.slug] = {
              status: c.status,
              activeDurationMin: c.activeDurationMin,
              priceCentsPerMin: c.priceCentsPerMinute,
              chatPriceCentsPerMin: c.chatPriceCentsPerMinute,
            };
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

      {/* próximas citas del cliente */}
      <div className="mt-6">
        <MyAppointments refreshKey={apptRefresh} />
      </div>

      <div
        ref={scrollRef}
        className="no-scrollbar mt-2 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
      >
        {CONSULTANTS.map((c) => (
          <ConsultantCard
            key={c.slug}
            c={c}
            t={t}
            status={statuses[c.slug]?.status}
            activeDurationMin={statuses[c.slug]?.activeDurationMin}
            priceCentsPerMin={statuses[c.slug]?.priceCentsPerMin}
            chatPriceCentsPerMin={statuses[c.slug]?.chatPriceCentsPerMin}
            onBooked={() => setApptRefresh((n) => n + 1)}
          />
        ))}
        <CreditCard t={t} />
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
