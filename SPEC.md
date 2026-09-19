# EduRAG — Especificación Técnica (SPEC.md)

## 1. Concepto y Visión

EduRAG es una plataforma SaaS educativa multi-tenant diseñada para transformar materiales docentes estructurados (Markdown, TXT, PDF digital y DOCX) en asistentes pedagógicos interactivos para estudiantes. Los chatbots pueden consultarse directamente desde el marketplace público o embeberse en plataformas LMS (Moodle, Canvas) mediante `<iframe>`.

**Restricciones de diseño no negociables:**
- **Costo operativo \$0/mes permanente:** Supabase Free Tier + Vercel + Railway + APIs gratuitas de LLM (BYOK).
- **Aislamiento estricto multi-tenant:** Validación obligatoria de titularidad `(owner_id, chatbot_id)` en cada operación de lectura, escritura o consulta.
- **RAG léxico sin motor vectorial dedicado:** Eliminación de ChromaDB / vector stores locales para evitar `ContainerTimeout` y sobrecarga de memoria (~500 MB venv). Extracción directa a PostgreSQL + clasificación al vuelo en memoria.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Proveedor | Tier |
|---|---|---|---|
| **Frontend SPA** | Next.js 16 (App Router) + Tailwind CSS + Radix UI | Vercel | Free |
| **API Backend** | FastAPI (Python 3.11/3.12) + Uvicorn | Railway | Free |
| **Base de Datos** | Supabase PostgreSQL 15 | Supabase | Free Tier permanente |
| **Almacenamiento** | Supabase Storage (bucket `documents`) | Supabase | Free (1 GB) |
| **Autenticación** | JWT HS256 (PyJWT + bcrypt) con rotación y revocación | — | Free |
| **Cifrado** | Fernet (`cryptography`) para API keys | — | Free |
| **Inferencia LLM** | OpenRouter Client (`httpx.AsyncClient`) | OpenRouter | Free (BYOK) |

---

## 3. Modelo de Datos (PostgreSQL — Supabase)

### Tabla `users`
```sql
create table users (
  id                 text primary key,
  email              text unique not null,
  password           text,
  role               text not null default 'student' check (role in ('teacher','student','admin')),
  auth_method        text not null default 'email_password',
  first_name         text default '',
  last_name          text default '',
  institution_name   text default '',
  openrouter_api_key text default '',  -- cifrado con Fernet
  openrouter_model   text default '',
  is_test_account    boolean default false,
  country            text,
  is_active          boolean default true,
  created_at         timestamptz default now()
);
```

### Tabla `chatbots`
```sql
create table chatbots (
  id                     text primary key,
  owner_id               text references users(id) on delete cascade,
  name                   text not null,
  subject_area           text,
  education_level        text,
  tone                   text default 'friendly' check (tone in ('formal','friendly','technical')),
  welcome_message        text,
  system_prompt_override text,  -- máx 2000 chars (validado en backend)
  restriction_level      text default 'guided' check (restriction_level in ('strict','guided','open')),
  llm_provider           text default 'openrouter',
  public_url             text,
  embed_code             text,
  is_published           boolean default false,
  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
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
  student_id  uuid,  -- nullable para usuarios no autenticados
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
```

### Tabla `messages` (normalizada — reemplaza JSONB legacy)
```sql
create table messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id text not null references conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant','system')),
  content         text not null,
  created_at      timestamptz not null default now()
);
create index idx_messages_conversation_id      on messages(conversation_id);
create index idx_messages_conversation_created on messages(conversation_id, created_at asc);
```

### Tabla `revoked_tokens`
```sql
create table revoked_tokens (
  jti        text primary key,
  revoked_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index idx_revoked_tokens_expires_at on revoked_tokens(expires_at);
```

---

## 4. Índices de Rendimiento

Aplicados mediante migraciones versionadas en `supabase/migrations/`:

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
- `GET /health` — Health check básico.
- `GET /ready` — Readiness probe (verifica conectividad con Supabase).
- `GET /platform/stats` — Estadísticas públicas agregadas (chatbots publicados, docentes activos, total mensajes).

### Autenticación
- `POST /auth/login` (10/min) — Emite par access/refresh token; excluye el campo `password` de la respuesta.
- `POST /auth/register` (5/min) — Registro de estudiantes (fuerza `role: student`).
- `POST /auth/refresh` (20/min) — Rota tokens e invalida el `jti` anterior `[JWT]`.
- `POST /auth/logout` — Invalida el `jti` activo en `revoked_tokens` `[JWT]`.
- `GET /auth/me` — Datos del usuario autenticado `[JWT]`.
- `PUT /auth/me/profile` — Actualización de perfil y clave OpenRouter `[JWT]`.

### Chatbots
- `GET /chatbots` — Listado con soporte para `owner_id`, `published_only`, `limit` y `offset`.
- `POST /chatbots` — Creación de chatbot (valida `system_prompt_override` ≤ 2000 chars) `[JWT Teacher]`.
- `GET /chatbots/{id}` — Detalle público/privado (oculta prompt a terceros).
- `PUT /chatbots/{id}` — Actualización de parámetros pedagógicos `[JWT Owner]`.
- `DELETE /chatbots/{id}` — Eliminación en cascada `[JWT Owner]`.
- `POST /chatbots/{id}/publish` — Publicación al marketplace `[JWT Owner]`.
- `GET /chatbots/{id}/embed` — Obtención de `embed_code` y `public_url`.

### Documentos
- `POST /documents/upload` — Ingesta síncrona de MD, TXT, PDF digital o DOCX con deduplicación por SHA-256 `[JWT Owner]`.
- `GET /documents?chatbot_id=` — Listado de documentos indexados `[JWT Owner]`.
- `GET /documents/{id}` — Metadatos individuales `[JWT Owner]`.
- `DELETE /documents/{id}?chatbot_id=` — Eliminación de archivo binario y contenido textual `[JWT Owner]`.

### Chat
- `POST /chat/{id}` — Inferencia síncrona con memoria contextual (100 req/min/IP).
- `POST /chat/{id}/stream` — Streaming de respuesta token a token vía SSE (`event: token`, `event: done`, `event: error`).
- `GET /chat/{id}/history` — Historial de conversación `[JWT: Owner, Admin o Estudiante participante]`.

### Docente y Administración
- `GET /teacher/metrics` — Métricas de uso y gestión docente `[JWT Teacher]`.
- `POST /admin/teachers` — Creación de cuenta docente `[JWT Admin]`.
- `GET /admin/teachers` — Listado de docentes `[JWT Admin]`.
- `PUT /admin/teachers/{id}` — Modificación de cuenta docente `[JWT Admin]`.
- `DELETE /admin/teachers/{id}` — Baja de cuenta docente `[JWT Admin]`.

---

## 6. Pipeline de Documentos y Construcción de Contexto

### Upload Síncrono
```
POST /documents/upload (multipart/form-data)
  ├── Validación de token JWT y titularidad (owner_id == chatbot.owner_id)
  ├── Validación de tamaño (máx. 20 MB) y MIME admitido
  ├── Extracción de texto:
  │     ├── Markdown / TXT -> UTF-8 directo
  │     ├── PDF Digital    -> PyMuPDF (fitz)
  │     └── DOCX           -> python-docx (párrafos + celdas de tablas)
  ├── Deduplicación: cálculo de SHA-256 sobre el texto extraído
  ├── Almacenamiento binario en Supabase Storage (bucket 'documents')
  ├── Persistencia textual en 'document_contents'
  └── Registro de metadatos en 'documents' (status: 'indexed')
```

### Construcción de Contexto (`context_builder.py`)
```
build_context(documents, query, max_chars=60_000)
  ├── Fragmenta cada documento en chunks de 1,500 caracteres con overlap de 200 caracteres.
  ├── Evalúa puntuación léxica de cada chunk según solapamiento de tokens con la query.
  ├── Ordena chunks descendentemente por relevancia.
  └── Selecciona codiciosamente hasta copar el presupuesto de 60,000 caracteres.
```

### Temperatures por Nivel de Restricción Pedagógica

| Nivel | Temperature | Comportamiento |
|---|---|---|
| `strict` | 0.2 | Respuestas deterministas y ceñidas exclusivamente al texto provisto. |
| `guided` | 0.5 | Respuestas didácticas con analogías breves dentro del marco documental. |
| `open` | 0.8 | Respuestas exploratorias y conversacionales orientadas a debate. |

---

## 7. Seguridad y Resiliencia

- **Cifrado Fernet:** Almacenamiento cifrado de API keys BYOK con derivación segura.
- **Sanitización de Respuestas:** Función `map_user_response()` purga hashes de contraseñas de cualquier salida serializada.
- **Protección contra DoS / Abuso:** Rate limiting en memoria con `slowapi` calibrado por criticidad de endpoint.
- **Mitigación XSS / Iframe:** Políticas CSP en Next.js con configuración de `frame-ancestors *` para integración sin bloqueo en LMS externos.

---

## 8. Verificación y Testing

- **Backend (Pytest):** 61 tests automatizados y herméticos con dobles de prueba (`MockSupabaseClient`, `MockStorageClient`).
- **Frontend (Vitest):** 82 tests unitarios sobre componentes, contexto de autenticación y cliente de API.
- **CI/CD:** Pipeline de GitHub Actions ejecutando pruebas en Python (3.11, 3.12) y Node.js (20, 22).

---

## 9. Migraciones SQL

Ubicadas en `supabase/migrations/` y ejecutadas mediante `supabase db push`:

| Archivo | Descripción |
|---|---|
| `20260607152000_harden_core_tables.sql` | Columnas nativas en `users`, parámetros pedagógicos en `chatbots`, `content_hash` en `documents`. |
| `20260607153000_add_missing_indexes.sql` | 12 índices de rendimiento en las tablas principales. |
| `20260607154000_extract_messages_table.sql` | Creación de tabla `messages` y migración de datos desde JSONB. |
| `20260608120000_drop_messages_jsonb_legacy.sql` | Eliminación de columna `conversations.messages` (JSONB legacy). |
| `20260611120000_add_revoked_tokens.sql` | Creación de tabla `revoked_tokens` con guarda condicional para `pg_cron`. |
