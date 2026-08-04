import { ApiError, type ApiErrorBody, type AuthResponse, type User } from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

/** URL del WebSocket de tiempo real (chat). http(s) -> ws(s). */
export const WS_URL = `${API_URL.replace(/^http/, "ws")}/ws`;

/**
 * Desfase (ms) entre el reloj del dispositivo y el del servidor, calculado con
 * la cabecera `Date` de las respuestas. Así los temporizadores de sesión no
 * dependen del reloj local (que puede estar adelantado/atrasado).
 */
let clockOffsetMs = 0;

/** "Ahora" según el servidor: reloj local corregido por el desfase. */
export function serverNow(): number {
  return Date.now() - clockOffsetMs;
}

function syncClockFromResponse(res: Response): void {
  const dateHeader = res.headers.get("date");
  if (!dateHeader) return;
  const serverMs = Date.parse(dateHeader);
  if (!Number.isNaN(serverMs)) clockOffsetMs = Date.now() - serverMs;
}

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

  syncClockFromResponse(res);

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

export function forgotPassword(
  email: string,
): Promise<{ message: string; demoResetUrl: string | null }> {
  return apiFetch("/api/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}

export function resetPassword(input: {
  token: string;
  newPassword: string;
}): Promise<void> {
  return apiFetch<void>("/api/auth/reset-password", {
    method: "POST",
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

// ------------------------------------------------------------------
// Videollamada
// ------------------------------------------------------------------

export interface Consultant {
  id: string;
  slug: string;
  name: string;
  status: "online" | "busy" | "offline";
  /** Precio por minuto de la videollamada. */
  priceCentsPerMinute: number;
  /** Precio por minuto del chat. */
  chatPriceCentsPerMinute: number;
  available: boolean;
  /** Si está ocupada, minutos contratados de la consulta en curso. */
  activeDurationMin: number | null;
}

export interface StartSessionResult {
  sessionId: string;
  channel: "video" | "chat";
  joinUrl: string | null;
  /** true si la sala puede incrustarse en un iframe (Jitsi). */
  embeddable: boolean;
  durationMin: number;
  totalCents: number;
  startedAt: string;
  expiresAt: string;
  balanceCents: number;
  consultant: { slug: string; name: string };
}

export interface SessionRecord {
  id: string;
  consultantName: string;
  consultantSlug: string;
  channel: string;
  durationMin: number;
  totalCents: number;
  status: "active" | "completed" | "cancelled";
  joinUrl: string | null;
  embeddable: boolean;
  startedAt: string;
  expiresAt: string;
  endedAt: string | null;
}

export function fetchConsultants(): Promise<{ consultants: Consultant[] }> {
  return apiFetch("/api/consultants");
}

export function startSession(input: {
  consultantSlug: string;
  durationMin: number;
  channel?: "video" | "chat";
}): Promise<StartSessionResult> {
  return apiFetch("/api/sessions/start", {
    method: "POST",
    auth: true,
    body: input,
  });
}

export function endSession(
  sessionId: string,
  reason: "completed" | "cancelled" = "completed",
): Promise<{ ended: boolean; status: string }> {
  return apiFetch(`/api/sessions/${sessionId}/end`, {
    method: "POST",
    auth: true,
    body: { reason },
  });
}

export function fetchActiveSession(): Promise<{ session: SessionRecord | null }> {
  return apiFetch("/api/sessions/active", { auth: true });
}

export function fetchSessionHistory(): Promise<{ sessions: SessionRecord[] }> {
  return apiFetch("/api/sessions", { auth: true });
}

export function topupWallet(
  amountCents: number,
): Promise<{ balanceCents: number; mode: string }> {
  return apiFetch("/api/sessions/wallet/topup", {
    method: "POST",
    auth: true,
    body: { amountCents },
  });
}

/**
 * Inicia una recarga por horas. El servidor calcula el importe con el precio
 * por hora que fija la asesora. Con Stripe devuelve `{ mode:'stripe', url }`;
 * en modo demo `{ mode:'demo', balanceCents }`.
 */
export function startTopup(
  hours: number,
): Promise<
  | { mode: "stripe"; url: string }
  | { mode: "demo"; balanceCents: number }
> {
  return apiFetch("/api/sessions/wallet/checkout", {
    method: "POST",
    auth: true,
    body: { hours },
  });
}

/** Precio por hora de la recarga (público). */
export function fetchRechargePrice(): Promise<{ pricePerHourCents: number }> {
  return apiFetch("/api/services/recharge-price");
}

/** La asesora fija el precio por hora de la recarga. */
export function updateRechargePrice(
  pricePerHourCents: number,
): Promise<{ pricePerHourCents: number }> {
  return apiFetch("/api/consultants/me/recharge-price", {
    method: "PATCH",
    auth: true,
    body: { pricePerHourCents },
  });
}

// ------------------------------------------------------------------
// Agenda / citas
// ------------------------------------------------------------------

export interface SlotsResult {
  slots: string[]; // instantes UTC (ISO)
  priceCentsPerMin: number; // videollamada
  chatPriceCentsPerMin: number; // chat
}

export function fetchSlots(
  slug: string,
  durationMin: number,
): Promise<SlotsResult> {
  return apiFetch(`/api/consultants/${slug}/slots?durationMin=${durationMin}`);
}

export interface Appointment {
  id: string;
  consultantSlug: string;
  consultantName: string;
  clientName: string;
  channel: "video" | "chat";
  durationMin: number;
  totalCents: number;
  startAt: string;
  endAt: string;
  status: "booked" | "cancelled" | "completed";
  sessionId: string | null;
}

export function bookAppointment(input: {
  consultantSlug: string;
  channel: "video" | "chat";
  durationMin: number;
  startAt: string;
}): Promise<{
  id: string;
  channel: "video" | "chat";
  durationMin: number;
  totalCents: number;
  startAt: string;
  endAt: string;
  balanceCents: number;
}> {
  return apiFetch("/api/appointments", {
    method: "POST",
    auth: true,
    body: input,
  });
}

export function fetchMyAppointments(): Promise<{ appointments: Appointment[] }> {
  return apiFetch("/api/appointments", { auth: true });
}

export function cancelAppointment(
  id: string,
): Promise<{ cancelled: boolean; refunded: boolean; balanceCents: number | null }> {
  return apiFetch(`/api/appointments/${id}/cancel`, {
    method: "POST",
    auth: true,
  });
}

/** Abre la sesión (chat/vídeo) de una cita ya pagada; misma forma que start. */
export function startAppointment(id: string): Promise<{
  sessionId: string;
  channel: "video" | "chat";
  joinUrl: string | null;
  embeddable: boolean;
  durationMin: number;
  totalCents: number;
  startedAt: string;
  expiresAt: string;
  consultant: { slug: string; name: string };
}> {
  return apiFetch(`/api/appointments/${id}/start`, {
    method: "POST",
    auth: true,
  });
}

export interface AvailabilityBlock {
  weekday: number; // 0=domingo … 6=sábado
  startMinute: number;
  endMinute: number;
}

export interface Availability {
  timezone: string;
  blocks: AvailabilityBlock[];
}

export function fetchAvailability(): Promise<Availability> {
  return apiFetch("/api/consultants/me/availability", { auth: true });
}

export function setAvailability(
  blocks: AvailabilityBlock[],
): Promise<Availability> {
  return apiFetch("/api/consultants/me/availability", {
    method: "PUT",
    auth: true,
    body: { blocks },
  });
}

export function fetchAdvisorAppointments(): Promise<{
  appointments: Appointment[];
}> {
  return apiFetch("/api/consultants/me/appointments", { auth: true });
}

// ------------------------------------------------------------------
// Panel de la asesora
// ------------------------------------------------------------------

export interface AdvisorView {
  consultant: { slug: string; name: string; status: string };
  activeSession: {
    id: string;
    channel: "video" | "chat";
    joinUrl: string | null;
    embeddable: boolean;
    durationMin: number;
    startedAt: string;
    expiresAt: string;
  } | null;
}

export function fetchAdvisorView(): Promise<AdvisorView> {
  return apiFetch("/api/consultants/me", { auth: true });
}

export interface AdvisorSessions {
  sessions: SessionRecord[];
  totalCents: number;
  count: number;
  priceCentsPerMin: number; // videollamada
  chatPriceCentsPerMin: number; // chat
}

export function fetchAdvisorSessions(): Promise<AdvisorSessions> {
  return apiFetch("/api/consultants/me/sessions", { auth: true });
}

export interface RevenuePoint {
  period: string;
  cents: number;
  count: number;
}

export interface AdvisorStats {
  daily: RevenuePoint[];
  monthly: RevenuePoint[];
  totalCents: number;
  count: number;
}

export function fetchAdvisorStats(): Promise<AdvisorStats> {
  return apiFetch("/api/consultants/me/stats", { auth: true });
}

export function updateAdvisorRate(
  priceCentsPerMin: number,
  chatPriceCentsPerMin?: number,
): Promise<{ priceCentsPerMin: number; chatPriceCentsPerMin: number }> {
  return apiFetch("/api/consultants/me/rate", {
    method: "PATCH",
    auth: true,
    body: { priceCentsPerMin, chatPriceCentsPerMin },
  });
}

export function setConsultantStatus(
  slug: string,
  status: "online" | "busy" | "offline",
): Promise<{ slug: string; status: string }> {
  return apiFetch(`/api/consultants/${slug}/status`, {
    method: "POST",
    auth: true,
    body: { status },
  });
}
