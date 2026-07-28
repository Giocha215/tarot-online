import { query } from "../../db/pool.js";

export type ChatRole = "client" | "consultant";

export interface ChatMessage {
  id: string;
  senderRole: ChatRole;
  body: string;
  ts: string;
}

interface ChatMessageRow {
  id: string;
  sender_role: ChatRole;
  body: string;
  created_at: Date;
}

/** Guarda un mensaje y lo devuelve normalizado para difundir por el WebSocket. */
export async function insertMessage(
  sessionId: string,
  senderRole: ChatRole,
  body: string,
): Promise<ChatMessage> {
  const { rows } = await query<ChatMessageRow>(
    `INSERT INTO chat_messages (session_id, sender_role, body)
     VALUES ($1, $2, $3)
     RETURNING id, sender_role, body, created_at`,
    [sessionId, senderRole, body],
  );
  const r = rows[0]!;
  return {
    id: r.id,
    senderRole: r.sender_role,
    body: r.body,
    ts: r.created_at.toISOString(),
  };
}

/** Historial de la conversación, en orden cronológico. */
export async function listBySession(
  sessionId: string,
  limit = 300,
): Promise<ChatMessage[]> {
  const { rows } = await query<ChatMessageRow>(
    `SELECT id, sender_role, body, created_at
       FROM chat_messages
      WHERE session_id = $1
      ORDER BY created_at ASC
      LIMIT $2`,
    [sessionId, limit],
  );
  return rows.map((r) => ({
    id: r.id,
    senderRole: r.sender_role,
    body: r.body,
    ts: r.created_at.toISOString(),
  }));
}

/**
 * Devuelve el rol del usuario en una sesión de chat ACTIVA, o null si no es
 * participante (ni el cliente dueño ni la asesora dueña de la consultora).
 * Solo autoriza sesiones vivas de canal 'chat'.
 */
export async function getParticipantRole(
  sessionId: string,
  userId: string,
): Promise<ChatRole | null> {
  const { rows } = await query<{
    user_id: string;
    owner_user_id: string | null;
  }>(
    `SELECT s.user_id, c.owner_user_id
       FROM sessions s
       JOIN consultants c ON c.id = s.consultant_id
      WHERE s.id = $1 AND s.status = 'active' AND s.channel = 'chat'
      LIMIT 1`,
    [sessionId],
  );
  const row = rows[0];
  if (!row) return null;
  if (row.user_id === userId) return "client";
  if (row.owner_user_id === userId) return "consultant";
  return null;
}
