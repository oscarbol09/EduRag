# EduRAG — Plataforma SaaS Educativa

> Plataforma multi-tenant donde los docentes crean agentes conversacionales entrenados con sus propios documentos (MD, TXT, PDF, DOCX), y los estudiantes los consumen a través de un marketplace centralizado o integrados en LMS externos (Moodle) vía `<iframe>`.

---

## Tabla de Contenidos

- [Visión General](#visión-general)
- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Stack Tecnológico](#stack-tecnológico)
- [Estructura del Repositorio](#estructura-del-repositorio)
- [Modelo de Datos](#modelo-de-datos)
- [Pipeline de Documentos](#pipeline-de-documentos)
- [API Reference](#api-reference)
- [Configuración de Entorno](#configuración-de-entorno)
- [Testing](#testing)
- [Seguridad](#seguridad)
- [Estado del Proyecto](#estado-del-proyecto)
- [Autores](#autores)

---

## Visión General

EduRAG resuelve un problema concreto en la educación digital: los materiales de clase (apuntes, guías, lecturas) están fragmentados y son difíciles de consultar. La plataforma permite a cualquier docente convertir sus documentos en un asistente conversacional inteligente, sin conocimientos de programación, y ponerlo a disposición de sus estudiantes en minutos.

**Principios de diseño:**

- **Costo cero post-primer mes** — toda la infraestructura opera sobre Supabase Free Tier y APIs gratuitas.
- **Aislamiento multi-tenant estricto** — los datos de cada docente están completamente separados por `owner_id` / `chatbot_id`.
- **Extensibilidad LLM** — el proveedor de IA se intercambia en `llm_client.py` sin cambios en la lógica de negocio. Actualmente usa **OpenRouter** (acceso unificado a múltiples modelos gratuitos).
- **Arquitectura sin vector store** — el contenido se almacena como texto en Supabase PostgreSQL y se pasa directamente al context window del modelo, eliminando dependencias pesadas (~500 MB venv de ChromaDB).
- **BYOK (Bring Your Own Key)** — cada docente configura su propia API Key de OpenRouter. Las cuentas en la whitelist usan la key del sistema como fallback.

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase (Cloud)                            │
│                                                                 │
│  ┌──────────────────┐           ┌──────────────────┐            │
│  │    Frontend       │           │     Backend       │            │
│  │  Next.js 16       │──────────▶│  FastAPI 0.2.0   │            │
│  │  Vercel           │           │  Railway          │            │
│  └──────────────────┘           └────────┬─────────┘            │
│                                          │                      │
│                 ┌────────────────────────┴───────────────┐      │
│                 ▼                                        ▼      │
│  ┌───────────────────────────┐        ┌────────────────────┐    │
│  │   Supabase PostgreSQL     │        │  Supabase Storage  │    │
│  │   6 tablas SQL            │        │  Bucket: documents │    │
│  └───────────────────────────┘        └────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                               │
                   ┌───────────▼────────────┐
                   │   OpenRouter API        │
                   │   (modelos gratuitos)   │
                   └────────────────────────┘
```

> **Nota:** El texto completo de cada documento se extrae al momento del upload y se almacena en Supabase (`document_contents`). Al chatear, el backend reconstruye el contexto con `context_builder.build_context()` (chunking léxico de 1500 chars con overlap 200, ranking por overlap de tokens, presupuesto máximo de 60 000 chars).

---

## Stack Tecnológico

| Capa | Tecnología | Proveedor | Tier |
|---|---|---|---|
| Frontend SPA | Next.js 16 + Tailwind CSS + Radix UI | Vercel | Free |
| API Backend | FastAPI (Python 3.11) + Uvicorn | Railway | Free / Económico |
| Base de datos | Supabase PostgreSQL | Supabase | Free Tier permanente |
| Almacenamiento | Supabase Storage (`documents` bucket) | Supabase | Free (1 GB) |
| Autenticación | JWT propio (PyJWT + bcrypt) | — | Free |
| LLM | OpenRouter (múltiples modelos free tier) | OpenRouter API | Free (BYOK) |

---

## Estructura del Repositorio

```
/
├── backend/
│   ├── main.py                     # App FastAPI, endpoints, caché TTL, rate limiting
│   ├── settings.py                 # Variables de entorno (Pydantic Settings, sin defaults inseguros)
│   ├── models.py                   # Modelos Pydantic (request/response)
│   ├── auth.py                     # Middleware JWT (get_current_user / opcional)
│   ├── jwt_token.py                # create/verify JWT (PyJWT HS256)
│   ├── password.py                 # hash_password / verify_password (bcrypt)
│   ├── security_utils.py           # Cifrado Fernet para API keys de docentes
│   ├── supabase_db.py              # CRUD — 6 tablas Postgres en Supabase
│   ├── document_content_store.py   # Almacén de texto en Supabase (document_contents)
│   ├── context_builder.py          # Chunking léxico + ranking + presupuesto 60k chars
│   ├── llm_client.py               # Cliente async OpenRouter (generate + generate_stream)
│   ├── document_uploader.py        # Upload Supabase Storage + extracción texto (MD/TXT/PDF/DOCX)
│   ├── railway.toml                # Config deploy Railway
│   ├── test_main.py                # Suite pytest (26 tests)
│   ├── requirements.txt            # Dependencias Python
│   ├── .env.example                # Plantilla de variables de entorno
│   └── AGENTS.md                   # Guía para agentes IA — backend
│
├── frontend/
│   ├── src/
│   │   ├── app/                    # Next.js App Router
│   │   │   ├── page.tsx            # Landing (stats en vivo desde /platform/stats)
│   │   │   ├── login/              # Login
│   │   │   ├── teacher/            # Dashboard del docente
│   │   │   ├── marketplace/        # Marketplace público
│   │   │   └── chat/[botId]/       # Interfaz de chat (embebible vía iframe)
│   │   ├── lib/
│   │   │   ├── api.ts              # Cliente HTTP centralizado
│   │   │   ├── types.ts            # Tipos TypeScript
│   │   │   ├── context.tsx         # Auth context (sessionStorage)
│   │   │   └── utils.ts            # Helpers
│   │   └── components/
│   ├── vercel.json                 # Framework + 5 security headers (CSP, X-Frame-Options, etc.)
│   └── AGENTS.md                   # Guía para agentes IA — frontend
│
├── supabase/
│   └── migrations/                 # Migraciones SQL ordenadas cronológicamente
│       ├── 20260607152000_harden_core_tables.sql
│       ├── 20260607153000_add_missing_indexes.sql
│       ├── 20260607154000_extract_messages_table.sql
│       └── 20260608120000_drop_messages_jsonb_legacy.sql
│
├── AGENTS.md                       # Guía global para agentes IA
├── SPEC.md                         # Especificación técnica detallada
└── README.md                       # Este archivo
```

---

## Modelo de Datos

Todas las entidades persisten en **Supabase (PostgreSQL)**. 6 tablas activas.

### `users`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | text PK | ID único |
| `email` | text unique | Correo electrónico |
| `password` | text | Hash bcrypt |
| `role` | text | `teacher | student | admin` |
| `auth_method` | text | `pre_created | email_password` |
| `first_name` | text | Nombre |
| `last_name` | text | Apellido |
| `institution_name` | text | Institución |
| `openrouter_api_key` | text | API Key cifrada con Fernet |
| `openrouter_model` | text | Modelo preferido |
| `is_test_account` | boolean | Whitelist del sistema |
| `country` | text | País |
| `is_active` | boolean | default true |
| `created_at` | timestamptz | — |

### `chatbots`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | text PK | — |
| `owner_id` | text FK → users | Creador |
| `name` | text | Nombre del chatbot |
| `subject_area` | text | Área de estudio |
| `education_level` | text | `secondary | university` |
| `tone` | text | `formal | friendly | technical` |
| `welcome_message` | text | — |
| `system_prompt_override` | text | Máx 2000 chars |
| `restriction_level` | text | `strict | guided | open` |
| `is_published` | boolean | default false |
| `public_url` | text | `/chat/{id}` |
| `embed_code` | text | `<iframe>` para LMS |
| `created_at / updated_at` | timestamptz | — |

### `documents`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | text PK | — |
| `chatbot_id` | text FK → chatbots | — |
| `filename` | text | Nombre original |
| `mime_type` | text | `text/markdown | text/plain | application/pdf | ...docx` |
| `blob_url` | text | Ruta en Supabase Storage |
| `content_hash` | text | SHA-256 del texto (deduplicación) |
| `status` | text | `indexed | error` |
| `chunk_count` | int | — |
| `created_at / processed_at` | timestamptz | — |

### `document_contents`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | text PK | = `document_id` |
| `chatbot_id` | text FK → chatbots | — |
| `filename` | text | — |
| `content` | text | Texto completo extraído |
| `content_hash` | text | SHA-256 (índice único por chatbot) |

### `conversations`
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | text PK | — |
| `chatbot_id` | text FK → chatbots | — |
| `student_id` | uuid | Estudiante autenticado (opcional) |
| `created_at / updated_at` | timestamptz | — |

> El campo `messages` (JSONB) fue eliminado por la migración `20260608120000`. Los mensajes viven ahora en la tabla `messages`.

### `messages` (tabla normalizada)
| Campo | Tipo | Descripción |
|---|---|---|
| `id` | uuid PK | gen_random_uuid() |
| `conversation_id` | uuid FK → conversations | ON DELETE CASCADE |
| `role` | text | `user | assistant | system` |
| `content` | text | Contenido del mensaje |
| `created_at` | timestamptz | default now() |

---

## Pipeline de Documentos

### Upload (síncrono)
```
POST /documents/upload
  → Valida JWT + propiedad del chatbot (owner_id == sub)
  → Valida tamaño (máx 20 MB) y extensión (.md, .txt, .pdf, .docx)
  → Extrae texto en memoria (UTF-8 / PyMuPDF / python-docx con tablas)
  → Deduplica por SHA-256 del texto extraído
  → Sube original → Supabase Storage (documents bucket)
  → Guarda texto → Supabase (document_contents)
  → Crea metadatos → Supabase (documents, status: "indexed")
```

### Chat síncrono (`POST /chat/{id}`)
```
  → Verifica caché TTL (5 min)
  → Recupera document_contents del chatbot desde Supabase
  → build_context() — chunking léxico + ranking + ≤ 60 000 chars
  → Recupera historial de messages (tabla normalizada, últimos 20)
  → Valida API key del docente (Fernet decrypt)
  → Llama OpenRouter vía httpx.AsyncClient
  → Persiste turno en tabla messages (create_messages_batch)
  → Retorna { response, conversation_id, sources }
```

### Chat streaming (`POST /chat/{id}/stream`)
```
  Mismo pipeline, pero la respuesta se emite como SSE:
    event: token  → { "content": "fragmento" }
    event: done   → { "conversation_id": "...", "sources": [...] }
    event: error  → { "message": "..." }
  Headers: X-Accel-Buffering: no, Cache-Control: no-cache
```

---

## API Reference

### Sistema

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/health` | — | Health check |
| `GET` | `/ready` | — | Readiness (verifica Supabase) |
| `GET` | `/platform/stats` | — | Estadísticas públicas (chatbots publicados, docentes activos, total mensajes) |

### Autenticación

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/auth/login` | — | Login (10 req/min por IP) |
| `POST` | `/auth/register` | — | Registro público — fuerza `role: student` (5 req/min) |
| `GET` | `/auth/me` | JWT | Datos del usuario actual |
| `PUT` | `/auth/me/profile` | JWT | Actualizar perfil + OpenRouter key + modelo |

### Chatbots

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/chatbots` | opcional | Lista — soporta `owner_id`, `published_only`, `limit`, `offset` |
| `POST` | `/chatbots` | JWT | Crear chatbot |
| `GET` | `/chatbots/{id}` | opcional | Detalle (oculta `system_prompt_override` a terceros) |
| `PUT` | `/chatbots/{id}` | JWT owner | Actualizar |
| `DELETE` | `/chatbots/{id}` | JWT owner | Eliminar + `document_contents` asociados |
| `POST` | `/chatbots/{id}/publish` | JWT owner | Publicar |
| `GET` | `/chatbots/{id}/embed` | — | `embed_code` + `public_url` |

### Documentos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/documents/upload` | JWT owner | Subir MD/TXT/PDF/DOCX — valida propiedad + deduplica por hash |
| `GET` | `/documents` | JWT owner | Listar — `?chatbot_id=` + `limit` / `offset` |
| `GET` | `/documents/{id}` | JWT owner | Detalle |
| `DELETE` | `/documents/{id}` | JWT owner | Eliminar metadatos + contenido |

### Chat

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/chat/{id}` | opcional | Mensaje síncrono (100 req/min/IP) |
| `POST` | `/chat/{id}/stream` | opcional | Mensaje SSE token-a-token |
| `GET` | `/chat/{id}/history` | JWT | Historial — solo owner, admin o estudiante asociado |

### Admin

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/admin/teachers` | JWT admin | Crear docente |
| `GET` | `/admin/teachers` | JWT admin | Listar docentes (sin passwords) |
| `PUT` | `/admin/teachers/{id}` | JWT admin | Editar docente |
| `DELETE` | `/admin/teachers/{id}` | JWT admin | Eliminar docente |

### Docente

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/teacher/metrics` | JWT teacher | Métricas: chatbots, documentos, conversaciones semanales |

---

## Configuración de Entorno

### Backend — `backend/.env`

```env
# Supabase
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_KEY=eyJ...  # service_role key

# JWT (mín. 32 chars)
JWT_SECRET=your-jwt-secret-min-32-chars

# Cifrado de API keys (generar con Fernet.generate_key())
ENCRYPTION_KEY=your-fernet-key

# OpenRouter (fallback para cuentas en whitelist)
OPENROUTER_API_KEY=sk-or-v1-...
DEFAULT_LLM_MODEL=google/gemma-3-27b-it:free
TEST_ACCOUNTS_WHITELIST=admin@edurag.com,test@edurag.com

# App
APP_HOST=0.0.0.0
APP_PORT=8000
CORS_ORIGINS=http://localhost:3000,https://edu-rag-red.vercel.app,https://edurag-production.up.railway.app
MAX_FILE_SIZE_MB=20
MAX_EXTRACTED_TEXT_CHARS=1000000
MAX_CACHE_SIZE=1000
```

### Frontend — `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=https://edurag-production.up.railway.app
```

---

## Testing

```bash
cd backend
pytest -v          # 26 tests automatizados
```

Cobertura de la suite:
- Auth: login, registro, roles, passwords no expuestos
- Seguridad multi-tenant: aislamiento de chatbots, documentos y conversaciones
- `security_utils`: cifrado/descifrado Fernet
- `context_builder`: presupuesto, scoring por relevancia
- Chat: síncrono, streaming SSE, persistencia de `conversation_id`, aislamiento cross-chatbot, historial
- Admin CRUD: crear, listar, actualizar, eliminar docentes; control de acceso 403/404

---

## Seguridad

| Control | Implementación |
|---|---|
| Cifrado de API keys | Fernet (`security_utils.py`) — sin fallback a texto plano |
| Rate limiting | `slowapi`: login 10/min, register 5/min, chat 100/min por IP |
| Aislamiento multi-tenant | `owner_id` / `chatbot_id` validados en todas las queries |
| JWT sin fallbacks | `JWT_SECRET` requerido, sin valor por defecto |
| Passwords no expuestos | `map_user_response()` elimina el campo `password` de toda respuesta |
| CSP + Security Headers | `vercel.json`: CSP, X-Frame-Options: DENY, X-Content-Type-Options, Referrer-Policy, Permissions-Policy |
| Historial protegido | `/chat/{id}/history` — solo owner, admin o estudiante asociado |
| system_prompt limitado | `MAX_SYSTEM_PROMPT_LENGTH = 2000` chars |
| Token en sessionStorage | Se borra al cerrar la pestaña (menor exposición XSS que localStorage) |

---

## Estado del Proyecto

**Auditoría técnica completada — junio 2026.** 27 de 30 ítems resueltos. Acciones manuales pendientes:

```bash
# Aplicar migraciones a Supabase (desde la raíz del proyecto)
supabase db push
```

Las migraciones crean la tabla `messages`, 12 índices de rendimiento y eliminan el campo `messages` JSONB legacy de `conversations`. El backend incluye fallback gracioso si las migraciones aún no están aplicadas.

---

## Autor

Oscar Madera — [@oscarbol09](https://github.com/oscarbol09)
