"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAccessToken, WS_URL } from "@/lib/auth/api-client";

export type ChatRole = "client" | "consultant";

export interface ChatMessage {
  id: string;
  senderRole: ChatRole;
  body: string;
  ts: string;
}

/**
 * Conecta al WebSocket de chat de una sesión: se une a la sala, recibe el
 * historial y los mensajes nuevos en vivo, y expone `send`. Reintenta la
 * conexión si se cae mientras la sesión sigue viva.
 */
export function useChatSocket(sessionId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      const token = getAccessToken();
      if (!token) {
        retry = setTimeout(connect, 1000);
        return;
      }
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: "chat.join", sessionId, token }));
      };
      ws.onmessage = (ev) => {
        let m: {
          type?: string;
          messages?: ChatMessage[];
          id?: string;
          senderRole?: ChatRole;
          body?: string;
          ts?: string;
        };
        try {
          m = JSON.parse(ev.data as string);
        } catch {
          return;
        }
        if (m.type === "chat.joined") {
          setConnected(true);
          setMessages(m.messages ?? []);
        } else if (
          m.type === "chat.msg" &&
          m.id &&
          m.senderRole &&
          m.body != null &&
          m.ts
        ) {
          const incoming = {
            id: m.id,
            senderRole: m.senderRole,
            body: m.body,
            ts: m.ts,
          };
          setMessages((prev) =>
            prev.some((x) => x.id === incoming.id) ? prev : [...prev, incoming],
          );
        }
      };
      ws.onclose = () => {
        setConnected(false);
        if (!closed) retry = setTimeout(connect, 1500);
      };
      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [sessionId]);

  const send = useCallback(
    (body: string) => {
      const ws = wsRef.current;
      const text = body.trim();
      if (ws && ws.readyState === 1 && text) {
        ws.send(JSON.stringify({ type: "chat.msg", sessionId, body: text }));
      }
    },
    [sessionId],
  );

  return { messages, connected, send };
}
