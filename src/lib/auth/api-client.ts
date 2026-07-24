import { ApiError, type ApiErrorBody, type AuthResponse, type User } from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

/**
 * El access token vive SOLO en memoria de módulo: ni localStorage ni cookie
 * legible. Un XSS no puede leerlo con `localStorage.getItem`, y al recargar la
 * página se recupera la sesión vía /refresh (cookie httpOnly).
 */
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
  /** Uso interno: evita bucles infinitos al reintentar tras /refresh. */
  _retry?: boolean;
}

async function parseError(res: Response): Promise<ApiError> {
  let body: ApiErrorBody | null = null;
  try {
    body = (await res.json()) as ApiErrorBody;
  } catch {
    /* respuesta sin JSON (502, timeout del proxy…) */
  }
  return new ApiError(
    res.status,
    body?.error?.code ?? "UNKNOWN_ERROR",
    body?.error?.message ?? `Error de red (${res.status}).`,
    body?.error?.details ?? {},
  );
}

/**
 * Fetch con: cookies incluidas, Bearer automático y **reintento único** tras
 * renovar el access token si el backend responde 401 por expiración.
 */
export async function apiFetch<T>(
  path: string,
  { body, auth = false, _retry = false, ...init }: RequestOptions = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (body !== undefined) headers.set("Content-Type", "application/json");
  if (auth && accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    // Sin esto la cookie de refresh no viaja entre dominios distintos.
    credentials: "include",
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (res.status === 401 && auth && !_retry) {
    const renewed = await refreshSession();
    if (renewed) {
      return apiFetch<T>(path, { body, auth, _retry: true, ...init });
    }
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ------------------------------------------------------------------
// Endpoints de auth
// ------------------------------------------------------------------

export async function register(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: input,
  });
  setAccessToken(data.accessToken);
  return data;
}

export async function login(input: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: input,
  });
  setAccessToken(data.accessToken);
  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch<void>("/api/auth/logout", { method: "POST" });
  } finally {
    // Aunque la llamada falle, localmente la sesión se da por cerrada.
    setAccessToken(null);
  }
}

/**
 * Intenta recuperar sesión desde la cookie httpOnly.
 * Devuelve `false` en vez de lanzar: "no hay sesión" es un estado normal
 * (visitante anónimo), no un error.
 */
export async function refreshSession(): Promise<AuthResponse | false> {
  try {
    const data = await apiFetch<AuthResponse>("/api/auth/refresh", {
      method: "POST",
    });
    setAccessToken(data.accessToken);
    return data;
  } catch {
    setAccessToken(null);
    return false;
  }
}

export async function fetchMe(): Promise<User> {
  const { user } = await apiFetch<{ user: User }>("/api/auth/me", {
    auth: true,
  });
  return user;
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await apiFetch<void>("/api/auth/change-password", {
    method: "POST",
    auth: true,
    body: input,
  });
}

// ------------------------------------------------------------------
// Servicios
// ------------------------------------------------------------------

export interface DashboardData {
  user: User;
  consultations: unknown[];
  availableServices: {
    slug: string;
    name: string;
    channel: "chat" | "phone" | "email";
    priceCentsPerMinute: number;
    minutesAffordable: number;
  }[];
}

export function fetchDashboard(): Promise<DashboardData> {
  return apiFetch<DashboardData>("/api/services/dashboard", { auth: true });
}
