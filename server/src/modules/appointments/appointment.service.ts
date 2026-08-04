import { withTransaction } from "../../db/pool.js";
import { AppError, conflict, forbidden, notFound } from "../../utils/errors.js";
import {
  ADVISOR_TIMEZONE,
  partsInTz,
  zonedTimeToUtc,
} from "../../utils/timezone.js";
import * as consultantRepo from "../consultants/consultant.repository.js";
import * as sessionService from "../sessions/session.service.js";
import * as walletRepo from "../wallet/wallet.repository.js";
import * as apptRepo from "./appointment.repository.js";

const SLOT_STEP_MIN = 30; // granularidad de los huecos ofrecidos
const HORIZON_DAYS = 21; // cuántos días hacia adelante se pueden reservar
const MIN_LEAD_MIN = 30; // no reservar con menos de 30 min de antelación
const REFUND_WINDOW_MS = 60 * 60_000; // reembolso si cancela >1 h antes
const START_GRACE_MS = 5 * 60_000; // se puede entrar 5 min antes

/**
 * Huecos libres de una consultora para una duración dada, en los próximos
 * HORIZON_DAYS días. Devuelve instantes UTC (ISO) que el cliente muestra en su
 * hora local. Excluye pasado inmediato y solapamientos con citas ya reservadas.
 */
export async function getAvailableSlots(
  consultantSlug: string,
  durationMin: number,
) {
  const consultant = await consultantRepo.findBySlug(consultantSlug);
  if (!consultant) {
    throw notFound("CONSULTANT_NOT_FOUND", "La consultora no existe.");
  }

  const availability = await apptRepo.listAvailability(consultant.id);
  const booked = await apptRepo.listUpcomingBookings(consultant.id);
  const now = Date.now();
  const earliest = now + MIN_LEAD_MIN * 60_000;

  const today = partsInTz(new Date(now), ADVISOR_TIMEZONE);
  const slots: string[] = [];

  for (let offset = 0; offset < HORIZON_DAYS; offset++) {
    // Fecha de calendario (en hora de la asesora) = hoy + offset.
    const base = new Date(Date.UTC(today.year, today.month - 1, today.day));
    base.setUTCDate(base.getUTCDate() + offset);
    const y = base.getUTCFullYear();
    const mo = base.getUTCMonth() + 1;
    const d = base.getUTCDate();
    const weekday = base.getUTCDay();

    for (const block of availability.filter((b) => b.weekday === weekday)) {
      for (
        let m = block.start_minute;
        m + durationMin <= block.end_minute;
        m += SLOT_STEP_MIN
      ) {
        const startAt = zonedTimeToUtc(
          y,
          mo,
          d,
          Math.floor(m / 60),
          m % 60,
          ADVISOR_TIMEZONE,
        );
        const startMs = startAt.getTime();
        if (startMs < earliest) continue;
        const endMs = startMs + durationMin * 60_000;
        const overlaps = booked.some(
          (b) => startMs < b.end_at.getTime() && endMs > b.start_at.getTime(),
        );
        if (overlaps) continue;
        slots.push(startAt.toISOString());
      }
    }
  }

  slots.sort();
  return {
    slots,
    priceCentsPerMin: consultant.price_cents_per_min,
    chatPriceCentsPerMin: consultant.chat_price_cents_per_min,
  };
}

/** Reserva una cita y cobra por adelantado (política: cobro al reservar). */
export async function bookAppointment(
  userId: string,
  input: {
    consultantSlug: string;
    channel: "video" | "chat";
    durationMin: number;
    startAt: string;
    readingServiceId?: string;
  },
) {
  const consultant = await consultantRepo.findBySlug(input.consultantSlug);
  if (!consultant) {
    throw notFound("CONSULTANT_NOT_FOUND", "La consultora no existe.");
  }

  // Si es una lectura de Tarot (precio fijo), el canal, la duración y el
  // importe salen de la lectura (no del precio por minuto).
  let channel = input.channel;
  let durationMin = input.durationMin;
  let readingId: string | null = null;
  let fixedTotal: number | null = null;
  if (input.readingServiceId) {
    const { findById } = await import("../readings/reading.repository.js");
    const reading = await findById(input.readingServiceId);
    if (!reading || reading.consultant_id !== consultant.id || !reading.active) {
      throw notFound("READING_NOT_FOUND", "Esa lectura no está disponible.");
    }
    channel = reading.channel;
    durationMin = reading.duration_min;
    readingId = reading.id;
    fixedTotal = reading.price_cents;
  }

  // El inicio pedido debe ser uno de los huecos válidos ahora mismo.
  const { slots } = await getAvailableSlots(input.consultantSlug, durationMin);
  if (!slots.includes(input.startAt)) {
    throw conflict("SLOT_UNAVAILABLE", "Ese horario ya no está disponible.");
  }

  const startAt = new Date(input.startAt);
  const endAt = new Date(startAt.getTime() + durationMin * 60_000);
  // Precio: fijo (lectura) o por minuto según el canal.
  const perMin =
    fixedTotal != null
      ? 0
      : channel === "chat"
        ? consultant.chat_price_cents_per_min
        : consultant.price_cents_per_min;
  const totalCents = fixedTotal != null ? fixedTotal : perMin * durationMin;

  const result = await withTransaction(async (client) => {
    // Recheca solapamiento bajo lock para evitar dobles reservas.
    const clash = await apptRepo.findOverlapping(
      client,
      consultant.id,
      startAt,
      endAt,
    );
    if (clash) {
      throw conflict("SLOT_UNAVAILABLE", "Ese horario ya no está disponible.");
    }

    const appt = await apptRepo.insert(client, {
      consultantId: consultant.id,
      userId,
      channel,
      durationMin,
      priceCentsPerMin: perMin,
      totalCents,
      startAt,
      endAt,
      readingServiceId: readingId,
    });

    const charged = await walletRepo.applyTransaction(client, {
      userId,
      amountCents: -totalCents,
      kind: "session_charge",
      reference: `appt:${appt.id}`,
    });
    if (!charged) {
      throw new AppError(
        402,
        "INSUFFICIENT_BALANCE",
        "Saldo insuficiente para reservar esta cita.",
        { requiredCents: totalCents },
      );
    }
    return { appt, balanceCents: charged.balanceCents };
  });

  return {
    id: result.appt.id,
    channel: result.appt.channel,
    durationMin: result.appt.duration_min,
    totalCents: result.appt.total_cents,
    startAt: result.appt.start_at.toISOString(),
    endAt: result.appt.end_at.toISOString(),
    balanceCents: result.balanceCents,
  };
}

/** Cancela una cita. Reembolsa si se cancela con >1 h de antelación. */
export async function cancelAppointment(userId: string, apptId: string) {
  const appt = await apptRepo.findByIdForUser(apptId, userId);
  if (!appt) throw notFound("APPOINTMENT_NOT_FOUND", "Cita no encontrada.");
  if (appt.status !== "booked") {
    throw conflict("APPOINTMENT_INACTIVE", "La cita ya no está activa.");
  }
  const now = Date.now();
  if (appt.start_at.getTime() <= now) {
    throw conflict("APPOINTMENT_STARTED", "La cita ya ha comenzado.");
  }
  const refundable = appt.start_at.getTime() - now > REFUND_WINDOW_MS;

  const result = await withTransaction(async (client) => {
    await apptRepo.setStatus(client, apptId, "cancelled");
    let balanceCents: number | null = null;
    if (refundable) {
      const refunded = await walletRepo.applyTransaction(client, {
        userId,
        amountCents: appt.total_cents,
        kind: "refund",
        reference: `appt-refund:${apptId}`,
      });
      balanceCents = refunded?.balanceCents ?? null;
    }
    return { balanceCents };
  });

  return {
    cancelled: true,
    refunded: refundable,
    balanceCents: result.balanceCents,
  };
}

/**
 * Abre la sesión (chat o vídeo) de una cita ya pagada, dentro de su ventana.
 * No vuelve a cobrar. Si ya se abrió, la reutiliza.
 */
export async function startAppointment(userId: string, apptId: string) {
  const appt = await apptRepo.findByIdForUser(apptId, userId);
  if (!appt) throw notFound("APPOINTMENT_NOT_FOUND", "Cita no encontrada.");
  if (appt.status !== "booked") {
    throw conflict("APPOINTMENT_INACTIVE", "La cita ya no está activa.");
  }
  const now = Date.now();
  if (now < appt.start_at.getTime() - START_GRACE_MS) {
    throw conflict("APPOINTMENT_TOO_EARLY", "Aún no es la hora de tu cita.");
  }
  if (now > appt.end_at.getTime()) {
    throw conflict("APPOINTMENT_EXPIRED", "La cita ya ha pasado.");
  }

  // La sesión dura hasta el fin de la franja reservada.
  const session = await sessionService.startAppointmentSession({
    userId,
    consultantId: appt.consultant_id,
    channel: appt.channel,
    durationMin: appt.duration_min,
    priceCentsPerMin: appt.price_cents_per_min,
    totalCents: appt.total_cents,
    expiresAt: appt.end_at,
  });
  await apptRepo.linkSession(apptId, session.sessionId);
  return session;
}

export async function listForUser(userId: string) {
  const rows = await apptRepo.listUpcomingForUser(userId);
  return rows.map(apptRepo.toPublicAppointment);
}

/** Agenda de la asesora: sus próximas citas. */
export async function listForAdvisor(userId: string) {
  const consultant = await consultantRepo.findByOwner(userId);
  if (!consultant) {
    throw forbidden("NOT_A_CONSULTANT", "Esta cuenta no es de asesora.");
  }
  const rows = await apptRepo.listUpcomingForConsultant(consultant.id);
  return rows.map(apptRepo.toPublicAppointment);
}

export async function getAvailability(userId: string) {
  const consultant = await consultantRepo.findByOwner(userId);
  if (!consultant) {
    throw forbidden("NOT_A_CONSULTANT", "Esta cuenta no es de asesora.");
  }
  const blocks = await apptRepo.listAvailability(consultant.id);
  return {
    timezone: ADVISOR_TIMEZONE,
    blocks: blocks.map((b) => ({
      weekday: b.weekday,
      startMinute: b.start_minute,
      endMinute: b.end_minute,
    })),
  };
}

export async function setAvailability(
  userId: string,
  blocks: { weekday: number; startMinute: number; endMinute: number }[],
) {
  const consultant = await consultantRepo.findByOwner(userId);
  if (!consultant) {
    throw forbidden("NOT_A_CONSULTANT", "Esta cuenta no es de asesora.");
  }
  await apptRepo.replaceAvailability(consultant.id, blocks);
  return getAvailability(userId);
}
