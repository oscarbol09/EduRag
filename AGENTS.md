# EduRAG — AGENTS.md (Raíz del Proyecto)

Guía de referencia para agentes de IA y colaboradores. Para detalle de cada módulo, ver `backend/AGENTS.md` y `frontend/AGENTS.md`.

---

## Contexto del Proyecto

**EduRAG** es una plataforma SaaS educativa multi-tenant. Los docentes crean chatbots a partir de sus propios documentos (MD, TXT, PDF, DOCX). Los estudiantes los consumen vía marketplace web o iframe embebido en LMS externos (Moodle).

**Tres restricciones de diseño no negociables:**
1. Costo operativo $0/mes post-primer-mes (Supabase Free Tier + APIs gratuitas).
2. Aislamiento estricto de datos por tenant (`chatbot_id` / `owner_id`).
3. Arquitectura extensible para múltiples LLMs sin cambios de lógica de negocio.

**Sin ChromaDB:** eliminado por `ContainerTimeout` en Railway (~500 MB de venv). El texto se guarda en Supabase (`document_contents`) y pasa directamente al context window. Chunking léxico + ranking por overlap en `context_builder.py`.

---

## Stack de Referencia Rápida

| Capa | Tecnología | Dónde |
|---|---|---|
| Frontend | Next.js 16 + Tailwind CSS | `frontend/` — Vercel |
| Backend | FastAPI (Python 3.11) + Uvicorn | `backend/` — Railway |
| Base de datos | Supabase PostgreSQL | Cloud |
| Almacenamiento | Supabase Storage (bucket `documents`) | Cloud |
| Autenticación | JWT HS256 (PyJWT + bcrypt) | `backend/jwt_token.py`, `auth.py` |
| Cifrado API keys | Fernet (cryptography) | `backend/security_utils.py` |
| LLM | OpenRouter (modelos gratuitos) | `backend/llm_client.py` |
| Contexto RAG | Chunking léxico 1500c + overlap 200 + presupuesto 60k | `backend/context_builder.py` |
| Streaming | SSE `text/event-stream` — eventos `token` / `done` / `error` | `backend/main.py` |

---

## URLs de Producción

| Servicio | URL |
|---|---|
| Frontend | `https://edu-rag-red.vercel.app` |
| API Backend | `https://edurag-production.up.railway.app` |
| Supabase proyecto | `ndiipkvryycogiabymiu` |

---

## Tablas SQL (Supabase) — 6 tablas activas

| Tabla | Clave Primaria | Descripción |
|---|---|---|
| `users` | `id` text | Docentes, estudiantes y admins. Columnas nativas: `first_name`, `last_name`, `institution_name`, `openrouter_api_key` (cifrada Fernet), `openrouter_model`, `is_test_account` |
| `chatbots` | `id` text | Config de cada chatbot. FK: `owner_id → users` |
| `documents` | `id` text | Metadatos de documentos. FK: `chatbot_id → chatbots` |
| `document_contents` | `id` text | Texto extraído completo. FK: `chatbot_id → chatbots` |
| `conversations` | `id` text | Registro de sesiones de chat. FK: `chatbot_id → chatbots` |
| `messages` | `id` uuid | Mensajes individuales normalizados. FK: `conversation_id → conversations ON DELETE CASCADE` |

> `conversations.messages` (JSONB) fue eliminado por la migración `20260608120000`. El backend incluye fallback JSONB para conversaciones pre-migración.

**Regla crítica:** toda query a `document_contents` debe filtrar por `chatbot_id`. Nunca mezclar datos de un tenant con otro.

---

## Migraciones SQL

Las migraciones están en `supabase/migrations/` y se aplican con `supabase db push` desde la raíz del proyecto.

| Archivo | Descripción |
|---|---|
| `20260607152000_harden_core_tables.sql` | Columnas nativas en `users`, columnas pedagógicas en `chatbots`, `content_hash` en `documents` |
| `20260607153000_add_missing_indexes.sql` | 12 índices en `chatbots`, `documents`, `document_contents`, `conversations`, `users` |
| `20260607154000_extract_messages_table.sql` | Crea tabla `messages` + migra datos desde JSONB |
| `20260608120000_drop_messages_jsonb_legacy.sql` | Elimina columna `conversations.messages` (JSONB) |

---

## Autenticación — Resumen

Sistema **JWT propio** HS256 firmado por `JWT_SECRET` (obligatorio, sin default).

- Login: `POST /auth/login` (10/min) → verifica bcrypt → JWT con `{ sub, email, role, exp }`.
- Registro público: `POST /auth/register` (5/min) → fuerza `role: student`.
- Creación de docentes: `POST /admin/teachers` (solo admin).
- Token persiste en **`sessionStorage`** (se borra al cerrar la pestaña — menor exposición XSS).
- Validación: `get_current_user(request)` y `get_current_user_optional(request)` en `backend/auth.py`.

---

## Seguridad — Controles Activos

| Control | Detalle |
|---|---|
| Cifrado API keys | Fernet en `security_utils.py` — `encrypt_api_key` / `decrypt_api_key` sin fallback silencioso |
| Rate limiting | `slowapi`: `/auth/login` 10/min, `/auth/register` 5/min, `/chat/{id}` 100/min por IP |
| Aislamiento multi-tenant | `owner_id` / `chatbot_id` validados en todas las operaciones |
| Passwords filtrados | `map_user_response()` hace `res.pop("password", None)` en toda respuesta |
| CSP + headers | `vercel.json`: CSP con `connect-src` Railway + Supabase, `X-Frame-Options: DENY`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` |
| Historial protegido | `GET /chat/{id}/history` — requiere JWT y valida owner / admin / estudiante asociado |
| system_prompt limitado | `MAX_SYSTEM_PROMPT_LENGTH = 2000` chars — validado en POST y PUT `/chatbots` |
| CORS | `CORS_ORIGINS` incluye frontend Vercel y backend Railway |

---

## API Reference — Tabla Completa

```
GET  /health                          → health check
GET  /ready                           → readiness (verifica Supabase)
GET  /platform/stats                  → estadísticas públicas (landing)

POST /auth/login                      → { token, user } — 10/min
POST /auth/register                   → { token, user } — 5/min, role=student forzado
GET  /auth/me                         → usuario actual [JWT]
PUT  /auth/me/profile                 → actualizar perfil + OpenRouter key [JWT]

GET  /chatbots                        → lista (owner_id, published_only, limit, offset)
POST /chatbots                        → crear [JWT]
GET  /chatbots/{id}                   → detalle (system_prompt_override ocultado a terceros)
PUT  /chatbots/{id}                   → actualizar [JWT owner]
DELETE /chatbots/{id}                 → eliminar + document_contents [JWT owner]
POST /chatbots/{id}/publish           → publicar [JWT owner]
GET  /chatbots/{id}/embed             → embed_code + public_url

POST /documents/upload                → subir MD/TXT/PDF/DOCX [JWT owner]
GET  /documents?chatbot_id=           → listar (limit, offset) [JWT owner]
GET  /documents/{id}                  → detalle [JWT owner]
DELETE /documents/{id}?chatbot_id=    → eliminar metadatos + contenido [JWT owner]

POST /chat/{id}                       → mensaje síncrono — 100/min/IP
POST /chat/{id}/stream                → mensaje SSE token-a-token
GET  /chat/{id}/history               → historial [JWT: owner | admin | student]

GET  /teacher/metrics                 → métricas del docente [JWT teacher]

POST /admin/teachers                  → crear docente [JWT admin]
GET  /admin/teachers                  → listar docentes [JWT admin]
PUT  /admin/teachers/{id}             → editar docente [JWT admin]
DELETE /admin/teachers/{id}           → eliminar docente [JWT admin]
```

---

## Roles

| Rol | Creación | Permisos clave |
|---|---|---|
| `admin` | Manual en Supabase | CRUD de docentes, acceso total |
| `teacher` | Admin vía `POST /admin/teachers` | CRUD de sus chatbots y documentos |
| `student` | Auto-registro `POST /auth/register` | Chat con publicados, marketplace |

---

## Testing

```bash
cd backend
pytest -v          # 26 tests — auth, seguridad, chat, admin, context_builder, security_utils

cd frontend
npm run build      # verifica TypeScript y build de producción
```

---

## Convenciones Git

```
feat:     nueva funcionalidad
fix:      corrección de bug
docs:     solo documentación
refactor: sin cambio de comportamiento
test:     tests
chore:    mantenimiento (deps, CI)
```

**Ramas:**
```
master          → producción (deploy automático)
develop         → integración
feature/nombre
fix/nombre
```

**Reglas:** nunca commitear `.env`, credenciales, ni carpetas `__pycache__/`, `antenv/`, `chroma_data/`.

---

## Variables de Entorno Críticas

| Variable | Módulo | Obligatoria | Descripción |
|---|---|---|---|
| `SUPABASE_URL` | backend | ✅ | URL de la API de Supabase |
| `SUPABASE_KEY` | backend | ✅ | service_role key |
| `JWT_SECRET` | backend | ✅ | Secret para JWT (≥32 chars) |
| `ENCRYPTION_KEY` | backend | ✅ | Clave Fernet para cifrado de API keys |
| `OPENROUTER_API_KEY` | backend | — | Fallback para whitelist |
| `CORS_ORIGINS` | backend | ✅ | URLs permitidas (Vercel + Railway + localhost) |
| `NEXT_PUBLIC_API_URL` | frontend | ✅ | URL base del backend |

---

## Checklist para Nuevas Features

- [ ] ¿Afecta multi-tenant? → verificar aislamiento por `chatbot_id` / `owner_id`.
- [ ] ¿Nuevo endpoint? → añadir a la tabla de API Reference y a `SPEC.md`.
- [ ] ¿Nueva variable de entorno? → añadir a `.env.example` y a esta tabla.
- [ ] ¿Nuevo modelo de datos? → actualizar `SPEC.md` + `README.md` + migración SQL en `supabase/migrations/`.
- [ ] ¿Nueva dependencia Python? → verificar que el venv no supere ~200 MB (Railway).
- [ ] ¿Cambio en LLM? → modificar solo `llm_client.py` (interfaz `generate` / `generate_stream`).
- [ ] ¿Cambio en costos? → verificar que sigue dentro del Free Tier.
