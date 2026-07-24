import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AUTH_ERRORS, unauthorized } from "./errors.js";

export interface AccessTokenPayload {
  /** subject = user id */
  sub: string;
  email: string;
  role: string;
}

const ISSUER = "tarot-online";
const AUDIENCE = "tarot-online-web";

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"],
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    // `algorithms` explícito: sin él, un token con alg:none sería aceptado.
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    if (typeof decoded === "string") {
      throw unauthorized(AUTH_ERRORS.TOKEN_INVALID, "Token inválido.");
    }
    return {
      sub: String(decoded.sub),
      email: String((decoded as jwt.JwtPayload).email ?? ""),
      role: String((decoded as jwt.JwtPayload).role ?? "client"),
    };
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw unauthorized(AUTH_ERRORS.TOKEN_EXPIRED, "La sesión ha expirado.");
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw unauthorized(AUTH_ERRORS.TOKEN_INVALID, "Token inválido.");
    }
    throw err;
  }
}

/**
 * El refresh token es opaco (256 bits aleatorios), no un JWT: así puede
 * revocarse de verdad en servidor. En la BD solo vive su hash.
 */
export function generateRefreshToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString("base64url");
  return { token, hash: hashRefreshToken(token) };
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function refreshTokenExpiry(from = new Date()): Date {
  return new Date(
    from.getTime() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  );
}
