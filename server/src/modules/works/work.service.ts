import { withTransaction } from "../../db/pool.js";
import { AppError, badRequest, forbidden, notFound } from "../../utils/errors.js";
import * as consultantRepo from "../consultants/consultant.repository.js";
import * as walletRepo from "../wallet/wallet.repository.js";
import * as workRepo from "./work.repository.js";

export async function getPublicWorks(slug: string) {
  const rows = await workRepo.listActiveBySlug(slug);
  return rows.map(workRepo.toPublicWork);
}

export async function getAdvisorWorks(userId: string) {
  const consultant = await consultantRepo.findByOwner(userId);
  if (!consultant) {
    throw forbidden("NOT_A_CONSULTANT", "Esta cuenta no es de asesora.");
  }
  const rows = await workRepo.listByConsultant(consultant.id);
  return rows.map(workRepo.toPublicWork);
}

export async function updateAdvisorWork(
  userId: string,
  id: string,
  priceCents: number,
  active: boolean,
) {
  const consultant = await consultantRepo.findByOwner(userId);
  if (!consultant) {
    throw forbidden("NOT_A_CONSULTANT", "Esta cuenta no es de asesora.");
  }
  const updated = await workRepo.updateWork(consultant.id, id, priceCents, active);
  if (!updated) throw notFound("WORK_NOT_FOUND", "Trabajo no encontrado.");
  return workRepo.toPublicWork(updated);
}

/** Lista de pedidos que le han hecho a la asesora. */
export async function getAdvisorOrders(userId: string) {
  const consultant = await consultantRepo.findByOwner(userId);
  if (!consultant) {
    throw forbidden("NOT_A_CONSULTANT", "Esta cuenta no es de asesora.");
  }
  return workRepo.listByConsultantOrders(consultant.id);
}

/** Crea un pedido de trabajo y cobra el precio fijo por adelantado. */
export async function placeOrder(
  userId: string,
  input: {
    consultantSlug: string;
    workServiceId: string;
    fullName: string;
    birthdate: string;
    phone: string;
    email: string;
    partnerName?: string;
    partnerBirthdate?: string;
    notes?: string;
  },
) {
  const consultant = await consultantRepo.findBySlug(input.consultantSlug);
  if (!consultant) {
    throw notFound("CONSULTANT_NOT_FOUND", "La consultora no existe.");
  }
  const work = await workRepo.findById(input.workServiceId);
  if (!work || work.consultant_id !== consultant.id || !work.active) {
    throw notFound("WORK_NOT_FOUND", "Ese trabajo no está disponible.");
  }
  if (work.requires_couple && (!input.partnerName || !input.partnerBirthdate)) {
    throw badRequest(
      "PARTNER_REQUIRED",
      "Este trabajo requiere el nombre y la fecha de nacimiento de la pareja.",
    );
  }

  const result = await withTransaction(async (client) => {
    const order = await workRepo.insertOrder(client, {
      consultantId: consultant.id,
      userId,
      workServiceId: work.id,
      workName: work.name,
      priceCents: work.price_cents,
      fullName: input.fullName,
      birthdate: input.birthdate,
      phone: input.phone,
      email: input.email,
      partnerName: work.requires_couple ? (input.partnerName ?? null) : null,
      partnerBirthdate: work.requires_couple
        ? (input.partnerBirthdate ?? null)
        : null,
      notes: input.notes ?? null,
    });

    const charged = await walletRepo.applyTransaction(client, {
      userId,
      amountCents: -work.price_cents,
      kind: "session_charge",
      reference: `order:${order.id}`,
    });
    if (!charged) {
      throw new AppError(
        402,
        "INSUFFICIENT_BALANCE",
        "Saldo insuficiente para este trabajo.",
        { requiredCents: work.price_cents },
      );
    }
    return { order, balanceCents: charged.balanceCents };
  });

  return {
    id: result.order.id,
    workName: work.name,
    priceCents: work.price_cents,
    balanceCents: result.balanceCents,
  };
}
