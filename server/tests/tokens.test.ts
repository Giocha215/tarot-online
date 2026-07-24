import { describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { AppError } from "../src/utils/errors.js";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
  signAccessToken,
  verifyAccessToken,
} from "../src/utils/tokens.js";

describe("access token (JWT)", () => {
  const payload = { sub: "user-123", email: "ana@example.com", role: "client" };

  it("firma y verifica ida y vuelta", () => {
    const decoded = verifyAccessToken(signAccessToken(payload));
    expect(decoded.sub).toBe("user-123");
    expect(decoded.email).toBe("ana@example.com");
    expect(decoded.role).toBe("client");
  });

  it("rechaza un token con firma manipulada", () => {
    const token = signAccessToken(payload);
    const [h, p] = token.split(".");
    expect(() => verifyAccessToken(`${h}.${p}.firmaFalsa`)).toThrowError(
      AppError,
    );
  });

  it("rechaza un token firmado con otro secreto", () => {
    const foreign = jwt.sign(payload, "x".repeat(40), {
      issuer: "tarot-online",
      audience: "tarot-online-web",
    });
    expect(() => verifyAccessToken(foreign)).toThrowError(/inválido/i);
  });

  it("rechaza alg:none (ataque clásico de degradación)", () => {
    const none = jwt.sign(payload, "", { algorithm: "none" });
    expect(() => verifyAccessToken(none)).toThrowError(AppError);
  });

  it("rechaza un token caducado con el código correcto", () => {
    const expired = jwt.sign(payload, process.env.JWT_SECRET!, {
      algorithm: "HS256",
      issuer: "tarot-online",
      audience: "tarot-online-web",
      expiresIn: "-10s",
    });
    try {
      verifyAccessToken(expired);
      expect.unreachable("debería haber lanzado");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe("AUTH_TOKEN_EXPIRED");
      expect((err as AppError).status).toBe(401);
    }
  });

  it("rechaza un token con audience ajena", () => {
    const wrongAud = jwt.sign(payload, process.env.JWT_SECRET!, {
      algorithm: "HS256",
      issuer: "tarot-online",
      audience: "otra-app",
    });
    expect(() => verifyAccessToken(wrongAud)).toThrowError(AppError);
  });
});

describe("refresh token", () => {
  it("genera tokens únicos y de entropía suficiente", () => {
    const tokens = new Set(
      Array.from({ length: 500 }, () => generateRefreshToken().token),
    );
    expect(tokens.size).toBe(500);
    // 32 bytes en base64url ≈ 43 caracteres
    expect([...tokens][0]!.length).toBeGreaterThanOrEqual(43);
  });

  it("el hash es determinista y no contiene el token", () => {
    const { token, hash } = generateRefreshToken();
    expect(hashRefreshToken(token)).toBe(hash);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
  });

  it("la caducidad respeta REFRESH_TOKEN_TTL_DAYS", () => {
    const from = new Date("2026-01-01T00:00:00Z");
    const days = Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30);
    const expected = from.getTime() + days * 86_400_000;
    expect(refreshTokenExpiry(from).getTime()).toBe(expected);
  });
});
