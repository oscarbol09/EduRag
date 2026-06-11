# EduRAG — Especificación Técnica (SPEC.md)

## 1. Concepto y Visión

EduRAG es una plataforma SaaS educativa multi-tenant donde los docentes crean agentes conversacionales basados en sus propios documentos, y los estudiantes los consumen a través de un marketplace centralizado o mediante integración con LMS externos (Moodle) vía `<iframe>`.

**Restricciones de diseño:**
- $0/mes post-primer-mes (Supabase Free Tier + APIs gratuitas).
- Aislamiento estricto multi-tenant por `chatbot_id` / `owner_id`.
- Arquitectura extensible para múltiples LLMs sin cambios de lógica de negocio.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Proveedor | Tier |
|---|---|---|---|
| Frontend SPA | Next.js 16 + Tailwind CSS + Radix UI | Vercel | Free |
| API Backend | FastAPI (Python 3.11) + Uvicorn | Railway | Free |
| Base de datos | Supabase PostgreSQL | Supabase | Free permanente |
| Almacenamiento | Supabase Storage (bucket `documents`) | Supabase | Free (1 GB) |
| Autenticación | JWT HS256 (PyJWT + bcrypt) | — | Free |
| Cifrado | Fernet (cryptography) para API keys | — | Free |
| LLM | OpenRouter (Gemini, Llama, etc.) | OpenRouter | Free (BYOK) |

> **Sin ChromaDB:** eliminado por `ContainerTimeout` en Railway (~500 MB de venv). El texto se almacena en Supabase y se pasa directamente al context window vía chunking léxico.

---

## 3. Modelo de Datos (PostgreSQL — Supabase)

### Tabla `users`
```sql
create table users (
  id           text primary key,
  email        text unique not null,
  password     text,
  role         text not null default 'student' check (role in ('teacher','student','admin')),
  auth_method  text not null default 'email_password',
  first_name   text default '',
  last_name    text default '',
  institution_name text default '',
  openrouter_api_key text default '',  -- cifrado con Fernet
  openrouter_model   text default '',
  is_test_account boolean default false,
  country      text,
  is_active    boolean default true,
  created_at   timestamptz default now()
);
```

### Tabla `chatbots`
```sql
create table chatbots (
  id                    text primary key,
  owner_id              text references users(id) on delete cascade,
  name                  text not null,
  subject_area          text,
  education_level       text,
  tone                  text default 'friendly' check (tone in ('formal','friendly','technical')),
  welcome_message       text,
  system_prompt_override text,  -- máx 2000 chars (validado en backend)
  restriction_level     text default 'guided' check (restriction_level in ('strict','guided','open')),
  llm_provider          text default 'openrouter',
  public_url            text,
  embed_code            text,
  is_published          boolean default false,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);
```

### Tabla `documents`
```sql
create table documents (
  id           text primary key,
  chatbot_id   text references chatbots(id) on delete cascade,
  filename     text,
  mime_type    text,
  blob_url     text,
  content_hash text,  -- SHA-256 del texto extraído (deduplicación)
  status       text default 'indexed' check (status in ('queued','processing','indexed','error')),
  chunk_count  int default 1,
  created_at   timestamptz default now(),
  processed_at timestamptz default now()
);
```

### Tabla `document_contents`
```sql
create table document_contents (
  id           text primary key,
  chatbot_id   text references chatbots(id) on delete cascade,
  filename     text,
  content      text,
  content_hash text  -- SHA-256 (índice único por chatbot para deduplicación)
);
```

### Tabla `conversations`
```sql
create table conversations (
  id          text primary key,
  chatbot_id  text references chatbots(id) on delete cascade,
  student_id  uuid,  -- nullable — usuarios no autenticados
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
  -- El campo messages (JSONB) fue eliminado por migración 20260608120000
);
```

### Tabla `messages` (normalizada — reemplaza el JSONB)
```sql
create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant','system')),
  content         text not null,
  created_at      timestamptz not null default now()
);
create index idx_messages_conversation_id      on messages(conversation_id);
create index idx_messages_conversation_created on messages(conversation_id, created_at asc);
```

---

## 4. Índices de Rendimiento

Creados por la migración `20260607153000_add_missing_indexes.sql`:

```sql
-- chatbots
create index idx_chatbots_owner_id             on chatbots(owner_id);
create index idx_chatbots_published_created_at on chatbots(is_published, created_at desc);

-- documents
create index idx_documents_chatbot_id          on documents(chatbot_id);
create index idx_documents_status              on documents(status);

-- document_contents
create index idx_document_contents_chatbot_id  on document_contents(chatbot_id);
create unique index idx_document_contents_chatbot_hash_unique
  on document_contents(chatbot_id, content_hash) where content_hash is not null;

-- conversations
create index idx_conversations_chatbot_id           on conversations(chatbot_id);
create index idx_conversations_student_id            on conversations(student_id) where student_id is not null;
create index idx_conversations_chatbot_updated_at    on conversations(chatbot_id, updated_at desc);

-- users
create index idx_users_role        on users(role);
create index idx_users_email       on users(email);
create index idx_users_role_active on users(role, is_active) where is_active = true;
```

---

## 5. API Endpoints

### Sistema
- `GET /health` — health check
- `GET /ready` — readiness (verifica Supabase)
- `GET /platform/stats` — estadísticas públicas (chatbots publicados, docentes activos, total mensajes de `public.messages`)

### Autenticación
- `POST /auth/login` (10/min) — JWT sin hash de password en respuesta
- `POST /auth/register` (5/min) — fuerza `role: student`
- `POST /auth/refresh` (20/min) — rota access+refresh token, revoca el anterior [JWT]
- `GET /auth/me` — usuario actual [JWT]
- `PUT /auth/me/profile` — perfil + API key cifrada + modelo [JWT]

### Chatbots
- `GET /chatbots` — lista (`owner_id`, `published_only`, `limit`, `offset`)
- `POST /chatbots` — crear [JWT] — valida `system_prompt_override` ≤ 2000 chars
- `GET /chatbots/{id}` — detalle (oculta `system_prompt_override` a terceros)
- `PUT /chatbots/{id}` — actualizar [JWT owner]
- `DELETE /chatbots/{id}` — eliminar + `document_contents` [JWT owner]
- `POST /chatbots/{id}/publish` — publicar [JWT owner]
- `GET /chatbots/{id}/embed` — `embed_code` + `public_url`

### Documentos (protegidos por JWT + validación de propiedad)
- `POST /documents/upload` — subir MD/TXT/PDF/DOCX; deduplica por SHA-256
- `GET /documents?chatbot_id=` — listar (`limit`, `offset`)
- `GET /documents/{id}` — detalle
- `DELETE /documents/{id}?chatbot_id=` — eliminar metadatos + contenido

### Chat
- `POST /chat/{id}` — síncrono (100 req/min/IP) — memoria conversacional via `messages`
- `POST /chat/{id}/stream` — SSE token-a-token (mismo pipeline)
- `GET /chat/{id}/history` — historial [JWT: owner | admin | student asociado]

### Admin
- `POST /admin/teachers` — crear docente [JWT admin]
- `GET /admin/teachers` — listar (sin passwords) [JWT admin]
- `PUT /admin/teachers/{id}` — editar [JWT admin]
- `DELETE /admin/teachers/{id}` — eliminar [JWT admin]

### Docente
- `GET /teacher/metrics` — chatbots totales/publicados, documentos indexados, conversaciones semanales [JWT teacher]

---

## 6. Pipeline de Documentos

### Upload (síncrono)
```
POST /documents/upload (multipart: file + chatbot_id)
  → JWT + validación de propiedad (owner_id == chatbot.owner_id)
  → Validación: extensión (.md/.txt/.pdf/.docx), tamaño (≤20 MB)
  → extract_text_from_file() — UTF-8 / PyMuPDF / python-docx (párrafos + tablas)
  → SHA-256 del texto → verificar duplicado en document_contents
  → upload_file_to_blob() → Supabase Storage
  → store_document_content() → Supabase document_contents
  → create_document() → Supabase documents (status: "indexed")
```

### Construcción de Contexto (`context_builder.py`)
```
get_all_contents_for_chatbot(chatbot_id)
  → [{"filename": "...", "content": "texto completo"}, ...]
  → chunk_document(text, chunk_size=1500, overlap=200) → chunks
  → rank_chunks(chunks, query) → orden por overlap de tokens
  → selección greedy hasta MAX_CONTEXT_CHARS (60 000)
  → "--- Documento: {filename} ---\n{chunk}\n" concatenado
```

### Chat (síncrono)
```
POST /chat/{chatbot_id}
  → Caché TTL 5 min (key: chatbot_id:sha256(message))
  → get_all_contents_for_chatbot() → context_builder.build_context()
  → list_messages_for_conversation(limit=20) — tabla messages (fallback JSONB)
  → system_prompt: chatbot.system_prompt_override o default por tone/restriction_level
  → decrypt_api_key(owner.openrouter_api_key) → validar → fallback whitelist
  → llm.generate(system_prompt, context, message, temperature, history_messages)
  → _persist_chat_turn() → create_messages_batch([user_msg, assistant_msg])
  → ChatResponse { response, conversation_id, sources: [filenames] }
```

### Chat (streaming SSE)
```
POST /chat/{chatbot_id}/stream
  → Mismo pipeline de preparación
  → StreamingResponse(media_type="text/event-stream")
  → event: token → { "content": "fragmento" }  (por cada chunk de OpenRouter)
  → event: done  → { "conversation_id": "...", "sources": [...] }
  → event: error → { "message": "..." }
  → Headers: X-Accel-Buffering: no, Cache-Control: no-cache, no-transform
```

### Temperatures por `restriction_level`

| Nivel | Temperature |
|---|---|
| `strict` | 0.2 |
| `guided` | 0.5 |
| `open` | 0.8 |

---

## 7. Seguridad

| Control | Implementación |
|---|---|
| Cifrado API keys | Fernet (`security_utils.py`) — sin fallback silencioso a texto plano |
| Rate limiting | `slowapi`: login 10/min, register 5/min, chat 100/min/IP |
| Aislamiento multi-tenant | `owner_id` / `chatbot_id` validados en todas las queries y endpoints |
| Passwords | bcrypt — filtrados de toda respuesta HTTP en `map_user_response()` |
| JWT | HS256 con `jti` único, refresh token con rotación, `revoked_tokens` para invalidación |
| Rol forzado | Registro público siempre asigna `role: student` |
| system_prompt | `MAX_SYSTEM_PROMPT_LENGTH = 2000` chars — validado en POST y PUT |
| CSP + Headers | `next.config.ts`: CSP con `connect-src` explícito + `frame-ancestors *` para iframes en LMS |
| Historial | `GET /chat/{id}/history` — requiere JWT + validación de rol |
| Token frontend | `localStorage` — compartido entre pestañas, mitigado por expiración 24h + revocación |

---

## 8. Testing

```bash
cd backend && pytest -v   # 44 tests
```

**Grupos:** sistema, auth, seguridad multi-tenant, chat (sync+stream), validaciones, admin CRUD, `security_utils`, `context_builder`.

---

## 9. Formatos de Documento Soportados

| Formato | MIME | Extracción |
|---|---|---|
| Markdown | `text/markdown` | UTF-8 decode |
| Texto plano | `text/plain` | UTF-8 decode |
| PDF digital | `application/pdf` | PyMuPDF (`fitz`) — PDFs escaneados devuelven 400 |
| Word | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | python-docx (párrafos + tablas) |

---

## 10. Migraciones SQL

Aplicar con `supabase db push` desde la raíz del proyecto:

| Archivo | Contenido |
|---|---|
| `20260607152000_harden_core_tables.sql` | Columnas nativas en `users`, columnas pedagógicas en `chatbots`, campos adicionales en `documents` y `conversations` |
| `20260607153000_add_missing_indexes.sql` | 12 índices en 5 tablas |
| `20260607154000_extract_messages_table.sql` | Crea tabla `messages` + migra datos desde JSONB |
| `20260608120000_drop_messages_jsonb_legacy.sql` | Elimina `conversations.messages` (JSONB) |
| `20260611120000_add_revoked_tokens.sql` | Crea tabla `revoked_tokens` para invalidación de JWT |
