import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";

/**
 * Hub de tiempo real. Un único WebSocketServer montado sobre el mismo puerto
 * HTTP (ruta /ws). Difunde eventos a todos los clientes conectados.
 *
 * Se mantiene deliberadamente simple: para la demo basta con emitir cambios
 * de estado de consultoras. Con escala real esto pasaría a Redis pub/sub para
 * repartir entre varias instancias.
 */

type RealtimeEvent =
  | { type: "consultant.status"; slug: string; status: string; available: boolean }
  | { type: "session.ended"; sessionId: string };

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function attachRealtime(server: Server): void {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket) => {
    clients.add(socket);
    socket.send(JSON.stringify({ type: "hello", ts: Date.now() }));

    socket.on("close", () => clients.delete(socket));
    socket.on("error", () => clients.delete(socket));
  });
}

export function publish(event: RealtimeEvent): void {
  if (clients.size === 0) return;
  const payload = JSON.stringify(event);
  for (const socket of clients) {
    // readyState 1 = OPEN
    if (socket.readyState === 1) socket.send(payload);
  }
}

export function closeRealtime(): void {
  for (const socket of clients) socket.close();
  clients.clear();
  wss?.close();
  wss = null;
}
