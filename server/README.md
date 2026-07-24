# Tarot Online — API de autenticación

Backend Express + PostgreSQL para el módulo de usuarios: registro, login,
sesiones con JWT y acceso a servicios.

## Puesta en marcha

```bash
cd server
npm install
cp .env.example .env      # rellena DATABASE_URL y JWT_SECRET
npm run migrate           # crea las tablas
npm run dev               # http://localhost:4000
```

Genera un `JWT_SECRET` de verdad:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Pruebas

Las de integración necesitan una base de datos **desechable** (borran filas):

```bash
createdb tarot_test
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tarot_test npm test
```

O con Docker:

```bash
docker run -d --name tarot-test-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=tarot_test -p 55432:5432 postgres:16-alpine
```

## Endpoints

| Método | Ruta                        | Auth   | Descripción                          |
| ------ | --------------------------- | ------ | ------------------------------------ |
| POST   | `/api/auth/register`        | —      | Crea cuenta. `201` + access token    |
| POST   | `/api/auth/login`           | —      | Inicia sesión. `200` + access token  |
| POST   | `/api/auth/refresh`         | cookie | Rota la sesión. `200`                |
| POST   | `/api/auth/logout`          | cookie | Revoca la sesión actual. `204`       |
| POST   | `/api/auth/logout-all`      | Bearer | Cierra todos los dispositivos. `204` |
| GET    | `/api/auth/me`              | Bearer | Perfil del usuario                   |
| POST   | `/api/auth/change-password` | Bearer | Cambia contraseña. `204`             |
| GET    | `/api/services`             | opc.   | Catálogo público                     |
| GET    | `/api/services/dashboard`   | Bearer | Datos del panel                      |

Los errores siempre tienen la forma:

```json
{ "error": { "code": "AUTH_INVALID_CREDENTIALS", "message": "...", "details": {} } }
```

El frontend debe leer `code` (estable), no `message` (traducible).

## Modelo de sesión

- **Access token**: JWT HS256, 15 min, viaja en `Authorization: Bearer`.
  El cliente lo guarda **en memoria**, nunca en `localStorage`.
- **Refresh token**: 32 bytes aleatorios (no es un JWT: así se puede revocar
  de verdad). Cookie `httpOnly` + `SameSite`, `Path=/api/auth`. En la base de
  datos solo vive su SHA-256.
- **Rotación**: cada `/refresh` revoca el token usado y emite otro. Si aparece
  un token ya revocado se asume robo y se revoca **toda la familia** de esa
  sesión.

## Desarrollo local con Docker

```bash
docker run -d --name tarot-pg --restart unless-stopped \
  -e POSTGRES_USER=tarot -e POSTGRES_PASSWORD=tarot_dev_pw -e POSTGRES_DB=tarot \
  -p 5434:5432 -v tarot_pgdata:/var/lib/postgresql/data postgres:16-alpine
```

En `.env`:

```
DATABASE_URL=postgresql://tarot:tarot_dev_pw@localhost:5434/tarot
DATABASE_SSL=false
```

El puerto es 5434 y no 5432 para no chocar con otros Postgres que ya
tengas corriendo.

## Despliegue en Railway

1. Servicio nuevo desde el repo de GitHub.
2. *Settings → Root Directory*: `server`. Sin esto Railway intenta
   construir el frontend Next.js de la raíz y falla.
3. Variables (*Settings → Variables*):

   | Variable        | Valor                                    |
   | --------------- | ---------------------------------------- |
   | `DATABASE_URL`  | `${{Postgres.DATABASE_URL}}` (referencia) |
   | `DATABASE_SSL`  | `true`                                    |
   | `JWT_SECRET`    | secreto propio, ver arriba                |
   | `NODE_ENV`      | `production`                              |
   | `CORS_ORIGIN`   | la URL del frontend, sin barra final      |

   `PORT` lo inyecta Railway solo; no lo definas a mano.

4. *Networking → Generate Domain* para obtener la URL pública.
5. En el frontend, `NEXT_PUBLIC_API_URL` apuntando a ese dominio.

`npm start` aplica las migraciones pendientes al arrancar. Con varias
réplicas simultáneas conviene moverlo a un paso de release aparte, para que
no compitan por aplicar la misma migración.

Con frontend y API en dominios distintos la cookie sale con
`SameSite=None; Secure`, que exige HTTPS en ambos. `CORS_ORIGIN` debe
coincidir **exactamente** con el origen del navegador: si no, el navegador
descarta la cookie sin avisar y el login parece funcionar pero la sesión no
sobrevive al refresco.
