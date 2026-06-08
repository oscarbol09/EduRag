-- Migración: tabla messages separada (reemplaza conversations.messages JSONB)
-- IMPORTANTE: Esta migración es ADITIVA. La columna conversations.messages NO se elimina
-- todavía para permitir rollback seguro. El backend leerá de la nueva tabla primero;
-- una vez validado en producción, ejecutar la segunda fase (ver al final).
--
-- Aplica con: supabase db push  (o ejecuta en el SQL editor de Supabase)

-- ── Paso 1: crear tabla messages ─────────────────────────────────────────────

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  conversation_id text not null references public.conversations(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant', 'system')),
  content     text not null,
  created_at  timestamptz not null default now()
);

comment on table public.messages is
  'Mensajes individuales de cada conversación. Reemplaza conversations.messages JSONB.';

-- Índices para las queries más frecuentes
create index if not exists idx_messages_conversation_id
  on public.messages(conversation_id);

create index if not exists idx_messages_conversation_created
  on public.messages(conversation_id, created_at asc);

-- RLS (misma política que conversations — el backend usa service role, RLS es defensa adicional)
alter table public.messages enable row level security;

-- ── Paso 2: migrar mensajes existentes de JSONB a la nueva tabla ─────────────
-- Lee el array JSONB de cada conversación y lo inserta fila a fila.

do $$
declare
  conv record;
  msg  jsonb;
  msg_role    text;
  msg_content text;
  msg_ts      timestamptz;
begin
  for conv in
    select id, messages
    from public.conversations
    where messages is not null
      and jsonb_array_length(messages) > 0
  loop
    for msg in select * from jsonb_array_elements(conv.messages)
    loop
      msg_role    := msg->>'role';
      msg_content := msg->>'content';
      msg_ts      := coalesce(
                       (msg->>'timestamp')::timestamptz,
                       now()
                     );

      -- Saltar roles inválidos o contenido vacío
      if msg_role is null or msg_role not in ('user', 'assistant', 'system') then
        continue;
      end if;
      if msg_content is null or trim(msg_content) = '' then
        continue;
      end if;

      insert into public.messages (conversation_id, role, content, created_at)
      values (conv.id, msg_role, msg_content, msg_ts)
      on conflict do nothing;
    end loop;
  end loop;
end;
$$;

-- ── Fase 2 (ejecutar SÓLO después de validar el backend con la nueva tabla) ──
-- Una vez confirmado que el backend lee/escribe exclusivamente de public.messages,
-- ejecutar esto para eliminar la columna JSONB legacy:
--
--   alter table public.conversations drop column if exists messages;
--
-- No ejecutar ahora — requiere actualizar primero supabase_db.py y main.py.
