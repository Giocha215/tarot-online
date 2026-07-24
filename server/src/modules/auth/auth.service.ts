import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { env } from "../../config/env.js";
import { AUTH_ERRORS, badRequest, conflict, unauthorized } from "../../utils/errors.js";
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiry,
  signAccessToken,
} from "../../utils/tokens.js";
import { sendPasswordResetEmail } from "./email.service.js";
import * as resetRepo from "./password-reset.repository.js";
import * as refreshRepo from "./refresh-token.repository.js";
import * as userRepo from "./user.repository.js";
import type { PublicUser } from "./user.repository.js";

export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface SessionContext {
  userAgent?: string | null;
  ipAddress?: string | null;
}

/**
 * Hash "quemado" con el mismo coste que los reales. Se usa para gastar tiempo
 * de CPU cuando el email no existe, de modo que login-con-email-inexistente y
 * login-con-contraseña-mala tarden lo mismo. Sin esto, el tiempo de respuesta
 * revela qué emails están registrados.
 */
const DUMMY_HASH = bcrypt.hashSync("cpu-burn-placeholder", env.BCRYPT_ROUNDS);

async function issueSession(
  user: userRepo.UserRow,
  ctx: SessionContext,
  /** Al rotar se reutiliza la familia existente; al iniciar sesión se crea una. */
  familyId: string = crypto.randomUUID(),
): Promise<AuthResult> {
  const { token, hash } = generateRefreshToken();
  const expiresAt = refreshTokenExpiry();

  await refreshRepo.insertRefreshToken({
    userId: user.id,
    tokenHash: hash,
    familyId,
    expiresAt,
    userAgent: ctx.userAgent ?? null,
    ipAddress: ctx.ipAddress ?? null,
  });

  return {
    user: userRepo.toPublicUser(user),
    accessToken: signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
    }),
    refreshToken: token,
    refreshExpiresAt: expiresAt,
  };
}

export async function register(
  input: { email: string; password: string; displayName: string },
  ctx: SessionContext = {},
): Promise<AuthResult> {
  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);

  let user: userRepo.UserRow;
  try {
    user = await userRepo.insertUser({
      email: input.email,
      passwordHash,
      displayName: input.displayName,
    });
  } catch (err) {
    // Se confía en el índice único, no en un SELECT previo: entre el SELECT y
    // el INSERT dos peticiones simultáneas podrían colarse las dos.
    if (userRepo.isUniqueViolation(err)) {
      throw conflict(
        AUTH_ERRORS.EMAIL_TAKEN,
        "Ya existe una cuenta con este email.",
      );
    }
    throw err;
  }

  return issueSession(user, ctx);
}

export async function login(
  input: { email: string; password: string },
  ctx: SessionContext = {},
): Promise<AuthResult> {
  const user = await userRepo.findByEmail(input.email);

  // Se compara siempre, exista o no el usuario (ver DUMMY_HASH).
  const ok = await bcrypt.compare(
    input.password,
    user?.password_hash ?? DUMMY_HASH,
  );

  // Mismo código y mismo mensaje en ambos casos: no se filtra si el email existe.
  if (!user || !ok) {
    throw unauthorized(
      AUTH_ERRORS.INVALID_CREDENTIALS,
      "Email o contraseña incorrectos.",
    );
  }

  return issueSession(user, ctx);
}

/**
 * Rota el refresh token. El anterior se revoca en el acto, así que un token
 * ya usado que vuelve a aparecer significa robo: se mata toda la familia.
 */
export async function refresh(
  presentedToken: string,
  ctx: SessionContext = {},
): Promise<AuthResult> {
  const row = await refreshRepo.findByHash(hashRefreshToken(presentedToken));

  if (!row) {
    throw unauthorized(AUTH_ERRORS.REFRESH_INVALID, "Sesión no válida.");
  }

  if (row.revoked_at) {
    await refreshRepo.revokeFamily(row.family_id);
    throw unauthorized(
      AUTH_ERRORS.REFRESH_REUSED,
      "Sesión revocada por motivos de seguridad. Vuelve a iniciar sesión.",
    );
  }

  if (row.expires_at.getTime() <= Date.now()) {
    throw unauthorized(AUTH_ERRORS.REFRESH_INVALID, "La sesión ha expirado.");
  }

  const user = await userRepo.findById(row.user_id);
  if (!user) {
    throw unauthorized(AUTH_ERRORS.REFRESH_INVALID, "Sesión no válida.");
  }

  await refreshRepo.revokeById(row.id);
  return issueSession(user, ctx, row.family_id);
}

export async function logout(presentedToken?: string): Promise<void> {
  if (!presentedToken) return;
  const row = await refreshRepo.findByHash(hashRefreshToken(presentedToken));
  if (row) await refreshRepo.revokeById(row.id);
}

export async function logoutAll(userId: string): Promise<void> {
  await refreshRepo.revokeAllForUser(userId);
}

export async function getProfile(userId: string): Promise<PublicUser> {
  const user = await userRepo.findById(userId);
  if (!user) {
    throw unauthorized(AUTH_ERRORS.TOKEN_INVALID, "Usuario no encontrado.");
  }
  return userRepo.toPublicUser(user);
}

export async function changePassword(
  userId: string,
  input: { currentPassword: string; newPassword: string },
): Promise<void> {
  const user = await userRepo.findById(userId);
  if (!user) {
    throw unauthorized(AUTH_ERRORS.TOKEN_INVALID, "Usuario no encontrado.");
  }

  const ok = await bcrypt.compare(input.currentPassword, user.password_hash);
  if (!ok) {
    throw unauthorized(
      AUTH_ERRORS.INVALID_CREDENTIALS,
      "La contraseña actual no es correcta.",
    );
  }

  const hash = await bcrypt.hash(input.newPassword, env.BCRYPT_ROUNDS);
  await userRepo.updatePasswordHash(userId, hash);
  // Cambiar contraseña cierra todas las sesiones: es el punto del cambio.
  await refreshRepo.revokeAllForUser(userId);
}

/**
 * Solicita recuperar la contraseña. Genera un token de un solo uso, lo guarda
 * hasheado y envía el enlace por email.
 *
 * Devuelve SIEMPRE éxito, exista o no el email: así no se filtra qué correos
 * están registrados. En modo demo (sin Resend) devuelve el enlace para
 * mostrarlo en pantalla.
 */
export async function requestPasswordReset(
  email: string,
): Promise<{ demoResetUrl: string | null }> {
  const user = await userRepo.findByEmail(email);

  // Si no existe, se corta aquí pero se responde igual (sin revelar nada).
  if (!user) return { demoResetUrl: null };

  // Un solo enlace válido a la vez: se invalidan los anteriores.
  await resetRepo.invalidateForUser(user.id);

  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + env.RESET_TOKEN_TTL_MIN * 60_000);

  await resetRepo.insertResetToken({ userId: user.id, tokenHash, expiresAt });

  const resetUrl = `${env.APP_URL.replace(/\/$/, "")}/restablecer?token=${token}`;
  await sendPasswordResetEmail(user.email, resetUrl);

  // En modo demo se devuelve el enlace; con email real, nunca.
  return { demoResetUrl: env.emailEnabled ? null : resetUrl };
}

/**
 * Restablece la contraseña con el token del enlace. Un solo uso: se marca
 * usado y se cierran todas las sesiones del usuario.
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const row = await resetRepo.findByHash(tokenHash);

  if (!row || row.used_at || row.expires_at.getTime() <= Date.now()) {
    throw badRequest(
      "RESET_TOKEN_INVALID",
      "El enlace de recuperación no es válido o ha caducado.",
    );
  }

  const hash = await bcrypt.hash(newPassword, env.BCRYPT_ROUNDS);
  await userRepo.updatePasswordHash(row.user_id, hash);
  await resetRepo.markUsed(row.id);
  // Recuperar contraseña cierra todas las sesiones abiertas.
  await refreshRepo.revokeAllForUser(row.user_id);
}
