-- ------------------------------------------------------------------
-- 005_chat_messages — mensajes del chat en vivo por sesión
-- ------------------------------------------------------------------
-- Cada consulta de tipo 'chat' (sessions.channel = 'chat') guarda aquí su
-- conversación. Se borra en cascada si la sesión desaparece.

CREATE TABLE IF NOT EXISTS chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sender_role  TEXT NOT NULL CHECK (sender_role IN ('client', 'consultant')),
  body         TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_session_idx
  ON chat_messages (session_id, created_at);
