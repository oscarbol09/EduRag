# EduRAG — Plataforma SaaS Educativa

> Plataforma multi-tenant donde los docentes crean agentes conversacionales entrenados con sus propios documentos (MD, TXT), y los estudiantes los consumen a través de un marketplace centralizado o integrados en LMS externos (Moodle) vía `<iframe>`.

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
* **Extensibilidad LLM** — el proveedor de IA (Gemini hoy, Claude mañana) se intercambia sin cambios en la lógica de negocio.
* **Arquitectura sin vector store** — el contenido de los documentos se almacena como texto en Supabase PostgreSQL y se pasa directamente al context window de Gemini, eliminando dependencias pesadas (~500 MB venv de ChromaDB) y asegurando despliegues rápidos.

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
                  │   Google Gemini API     │
                  │   gemini-2.0-flash      │
                  └────────────────────────┘
```

> **Nota arquitectural:** El texto completo de cada documento se extrae al momento del upload y se almacena en Supabase Postgres (`document_contents`). Al chatear, todos los textos del chatbot se recuperan y pasan directamente al prompt de Gemini (context window ~1M tokens).

---

## Stack Tecnológico

| Capa | Tecnología | Proveedor | Tier |
|---|---|---|---|
| Frontend SPA | Next.js 16 + Tailwind CSS + Radix UI | Vercel (Recomendado) | Free |
| API Backend | FastAPI (Python 3.11) + Gunicorn + Uvicorn | Railway | Free / Económico |
| Base de datos | Supabase PostgreSQL | Supabase | Free Tier permanente |
| Almacenamiento | Supabase Storage | Supabase (`documents` bucket) | Free (1 GB) |
| Autenticación | JWT propio (PyJWT + bcrypt) | — | Free |
| LLM | Google Gemini 2.0 Flash | Google AI API | Free tier (15 RPM) |

---

## Estructura del Repositorio

```
/
├── backend/                        # API REST — FastAPI
│   ├── main.py                     # Aplicación principal + todos los endpoints, caché TTL y CORS
│   ├── settings.py                 # Variables de entorno (Pydantic Settings sin fallbacks)
│   ├── models.py                   # Modelos Pydantic (request/response)
│   ├── auth.py                     # Middleware de autenticación JWT
│   ├── jwt_token.py                # create_jwt_token / verify_jwt_token (PyJWT seguro)
│   ├── password.py                 # hash_password / verify_password (bcrypt)
│   ├── supabase_db.py              # CRUD — 5 tablas Postgres en Supabase
│   ├── vector_store.py             # Almacén de texto de documentos en Supabase
│   ├── llm_client.py               # Abstracción LLM (Gemini activo / Claude stub)
│   ├── document_uploader.py        # Supabase Storage bucket upload + extr. texto
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
* `institution` (text, opcional).
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
* `llm_provider` (text) — `gemini | claude`.
* `public_url` (text) — URL pública del chat.
* `embed_code` (text) — Tag iframe para LMS.
* `is_published` (boolean, default false).
* `created_at` / `updated_at` (timestamptz).

### Tabla `documents`
* `id` (text, primary key) — ID único del documento.
* `chatbot_id` (text, foreign key → `chatbots.id` on delete cascade).
* `filename` (text) — Nombre del archivo original.
* `mime_type` (text) — Tipo de archivo (`text/markdown | text/plain`).
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
Docente sube archivo (MD / TXT)
        │
        ▼
POST /documents/upload
        │
        ├── Valida JWT del usuario y propiedad del chatbot (owner_id == sub)
        ├── Valida tamaño (máx 20 MB) y tipos de archivo (.md, .txt)
        ├── Extrae texto decodificando UTF-8
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
        ├── Construye contexto: "--- Documento: {filename} ---\n{content}"
        ├── Llama a Gemini 2.0 Flash con prompt base + contexto + pregunta
        ├── Persiste conversación en la tabla conversations
        └── Retorna ChatResponse { response, conversation_id, sources }
```

---

## API Reference

### Documentos (Parches de seguridad activos)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/documents/upload` | JWT (owner) | Subir MD/TXT. Valida propiedad del bot. |
| `GET` | `/documents` | JWT (owner) | Listar por chatbot. Valida propiedad del bot. |
| `GET` | `/documents/{id}` | JWT (owner) | Detalle de un documento. Valida propiedad del bot. |
| `DELETE` | `/documents/{id}` | JWT (owner) | Eliminar documento y contenido. Valida propiedad del bot. |

### Autenticación (Exclusión de hashes de contraseñas)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/auth/login` | — | Login email + password → emite JWT sin contraseñas |
| `POST` | `/auth/register` | — | Registro (fuerza rol student, filtra hashes) |
| `GET` | `/auth/me` | JWT | Datos del usuario del token actual |

---

## Configuración de Entorno

### Backend — `backend/.env`

```env
# Supabase Configuration
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_KEY=eyJ...  # service_role key (Settings > API > service_role)

# JWT Secret (Requerido)
JWT_SECRET=your-jwt-secret-min-32-chars

# Google Gemini API Key
GOOGLE_API_KEY=your-google-api-key

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
