# EduRAG — AGENTS.md (Raíz del Proyecto)

Guía de referencia rápida para agentes de IA y colaboradores que trabajen en cualquier parte del repositorio. Para detalle de cada módulo, ver el `AGENTS.md` correspondiente en `backend/` y `frontend/`.

---

## Contexto del Proyecto

**EduRAG** es una plataforma SaaS educativa multi-tenant. Los docentes crean chatbots a partir de sus propios documentos (MD, TXT). Los estudiantes los consumen vía marketplace web o iframe embebido en LMS externos (Moodle).

**Tres restricciones de diseño no negociables:**
1. Costo operativo $0/mes post-primer-mes (Supabase Free Tier + APIs gratuitas).
2. Aislamiento estricto de datos por tenant (por `chatbot_id` y `owner_id`).
3. Arquitectura extensible para múltiples LLMs sin cambios de lógica de negocio.

**Decisión arquitectural clave — sin ChromaDB:**
ChromaDB fue eliminado porque sus dependencias (~500 MB de venv) causaban `ContainerTimeout` en servicios de hosting y ralentizaban los deploys. El texto de los documentos se almacena en Supabase (`document_contents`) y se pasa directamente al context window de Gemini (~1M tokens). No se usan embeddings ni búsqueda vectorial.

---

## Stack de Referencia Rápida

| Capa | Tecnología | Dónde |
|---|---|---|
| Frontend | Next.js 16 + Tailwind CSS + Radix UI | `frontend/` |
| Backend | FastAPI (Python 3.11) + Gunicorn + Uvicorn | `backend/` |
| Base de datos | Supabase PostgreSQL | Cloud |
| Almacenamiento | Supabase Storage (Bucket: `documents`) | Cloud |
| Autenticación | JWT propio HS256 (PyJWT + bcrypt) | `backend/jwt_token.py`, `auth.py` |
| LLM activo | Google Gemini 2.0 Flash | `backend/llm_client.py` |
| LLM stub | Anthropic Claude (no implementado aún) | `backend/llm_client.py` |
| Texto de docs | Supabase — tabla `document_contents` | `backend/vector_store.py` |

---

## Recursos Cloud (Supabase, Railway & Vercel)

| Recurso | Tipo | Proveedor | Estado |
|---|---|---|---|
| `ndiipkvryycogiabymiu` | PostgreSQL + Storage | Supabase | ✅ Activo |
| `edurag` | Backend API | Railway | ✅ Activo |
| `edu-rag` | Frontend App (Next.js) | Vercel | ✅ Activo |

**URLs de producción:**
- API: `https://edurag-production.up.railway.app`
- Frontend: `https://edu-rag-red.vercel.app`

---

## Tablas SQL (Supabase)

| Tabla | Clave Primaria | Descripción |
|---|---|---|
| `users` | `id` | Docentes, estudiantes y admins |
| `chatbots` | `id` | Configuración de cada chatbot (relación con `users`) |
| `documents` | `id` | Metadatos de documentos subidos (relación con `chatbots`) |
| `document_contents` | `id` | Texto extraído de cada documento (relación con `chatbots`) |
| `conversations` | `id` | Historial de mensajes (relación con `chatbots`) |

**Regla crítica:** toda query a `document_contents` debe filtrar por `chatbot_id`. Nunca exponer contenido de un tenant a consultas de otro.

---

## Autenticación — Resumen

El sistema usa **JWT propio** (HS256) firmado por `JWT_SECRET`.

- Login: `POST /auth/login` → verifica bcrypt → emite JWT con `{ sub, email, role, exp }`.
- Registro de estudiantes: `POST /auth/register` (auto-servicio).
- Creación de docentes: `POST /admin/teachers` (solo admin).
- Validación de endpoints: `get_current_user(request)` en `backend/auth.py`.

---

## Pipeline de Documentos — Flujo Resumido

```
Upload (síncrono):
  Archivo (MD/TXT) → extracción texto en memoria
    → Supabase Storage (original) + Supabase document_contents (texto)
    → documents: status "indexed" (inmediato)

Chat (síncrono):
  Mensaje → Supabase: recuperar todos los document_contents del chatbot
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
| `admin` | Manual en Supabase | Crear docentes, administrar plataforma |
| `teacher` | Admin vía `POST /admin/teachers` | CRUD de sus chatbots, subir documentos |
| `student` | Auto-registro `POST /auth/register` | Chat con publicados, ver marketplace |

---

## API Endpoints — Referencia Rápida

```
# Sistema
GET  /health                        → health check
GET  /ready                         → readiness (verifica Supabase)

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

# Documentos [JWT Protegido]
POST /documents/upload              → subir MD/TXT (multipart)
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
# Backend — test de endpoints automatizados
cd backend
pytest -v

# Frontend — build de producción
cd frontend
npm run build
```

---

## Variables de Entorno Críticas

| Variable | Módulo | Descripción |
|---|---|---|
| `SUPABASE_URL` | backend | URL de la API de Supabase |
| `SUPABASE_KEY` | backend | service_role API key de Supabase |
| `GOOGLE_API_KEY` | backend | API key de Google AI (Gemini) |
| `JWT_SECRET` | backend | Secret para firmar tokens JWT (≥32 chars) |
| `NEXT_PUBLIC_API_URL` | frontend | URL base de la API backend |

---

## Checklist para Nuevas Features

- [ ] ¿Afecta multi-tenant? → verificar aislamiento por `chatbot_id` / `owner_id`.
- [ ] ¿Nuevo endpoint? → documentar en la tabla de API Reference del README.
- [ ] ¿Nueva variable de entorno? → agregar a `.env.example` del módulo correspondiente.
- [ ] ¿Nuevo modelo de datos? → actualizar la sección de Modelo de Datos en README y SPEC.
- [ ] ¿Cambio en costos? → re-evaluar si sigue dentro del Free Tier.
- [ ] ¿Cambio en LLM? → hacerlo solo en `llm_client.py` respetando la interfaz `generate()`.
- [ ] ¿Nueva dependencia Python? → verificar que el virtualenv resultante no supere ~200MB para optimizar los tiempos de compilación y despliegue.
