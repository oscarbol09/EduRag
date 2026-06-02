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
- [Autenticación](#autenticación)
- [Configuración de Entorno](#configuración-de-entorno)
- [Testing](#testing)
- [Roles y Permisos](#roles-y-permisos)
- [Seguridad](#seguridad)
- [Estado del Proyecto](#estado-del-proyecto)
- [Extensibilidad LLM](#extensibilidad-llm)
- [Autores](#autores)

---

## Visión General

EduRAG resuelve un problema concreto en la educación digital: los materiales de clase (apuntes, guías, lecturas) están fragmentados y son difíciles de consultar. La plataforma permite a cualquier docente convertir sus documentos en un asistente conversacional inteligente, sin conocimientos de programación, y ponerlo a disposición de sus estudiantes en minutos.

**Principios de diseño:**

* **Costo cero post-primer mes** — toda la infraestructura opera sobre Supabase Free Tier y APIs gratuitas.
* **Aislamiento multi-tenant estricto** — los datos de cada docente están completamente separados por `owner_id` / `chatbot_id`.
* **Extensibilidad LLM** — el proveedor de IA se intercambia en `llm_client.py` sin cambios en la lógica de negocio. Actualmente usa **OpenRouter** (acceso unificado a múltiples modelos gratuitos).
* **Arquitectura sin vector store** — el contenido de los documentos se almacena como texto en Supabase PostgreSQL y se pasa directamente al context window del modelo, eliminando dependencias pesadas (~500 MB venv de ChromaDB) y asegurando despliegues rápidos.
* **BYOK (Bring Your Own Key)** — cada docente configura su propia API Key de OpenRouter. Las cuentas `@edurag.com` usan la key del admin como fallback.

---

## Arquitectura del Sistema

```
┌────────────────────────────────────────────────────────┐
│                        Supabase                        │
│                                                        │
│  ┌─────────────────┐   ┌─────────────────┐             │
│  │    Frontend     │   │     Backend     │             │
│  │  Next.js 16     │──▶│  FastAPI 0.2.0  │             │
│  │  (Vercel SPA)   │   │  (Railway / App)│             │
│  └─────────────────┘   └────────┬────────┘             │
│                                 │                      │
│               ┌─────────────────┴──────────────┐       │
│               ▼                                ▼       │
│  ┌──────────────────────────┐     ┌──────────────────┐ │
│  │    Supabase Postgres     │     │ Supabase Storage │ │
│  │       5 tablas SQL       │     │ Bucket: documents│ │
│  └──────────────────────────┘     └──────────────────┘ │
└────────────────────────────────────────────────────────┘
                               │
                   ┌────────────▼───────────┐
                   │   OpenRouter API        │
                   │   (modelos gratuitos)   │
                   └────────────────────────┘
```

> **Nota arquitectural:** El texto completo de cada documento se extrae al momento del upload y se almacena en Supabase Postgres (`document_contents`). Al chatear, el backend reconstruye el contexto con `context_builder.build_context()` (chunking léxico de 1500 chars con overlap 200, ranking por overlap de tokens y presupuesto máximo de 60 000 chars) y lo envía al modelo vía OpenRouter (context window hasta ~1M tokens según el modelo).

---

## Stack Tecnológico

| Capa | Tecnología | Proveedor | Tier |
|---|---|---|---|
| Frontend SPA | Next.js 16 + Tailwind CSS + Radix UI | Vercel (Recomendado) | Free |
| API Backend | FastAPI (Python 3.11) + Gunicorn + Uvicorn | Railway | Free / Económico |
| Base de datos | Supabase PostgreSQL | Supabase | Free Tier permanente |
| Almacenamiento | Supabase Storage | Supabase (`documents` bucket) | Free (1 GB) |
| Autenticación | JWT propio (PyJWT + bcrypt) | — | Free |
| LLM | OpenRouter (múltiples modelos free tier) | OpenRouter API | Free tier (BYOK) |

---

## Estructura del Repositorio

```
/
├── backend/                        # API REST — FastAPI
│   ├── main.py                     # Aplicación principal + todos los endpoints, caché TTL, CORS, rate limit
│   ├── settings.py                 # Variables de entorno (Pydantic Settings sin fallbacks)
│   ├── models.py                   # Modelos Pydantic (request/response)
│   ├── auth.py                     # Middleware de autenticación JWT
│   ├── jwt_token.py                # create_jwt_token / verify_jwt_token (PyJWT seguro)
│   ├── password.py                 # hash_password / verify_password (bcrypt)
│   ├── supabase_db.py              # CRUD — 5 tablas Postgres en Supabase
│   ├── document_content_store.py   # Almacén de texto de documentos en Supabase
│   ├── context_builder.py          # Chunking léxico + ranking por tokens + presupuesto 60k chars
│   ├── llm_client.py               # Cliente async httpx → OpenRouter con `generate()` y `generate_stream()`
│   ├── document_uploader.py        # Supabase Storage bucket upload + extr. texto (MD, TXT, PDF, DOCX)
│   ├── railway.toml                # Config de deploy Railway (Uvicorn con timeouts ajustados)
│   ├── test_main.py                # Suite de pruebas automatizadas con pytest
│   ├── manual_test_api.py          # Script manual de pruebas de integración
│   ├── requirements.txt            # Dependencias actualizadas sin dependencias pesadas
│   ├── .env.example                # Plantilla de variables Supabase
│   └── AGENTS.md                   # Guía para agentes IA — backend
│
├── frontend/                       # SPA — Next.js 16
│   ├── src/
│   │   ├── app/                    # Next.js App Router
│   │   │   ├── page.tsx            # Home / landing
│   │   │   ├── login/              # Página de login
│   │   │   ├── teacher/            # Dashboard del docente
│   │   │   │   └── chatbots/new/   # Formulario de creación de chatbot
│   │   │   ├── marketplace/        # Marketplace público de chatbots
│   │   │   └── chat/[botId]/       # Interfaz de chat (embebible vía iframe)
│   │   ├── lib/
│   │   │   ├── api.ts              # Cliente HTTP centralizado
│   │   │   ├── types.ts            # Tipos TypeScript
│   │   │   ├── context.tsx         # Auth context (React)
│   │   │   └── utils.ts            # Funciones helper
│   │   └── components/             # Componentes reutilizables
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   └── AGENTS.md                   # Guía para agentes IA — frontend
│
├── AGENTS.md                       # Guía global para agentes IA
├── SPEC.md                         # Especificación técnica detallada
└── README.md                       # Este archivo
```

---

## Modelo de Datos

Todas las entidades persisten en **Supabase (PostgreSQL)**.

### Tabla `users`
* `id` (text, primary key) — ID único del usuario.
* `email` (text, unique) — Correo electrónico.
* `password` (text) — Hash bcrypt de la contraseña.
* `role` (text) — Rol de usuario (`teacher | student | admin`).
* `auth_method` (text) — Método (`pre_created | email_password`).
* `first_name` (text, opcional) — Nombre del docente.
* `last_name` (text, opcional) — Apellido del docente.
* `institution_name` (text, opcional) — Nombre de la institución.
* `openrouter_api_key` (text, opcional) — API Key propia del docente.
* `openrouter_model` (text, opcional) — Modelo preferido de OpenRouter del docente.
* `is_test_account` (boolean, default false) — Identifica cuentas de prueba.
* `institution` (text, opcional) — campo legacy en formato serializado `"Nombre Apellido | Institución | OpenRouterKey | ModelId"` (soportado para retrocompatibilidad).
* `country` (text, opcional).
* `is_active` (boolean, default true).
* `created_at` (timestamptz).

### Tabla `chatbots`
* `id` (text, primary key) — ID único del bot.
* `owner_id` (text, foreign key → `users.id`) — Creador del bot.
* `name` (text) — Nombre del chatbot.
* `subject_area` (text) — Área de estudio.
* `education_level` (text) — `secondary | university`.
* `tone` (text) — `formal | friendly | technical`.
* `welcome_message` (text).
* `system_prompt_override` (text, opcional).
* `restriction_level` (text) — `strict | guided | open`.
* `llm_provider` (text) — siempre `openrouter`.
* `public_url` (text) — URL pública del chat.
* `embed_code` (text) — Tag iframe para LMS.
* `is_published` (boolean, default false).
* `created_at` / `updated_at` (timestamptz).

### Tabla `documents`
* `id` (text, primary key) — ID único del documento.
* `chatbot_id` (text, foreign key → `chatbots.id` on delete cascade).
* `filename` (text) — Nombre del archivo original.
* `mime_type` (text) — Tipo de archivo (`text/markdown | text/plain | application/pdf | application/vnd.openxmlformats-officedocument.wordprocessingml.document`).
* `blob_url` (text) — URL de referencia en Supabase Storage.
* `status` (text) — `indexed | queued | error`.
* `chunk_count` (int, default 1).
* `created_at` / `processed_at` (timestamptz).

### Tabla `document_contents`
* `id` (text, primary key) — ID del documento.
* `chatbot_id` (text, foreign key → `chatbots.id` on delete cascade).
* `filename` (text).
* `content` (text) — Texto completo extraído.

### Tabla `conversations`
* `id` (text, primary key) — ID de la conversación.
* `chatbot_id` (text, foreign key → `chatbots.id` on delete cascade).
* `student_id` (text, opcional) — ID del estudiante (si está autenticado).
* `messages` (jsonb) — Historial de mensajes en formato JSON.
* `created_at` / `updated_at` (timestamptz).

---

## Pipeline de Documentos

### Upload (síncrono)
```
Docente sube archivo (MD / TXT / PDF / DOCX)
        │
        ▼
POST /documents/upload
        │
        ├── Valida JWT del usuario y propiedad del chatbot (owner_id == sub)
        ├── Valida tamaño (máx 20 MB) y tipos de archivo (.md, .txt, .pdf, .docx)
        ├── Extrae texto decodificando UTF-8 / decodificación PDF y DOCX en memoria
        ├── Sube archivo original → Supabase Storage (documents bucket)
        ├── Guarda texto extraído → Supabase PostgreSQL (document_contents)
        └── Crea registro de metadatos → Supabase PostgreSQL (documents)
```

### Chat (síncrono)
```
Estudiante envía mensaje
        │
        ▼
POST /chat/{chatbot_id}
        │
        ├── Verifica caché local con expiración TTL (5 minutos)
        ├── Recupera todos los document_contents del chatbot desde Supabase Postgres
        ├── Construye contexto con `context_builder.build_context()` (chunking 1500c, ranking por overlap, ≤ 60 000 chars)
        ├── Verifica si el docente tiene OpenRouter key configurada en `openrouter_api_key` (con fallback legacy en `institution`)
        ├── Si no tiene key y no es cuenta @edurag.com → retorna mensaje de error
        ├── Llama a OpenRouter API con `httpx.AsyncClient` (no bloquea event loop)
        ├── Persiste conversación en la tabla conversations
        └── Retorna ChatResponse { response, conversation_id, sources }
```

### Chat (streaming SSE)
```
Estudiante envía mensaje
        │
        ▼
POST /chat/{chatbot_id}/stream    (text/event-stream)
        │
        ├── Mismo flujo de preparación que el endpoint síncrono
        ├── Retorna StreamingResponse con `event: token` / `event: done` / `event: error`
        ├── Headers: X-Accel-Buffering: no, Cache-Control: no-cache, no-transform
        └── El frontend hace fallback automático a /chat/{chatbot_id} si el stream falla
```

---

## API Reference

### Sistema

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/health` | — | Health check |
| `GET` | `/ready` | — | Readiness (verifica Supabase) |

### Autenticación (exclusión de hashes de contraseñas)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/auth/login` | — | Login email + password → emite JWT sin contraseñas |
| `POST` | `/auth/register` | — | Registro (fuerza rol student, filtra hashes) |
| `GET` | `/auth/me` | JWT | Datos del usuario del token actual |
| `PUT` | `/auth/me/profile` | JWT (docente) | Actualizar perfil + OpenRouter key + modelo |

### Chatbots

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/chatbots` | — / JWT | Lista con filtros `owner_id`, `published_only` |
| `POST` | `/chatbots` | JWT | Crear chatbot |
| `GET` | `/chatbots/{id}` | — / JWT | Detalle del chatbot |
| `PUT` | `/chatbots/{id}` | JWT (owner) | Actualizar chatbot |
| `DELETE` | `/chatbots/{id}` | JWT (owner) | Eliminar chatbot + `document_contents` asociados |
| `POST` | `/chatbots/{id}/publish` | JWT (owner) | Publicar chatbot |
| `GET` | `/chatbots/{id}/embed` | — | `embed_code` + `public_url` |

### Documentos (parches de seguridad activos)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/documents/upload` | JWT (owner) | Subir MD/TXT/PDF/DOCX. Valida propiedad del bot. |
| `GET` | `/documents?chatbot_id=` | JWT (owner) | Listar por chatbot. Valida propiedad del bot. |
| `GET` | `/documents/{id}` | JWT (owner) | Detalle de un documento. Valida propiedad del bot. |
| `DELETE` | `/documents/{id}?chatbot_id=` | JWT (owner) | Eliminar metadatos + contenido. Valida propiedad del bot. |

### Chat

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/chat/{chatbot_id}` | opcional | Enviar mensaje — respuesta completa (100 req/min/IP) |
| `POST` | `/chat/{chatbot_id}/stream` | opcional | Enviar mensaje con SSE (token a token) |
| `GET` | `/chat/{chatbot_id}/history` | opcional | Historial de conversación |

### Admin

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/admin/teachers` | JWT (admin) | Crear cuenta de docente |
| `GET` | `/admin/teachers` | JWT (admin) | Listar docentes |
| `PUT` | `/admin/teachers/{id}` | JWT (admin) | Editar docente |
| `DELETE` | `/admin/teachers/{id}` | JWT (admin) | Eliminar docente |

---

## Configuración de Entorno

### Backend — `backend/.env`

```env
# Supabase Configuration
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_KEY=eyJ...  # service_role key (Settings > API > service_role)

# JWT Secret (Requerido)
JWT_SECRET=your-jwt-secret-min-32-chars

# OpenRouter API Key (fallback para cuentas @edurag.com)
OPENROUTER_API_KEY=sk-or-v1-...

# App Settings
APP_HOST=0.0.0.0
APP_PORT=8000
CORS_ORIGINS=http://localhost:3000,https://edu-rag-red.vercel.app
MAX_FILE_SIZE_MB=20
MAX_CACHE_SIZE=1000
```

---

## Testing

La plataforma posee una suite de pruebas automatizadas completa con `pytest`.

```bash
cd backend

# Correr pruebas automatizadas
pytest -v

# Ejecutar script manual de integración
python manual_test_api.py
```

---

## Seguridad

* **Aislamiento Multi-tenant:** Validación de `owner_id` y `chatbot_id` en todas las queries y endpoints.
* **Endpoints Protegidos:** `/documents` protegidos obligatoriamente con token JWT.
* **Filtro de Contraseñas:** Se eliminaron los campos de contraseñas hasheadas en todas las respuestas HTTP de auth.
* **Caché en Memoria con TTL:** Expiración de caché estricta de 5 minutos en el chat para evitar persistencia obsoleta.
* **Firma JWT Segura:** Obliga a configurar un `JWT_SECRET` fuerte al inicio, sin fallbacks inseguros.

---

## Autor

* Oscar Madera — [@oscarbol09](https://github.com/oscarbol09)
