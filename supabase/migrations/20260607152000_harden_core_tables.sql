-- Harden EduRAG core tables for multi-tenant access and common query paths.
-- The FastAPI backend uses the Supabase service role, so these RLS settings are
-- defense in depth against accidental Data API exposure from anon/auth clients.

alter table if exists public.documents
  add column if not exists content_hash text;

alter table if exists public.document_contents
  add column if not exists content_hash text;

create index if not exists idx_chatbots_owner_id
  on public.chatbots(owner_id);

create index if not exists idx_chatbots_published_created_at
  on public.chatbots(is_published, created_at desc);

create index if not exists idx_documents_chatbot_id
  on public.documents(chatbot_id);

create index if not exists idx_document_contents_chatbot_id
  on public.document_contents(chatbot_id);

create unique index if not exists idx_document_contents_chatbot_hash_unique
  on public.document_contents(chatbot_id, content_hash)
  where content_hash is not null;

create index if not exists idx_conversations_chatbot_id
  on public.conversations(chatbot_id);

create index if not exists idx_conversations_student_id
  on public.conversations(student_id)
  where student_id is not null;

alter table if exists public.conversations
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_conversations_chatbot_updated_at
  on public.conversations(chatbot_id, updated_at desc);

alter table if exists public.users enable row level security;
alter table if exists public.chatbots enable row level security;
alter table if exists public.documents enable row level security;
alter table if exists public.document_contents enable row level security;
alter table if exists public.conversations enable row level security;
