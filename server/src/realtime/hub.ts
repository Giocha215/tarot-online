import type { Server } from "node:http";
import type { RawData } from "ws";
import { WebSocketServer, type WebSocket } from "ws";
import * as chatRepo from "../modules/chat/chat.repository.js";
import { verifyAccessToken } from "../utils/tokens.js";

/**
 * Hub de tiempo real. Un único WebSocketServer sobre el mismo puerto HTTP
 * (ruta /ws). Hace dos cosas:
 *   1. Difunde eventos globales (estado de consultoras, fin de sesión) a todos.
 *   2. Gestiona salas de chat por sesión: cada mensaje se autentica, se guarda
 *      y se reparte solo a los dos participantes de esa sesión.
 *
 * Se mantiene simple: con escala real las salas pasarían a Redis pub/sub para
 * repartir entre varias instancias.
 */

type RealtimeEvent =
  | { type: "consultant.status"; slug: string; status: string; available: boolean }
  | { type: "session.ended"; sessionId: string };

/** Estado por socket: vacío hasta que se une a una sala de chat. */
interface SocketState {
  sessionId?: string;
  userId?: string;
  role?: chatRepo.ChatRole;
}

let wss: WebSocketServer | null = null;
const clients = new Map<WebSocket, SocketState>();

export function attachRealtime(server: Server): void {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket) => {
    clients.set(socket, {});
    socket.send(JSON.stringify({ type: "hello", ts: Date.now() }));

    socket.on("message", (data) => {
      void handleMessage(socket, data);
    });
    socket.on("close", () => clients.delete(socket));
    socket.on("error", () => clients.delete(socket));
  });
}

async function handleMessage(socket: WebSocket, data: RawData): Promise<void> {
  let msg: Record<string, unknown>;
  try {
    msg = JSON.parse(data.toString()) as Record<string, unknown>;
  } catch {
    return; // ignora payloads no-JSON
  }

  if (msg.type === "chat.join") return joinRoom(socket, msg);
  if (msg.type === "chat.msg") return relayMessage(socket, msg);
}

/** Une el socket a una sala tras verificar token y participación. */
async function joinRoom(
  socket: WebSocket,
  msg: Record<string, unknown>,
): Promise<void> {
  const sessionId = typeof msg.sessionId === "string" ? msg.sessionId : null;
  const token = typeof msg.token === "string" ? msg.token : null;
  if (!sessionId || !token) return;

  let userId: string;
  try {
    userId = verifyAccessToken(token).sub;
  } catch {
    socket.send(JSON.stringify({ type: "chat.error", error: "unauthorized" }));
    return;
  }

  const role = await chatRepo.getParticipantRole(sessionId, userId);
  if (!role) {
    socket.send(JSON.stringify({ type: "chat.error", error: "forbidden" }));
    return;
  }

  clients.set(socket, { sessionId, userId, role });
  const messages = await chatRepo.listBySession(sessionId);
  socket.send(JSON.stringify({ type: "chat.joined", role, messages }));
}

/** Guarda el mensaje y lo reparte a los dos sockets de la misma sesión. */
async function relayMessage(
  socket: WebSocket,
  msg: Record<string, unknown>,
): Promise<void> {
  const state = clients.get(socket);
  if (!state?.sessionId || !state.role) return;

  const raw = typeof msg.body === "string" ? msg.body.trim() : "";
  if (!raw) return;
  const body = raw.slice(0, 2000);

  const saved = await chatRepo.insertMessage(state.sessionId, state.role, body);
  const payload = JSON.stringify({ type: "chat.msg", ...saved });
  for (const [sock, st] of clients) {
    if (st.sessionId === state.sessionId && sock.readyState === 1) {
      sock.send(payload);
    }
  }
}

export function publish(event: RealtimeEvent): void {
  if (clients.size === 0) return;
  const payload = JSON.stringify(event);
  for (const socket of clients.keys()) {
    // readyState 1 = OPEN
    if (socket.readyState === 1) socket.send(payload);
  }
}

export function closeRealtime(): void {
  for (const socket of clients.keys()) socket.close();
  clients.clear();
  wss?.close();
  wss = null;
}
