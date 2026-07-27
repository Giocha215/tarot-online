# Cómo crear tu cuenta de Stripe (paso a paso, sencillo)

Hola 👋 Esto es para configurar los pagos de la página. Está pensado para
hacerlo sin saber de tecnología. Son dos fases: primero una **rápida** (para
que empecemos a montarlo) y luego la de **activación** (cuando ya quieras
recibir dinero de verdad).

> Video de apoyo (español): https://www.youtube.com/watch?v=RQNvW2DVQmg

---

## FASE 1 — Crear la cuenta (rápido, ~10 minutos)

Esto **no** cobra nada ni necesita tu banco todavía. Sirve para que el
desarrollador pueda montar los pagos en modo prueba.

1. Entra en **https://dashboard.stripe.com/register**
2. Escribe tu **correo**, tu **nombre** y una **contraseña**. Pulsa continuar.
3. **País de la cuenta**: elige **Portugal**. (Importante: así se activan los
   pagos portugueses como Multibanco y MB Way.)
4. Revisa tu correo y **verifica** el email (Stripe te envía un enlace).
5. Activa la **verificación en dos pasos (2FA)** si te lo pide — es por
   seguridad, se hace con tu móvil.

### Lo que tienes que enviarme (solo esto)

6. Dentro de Stripe, arriba, comprueba que estás en **modo Prueba / Test**
   (hay un interruptor "Test mode").
7. Ve al menú **Desarrolladores** (Developers) → **Claves de API** (API keys).
8. Verás una **"Clave secreta" (Secret key)** que empieza por **`sk_test_...`**.
   Pulsa **Revelar** y **copia** esa clave.
9. Envíamela. **Solo la de prueba (`sk_test_...`)**. Con eso ya monto los pagos.

> ⚠️ Seguridad: la clave que empieza por `sk_test_` es de prueba y no mueve
> dinero real. **No** compartas nunca la clave que empieza por `sk_live_`
> (esa es la real) por chat/correo abierto — esa la pondremos juntos y en
> privado cuando pasemos a cobros de verdad.

---

## FASE 2 — Activar para cobrar de verdad (cuando estéis listos)

Esto se hace **después**, cuando ya queráis recibir pagos reales. Ten a mano:

- **NIF** (número de contribuinte).
- **IBAN** de tu cuenta bancaria (ahí llega el dinero de las consultas).
- **Documento de identidad**, dirección y teléfono.

Pasos:

1. En Stripe, pulsa **"Activa tu cuenta"** (Activate account).
2. Rellena los datos del negocio y personales que te pide.
3. Añade tu **IBAN** para recibir los pagos.
4. Sube la verificación de identidad si la solicita.

Cuando esté activada, me pasas (en privado) la clave **`sk_live_...`** y
cambiamos de modo prueba a real. **No cambia nada de la página**, solo esa clave.

---

## Resumen de qué me envías

| Cuándo | Qué | Para qué |
| ------ | --- | -------- |
| Ahora (Fase 1) | La clave **`sk_test_...`** | Montar los pagos en modo prueba |
| Al ir a producción (Fase 2) | La clave **`sk_live_...`** (en privado) | Cobros reales |

Cualquier duda en algún paso, manda una captura de pantalla y te ayudo.
