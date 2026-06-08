-- Migración: índices faltantes y refuerzo de los existentes
-- Aplica con: supabase db push  (o ejecuta directo en el SQL editor de Supabase)
-- Todos los CREATE INDEX usan IF NOT EXISTS — son idempotentes.

-- Índices sobre chatbots
create index if not exists idx_chatbots_owner_id
  on public.chatbots(owner_id);

create index if not exists idx_chatbots_published_created_at
  on public.chatbots(is_published, created_at desc);

-- Índices sobre documents
create index if not exists idx_documents_chatbot_id
  on public.documents(chatbot_id);

create index if not exists idx_documents_status
  on public.documents(status);

-- Índices sobre document_contents
create index if not exists idx_document_contents_chatbot_id
  on public.document_contents(chatbot_id);

create unique index if not exists idx_document_contents_chatbot_hash_unique
  on public.document_contents(chatbot_id, content_hash)
  where content_hash is not null;

-- Índices sobre conversations
create index if not exists idx_conversations_chatbot_id
  on public.conversations(chatbot_id);

create index if not exists idx_conversations_student_id
  on public.conversations(student_id)
  where student_id is not null;

create index if not exists idx_conversations_chatbot_updated_at
  on public.conversations(chatbot_id, updated_at desc);

-- Índices sobre users (faltaban en la migración anterior)
create index if not exists idx_users_role
  on public.users(role);

create index if not exists idx_users_email
  on public.users(email);

create index if not exists idx_users_role_active
  on public.users(role, is_active)
  where is_active = true;
