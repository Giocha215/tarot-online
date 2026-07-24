# Tarot Online — Demo

Plataforma de consultas de tarot: sitio web con tiradas interactivas,
cuentas de usuario y videollamada con consultora. Versión de demostración.

> Basado visualmente en tarot-online.com.pt, con desarrollo propio del
> backend, la autenticación y el flujo de videollamada.

## Qué incluye

- **Sitio (Next.js 15 + Tailwind)** — multi-idioma (PT / ES / EN), tema
  verde, selector de tiradas con cartas reales (baraja Rider-Waite, dominio
  público) y animación de barajado.
- **Registro y login (JWT)** — access token en memoria + refresh en cookie
  httpOnly con rotación y detección de reuso. Contraseñas con bcrypt.
- **Videollamada (demo)** — botón en la tarjeta de consultora → login →
  validación de saldo y disponibilidad → sala **embebida en la página**
  (Jitsi Meet) con **temporizador** → cierre y facturación.
- **Saldo e historial** — recarga en modo demo (sin pasarela real) e
  historial de sesiones en el panel del usuario.
- **Tiempo real** — WebSockets para el estado de las consultoras.

## Arquitectura

```
/            Frontend Next.js (App Router)
/server      Backend Express + PostgreSQL
```

| Capa     | Stack                                             |
| -------- | ------------------------------------------------- |
| Frontend | Next.js 15, React 18, Tailwind, TypeScript        |
| Backend  | Express, PostgreSQL (pg), JWT, bcrypt, Zod, ws    |
| Vídeo    | Jitsi Meet (demo) · Microsoft Teams (configurable)|
| Deploy   | Netlify (front) · Railway (API + Postgres)        |

## Puesta en marcha (local)

**1. Base de datos** (Docker):

```bash
docker run -d --name tarot-pg -e POSTGRES_USER=tarot -e POSTGRES_PASSWORD=tarot_dev_pw -e POSTGRES_DB=tarot -p 5434:5432 postgres:16-alpine
```

**2. Backend:**

```bash
cd server
npm install
cp .env.example .env      # rellena JWT_SECRET y DATABASE_URL
npm run migrate
npm run dev               # http://localhost:4000
```

**3. Frontend** (en otra terminal, desde la raíz):

```bash
npm install
echo NEXT_PUBLIC_API_URL=http://localhost:4000 > .env.local
npm run dev               # http://localhost:3005
```

Detalles del backend y del despliegue en [`server/README.md`](server/README.md).

## Pruebas

```bash
cd server && npm test     # 60 tests (unitarios + integración con Postgres)
```

## Estado

Versión inicial (`v0.1.0`). En modo demo: la recarga de saldo no cobra de
verdad y la videollamada usa Jitsi. Para producción quedan pendientes la
pasarela de pago (Stripe) y, si se quiere Teams, la integración con
Microsoft Graph.
