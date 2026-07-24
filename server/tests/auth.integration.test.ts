import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { runMigrations } from "../src/db/migrate.js";
import { pool, query } from "../src/db/pool.js";

/**
 * Pruebas de integración de punta a punta contra Postgres real.
 *
 * Requisitos:
 *   createdb tarot_test
 *   TEST_DATABASE_URL=postgresql://... npm test
 */

let app: Express;

const VALID = {
  email: "ana.silva@example.com",
  password: "tarot-2026-luna",
  displayName: "Ana Silva",
};

/** Extrae el valor de la cookie de refresh de la cabecera Set-Cookie. */
function getRefreshCookie(res: request.Response): string | undefined {
  const raw = res.headers["set-cookie"];
  const cookies = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return cookies.find((c) => c.startsWith("tarot_rt="));
}

beforeAll(async () => {
  await runMigrations();
  app = createApp();
});

afterAll(async () => {
  await query("DELETE FROM users WHERE email LIKE '%@example.com'");
  await pool.end();
});

beforeEach(async () => {
  // ON DELETE CASCADE se lleva por delante los refresh_tokens asociados.
  await query("DELETE FROM users WHERE email LIKE '%@example.com'");
});

// ------------------------------------------------------------------
describe("POST /api/auth/register", () => {
  it("crea la cuenta, devuelve 201 con access token y cookie de refresh", async () => {
    const res = await request(app).post("/api/auth/register").send(VALID);

    expect(res.status).toBe(201);
    expect(res.body.user).toMatchObject({
      email: VALID.email,
      displayName: VALID.displayName,
      role: "client",
      balanceCents: 0,
    });
    expect(res.body.accessToken).toEqual(expect.any(String));

    const cookie = getRefreshCookie(res);
    expect(cookie).toBeDefined();
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Path=/api/auth");
  });

  it("NUNCA devuelve el hash de la contraseña", async () => {
    const res = await request(app).post("/api/auth/register").send(VALID);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain("password");
    expect(body).not.toContain("$2");           // prefijo de hash bcrypt
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it("guarda la contraseña hasheada, jamás en claro", async () => {
    await request(app).post("/api/auth/register").send(VALID);
    const { rows } = await query<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE email = $1",
      [VALID.email],
    );
    expect(rows[0]!.password_hash).not.toBe(VALID.password);
    expect(rows[0]!.password_hash).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  it("rechaza email duplicado con 409 AUTH_EMAIL_TAKEN", async () => {
    await request(app).post("/api/auth/register").send(VALID);
    const res = await request(app).post("/api/auth/register").send(VALID);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("AUTH_EMAIL_TAKEN");
  });

  it("trata el email como case-insensitive para la unicidad", async () => {
    await request(app).post("/api/auth/register").send(VALID);
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...VALID, email: "Ana.Silva@EXAMPLE.com" });

    expect(res.status).toBe(409);
  });

  it("devuelve 400 con detalle por campo si los datos no son válidos", async () => {
    const res = await request(app).post("/api/auth/register").send({
      email: "no-es-un-email",
      password: "corta",
      displayName: "",
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toHaveProperty("email");
    expect(res.body.error.details).toHaveProperty("password");
    expect(res.body.error.details).toHaveProperty("displayName");
  });

  it("ignora campos que el cliente intente colar (role, balance)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ ...VALID, role: "admin", balanceCents: 999_999 });

    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("client");
    expect(res.body.user.balanceCents).toBe(0);
  });
});

// ------------------------------------------------------------------
describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/register").send(VALID);
  });

  it("acepta credenciales correctas", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: VALID.email, password: VALID.password });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.user.email).toBe(VALID.email);
    expect(getRefreshCookie(res)).toBeDefined();
  });

  it("acepta el email en cualquier combinación de mayúsculas", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ANA.SILVA@example.COM", password: VALID.password });

    expect(res.status).toBe(200);
  });

  it("rechaza contraseña incorrecta con 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: VALID.email, password: "contrasena-erronea" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_INVALID_CREDENTIALS");
  });

  it("no revela si el email existe: misma respuesta en ambos casos", async () => {
    const noExiste = await request(app)
      .post("/api/auth/login")
      .send({ email: "nadie@example.com", password: VALID.password });
    const malaPass = await request(app)
      .post("/api/auth/login")
      .send({ email: VALID.email, password: "contrasena-erronea" });

    expect(noExiste.status).toBe(malaPass.status);
    expect(noExiste.body.error.code).toBe(malaPass.body.error.code);
    expect(noExiste.body.error.message).toBe(malaPass.body.error.message);
  });
});

// ------------------------------------------------------------------
describe("GET /api/auth/me", () => {
  it("devuelve el perfil con un access token válido", async () => {
    const reg = await request(app).post("/api/auth/register").send(VALID);
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${reg.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(VALID.email);
  });

  it("401 sin cabecera Authorization", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_TOKEN_MISSING");
  });

  it("401 con token corrupto", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer no.es.un.jwt");

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_TOKEN_INVALID");
  });

  it("401 si el esquema no es Bearer", async () => {
    const reg = await request(app).post("/api/auth/register").send(VALID);
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Basic ${reg.body.accessToken}`);

    expect(res.status).toBe(401);
  });
});

// ------------------------------------------------------------------
describe("POST /api/auth/refresh — rotación", () => {
  it("emite un token nuevo y rota el de refresh", async () => {
    const reg = await request(app).post("/api/auth/register").send(VALID);
    const cookie = getRefreshCookie(reg)!;

    const res = await request(app).post("/api/auth/refresh").set("Cookie", cookie);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toEqual(expect.any(String));

    const nuevaCookie = getRefreshCookie(res);
    expect(nuevaCookie).toBeDefined();
    expect(nuevaCookie).not.toBe(cookie); // rotó de verdad
  });

  it("detecta reuso: el token viejo revoca toda la familia", async () => {
    const reg = await request(app).post("/api/auth/register").send(VALID);
    const cookieVieja = getRefreshCookie(reg)!;

    const rot = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieVieja);
    const cookieNueva = getRefreshCookie(rot)!;

    // Un atacante reutiliza la cookie ya rotada.
    const reuso = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieVieja);
    expect(reuso.status).toBe(401);
    expect(reuso.body.error.code).toBe("AUTH_REFRESH_REUSED");

    // Y la sesión legítima también queda invalidada: es lo correcto.
    const legitima = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookieNueva);
    expect(legitima.status).toBe(401);
  });

  it("401 sin cookie", async () => {
    const res = await request(app).post("/api/auth/refresh");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("AUTH_REFRESH_INVALID");
  });
});

// ------------------------------------------------------------------
describe("POST /api/auth/logout", () => {
  it("invalida el refresh token y limpia la cookie", async () => {
    const reg = await request(app).post("/api/auth/register").send(VALID);
    const cookie = getRefreshCookie(reg)!;

    const out = await request(app).post("/api/auth/logout").set("Cookie", cookie);
    expect(out.status).toBe(204);

    const despues = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", cookie);
    expect(despues.status).toBe(401);
  });

  it("es idempotente: sin cookie también responde 204", async () => {
    const res = await request(app).post("/api/auth/logout");
    expect(res.status).toBe(204);
  });
});

// ------------------------------------------------------------------
describe("POST /api/auth/change-password", () => {
  it("cambia la contraseña y cierra todas las sesiones", async () => {
    const reg = await request(app).post("/api/auth/register").send(VALID);
    const cookie = getRefreshCookie(reg)!;
    const nueva = "nueva-clave-2026";

    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${reg.body.accessToken}`)
      .send({ currentPassword: VALID.password, newPassword: nueva });
    expect(res.status).toBe(204);

    // La antigua ya no sirve, la nueva sí.
    const vieja = await request(app)
      .post("/api/auth/login")
      .send({ email: VALID.email, password: VALID.password });
    expect(vieja.status).toBe(401);

    const ok = await request(app)
      .post("/api/auth/login")
      .send({ email: VALID.email, password: nueva });
    expect(ok.status).toBe(200);

    // Y el refresh anterior quedó revocado.
    const rt = await request(app).post("/api/auth/refresh").set("Cookie", cookie);
    expect(rt.status).toBe(401);
  });

  it("401 si la contraseña actual es incorrecta", async () => {
    const reg = await request(app).post("/api/auth/register").send(VALID);
    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${reg.body.accessToken}`)
      .send({ currentPassword: "no-es-esta", newPassword: "nueva-clave-2026" });

    expect(res.status).toBe(401);
  });
});

// ------------------------------------------------------------------
describe("acceso a servicios (dashboard)", () => {
  it("el catálogo público es accesible sin sesión", async () => {
    const res = await request(app).get("/api/services");
    expect(res.status).toBe(200);
    expect(res.body.authenticated).toBe(false);
    expect(res.body.services.length).toBeGreaterThan(0);
    // Sin sesión no se puede saber si es asequible.
    expect(res.body.services[0].affordable).toBeNull();
  });

  it("/dashboard exige sesión", async () => {
    const res = await request(app).get("/api/services/dashboard");
    expect(res.status).toBe(401);
  });

  it("/dashboard devuelve datos del usuario autenticado", async () => {
    const reg = await request(app).post("/api/auth/register").send(VALID);
    const res = await request(app)
      .get("/api/services/dashboard")
      .set("Authorization", `Bearer ${reg.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(VALID.email);
    expect(Array.isArray(res.body.availableServices)).toBe(true);
    // Saldo 0 => 0 minutos en cualquier servicio de pago.
    expect(res.body.availableServices[0].minutesAffordable).toBe(0);
  });
});

// ------------------------------------------------------------------
describe("flujo completo registro → login → servicios → logout", () => {
  it("funciona de punta a punta", async () => {
    // 1. Registro
    const reg = await request(app).post("/api/auth/register").send(VALID);
    expect(reg.status).toBe(201);

    // 2. Login desde otro "dispositivo"
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: VALID.email, password: VALID.password });
    expect(login.status).toBe(200);
    const cookie = getRefreshCookie(login)!;

    // 3. Acceso a un servicio protegido
    const dash = await request(app)
      .get("/api/services/dashboard")
      .set("Authorization", `Bearer ${login.body.accessToken}`);
    expect(dash.status).toBe(200);

    // 4. Renovación de sesión
    const ref = await request(app).post("/api/auth/refresh").set("Cookie", cookie);
    expect(ref.status).toBe(200);

    // 5. El access token nuevo sigue abriendo el dashboard
    const dash2 = await request(app)
      .get("/api/services/dashboard")
      .set("Authorization", `Bearer ${ref.body.accessToken}`);
    expect(dash2.status).toBe(200);

    // 6. Logout cierra la sesión
    const nuevaCookie = getRefreshCookie(ref)!;
    await request(app).post("/api/auth/logout").set("Cookie", nuevaCookie);
    const tras = await request(app)
      .post("/api/auth/refresh")
      .set("Cookie", nuevaCookie);
    expect(tras.status).toBe(401);
  });
});
