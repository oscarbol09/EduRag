-- Migración Fase 2: eliminar la columna JSONB legacy conversations.messages
-- IMPORTANTE: Ejecutar SOLO después de verificar que:
--   1. El backend lee y escribe exclusivamente desde la tabla public.messages.
--   2. No hay clientes que consuman conversations.messages directamente.
--   3. Los datos históricos ya fueron migrados por la Fase 1 (20260607154000).
--
-- Aplica con: supabase db push  (o ejecuta en el SQL editor de Supabase)

-- ── Verificación previa (opcional) ───────────────────────────────────────────
-- Puedes ejecutar esto antes del DROP para confirmar que messages tiene datos:
--   select count(*) from public.messages;
--   select count(*) from public.conversations where messages is not null;

-- ── DROP de la columna legacy ─────────────────────────────────────────────────
alter table public.conversations drop column if exists messages;

comment on table public.conversations is
  'Historial de conversaciones. Los mensajes individuales están en public.messages.';
