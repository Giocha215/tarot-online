import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { withTransaction } from "../../db/pool.js";
import { publish } from "../../realtime/hub.js";
import {
  AppError,
  badRequest,
  conflict,
  forbidden,
  notFound,
} from "../../utils/errors.js";
import * as consultantRepo from "../consultants/consultant.repository.js";
import * as walletRepo from "../wallet/wallet.repository.js";
import * as sessionRepo from "./session.repository.js";

/**
 * Crea/obtiene la sala de la videollamada según el proveedor configurado.
 *  - daily: crea una sala en Daily (embebible, anónima) que caduca sola.
 *  - jitsi: sala única de meet.jit.si (embebible, pero exige moderador).
 *  - teams: enlace de la consultora o el por defecto (NO embebe).
 */
async function createRoom(
  durationMin: number,
  teamsUrl: string | null,
): Promise<string | null> {
  if (env.VIDEO_PROVIDER === "daily") {
    return createDailyRoom(durationMin);
  }
  if (env.VIDEO_PROVIDER === "jitsi") {
    const room = `TarotOnline-${crypto.randomBytes(6).toString("hex")}`;
    return `https://${env.JITSI_HOST}/${room}`;
  }
  return teamsUrl || env.TEAMS_DEFAULT_JOIN_URL || null;
}

/**
 * Crea una sala en Daily con caducidad = duración + 2 min de margen. La sala
 * es pública (cualquiera con el enlace entra, sin login) y se auto-expulsa al
 * caducar. Devuelve la URL embebible.
 */
async function createDailyRoom(durationMin: number): Promise<string> {
  if (!env.DAILY_API_KEY) {
    throw new AppError(
      500,
      "VIDEO_MISCONFIGURED",
      "El proveedor de vídeo (Daily) no está configurado.",
    );
  }
  const exp = Math.floor(Date.now() / 1000) + durationMin * 60 + 120;
  const res = await fetch("https://api.daily.co/v1/rooms", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.DAILY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        exp,
        eject_at_room_exp: true,
        enable_prejoin_ui: false,
      },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new AppError(
      502,
      "VIDEO_PROVIDER_ERROR",
      `No se pudo crear la sala de vídeo (Daily ${res.status}).`,
      detail.slice(0, 200),
    );
  }
  const data = (await res.json()) as { url?: string };
  if (!data.url) {
    throw new AppError(502, "VIDEO_PROVIDER_ERROR", "Daily no devolvió URL.");
  }
  return data.url;
}

/** Salas de Daily y Jitsi se pueden incrustar; Teams no. */
export function isEmbeddable(joinUrl: string | null): boolean {
  return Boolean(
    joinUrl &&
      (joinUrl.includes(".daily.co") || joinUrl.includes(env.JITSI_HOST)),
  );
}

export const SESSION_ERRORS = {
  CONSULTANT_NOT_FOUND: "CONSULTANT_NOT_FOUND",
  CONSULTANT_UNAVAILABLE: "CONSULTANT_UNAVAILABLE",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  ALREADY_IN_SESSION: "ALREADY_IN_SESSION",
  SESSION_NOT_FOUND: "SESSION_NOT_FOUND",
} as const;

/**
 * Inicia una videollamada. Toda la operación va en una transacción:
 *   1. Bloquea la fila de la consultora (FOR UPDATE) y comprueba que esté
 *      online y sin sesión activa.
 *   2. Cobra por adelantado (precio/min × minutos) contra el saldo del
 *      usuario; si no llega, aborta sin tocar nada.
 *   3. Crea la sesión y marca a la consultora como "busy".
 *
 * El cobro por adelantado hace que el punto 4 del flujo ("bloquear
 * facturación adicional al terminar") sea automático: ya no se cobra más.
 */
export async function startSession(
  userId: string,
  input: { consultantSlug: string; durationMin: number; channel?: "video" | "chat" },
) {
  const channel = input.channel ?? "video";
  const result = await withTransaction(async (client) => {
    const consultant = await consultantRepo.findBySlugForUpdate(
      client,
      input.consultantSlug,
    );
    if (!consultant) {
      throw notFound(
        SESSION_ERRORS.CONSULTANT_NOT_FOUND,
        "La consultora no existe.",
      );
    }

    if (consultant.status !== "online") {
      throw conflict(
        SESSION_ERRORS.CONSULTANT_UNAVAILABLE,
        "La consultora no está disponible ahora mismo.",
      );
    }

    // Defensa extra: aunque el estado diga "online", que no haya sesión viva.
    const active = await sessionRepo.findActiveByConsultant(
      client,
      consultant.id,
    );
    if (active) {
      throw conflict(
        SESSION_ERRORS.CONSULTANT_UNAVAILABLE,
        "La consultora está en otra sesión.",
      );
    }

    const totalCents = consultant.price_cents_per_min * input.durationMin;
    // El chat no necesita sala de vídeo: la conversación va por WebSocket.
    const joinUrl =
      channel === "chat"
        ? null
        : await createRoom(input.durationMin, consultant.teams_join_url);
    const expiresAt = new Date(Date.now() + input.durationMin * 60_000);

    // La sesión se crea primero para tener su id como referencia del cargo.
    // Si el cobro falla, el rollback deshace también este insert.
    const session = await sessionRepo.insertSession(client, {
      userId,
      consultantId: consultant.id,
      channel,
      durationMin: input.durationMin,
      priceCentsPerMin: consultant.price_cents_per_min,
      totalCents,
      joinUrl,
      expiresAt,
    });

    const charged = await walletRepo.applyTransaction(client, {
      userId,
      amountCents: -totalCents,
      kind: "session_charge",
      reference: session.id,
    });
    if (!charged) {
      throw new AppError(
        402,
        SESSION_ERRORS.INSUFFICIENT_BALANCE,
        "Saldo insuficiente para esta videollamada.",
        { requiredCents: totalCents },
      );
    }

    await consultantRepo.setStatus(consultant.id, "busy", client);

    return { session, consultant, balanceCents: charged.balanceCents };
  });

  publish({
    type: "consultant.status",
    slug: result.consultant.slug,
    status: "busy",
    available: false,
  });

  return {
    sessionId: result.session.id,
    channel: result.session.channel,
    joinUrl: result.session.join_url,
    embeddable: isEmbeddable(result.session.join_url),
    durationMin: result.session.duration_min,
    totalCents: result.session.total_cents,
    startedAt: result.session.started_at.toISOString(),
    expiresAt: result.session.expires_at.toISOString(),
    balanceCents: result.balanceCents,
    consultant: {
      slug: result.consultant.slug,
      name: result.consultant.name,
    },
  };
}

/**
 * Crea la sesión de una cita YA PAGADA (al reservar). No cobra de nuevo: el
 * saldo se debitó al agendar. Registra igualmente total_cents en la sesión
 * para que la facturación de la asesora lo contabilice. Marca a la consultora
 * como ocupada y publica el cambio de estado.
 */
export async function startAppointmentSession(params: {
  userId: string;
  consultantId: string;
  channel: "video" | "chat";
  durationMin: number;
  priceCentsPerMin: number;
  totalCents: number;
  expiresAt: Date;
}) {
  const result = await withTransaction(async (client) => {
    const consultant = await consultantRepo.findById(params.consultantId);
    if (!consultant) {
      throw notFound(SESSION_ERRORS.CONSULTANT_NOT_FOUND, "Consultora no encontrada.");
    }
    const active = await sessionRepo.findActiveByConsultant(client, params.consultantId);
    if (active) {
      throw conflict(
        SESSION_ERRORS.CONSULTANT_UNAVAILABLE,
        "La consultora está en otra sesión.",
      );
    }
    const joinUrl =
      params.channel === "chat"
        ? null
        : await createRoom(params.durationMin, consultant.teams_join_url);

    const session = await sessionRepo.insertSession(client, {
      userId: params.userId,
      consultantId: params.consultantId,
      channel: params.channel,
      durationMin: params.durationMin,
      priceCentsPerMin: params.priceCentsPerMin,
      totalCents: params.totalCents,
      joinUrl,
      expiresAt: params.expiresAt,
    });
    await consultantRepo.setStatus(params.consultantId, "busy", client);
    return { session, consultant };
  });

  publish({
    type: "consultant.status",
    slug: result.consultant.slug,
    status: "busy",
    available: false,
  });

  return {
    sessionId: result.session.id,
    channel: result.session.channel,
    joinUrl: result.session.join_url,
    embeddable: isEmbeddable(result.session.join_url),
    durationMin: result.session.duration_min,
    totalCents: result.session.total_cents,
    startedAt: result.session.started_at.toISOString(),
    expiresAt: result.session.expires_at.toISOString(),
    consultant: {
      slug: result.consultant.slug,
      name: result.consultant.name,
    },
  };
}

/**
 * Termina una sesión: por el temporizador (completed) o cancelada. Libera a
 * la consultora. Idempotente: si ya estaba cerrada, no hace nada.
 */
export async function endSession(
  userId: string,
  sessionId: string,
  reason: "completed" | "cancelled" = "completed",
) {
  const owned = await sessionRepo.findByIdForUser(sessionId, userId);
  if (!owned) {
    throw notFound(SESSION_ERRORS.SESSION_NOT_FOUND, "Sesión no encontrada.");
  }

  const closed = await withTransaction(async (client) => {
    const ended = await sessionRepo.markEnded(sessionId, reason, client);
    if (!ended) return null; // ya estaba cerrada
    await consultantRepo.setStatus(ended.consultant_id, "online", client);
    return ended;
  });

  if (closed) {
    publish({ type: "session.ended", sessionId });
    const consultant = await consultantRepo.findById(closed.consultant_id);
    if (consultant) {
      publish({
        type: "consultant.status",
        slug: consultant.slug,
        status: "online",
        available: true,
      });
    }
  }

  return { ended: Boolean(closed), status: reason };
}

/**
 * Barrido de sesiones caducadas. Lo llama un intervalo del servidor: cierra
 * las que pasaron de su expires_at sin que el frontend avisara (p. ej. el
 * usuario cerró la pestaña).
 */
export async function sweepExpiredSessions(): Promise<number> {
  const expired = await sessionRepo.findExpiredActive();
  let closed = 0;
  for (const s of expired) {
    const done = await withTransaction(async (client) => {
      const ended = await sessionRepo.markEnded(s.id, "completed", client);
      if (!ended) return false;
      await consultantRepo.setStatus(ended.consultant_id, "online", client);
      return true;
    });
    if (done) {
      closed++;
      publish({ type: "session.ended", sessionId: s.id });
    }
  }
  return closed;
}

export async function getHistory(userId: string) {
  const rows = await sessionRepo.listByUser(userId);
  return rows.map((r) => sessionRepo.toPublicSession(r, isEmbeddable(r.join_url)));
}

export async function getActive(userId: string) {
  const active = await sessionRepo.getActiveForUser(userId);
  return active
    ? sessionRepo.toPublicSession(active, isEmbeddable(active.join_url))
    : null;
}

/**
 * Panel de la asesora: la consultora que posee este usuario y su sesión
 * activa (si la hay), con el enlace de la sala y la hora de expiración para
 * unirse a la misma videollamada que el cliente y ver el mismo temporizador.
 */
export async function getAdvisorView(userId: string) {
  const consultant = await consultantRepo.findByOwner(userId);
  if (!consultant) {
    throw forbidden(
      "NOT_A_CONSULTANT",
      "Esta cuenta no está asociada a ninguna consultora.",
    );
  }

  const active = await sessionRepo.getActiveByConsultantId(consultant.id);
  return {
    consultant: {
      slug: consultant.slug,
      name: consultant.name,
      status: consultant.status,
    },
    activeSession:
      active && active.expires_at.getTime() > Date.now()
        ? {
            id: active.id,
            channel: active.channel,
            joinUrl: active.join_url,
            embeddable: isEmbeddable(active.join_url),
            durationMin: active.duration_min,
            startedAt: active.started_at.toISOString(),
            expiresAt: active.expires_at.toISOString(),
          }
        : null,
  };
}

/** Resuelve la consultora del usuario asesora o lanza 403. */
async function requireOwnedConsultant(userId: string) {
  const consultant = await consultantRepo.findByOwner(userId);
  if (!consultant) {
    throw forbidden(
      "NOT_A_CONSULTANT",
      "Esta cuenta no está asociada a ninguna consultora.",
    );
  }
  return consultant;
}

/** Historial de sesiones cobradas de la asesora, con total. */
export async function getAdvisorSessions(userId: string) {
  const consultant = await requireOwnedConsultant(userId);
  const rows = await sessionRepo.listByConsultant(consultant.id);
  const totals = await sessionRepo.totalsByConsultant(consultant.id);
  return {
    sessions: rows.map((r) => sessionRepo.toPublicSession(r)),
    totalCents: totals.totalCents,
    count: totals.count,
    priceCentsPerMin: consultant.price_cents_per_min,
  };
}

/** Facturación por día y por mes de la asesora, para las gráficas. */
export async function getAdvisorStats(userId: string) {
  const consultant = await requireOwnedConsultant(userId);
  const [daily, monthly, totals] = await Promise.all([
    sessionRepo.revenueByDay(consultant.id),
    sessionRepo.revenueByMonth(consultant.id),
    sessionRepo.totalsByConsultant(consultant.id),
  ]);
  return { daily, monthly, totalCents: totals.totalCents, count: totals.count };
}

/** La asesora cambia su tarifa (precio por minuto), en céntimos. */
export async function updateAdvisorRate(userId: string, priceCentsPerMin: number) {
  const consultant = await requireOwnedConsultant(userId);
  await consultantRepo.updateRate(consultant.id, priceCentsPerMin);
  return { priceCentsPerMin };
}

/**
 * Recarga por horas: el cliente solo elige las horas; el importe lo calcula
 * el servidor con el precio por hora que fija la asesora. Así el cliente no
 * puede manipular el precio ni el importe.
 */
export async function startTopupByHours(userId: string, hours: number) {
  const { getRechargePriceCents } = await import(
    "../settings/settings.repository.js"
  );
  const pricePerHour = await getRechargePriceCents();
  return startTopup(userId, pricePerHour * hours);
}

/** Precio por hora de la recarga (público, para mostrarlo en el modal). */
export async function getRechargePrice() {
  const { getRechargePriceCents } = await import(
    "../settings/settings.repository.js"
  );
  return { pricePerHourCents: await getRechargePriceCents() };
}

/** La asesora fija el precio por hora de la recarga. */
export async function setRechargePrice(userId: string, pricePerHourCents: number) {
  await requireOwnedConsultant(userId); // solo asesora/admin
  const { setRechargePriceCents } = await import(
    "../settings/settings.repository.js"
  );
  await setRechargePriceCents(pricePerHourCents);
  return { pricePerHourCents };
}

/**
 * Inicia una recarga. Con Stripe configurado devuelve la URL de Checkout
 * (el saldo se acredita en el webhook al pagar). En modo demo acredita ya.
 */
export async function startTopup(userId: string, amountCents: number) {
  if (amountCents > env.DEMO_TOPUP_MAX_CENTS && !env.stripeEnabled) {
    throw badRequest(
      "TOPUP_TOO_LARGE",
      `El máximo por recarga en modo demo es ${env.DEMO_TOPUP_MAX_CENTS} céntimos.`,
    );
  }

  if (env.stripeEnabled) {
    const { createTopupCheckout } = await import("../wallet/stripe.service.js");
    const url = await createTopupCheckout({ userId, amountCents });
    return { mode: "stripe" as const, url };
  }

  // Demo: acreditar directamente.
  const result = await withTransaction((client) =>
    walletRepo.applyTransaction(client, {
      userId,
      amountCents,
      kind: "topup",
      reference: "demo",
    }),
  );
  return { mode: "demo" as const, balanceCents: result?.balanceCents ?? 0 };
}

/** Recarga de saldo. En modo demo acredita directamente. */
export async function topup(userId: string, amountCents: number) {
  if (amountCents > env.DEMO_TOPUP_MAX_CENTS) {
    throw badRequest(
      "TOPUP_TOO_LARGE",
      `El máximo por recarga en modo demo es ${env.DEMO_TOPUP_MAX_CENTS} céntimos.`,
    );
  }

  const result = await withTransaction((client) =>
    walletRepo.applyTransaction(client, {
      userId,
      amountCents,
      kind: "topup",
      reference: env.stripeEnabled ? "stripe" : "demo",
    }),
  );

  // amountCents es positivo, así que un crédito nunca falla por saldo.
  return { balanceCents: result?.balanceCents ?? 0, mode: env.stripeEnabled ? "stripe" : "demo" };
}

/** Cambio de estado de la consultora (panel de consultoras). */
export async function updateConsultantStatus(
  userId: string,
  userRole: string,
  slug: string,
  status: consultantRepo.ConsultantStatus,
) {
  const consultant = await consultantRepo.findBySlug(slug);
  if (!consultant) {
    throw notFound(SESSION_ERRORS.CONSULTANT_NOT_FOUND, "Consultora no encontrada.");
  }

  // Solo el admin, o la consultora dueña de ese perfil, puede cambiarlo.
  const isOwner = consultant.owner_user_id === userId;
  if (userRole !== "admin" && !isOwner) {
    throw forbidden("FORBIDDEN", "No puedes cambiar el estado de esta consultora.");
  }

  await consultantRepo.setStatus(consultant.id, status);
  publish({
    type: "consultant.status",
    slug: consultant.slug,
    status,
    available: status === "online",
  });
  return { slug: consultant.slug, status };
}
