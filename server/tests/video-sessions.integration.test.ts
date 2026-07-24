import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { runMigrations } from "../src/db/migrate.js";
import { pool, query } from "../src/db/pool.js";

/**
 * Flujo de videollamada de punta a punta: login → saldo → disponibilidad →
 * iniciar → temporizador → terminar → facturación.
 *
 * Requiere Postgres desechable, igual que auth.integration.test.ts.
 */

let app: Express;

const USER = {
  email: "video.user@example.com",
  password: "tarot-2026-luna",
  displayName: "Video User",
};

async function registerAndLogin(): Promise<{ token: string; userId: string }> {
  const res = await request(app).post("/api/auth/register").send(USER);
  return { token: res.body.accessToken, userId: res.body.user.id };
}

async function setBalance(userId: string, cents: number) {
  await query("UPDATE users SET balance_cents = $2 WHERE id = $1", [
    userId,
    cents,
  ]);
}

async function resetConsultant(slug: string, status = "online") {
  await query("UPDATE consultants SET status = $2 WHERE slug = $1", [
    slug,
    status,
  ]);
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
  // Las sesiones y movimientos cuelgan del usuario (ON DELETE CASCADE).
  await query("DELETE FROM users WHERE email LIKE '%@example.com'");
  await resetConsultant("carmen-oxeu", "online");
  await resetConsultant("scarlet-0bq4", "online");
});

// ------------------------------------------------------------------
describe("GET /api/consultants", () => {
  it("lista consultoras con su estado, sin sesión", async () => {
    const res = await request(app).get("/api/consultants");
    expect(res.status).toBe(200);
    expect(res.body.consultants.length).toBeGreaterThan(0);
    const carmen = res.body.consultants.find(
      (c: { slug: string }) => c.slug === "carmen-oxeu",
    );
    expect(carmen.available).toBe(true);
  });
});

// ------------------------------------------------------------------
describe("POST /api/sessions/start", () => {
  it("401 sin sesión iniciada", async () => {
    const res = await request(app)
      .post("/api/sessions/start")
      .send({ consultantSlug: "carmen-oxeu", durationMin: 30 });
    expect(res.status).toBe(401);
  });

  it("402 si el saldo no cubre la videollamada", async () => {
    const { token, userId } = await registerAndLogin();
    await setBalance(userId, 100); // 1,00 € — insuficiente para 30 min a 5€/min

    const res = await request(app)
      .post("/api/sessions/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ consultantSlug: "carmen-oxeu", durationMin: 30 });

    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe("INSUFFICIENT_BALANCE");
  });

  it("inicia la sesión, cobra por adelantado y marca a la consultora busy", async () => {
    const { token, userId } = await registerAndLogin();
    await setBalance(userId, 20_000); // 200 €

    const res = await request(app)
      .post("/api/sessions/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ consultantSlug: "carmen-oxeu", durationMin: 30 });

    expect(res.status).toBe(201);
    expect(res.body.sessionId).toEqual(expect.any(String));
    // 30 min × 500 c = 15 000 c cobrados; queda 5 000.
    expect(res.body.totalCents).toBe(15_000);
    expect(res.body.balanceCents).toBe(5_000);
    expect(new Date(res.body.expiresAt).getTime()).toBeGreaterThan(Date.now());

    // La consultora ya no está disponible.
    const list = await request(app).get("/api/consultants");
    const carmen = list.body.consultants.find(
      (c: { slug: string }) => c.slug === "carmen-oxeu",
    );
    expect(carmen.status).toBe("busy");
    expect(carmen.available).toBe(false);
  });

  it("rechaza a una segunda persona mientras la consultora está ocupada", async () => {
    const a = await registerAndLogin();
    await setBalance(a.userId, 20_000);
    await request(app)
      .post("/api/sessions/start")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ consultantSlug: "carmen-oxeu", durationMin: 30 });

    // Segundo usuario
    const bRes = await request(app).post("/api/auth/register").send({
      ...USER,
      email: "otro.video@example.com",
    });
    await setBalance(bRes.body.user.id, 20_000);

    const res = await request(app)
      .post("/api/sessions/start")
      .set("Authorization", `Bearer ${bRes.body.accessToken}`)
      .send({ consultantSlug: "carmen-oxeu", durationMin: 30 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONSULTANT_UNAVAILABLE");
  });

  it("404 si la consultora no existe", async () => {
    const { token, userId } = await registerAndLogin();
    await setBalance(userId, 20_000);
    const res = await request(app)
      .post("/api/sessions/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ consultantSlug: "no-existe", durationMin: 30 });
    expect(res.status).toBe(404);
  });

  it("400 con duración no permitida", async () => {
    const { token, userId } = await registerAndLogin();
    await setBalance(userId, 20_000);
    const res = await request(app)
      .post("/api/sessions/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ consultantSlug: "carmen-oxeu", durationMin: 17 });
    expect(res.status).toBe(400);
  });
});

// ------------------------------------------------------------------
describe("POST /api/sessions/:id/end", () => {
  it("termina la sesión y libera a la consultora", async () => {
    const { token, userId } = await registerAndLogin();
    await setBalance(userId, 20_000);
    const start = await request(app)
      .post("/api/sessions/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ consultantSlug: "carmen-oxeu", durationMin: 15 });

    const end = await request(app)
      .post(`/api/sessions/${start.body.sessionId}/end`)
      .set("Authorization", `Bearer ${token}`)
      .send({ reason: "completed" });

    expect(end.status).toBe(200);
    expect(end.body.ended).toBe(true);

    const list = await request(app).get("/api/consultants");
    const carmen = list.body.consultants.find(
      (c: { slug: string }) => c.slug === "carmen-oxeu",
    );
    expect(carmen.status).toBe("online");
  });

  it("no vuelve a cobrar al terminar (facturación por adelantado)", async () => {
    const { token, userId } = await registerAndLogin();
    await setBalance(userId, 20_000);
    const start = await request(app)
      .post("/api/sessions/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ consultantSlug: "carmen-oxeu", durationMin: 15 });

    const balanceTrasInicio = start.body.balanceCents; // 20000 - 7500 = 12500

    await request(app)
      .post(`/api/sessions/${start.body.sessionId}/end`)
      .set("Authorization", `Bearer ${token}`)
      .send();

    const { rows } = await query<{ balance_cents: number }>(
      "SELECT balance_cents FROM users WHERE id = $1",
      [userId],
    );
    expect(rows[0]!.balance_cents).toBe(balanceTrasInicio);
  });

  it("es idempotente: terminar dos veces no rompe nada", async () => {
    const { token, userId } = await registerAndLogin();
    await setBalance(userId, 20_000);
    const start = await request(app)
      .post("/api/sessions/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ consultantSlug: "carmen-oxeu", durationMin: 15 });

    const first = await request(app)
      .post(`/api/sessions/${start.body.sessionId}/end`)
      .set("Authorization", `Bearer ${token}`)
      .send();
    const second = await request(app)
      .post(`/api/sessions/${start.body.sessionId}/end`)
      .set("Authorization", `Bearer ${token}`)
      .send();

    expect(first.body.ended).toBe(true);
    expect(second.body.ended).toBe(false); // ya estaba cerrada
  });

  it("no deja terminar la sesión de otra persona", async () => {
    const a = await registerAndLogin();
    await setBalance(a.userId, 20_000);
    const start = await request(app)
      .post("/api/sessions/start")
      .set("Authorization", `Bearer ${a.token}`)
      .send({ consultantSlug: "carmen-oxeu", durationMin: 15 });

    const bRes = await request(app).post("/api/auth/register").send({
      ...USER,
      email: "intruso.video@example.com",
    });

    const res = await request(app)
      .post(`/api/sessions/${start.body.sessionId}/end`)
      .set("Authorization", `Bearer ${bRes.body.accessToken}`)
      .send();
    expect(res.status).toBe(404); // no es suya → como si no existiera
  });
});

// ------------------------------------------------------------------
describe("saldo e historial", () => {
  it("la recarga en modo demo acredita el saldo", async () => {
    const { token, userId } = await registerAndLogin();
    await setBalance(userId, 0);

    const res = await request(app)
      .post("/api/sessions/wallet/topup")
      .set("Authorization", `Bearer ${token}`)
      .send({ amountCents: 5_000 });

    expect(res.status).toBe(201);
    expect(res.body.balanceCents).toBe(5_000);
    expect(res.body.mode).toBe("demo");
  });

  it("rechaza recargas por encima del máximo demo", async () => {
    const { token } = await registerAndLogin();
    const res = await request(app)
      .post("/api/sessions/wallet/topup")
      .set("Authorization", `Bearer ${token}`)
      .send({ amountCents: 10_000_000 });
    expect(res.status).toBe(400);
  });

  it("el historial refleja las sesiones del usuario", async () => {
    const { token, userId } = await registerAndLogin();
    await setBalance(userId, 20_000);
    await request(app)
      .post("/api/sessions/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ consultantSlug: "carmen-oxeu", durationMin: 15 });

    const hist = await request(app)
      .get("/api/sessions")
      .set("Authorization", `Bearer ${token}`);

    expect(hist.status).toBe(200);
    expect(hist.body.sessions.length).toBe(1);
    expect(hist.body.sessions[0].consultantSlug).toBe("carmen-oxeu");
    expect(hist.body.sessions[0].status).toBe("active");
  });

  it("/active devuelve la sesión en curso para rehidratar el temporizador", async () => {
    const { token, userId } = await registerAndLogin();
    await setBalance(userId, 20_000);
    const start = await request(app)
      .post("/api/sessions/start")
      .set("Authorization", `Bearer ${token}`)
      .send({ consultantSlug: "scarlet-0bq4", durationMin: 30 });

    const active = await request(app)
      .get("/api/sessions/active")
      .set("Authorization", `Bearer ${token}`);

    expect(active.status).toBe(200);
    expect(active.body.session.id).toBe(start.body.sessionId);
    expect(active.body.session.consultantSlug).toBe("scarlet-0bq4");
  });
});
