import { Router } from "express";
import { query } from "../../db/pool.js";
import { authenticate, optionalAuth } from "../../middleware/authenticate.js";
import * as userRepo from "../auth/user.repository.js";
import { getRechargePriceCents } from "../settings/settings.repository.js";

export const servicesRouter = Router();

// Precio por hora de la recarga (público, para mostrarlo en el modal).
servicesRouter.get("/recharge-price", async (_req, res, next) => {
  try {
    res.json({ pricePerHourCents: await getRechargePriceCents() });
  } catch (err) {
    next(err);
  }
});

interface ServiceRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  channel: string;
  price_cents_min: number;
}

/**
 * Catálogo público, pero con `optionalAuth`: si hay sesión se marca cuáles
 * puede pagar el usuario con su saldo actual.
 */
servicesRouter.get("/", optionalAuth, async (req, res, next) => {
  try {
    const { rows } = await query<ServiceRow>(
      `SELECT id, slug, name, description, channel, price_cents_min
         FROM services WHERE is_active = TRUE ORDER BY price_cents_min ASC`,
    );

    let balanceCents: number | null = null;
    if (req.user) {
      const user = await userRepo.findById(req.user.sub);
      balanceCents = user?.balance_cents ?? null;
    }

    res.json({
      services: rows.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        description: s.description,
        channel: s.channel,
        priceCentsPerMinute: s.price_cents_min,
        affordable:
          balanceCents === null ? null : balanceCents >= s.price_cents_min,
      })),
      authenticated: Boolean(req.user),
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Datos del dashboard: solo con sesión válida. Es el endpoint que prueba de
 * punta a punta que el access token llega y se verifica.
 */
servicesRouter.get("/dashboard", authenticate, async (req, res, next) => {
  try {
    const user = await userRepo.findById(req.user!.sub);
    if (!user) {
      res.status(404).json({
        error: { code: "USER_NOT_FOUND", message: "Usuario no encontrado." },
      });
      return;
    }

    const { rows: services } = await query<ServiceRow>(
      `SELECT id, slug, name, description, channel, price_cents_min
         FROM services WHERE is_active = TRUE ORDER BY price_cents_min ASC`,
    );

    res.json({
      user: userRepo.toPublicUser(user),
      // Placeholder: cuando exista la tabla de consultas, sale de ahí.
      consultations: [],
      availableServices: services.map((s) => ({
        slug: s.slug,
        name: s.name,
        channel: s.channel,
        priceCentsPerMinute: s.price_cents_min,
        minutesAffordable:
          s.price_cents_min > 0
            ? Math.floor(user.balance_cents / s.price_cents_min)
            : 0,
      })),
    });
  } catch (err) {
    next(err);
  }
});
