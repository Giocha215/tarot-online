import Stripe from "stripe";
import { env } from "../../config/env.js";
import { withTransaction } from "../../db/pool.js";
import * as walletRepo from "./wallet.repository.js";

/** Cliente Stripe (solo si hay clave). Usa la versión de API del SDK. */
export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY)
  : null;

/**
 * Crea una sesión de Stripe Checkout para recargar `amountCents` de saldo.
 * Devuelve la URL a la que redirigir al usuario. El saldo NO se acredita aquí:
 * se acredita en el webhook cuando el pago se confirma.
 */
export async function createTopupCheckout(params: {
  userId: string;
  amountCents: number;
}): Promise<string> {
  if (!stripe) throw new Error("Stripe no está configurado.");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    // Métodos disponibles según el país de la cuenta (tarjetas, y en cuentas
    // de Portugal también Multibanco/MB Way) los decide Stripe automáticamente.
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: params.amountCents,
          product_data: { name: "Recarga de saldo — Tarot Online" },
        },
      },
    ],
    // El saldo a acreditar viaja en metadata; el webhook lo lee.
    metadata: { userId: params.userId, amountCents: String(params.amountCents) },
    payment_intent_data: {
      metadata: { userId: params.userId, amountCents: String(params.amountCents) },
    },
    success_url: `${env.APP_URL}/dashboard?recarga=ok`,
    cancel_url: `${env.APP_URL}/dashboard?recarga=cancel`,
  });

  if (!session.url) throw new Error("Stripe no devolvió URL de Checkout.");
  return session.url;
}

/**
 * Procesa un evento de webhook ya verificado. Acredita el saldo cuando un
 * Checkout se completa. Idempotente: si ese `session.id` ya se acreditó, no
 * hace nada (Stripe puede reenviar el mismo evento).
 */
export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  if (event.type !== "checkout.session.completed") return;

  const session = event.data.object as Stripe.Checkout.Session;
  // Solo pagos realmente pagados.
  if (session.payment_status !== "paid") return;

  const userId = session.metadata?.userId;
  const amountCents = Number(session.metadata?.amountCents ?? 0);
  if (!userId || !Number.isFinite(amountCents) || amountCents <= 0) return;

  const reference = `stripe:${session.id}`;

  await withTransaction(async (client) => {
    // Idempotencia: ¿ya hay un movimiento con esta referencia?
    if (await walletRepo.hasTransactionRef(client, reference)) return;
    await walletRepo.applyTransaction(client, {
      userId,
      amountCents,
      kind: "topup",
      reference,
    });
  });
}

/** Verifica la firma del webhook y devuelve el evento tipado. */
export function constructWebhookEvent(
  rawBody: Buffer,
  signature: string,
): Stripe.Event {
  if (!stripe) throw new Error("Stripe no está configurado.");
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    env.STRIPE_WEBHOOK_SECRET,
  );
}
