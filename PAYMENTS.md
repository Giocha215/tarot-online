# Pasarela de pago — investigación e implementación

Objetivo: cobrar recargas de saldo (con las que el cliente paga las consultas
por minuto) en **Europa y Portugal**, pero también desde **cualquier parte del
mundo**.

## Comparativa de proveedores

| Proveedor | Mundial (tarjetas) | Europa (SEPA/iDEAL…) | Portugal (Multibanco / MB Way) | SCA/PSD2 | Facilidad | Notas |
| --------- | ------------------ | -------------------- | ------------------------------ | -------- | --------- | ----- |
| **Stripe** | ✅ Visa/MC/Amex, Apple/Google Pay | ✅ SEPA, iDEAL, Bancontact… | ✅ Multibanco · ✅ MB Way | ✅ integrado | ⭐ La mejor doc | **Recomendado** |
| **Mollie** | ✅ | ✅ | ✅ Multibanco · ✅ MB Way | ✅ | ⭐ Muy simple | Muy fuerte en PT; menos alcance global que Stripe |
| **PayPal** | ✅ | Parcial | ❌ nativo | ✅ | ⭐ | Buen método secundario; comisiones altas |
| **Adyen** | ✅ | ✅ | ✅ | ✅ | Compleja | Enterprise / a gran escala |
| **Easypay / IfThenPay / SIBS** | Limitado | Limitado | ✅ excelente | ✅ | Media | Locales PT; ideal Multibanco/MB Way pero poco global |

### Recomendación

**Stripe** como pasarela principal. Con una sola integración cubre:
- Tarjetas de **todo el mundo** + Apple Pay / Google Pay.
- Métodos europeos (SEPA, iDEAL…).
- **Multibanco y MB Way** de Portugal.
- **SCA / 3-D Secure** (obligatorio en la UE por PSD2) resuelto de serie.
- Mejor documentación y modo de pruebas.

> Confirma en tu panel de Stripe que MB Way/Multibanco están disponibles para
> el país de tu cuenta (Portugal) al activarla.

Opcional: añadir **Mollie** más adelante si quieres la experiencia más nativa
portuguesa. Con Stripe solo, ya está todo cubierto.

## Cómo encaja con la app

La app ya tiene la estructura lista:
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` en la configuración.
- `env.stripeEnabled` y la recarga en **modo demo** (acredita sin cobrar).
  Solo hay que sustituir el demo por Stripe Checkout + webhook.

## Plan de implementación (Stripe Checkout)

1. **Cuenta Stripe**: crear en stripe.com, activar (datos del negocio + cuenta
   bancaria portuguesa para los pagos). Obtener claves API (test y live).
2. **Activar métodos** en el panel de Stripe: tarjetas, Multibanco, MB Way,
   SEPA, Apple/Google Pay.
3. **Backend**:
   - `POST /api/wallet/checkout` (con sesión): crea una *Checkout Session* de
     Stripe por el importe elegido y devuelve su URL. El usuario paga en la
     página alojada de Stripe (gestiona SCA y todos los métodos).
   - `POST /api/webhooks/stripe`: recibe `checkout.session.completed`, verifica
     la firma con `STRIPE_WEBHOOK_SECRET` y **acredita el saldo** (la versión
     real del topup demo). Idempotente: se guardan los `event.id` procesados
     para no acreditar dos veces.
4. **Frontend**: el botón **"Recargar"** abre la URL de Checkout. Al volver, se
   muestra éxito; el saldo se actualiza vía webhook.
5. **Cumplimiento**: SCA lo resuelve Checkout. Añadir Términos/Privacidad,
   IVA si aplica (Stripe Tax) y política de reembolsos.
6. **Pruebas**: modo test de Stripe + tarjetas de prueba + Multibanco/MB Way de
   prueba.

## Documentación de referencia

- Checkout: https://stripe.com/docs/payments/checkout
- Multibanco: https://stripe.com/docs/payments/multibanco
- MB Way: https://stripe.com/docs/payments/mb-way
- Webhooks: https://stripe.com/docs/webhooks
- SCA/PSD2: https://stripe.com/docs/strong-customer-authentication
- Precios: https://stripe.com/en-pt/pricing

## Qué necesito de ti para implementarlo

- Cuenta de Stripe con **claves de prueba** (secret key + webhook secret).
- Importes/paquetes de recarga que quieras ofrecer (p. ej. 10 €, 20 €, 50 €).

Con eso, sustituyo el modo demo por Stripe real: Checkout para pagar y webhook
para acreditar el saldo. Empezamos en **modo test** (sin cobros reales) y, cuando
esté validado, se pasa a **live**.
