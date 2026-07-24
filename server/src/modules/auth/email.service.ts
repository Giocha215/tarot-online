import { env } from "../../config/env.js";

/**
 * Envío de correo. Con RESEND_API_KEY manda de verdad vía Resend; sin ella,
 * modo demo: no envía nada y el enlace se muestra en pantalla (el caller lo
 * devuelve en la respuesta).
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  if (!env.emailEnabled) {
    // Modo demo: se registra en el log; el enlace se devuelve al frontend.
    console.log(`[email:demo] recuperación para ${to}: ${resetUrl}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [to],
      subject: "Recupera tu contraseña — Tarot Online",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto">
          <h2 style="color:#2f7d4f">Recupera tu contraseña</h2>
          <p>Pediste restablecer tu contraseña. Pulsa el botón para elegir una nueva:</p>
          <p style="text-align:center;margin:28px 0">
            <a href="${resetUrl}" style="background:#2f7d4f;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none">
              Restablecer contraseña
            </a>
          </p>
          <p style="color:#777;font-size:13px">
            Si no fuiste tú, ignora este correo. El enlace caduca en ${env.RESET_TOKEN_TTL_MIN} minutos.
          </p>
        </div>`,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 200)}`);
  }
}
