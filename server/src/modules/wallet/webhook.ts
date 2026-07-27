import type { Request, Response } from "express";
import {
  constructWebhookEvent,
  handleWebhookEvent,
} from "./stripe.service.js";

/**
 * Endpoint del webhook de Stripe. Verifica la firma con el cuerpo en crudo y,
 * si es válida, procesa el evento (acredita el saldo al confirmarse el pago).
 * Responde 200 rápido para que Stripe no reintente.
 */
export async function stripeWebhookHandler(
  req: Request,
  res: Response,
): Promise<void> {
  const signature = req.headers["stripe-signature"];
  if (!signature || typeof signature !== "string") {
    res.status(400).send("Falta la firma de Stripe.");
    return;
  }

  let event;
  try {
    // req.body es un Buffer porque la ruta usa express.raw.
    event = constructWebhookEvent(req.body as Buffer, signature);
  } catch (err) {
    console.error("[stripe] firma de webhook inválida:", err);
    res.status(400).send("Firma inválida.");
    return;
  }

  try {
    await handleWebhookEvent(event);
    res.json({ received: true });
  } catch (err) {
    console.error("[stripe] error procesando webhook:", err);
    // 500 para que Stripe reintente el evento.
    res.status(500).send("Error procesando el evento.");
  }
}
