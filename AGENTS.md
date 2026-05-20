# EduRAG — AGENTS.md (Raíz del Proyecto)

Guía de referencia rápida para agentes de IA y colaboradores que trabajen en cualquier parte del repositorio. Para detalle de cada módulo, ver el `AGENTS.md` correspondiente en `backend/` y `frontend/`.

---

## Contexto del Proyecto

**EduRAG** es una plataforma SaaS educativa multi-tenant. Los docentes crean chatbots a partir de sus propios documentos (PDF, DOCX, MD, TXT). Los estudiantes los consumen vía marketplace web o iframe embebido en LMS externos (Moodle).

**Tres restricciones de diseño no negociables:**
1. Costo operativo $0/mes post-primer-mes (Azure Free Tiers + APIs gratuitas).
2. Aislamiento estricto de datos por tenant (por `chatbot_id` y `owner_id`).
3. Arquitectura extensible para múltiples LLMs sin cambios de lógica de negocio.

**Decisión arquitectural clave — sin ChromaDB:**
ChromaDB fue eliminado porque sus dependencias (~500 MB de venv) causaban `ContainerTimeout` en Azure App Service. El texto de los documentos se almacena en Cosmos DB (`document_contents`) y se pasa directamente al context window de Gemini (~1M tokens). No se usan embeddings ni búsqueda vectorial.

---

## Stack de Referencia Rápida

| Capa | Tecnología | Dónde |
|---|---|---|
| Frontend | Next.js 16 + Tailwind CSS + Radix UI | `frontend/` |
| Backend | FastAPI (Python 3.11) + Gunicorn + Uvicorn | `backend/` |
| Base de datos | Azure Cosmos DB for NoSQL — DB: `edubot` | Cloud |
| Almacenamiento | Azure Blob Storage — `edubotstore2026` | Cloud |
| Cola | Azure Queue Storage — `document-processing` | Cloud (futuro) |
| Autenticación | JWT propio HS256 (PyJWT + bcrypt) | `backend/jwt_token.py`, `auth.py` |
| LLM activo | Google Gemini 2.0 Flash | `backend/llm_client.py` |
| LLM stub | Anthropic Claude (no implementado aún) | `backend/llm_client.py` |
| Texto de docs | Cosmos DB — colección `document_contents` | `backend/vector_store.py` |

---

## Recursos Azure

| Recurso | Tipo | Región | Resource Group | Estado |
|---|---|---|---|---|
| `edu-bot-cosmos` | Cosmos DB for NoSQL | West US 2 | edubot-app | ✅ Activo |
| `edubotstore2026` | Storage Account | West US 2 | edubot-app | ✅ Activo |
| `edurag-api` | App Service Linux B1 | Central US | edubot-app | ✅ Activo |
| `edurag-frontend` | Static Web App | West US 2 | edubot-app | ✅ Activo |
| `edurag-backend` | Container App | West US 2 | edubot-app | ❌ Failed — eliminar |

**URLs de producción:**
- API: `https://edurag-api.azurewebsites.net`
- Frontend: `https://delightful-sea-04066b61e.7.azurestaticapps.net`

---

## Colecciones Cosmos DB

| Colección | Partition Key | Descripción |
|---|---|---|
| `users` | `/id` | Docentes, estudiantes y admins |
| `chatbots` | `/owner_id` | Configuración de cada chatbot |
| `documents` | `/chatbot_id` | Metadatos de documentos subidos |
| `document_contents` | `/chatbot_id` | Texto extraído de cada documento |
| `conversations` | `/chatbot_id` | Historial de mensajes |

**Regla crítica:** toda query a `document_contents` debe filtrar por `chatbot_id`. Nunca exponer contenido de un tenant a consultas de otro.

---

## Autenticación — Resumen

> Azure AD B2C fue descontinuado por Microsoft. El sistema usa **JWT propio** (HS256).

- Login: `POST /auth/login` → verifica bcrypt → emite JWT con `{ sub, email, role, exp }`.
- Registro de estudiantes: `POST /auth/register` (auto-servicio).
- Creación de docentes: `POST /admin/teachers` (solo admin).
- Validación de endpoints: `get_current_user(request)` en `backend/auth.py`.

---

## Pipeline de Documentos — Flujo Resumido

```
Upload (síncrono):
  Archivo (PDF/DOCX/MD/TXT) → extracción texto en memoria
    → Blob Storage (original) + Cosmos DB document_contents (texto)
    → documents: status "indexed" (inmediato)

Chat (síncrono):
  Mensaje → Cosmos DB: recuperar todos los document_contents del chatbot
    → construir contexto con todos los documentos
    → prompt: system_prompt + contexto + pregunta
    → Gemini 2.0 Flash → respuesta con fuentes (filenames)
```

**Temperatures por restriction_level:**

| Nivel | Temperature |
|---|---|
| `strict` | `0.2` |
| `guided` | `0.5` |
| `open` | `0.8` |

---

## Roles

| Rol | Creación | Permisos clave |
|---|---|---|
| `admin` | Manual en Cosmos DB | Crear docentes, administrar plataforma |
| `teacher` | Admin vía `POST /admin/teachers` | CRUD de sus chatbots, subir documentos |
| `student` | Auto-registro `POST /auth/register` | Chat con publicados, ver marketplace |

---

## API Endpoints — Referencia Rápida

```
# Sistema
GET  /health                        → health check
GET  /ready                         → readiness (verifica Cosmos DB)

# Auth
POST /auth/login                    → { token, user }
POST /auth/register                 → { token, user }
GET  /auth/me                       → datos del usuario actual

# Chatbots
GET  /chatbots                      → lista (filtros: owner_id, published_only)
POST /chatbots                      → crear [JWT]
GET  /chatbots/{id}                 → detalle
PUT  /chatbots/{id}                 → actualizar [JWT owner]
DELETE /chatbots/{id}               → eliminar + document_contents [JWT owner]
POST /chatbots/{id}/publish         → publicar [JWT owner]
GET  /chatbots/{id}/embed           → embed_code + public_url

# Documentos
POST /documents/upload              → subir PDF/DOCX/MD/TXT (multipart)
GET  /documents?chatbot_id=         → listar
GET  /documents/{id}                → detalle
DELETE /documents/{id}?chatbot_id=  → eliminar metadatos + contenido

# Chat
POST /chat/{chatbot_id}             → enviar mensaje (100 req/min/IP)
GET  /chat/{chatbot_id}/history     → historial

# Admin
POST /admin/teachers                → crear docente [JWT admin]
GET  /admin/teachers                → listar docentes [JWT admin]
```

---

## Convenciones de Código y Git

### Commits (Conventional Commits)
```
feat:     nueva funcionalidad
fix:      corrección de bug
docs:     solo documentación
refactor: refactoring sin cambio de comportamiento
test:     tests
chore:    tareas de mantenimiento (deps, CI, etc.)
```

### Branches
```
master        → producción (despliegue automático)
develop       → integración
feature/nombre-descriptivo
fix/nombre-descriptivo
```

### Reglas
- Nunca commitear archivos `.env` ni credenciales.
- Nunca hardcodear API keys, connection strings ni secrets en código.
- No incluir carpetas `antenv/`, `__pycache__/`, `.env`, `chroma_data/` en deploys.

---

## Testing

```bash
# Backend — test de endpoints
cd backend
python test_api.py

# Frontend — build de producción
cd frontend
npm run build
```

---

## Despliegue Rápido

```bash
# Backend (ZIP deploy manual — solo código Python, sin venv)
mkdir deploy_tmp
cp backend/*.py deploy_tmp/
cp requirements.txt deploy_tmp/
cd deploy_tmp
zip -r ../backend-deploy.zip . --exclude "*.pyc" --exclude "__pycache__/*"
cd ..

az webapp deploy --name edurag-api --resource-group edubot-app \
  --src-path backend-deploy.zip --type zip

# Frontend → automático via GitHub Actions en push a master
```

**App Settings requeridos en Azure para el backend:**
```
SCM_DO_BUILD_DURING_DEPLOYMENT=true
ENABLE_ORYX_BUILD=true
WEBSITES_PORT=8080
WEBSITES_CONTAINER_START_TIME_LIMIT=600
```

---

## Variables de Entorno Críticas

| Variable | Módulo | Descripción |
|---|---|---|
| `COSMOS_DB_ENDPOINT` | backend | URL de Cosmos DB |
| `COSMOS_DB_KEY` | backend | Primary key de Cosmos DB |
| `COSMOS_DB_DATABASE` | backend | Nombre de la base de datos (edubot) |
| `GOOGLE_API_KEY` | backend | API key de Google AI (Gemini) |
| `JWT_SECRET` | backend | Secret para firmar tokens JWT (≥32 chars) |
| `AZURE_STORAGE_CONNECTION_STRING` | backend | Connection string de Storage Account |
| `AZURE_QUEUE_CONNECTION_STRING` | backend | Connection string para Queue Storage |
| `NEXT_PUBLIC_API_URL` | frontend | URL base de la API backend |

---

## Checklist para Nuevas Features

- [ ] ¿Afecta multi-tenant? → verificar aislamiento por `chatbot_id` / `owner_id`.
- [ ] ¿Nuevo endpoint? → documentar en la tabla de API Reference del README.
- [ ] ¿Nueva variable de entorno? → agregar a `.env.example` del módulo correspondiente.
- [ ] ¿Nuevo modelo de datos? → actualizar la sección de Modelo de Datos en README y SPEC.
- [ ] ¿Cambio en costos de Azure? → re-evaluar si sigue dentro del Free Tier.
- [ ] ¿Cambio en LLM? → hacerlo solo en `llm_client.py` respetando la interfaz `generate()`.
- [ ] ¿Nueva dependencia Python? → verificar que el virtualenv resultante no supere ~200MB para evitar ContainerTimeout en Azure App Service.
