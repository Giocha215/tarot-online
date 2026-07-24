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
 * URL de la sala según el proveedor configurado.
 *  - jitsi: sala única y embebible (iframe), sin cuenta ni claves.
 *  - teams: enlace de la consultora o el por defecto (NO embebe).
 * `embeddable` le dice al frontend si puede meterlo en un iframe o debe
 * ofrecer "abrir en pestaña".
 */
function buildJoinUrl(teamsUrl: string | null): {
  joinUrl: string | null;
  embeddable: boolean;
} {
  if (env.VIDEO_PROVIDER === "jitsi") {
    const room = `TarotOnline-${crypto.randomBytes(6).toString("hex")}`;
    return { joinUrl: `https://${env.JITSI_HOST}/${room}`, embeddable: true };
  }
  return {
    joinUrl: teamsUrl || env.TEAMS_DEFAULT_JOIN_URL || null,
    embeddable: false,
  };
}

/** Una URL de Jitsi siempre se puede incrustar; el resto, no. */
export function isEmbeddable(joinUrl: string | null): boolean {
  return Boolean(joinUrl && joinUrl.includes(env.JITSI_HOST));
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
  input: { consultantSlug: string; durationMin: number },
) {
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
    const { joinUrl } = buildJoinUrl(consultant.teams_join_url);
    const expiresAt = new Date(Date.now() + input.durationMin * 60_000);

    // La sesión se crea primero para tener su id como referencia del cargo.
    // Si el cobro falla, el rollback deshace también este insert.
    const session = await sessionRepo.insertSession(client, {
      userId,
      consultantId: consultant.id,
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
            joinUrl: active.join_url,
            embeddable: isEmbeddable(active.join_url),
            durationMin: active.duration_min,
            startedAt: active.started_at.toISOString(),
            expiresAt: active.expires_at.toISOString(),
          }
        : null,
  };
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
