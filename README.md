# EduRAG — Plataforma SaaS Educativa

> Plataforma multi-tenant donde los docentes crean agentes conversacionales entrenados con sus propios documentos (PDF, DOCX, MD, TXT), y los estudiantes los consumen a través de un marketplace centralizado o integrados en LMS externos (Moodle) vía `<iframe>`.

[![Frontend CI/CD](https://github.com/oscarbol09/EduRAG-Platform/actions/workflows/frontend-app-service.yml/badge.svg)](https://github.com/oscarbol09/EduRAG-Platform/actions/workflows/frontend-app-service.yml)

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
- [Despliegue](#despliegue)
- [CI/CD](#cicd)
- [Roles y Permisos](#roles-y-permisos)
- [Seguridad](#seguridad)
- [Estado del Proyecto](#estado-del-proyecto)
- [Extensibilidad LLM](#extensibilidad-llm)
- [Autores](#autores)

---

## Visión General

EduRAG resuelve un problema concreto en la educación digital: los materiales de clase (PDFs, apuntes, guías) están fragmentados y son difíciles de consultar. La plataforma permite a cualquier docente convertir sus documentos en un asistente conversacional inteligente, sin conocimientos de programación, y ponerlo a disposición de sus estudiantes en minutos.

**Principios de diseño:**

- **Costo cero post-primer mes** — toda la infraestructura opera sobre Azure Free Tiers y APIs gratuitas.
- **Aislamiento multi-tenant estricto** — los datos de cada docente están completamente separados por `owner_id` / `chatbot_id`.
- **Extensibilidad LLM** — el proveedor de IA (Gemini hoy, Claude mañana) se intercambia sin cambios en la lógica de negocio.
- **Arquitectura sin vector store** — el contenido de los documentos se almacena como texto en Cosmos DB y se pasa directamente al context window de Gemini, eliminando dependencias pesadas y problemas de compatibilidad en Azure App Service.

---

## Arquitectura del Sistema

```
┌────────────────────────────────────────────────────────────────────┐
│                       Azure  ·  EduBot-app RG                      │
│                                                                    │
│  ┌─────────────────┐   ┌──────────────────┐                        │
│  │    Frontend      │   │     Backend       │                        │
│  │  Next.js 16      │──▶│   FastAPI 0.2.0   │                        │
│  │  Static Web Apps │   │   App Service B1  │                        │
│  │  edurag-frontend  │   │   edurag-api      │                        │
│  └─────────────────┘   └────────┬─────────┘                        │
│                                 │                                  │
│               ┌─────────────────┼──────────────────────┐           │
│               ▼                 ▼                      ▼           │
│  ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │   Cosmos DB       │  │  Blob Storage   │  │  Queue Storage   │  │
│  │  edu-bot-cosmos   │  │ edubotstore2026 │  │ document-        │  │
│  │  DB: edubot       │  │ container:      │  │ processing       │  │
│  │  5 colecciones    │  │  documents      │  │ (futuro worker)  │  │
│  └──────────────────┘  └─────────────────┘  └──────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
                               │
                  ┌────────────▼───────────┐
                  │   Google Gemini API     │
                  │   gemini-2.0-flash      │
                  └────────────────────────┘
```

> **Nota arquitectural:** La versión original contemplaba ChromaDB como vector store y un worker asíncrono para chunking/embeddings. Esta arquitectura fue reemplazada por un enfoque más simple y compatible con Azure App Service: el texto completo de cada documento se extrae al momento del upload y se almacena en Cosmos DB (`document_contents`). Al chatear, todos los textos del chatbot se recuperan y pasan directamente al prompt de Gemini (context window ~1M tokens).

---

## Stack Tecnológico

| Capa | Tecnología | Servicio Azure | Tier |
|---|---|---|---|
| Frontend SPA | Next.js 16 + Tailwind CSS + Radix UI | Azure Static Web Apps `edurag-frontend` | Free |
| API Backend | FastAPI (Python 3.11) + Gunicorn + Uvicorn | Azure App Service Linux `edurag-api` | Basic B1 |
| Base de datos | Azure Cosmos DB for NoSQL | `edu-bot-cosmos` — DB: `edubot` | Free Tier permanente |
| Almacenamiento | Azure Blob Storage | `edubotstore2026` / container `documents` | Free (5 GB) |
| Cola asíncrona | Azure Queue Storage | `edubotstore2026` / queue `document-processing` | Free |
| Autenticación | JWT propio (PyJWT + bcrypt) | — | Free |
| LLM | Google Gemini 2.0 Flash | Google AI API | Free tier (15 RPM, 1M tokens/día) |

> **¿Por qué sin ChromaDB?** ChromaDB 1.x requiere SQLite ≥ 3.35.0 y sus dependencias (onnxruntime, numpy, tokenizers) suman ~500 MB al virtualenv. Esto hace que el proceso de extracción del venv en Azure App Service supere el límite de 230 segundos del contenedor, impidiendo el arranque. El enfoque actual (texto directo a Gemini) es más simple, robusto y sin problemas de compatibilidad.

---

## Estructura del Repositorio

```
/
├── backend/                        # API REST — FastAPI
│   ├── main.py                     # Aplicación principal + todos los endpoints
│   ├── settings.py                 # Variables de entorno (Pydantic Settings)
│   ├── models.py                   # Modelos Pydantic (request/response)
│   ├── auth.py                     # Middleware de autenticación JWT
│   ├── jwt_token.py                # create_jwt_token / verify_jwt_token (PyJWT)
│   ├── password.py                 # hash_password / verify_password (bcrypt)
│   ├── azure_cosmos_db.py          # CRUD — 5 colecciones Cosmos DB
│   ├── vector_store.py             # Almacén de texto de documentos en Cosmos DB
│   ├── llm_client.py               # Abstracción LLM (Gemini activo / Claude stub)
│   ├── document_uploader.py        # Blob Storage upload + extracción de texto
│   ├── configure_azure.py          # Script de utilidad para setup inicial Azure
│   ├── startup.sh                  # Script de arranque (referencia)
│   ├── Dockerfile                  # Imagen Docker (referencia)
│   ├── requirements.txt
│   ├── .env.example
│   └── AGENTS.md                   # Guía para agentes IA — backend
│
├── worker/                         # Procesador asíncrono (legacy — no activo)
│   └── ...                         # Ver nota en sección de Arquitectura
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
│   ├── next.config.ts
│   ├── staticwebapp.config.json    # Routing para Azure Static Web Apps
│   ├── .env.local
│   └── AGENTS.md                   # Guía para agentes IA — frontend
│
├── .github/
│   └── workflows/
│       ├── master_edurag-api.yml   # CI/CD backend → Azure App Service
│       └── frontend-app-service.yml # CI/CD frontend → Azure Static Web Apps
│
├── AGENTS.md                       # Guía global para agentes IA
├── SPEC.md                         # Especificación técnica detallada
└── README.md                       # Este archivo
```

---

## Modelo de Datos

Todas las entidades persisten en **Azure Cosmos DB**, base de datos `edubot`.

### `users` — partition key: `/id`

```json
{
  "id": "uuid-v4",
  "email": "string",
  "password": "bcrypt_hash (solo para auth_method: email_password)",
  "role": "teacher | student | admin",
  "auth_method": "pre_created | email_password | google | microsoft",
  "institution": "string",
  "country": "string",
  "is_active": true,
  "created_at": "2025-01-01T00:00:00Z"
}
```

### `chatbots` — partition key: `/owner_id`

```json
{
  "id": "uuid-v4",
  "owner_id": "users.id",
  "name": "string",
  "subject_area": "string",
  "education_level": "secondary | university",
  "tone": "formal | friendly | technical",
  "welcome_message": "string",
  "system_prompt_override": "string (opcional)",
  "restriction_level": "strict | guided | open",
  "llm_provider": "gemini | claude",
  "public_url": "/chat/{id}",
  "embed_code": "<iframe src='/chat/{id}' width='100%' height='600'></iframe>",
  "is_published": false,
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### `documents` — partition key: `/chatbot_id`

```json
{
  "id": "uuid-v4",
  "chatbot_id": "chatbots.id",
  "filename": "string",
  "mime_type": "application/pdf | application/vnd.openxmlformats-officedocument.wordprocessingml.document | text/markdown | text/plain",
  "blob_url": "https://edubotstore2026.blob.core.windows.net/documents/{chatbot_id}/{doc_id}/{filename}",
  "status": "indexed",
  "chunk_count": 1,
  "created_at": "ISO8601",
  "processed_at": "ISO8601"
}
```

> **Nota:** con la nueva arquitectura el `status` siempre llega a `indexed` de forma síncrona durante el upload. No hay estados intermedios `queued` ni `processing` ya que el texto se extrae en el mismo request.

### `document_contents` — partition key: `/chatbot_id`

```json
{
  "id": "documents.id",
  "chatbot_id": "chatbots.id",
  "filename": "string",
  "content": "texto completo extraído del documento"
}
```

> **Nueva colección.** Almacena el texto completo de cada documento. Al chatear, se recuperan todos los documentos del chatbot y se pasan como contexto a Gemini.

### `conversations` — partition key: `/chatbot_id`

```json
{
  "id": "uuid-v4",
  "chatbot_id": "chatbots.id",
  "student_id": "users.id | null (anónimo)",
  "messages": [
    { "role": "user | assistant", "content": "string", "timestamp": "ISO8601" }
  ],
  "created_at": "ISO8601"
}
```

---

## Pipeline de Documentos

### Upload (síncrono — sin worker)

```
Docente sube archivo (PDF / DOCX / MD / TXT)
        │
        ▼
POST /documents/upload
        │
        ├── Valida: tipo de archivo y tamaño (máx 20 MB)
        ├── Extrae texto del archivo (en memoria):
        │     PDF  →  PyMuPDF (fitz)
        │     DOCX →  python-docx
        │     MD   →  decode UTF-8 directamente
        │     TXT  →  decode UTF-8 directamente
        ├── Sube archivo original → Blob Storage
        ├── Guarda texto extraído → Cosmos DB (document_contents)
        └── Crea registro en Cosmos DB (documents) → status: "indexed"
```

### Chat (síncrono)

```
Estudiante envía mensaje
        │
        ▼
POST /chat/{chatbot_id}
        │
        ├── Verifica caché en memoria
        ├── Recupera todos los document_contents del chatbot desde Cosmos DB
        ├── Construye contexto:
        │     "--- Documento: {filename} ---\n{content}" por cada documento
        ├── Construye prompt:
        │     system_prompt + contexto completo + pregunta del usuario
        ├── Llama a Gemini 2.0 Flash con temperature según restriction_level
        ├── Persiste conversación en Cosmos DB
        └── Retorna ChatResponse { response, conversation_id, sources }
```

### Niveles de Restricción

| Nivel | Temperature | Comportamiento del asistente |
|---|---|---|
| `strict` | `0.2` | Responde **solo** con información del contexto. |
| `guided` | `0.5` | Usa el contexto como base; puede complementar. |
| `open` | `0.8` | El contexto es punto de partida; puede expandir. |

---

## API Reference

### Sistema

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/` | — | Info y versión de la API |
| `GET` | `/health` | — | Health check |
| `GET` | `/ready` | — | Readiness check — verifica conexión a Cosmos DB |

### Autenticación

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/auth/login` | — | Login email + password → devuelve JWT |
| `POST` | `/auth/register` | — | Registro de estudiantes (auto-servicio) |
| `GET` | `/auth/me` | JWT | Datos del usuario del token actual |

### Chatbots

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `GET` | `/chatbots` | Opcional | Listar chatbots (`?owner_id=`, `?published_only=true`) |
| `POST` | `/chatbots` | JWT | Crear chatbot |
| `GET` | `/chatbots/{id}` | — | Detalle de un chatbot |
| `PUT` | `/chatbots/{id}` | JWT (owner) | Actualizar configuración |
| `DELETE` | `/chatbots/{id}` | JWT (owner) | Eliminar chatbot + contenidos en Cosmos DB |
| `POST` | `/chatbots/{id}/publish` | JWT (owner) | Publicar en marketplace |
| `GET` | `/chatbots/{id}/embed` | — | Devuelve `embed_code` e `public_url` |

### Documentos

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/documents/upload` | — | Subir PDF/DOCX/MD/TXT (`multipart/form-data`) |
| `GET` | `/documents` | — | Listar por chatbot (`?chatbot_id=`) |
| `GET` | `/documents/{id}` | — | Detalle de un documento |
| `DELETE` | `/documents/{id}` | — | Eliminar documento + su contenido |

### Chat

| Método | Ruta | Límite | Descripción |
|---|---|---|---|
| `POST` | `/chat/{chatbot_id}` | 100 req/min por IP | Enviar mensaje — usa documentos de Cosmos DB como contexto |
| `GET` | `/chat/{chatbot_id}/history` | — | Historial de una conversación (`?conversation_id=`) |

### Administración

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| `POST` | `/admin/teachers` | JWT (admin) | Crear cuenta de docente |
| `GET` | `/admin/teachers` | JWT (admin) | Listar todos los docentes |

---

## Autenticación

La plataforma usa un sistema de **JWT propio** (HS256) gestionado en `backend/jwt_token.py` y `backend/auth.py`.

| Flujo | Método | Descripción |
|---|---|---|
| Login email/password | `POST /auth/login` | Verifica bcrypt hash en Cosmos DB → emite JWT |
| Registro estudiante | `POST /auth/register` | Crea usuario con contraseña hasheada → emite JWT |
| Creación docente | `POST /admin/teachers` | Admin crea la cuenta (auth_method: pre_created) |
| Validación | `auth.py` | Bearer token extraído y verificado en cada endpoint protegido |

El JWT contiene: `sub` (user_id), `email`, `role`, `exp` (7 días).

---

## Configuración de Entorno

### Backend — `backend/.env`

```env
# ── Azure Cosmos DB ──────────────────────────────────────────────────
COSMOS_DB_ENDPOINT=https://edu-bot-cosmos.documents.azure.com:443/
COSMOS_DB_KEY=<primary-key>
COSMOS_DB_DATABASE=edubot

# ── Azure Blob Storage ───────────────────────────────────────────────
AZURE_STORAGE_CONNECTION_STRING=<connection-string>
AZURE_STORAGE_CONTAINER_NAME=documents

# ── Azure Queue Storage ──────────────────────────────────────────────
AZURE_QUEUE_CONNECTION_STRING=<connection-string>
AZURE_QUEUE_NAME=document-processing

# ── JWT interno ──────────────────────────────────────────────────────
JWT_SECRET=<mínimo 32 caracteres aleatorios — usar openssl rand -hex 32>

# ── Google Gemini ────────────────────────────────────────────────────
GOOGLE_API_KEY=<api-key>

# ── App ──────────────────────────────────────────────────────────────
APP_HOST=0.0.0.0
APP_PORT=8080
CORS_ORIGINS=["https://delightful-sea-04066b61e.7.azurestaticapps.net","http://localhost:3000"]
MAX_FILE_SIZE_MB=20
```

> Variables eliminadas: `CHROMA_DB_PATH` (ya no se usa ChromaDB).

### Frontend — `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=https://edurag-api.azurewebsites.net
```

---

## Despliegue

### Backend — App Service `edurag-api`

**Vía GitHub Actions** (recomendado): push a `master` en rama `backend/**` o `requirements.txt` dispara `.github/workflows/master_edurag-api.yml`.

El workflow:
1. Crea un ZIP limpio con solo código Python + `requirements.txt` (sin venv, sin chroma_data)
2. Configura `SCM_DO_BUILD_DURING_DEPLOYMENT=true` para que Oryx instale las dependencias en Azure
3. Despliega con startup command: `gunicorn --bind=0.0.0.0:8080 --worker-class uvicorn.workers.UvicornWorker --timeout 120 main:app`

**Manual (ZIP deploy):**
```bash
# Desde la raíz del proyecto
mkdir deploy_tmp
cp backend/*.py deploy_tmp/
cp requirements.txt deploy_tmp/
cd deploy_tmp && zip -r ../backend-deploy.zip . --exclude "*.pyc" --exclude "__pycache__/*"
cd ..

az webapp deploy \
  --name edurag-api \
  --resource-group edubot-app \
  --src-path backend-deploy.zip \
  --type zip
```

**App Settings requeridos en Azure:**
```
SCM_DO_BUILD_DURING_DEPLOYMENT=true
ENABLE_ORYX_BUILD=true
WEBSITES_PORT=8080
WEBSITES_CONTAINER_START_TIME_LIMIT=600
```

### Frontend — Static Web Apps `edurag-frontend`

Despliegue automático via GitHub Actions. No se requiere acción manual.

URL de producción: `https://delightful-sea-04066b61e.7.azurestaticapps.net`

---

## CI/CD

| Workflow | Archivo | Rama trigger | Destino |
|---|---|---|---|
| Backend | `master_edurag-api.yml` | `master` (cambios en `backend/**` o `requirements.txt`) | Azure App Service `edurag-api` |
| Frontend | `frontend-app-service.yml` | `master` | Azure Static Web Apps `edurag-frontend` |

> **Importante:** GitHub Actions fue desconectado del Deployment Center de Azure para evitar conflictos entre deploys directos y automáticos. El CI/CD funciona vía los workflows del repositorio.

### Secrets requeridos en GitHub Actions

| Secret | Descripción |
|---|---|
| `AZUREAPPSERVICE_CLIENTID_*` | App Registration — backend |
| `AZUREAPPSERVICE_TENANTID_*` | Tenant ID de Azure |
| `AZUREAPPSERVICE_SUBSCRIPTIONID_*` | ID de suscripción de Azure |
| `AZURE_STATIC_WEB_APPS_TOKEN` | Token de deployment de Static Web Apps |

---

## Roles y Permisos

| Rol | Método de creación | Permisos |
|---|---|---|
| `admin` | Creado manualmente en Cosmos DB | Crear/listar docentes, gestionar la plataforma |
| `teacher` | Admin vía `POST /admin/teachers` | Crear/editar/eliminar chatbots propios, subir documentos |
| `student` | Auto-registro vía `POST /auth/register` | Chatear con chatbots publicados, ver marketplace |

---

## Seguridad

| Control | Implementación | Archivo |
|---|---|---|
| Aislamiento multi-tenant | Queries a Cosmos DB filtran por `chatbot_id` / `owner_id`; validado contra JWT | `vector_store.py`, `main.py` |
| Validación de archivos | Tipo verificado por extensión y content_type; límite 20 MB | `main.py` |
| Rate limiting | `slowapi` — 100 req/min por IP en endpoint de chat | `main.py` |
| CORS | Lista explícita de orígenes en producción | `settings.py` |
| Contraseñas | bcrypt con factor de costo por defecto | `password.py` |
| Secretos | Variables de entorno; nunca en código | `.env` / GitHub Secrets |

---

## Estado del Proyecto

### Recursos Azure activos (grupo `edubot-app`)

| Recurso | Tipo | Región | Estado |
|---|---|---|---|
| `edu-bot-cosmos` | Cosmos DB for NoSQL | West US 2 | ✅ Activo |
| `edubotstore2026` | Storage Account (Blob + Queue) | West US 2 | ✅ Activo |
| `edurag-api` | App Service Linux — Basic B1 | Central US | ✅ Activo |
| `edurag-frontend` | Static Web App | West US 2 | ✅ Activo |
| `edurag-backend` | Container App | West US 2 | ❌ Failed — eliminar |

### Progreso de Fases

| Fase | Descripción | Estado |
|---|---|---|
| 0 | Setup e infraestructura — monorepo, Azure, CI/CD | ✅ Completada |
| 1 | Autenticación JWT, gestión de usuarios, admin básico | ✅ Completada |
| 2 | Pipeline de documentos, almacenamiento en Cosmos DB, endpoint de chat | ✅ Completada (sin vector store) |
| 3 | Dashboard del docente — formulario multi-paso, estado en tiempo real | ⏳ Pendiente |
| 4 | Portal del estudiante, marketplace público, iframe embebible | ⏳ Pendiente |
| 5 | Hardening, Application Insights, alertas de presupuesto, runbook | ⏳ Pendiente |

---

## Extensibilidad LLM

La clase `LLMClient` en `backend/llm_client.py` abstrae completamente el proveedor de IA. El proveedor se configura por chatbot con el campo `llm_provider` en Cosmos DB.

```python
llm = get_llm_client(chatbot.get("llm_provider", "gemini"))
response = llm.generate(system_prompt, context, user_message, temperature)
```

**Para agregar soporte a Claude:**

1. Implementar `_generate_claude()` en `llm_client.py` usando el SDK de Anthropic.
2. Agregar `ANTHROPIC_API_KEY` a las variables de entorno.
3. El resto del sistema no requiere cambios.

---

## Autores

| Autor | GitHub |
|---|---|
| Oscar Bolívar | [@oscarbol09](https://github.com/oscarbol09) |
| Darío Oviedo | [@dariooviedo2022](https://github.com/dariooviedo2022) |

---

*Para la especificación técnica completa, ver [SPEC.md](./SPEC.md). Para instrucciones específicas por módulo, ver los archivos `AGENTS.md` dentro de cada carpeta.*
