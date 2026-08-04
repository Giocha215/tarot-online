import { forbidden, notFound } from "../../utils/errors.js";
import * as consultantRepo from "../consultants/consultant.repository.js";
import * as readingRepo from "./reading.repository.js";

/** Catálogo público de lecturas de una consultora (solo activas). */
export async function getPublicReadings(slug: string) {
  const rows = await readingRepo.listActiveBySlug(slug);
  return rows.map(readingRepo.toPublicReading);
}

/** Todas las lecturas de la asesora (incluye inactivas), para su panel. */
export async function getAdvisorReadings(userId: string) {
  const consultant = await consultantRepo.findByOwner(userId);
  if (!consultant) {
    throw forbidden("NOT_A_CONSULTANT", "Esta cuenta no es de asesora.");
  }
  const rows = await readingRepo.listByConsultant(consultant.id);
  return rows.map(readingRepo.toPublicReading);
}

/** La asesora cambia precio/disponibilidad de una de sus lecturas. */
export async function updateAdvisorReading(
  userId: string,
  id: string,
  priceCents: number,
  active: boolean,
) {
  const consultant = await consultantRepo.findByOwner(userId);
  if (!consultant) {
    throw forbidden("NOT_A_CONSULTANT", "Esta cuenta no es de asesora.");
  }
  const updated = await readingRepo.updateReading(
    consultant.id,
    id,
    priceCents,
    active,
  );
  if (!updated) throw notFound("READING_NOT_FOUND", "Lectura no encontrada.");
  return readingRepo.toPublicReading(updated);
}
