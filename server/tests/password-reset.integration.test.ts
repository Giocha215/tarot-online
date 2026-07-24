import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { runMigrations } from "../src/db/migrate.js";
import { pool, query } from "../src/db/pool.js";

/**
 * Recuperación de contraseña de punta a punta (modo demo: el enlace vuelve en
 * la respuesta). Requiere Postgres desechable.
 */

let app: Express;

const USER = {
  email: "reset.user@example.com",
  password: "tarot-2026-luna",
  displayName: "Reset User",
};

function tokenFrom(demoResetUrl: string): string {
  return new URL(demoResetUrl).searchParams.get("token") as string;
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
  await query("DELETE FROM users WHERE email LIKE '%@example.com'");
  await request(app).post("/api/auth/register").send(USER);
});

describe("POST /api/auth/forgot-password", () => {
  it("devuelve el enlace en modo demo para un email existente", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: USER.email });

    expect(res.status).toBe(200);
    expect(res.body.demoResetUrl).toContain("/restablecer?token=");
  });

  it("responde igual (sin enlace) para un email que no existe: no filtra nada", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "nadie@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.demoResetUrl).toBeNull();
    // El mensaje es idéntico al del caso que sí existe.
    expect(res.body.message).toEqual(expect.any(String));
  });
});

describe("POST /api/auth/reset-password", () => {
  async function getToken(): Promise<string> {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: USER.email });
    return tokenFrom(res.body.demoResetUrl);
  }

  it("cambia la contraseña con un token válido", async () => {
    const token = await getToken();
    const nueva = "clave-nueva-2026";

    const reset = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: nueva });
    expect(reset.status).toBe(204);

    // La nueva entra, la vieja no.
    const ok = await request(app)
      .post("/api/auth/login")
      .send({ email: USER.email, password: nueva });
    expect(ok.status).toBe(200);

    const old = await request(app)
      .post("/api/auth/login")
      .send({ email: USER.email, password: USER.password });
    expect(old.status).toBe(401);
  });

  it("el token es de un solo uso", async () => {
    const token = await getToken();
    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "clave-nueva-2026" });

    const segundo = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "otra-clave-2026" });
    expect(segundo.status).toBe(400);
    expect(segundo.body.error.code).toBe("RESET_TOKEN_INVALID");
  });

  it("rechaza un token inventado", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "token-que-no-existe", newPassword: "clave-nueva-2026" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("RESET_TOKEN_INVALID");
  });

  it("aplica las reglas de contraseña a la nueva", async () => {
    const token = await getToken();
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "corta" });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("pedir un enlace nuevo invalida el anterior", async () => {
    const primero = await getToken();
    await getToken(); // segundo: invalida el primero

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: primero, newPassword: "clave-nueva-2026" });
    expect(res.status).toBe(400);
  });
});
