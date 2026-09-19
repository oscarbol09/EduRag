# EduRAG — AGENTS.md (Raíz del Proyecto)

Guía de referencia técnica para agentes de IA y desarrolladores. Para detalles específicos de cada módulo, consultar `backend/AGENTS.md` y `frontend/AGENTS.md`.

---

## Contexto del Proyecto

**EduRAG** es una plataforma SaaS educativa multi-tenant. Los docentes crean chatbots a partir de sus propios documentos (MD, TXT, PDF digital, DOCX). Los estudiantes los consultan vía marketplace web o iframe embebido en plataformas LMS externas (Moodle, Canvas).

**Tres restricciones de diseño fundamentales:**
1. **Costo operativo $0/mes permanente:** Supabase Free Tier + Vercel + Railway + APIs gratuitas.
2. **Aislamiento estricto de datos por tenant:** Validación obligatoria de `chatbot_id` y `owner_id` en todas las consultas.
3. **Arquitectura RAG léxica sin ChromaDB:** Eliminado por `ContainerTimeout` en Railway (~500 MB de venv). El texto se almacena en Supabase (`document_contents`) y pasa al context window mediante chunking léxico y ranking de overlap en `context_builder.py`.

---

## Stack de Referencia Rápida

| Capa | Tecnología | Dónde |
|---|---|---|
| Frontend | Next.js 16 (App Router) + Tailwind CSS | `frontend/` — Vercel |
| Backend | FastAPI (Python 3.11/3.12) + Uvicorn | `backend/` — Railway |
| Base de datos | Supabase PostgreSQL 15 | Cloud |
| Almacenamiento | Supabase Storage (bucket `documents`) | Cloud |
| Autenticación | JWT HS256 (PyJWT + bcrypt) con rotación y revocación | `backend/jwt_token.py`, `backend/auth.py` |
| Cifrado API keys | Fernet (`cryptography`) | `backend/security_utils.py` |
| LLM | OpenRouter (modelos gratuitos, BYOK) | `backend/llm_client.py` |
| Contexto RAG | Chunking léxico 1500c + overlap 200c + presupuesto 60k chars | `backend/context_builder.py` |
| Streaming | SSE `text/event-stream` — eventos `token` / `done` / `error` | `backend/main.py` |

---

## URLs de Producción

| Servicio | URL |
|---|---|
| Frontend | `https://edu-rag-red.vercel.app` |
| API Backend | `https://edurag-production.up.railway.app` |
| Supabase proyecto | `ndiipkvryycogiabymiu` |

---

## Tablas SQL (Supabase) — 6 tablas activas + revocación

| Tabla | Clave Primaria | Descripción |
|---|---|---|
| `users` | `id` text | Docentes, estudiantes y admins (`first_name`, `last_name`, `institution_name`, `openrouter_api_key` Fernet, `openrouter_model`, `is_test_account`). |
| `chatbots` | `id` text | Configuración de cada chatbot. FK: `owner_id → users`. |
| `documents` | `id` text | Metadatos de documentos. FK: `chatbot_id → chatbots`. |
| `document_contents` | `id` text | Texto extraído completo. FK: `chatbot_id → chatbots`. |
| `conversations` | `id` text | Registro de sesiones de chat. FK: `chatbot_id → chatbots`. |
| `messages` | `id` uuid | Mensajes individuales normalizados. FK: `conversation_id → conversations ON DELETE CASCADE`. |
| `revoked_tokens` | `jti` text | Registro de tokens JWT revocados para invalidación inmediata de sesiones. |

**Regla crítica:** Toda consulta a `document_contents` debe filtrar por `chatbot_id`. Nunca mezclar datos de un tenant con otro.

---

## Migraciones SQL

Ubicadas en `supabase/migrations/` y aplicadas con `supabase db push` desde la raíz del proyecto:

| Archivo | Descripción |
|---|---|
| `20260607152000_harden_core_tables.sql` | Columnas nativas en `users`, columnas pedagógicas en `chatbots`, `content_hash` en `documents`. |
| `20260607153000_add_missing_indexes.sql` | 12 índices de rendimiento en `chatbots`, `documents`, `document_contents`, `conversations`, `users`. |
| `20260607154000_extract_messages_table.sql` | Crea tabla `messages` y migra datos desde JSONB. |
| `20260608120000_drop_messages_jsonb_legacy.sql` | Elimina columna `conversations.messages` (JSONB legacy). |
| `20260611120000_add_revoked_tokens.sql` | Crea tabla `revoked_tokens` con guarda condicional para `pg_cron`. |

---

## Autenticación

Sistema **JWT propio** HS256 firmado por `JWT_SECRET` (obligatorio, sin defaults inseguros).

- **Login:** `POST /auth/login` (10/min) → verifica bcrypt → JWT con `{ sub, email, role, exp, jti }`.
- **Refresh:** `POST /auth/refresh` (20/min, [JWT]) → nuevo par access+refresh con rotación y revocación del anterior.
- **Logout:** `POST /auth/logout` [JWT] → revoca el token activo en `revoked_tokens`.
- **Registro público:** `POST /auth/register` (5/min) → fuerza `role: student`.
- **Creación de docentes:** `POST /admin/teachers` (solo rol `admin`).
- **Almacenamiento:** `localStorage` en frontend (compartido entre pestañas y protegido con expiración 24h + revocación en backend).
- **Validación:** `get_current_user(request)` y `get_current_user_optional(request)` en `backend/auth.py`.

---

## Seguridad — Controles Activos

| Control | Detalle |
|---|---|
| Cifrado API keys | Fernet en `security_utils.py` — `encrypt_api_key` / `decrypt_api_key` sin fallback silencioso a texto plano. |
| Rate limiting | `slowapi`: `/auth/login` 10/min, `/auth/register` 5/min, `/chat/{id}` 100/min por IP. |
| Aislamiento multi-tenant | `owner_id` / `chatbot_id` validados en todas las operaciones. |
| Passwords filtrados | `map_user_response()` purga el campo `password` en toda respuesta HTTP. |
| CSP + headers | `next.config.ts`: CSP con `connect-src` Railway + Supabase, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`; `frame-ancestors *` en vistas de chat embebibles. |
| Historial protegido | `GET /chat/{id}/history` — requiere JWT y valida owner / admin / estudiante asociado. |
| system_prompt limitado | `MAX_SYSTEM_PROMPT_LENGTH = 2000` chars — validado en POST y PUT `/chatbots`. |
| CORS | `CORS_ORIGINS` configurado explícitamente para Vercel, Railway y entornos locales. |

---

## API Reference

```
GET  /health                          → Health check
GET  /ready                           → Readiness probe (verifica Supabase)
GET  /platform/stats                  → Estadísticas públicas (landing)

POST /auth/login                      → { token, refresh_token, user } — 10/min
POST /auth/register                   → { token, refresh_token, user } — 5/min, role=student
POST /auth/refresh                    → { token, refresh_token, user } — 20/min [JWT]
POST /auth/logout                     → Invalida sesión activa [JWT]
GET  /auth/me                         → Usuario actual [JWT]
PUT  /auth/me/profile                 → Actualizar perfil + OpenRouter key [JWT]

GET  /chatbots                        → Lista (owner_id, published_only, limit, offset)
POST /chatbots                        → Crear chatbot [JWT Teacher]
GET  /chatbots/{id}                   → Detalle (system_prompt_override oculto a terceros)
PUT  /chatbots/{id}                   → Actualizar [JWT Owner]
DELETE /chatbots/{id}                 → Eliminar + document_contents en cascada [JWT Owner]
POST /chatbots/{id}/publish           → Publicar en marketplace [JWT Owner]
GET  /chatbots/{id}/embed             → embed_code + public_url

POST /documents/upload                → Subir MD/TXT/PDF/DOCX [JWT Owner]
GET  /documents?chatbot_id=           → Listar documentos (limit, offset) [JWT Owner]
GET  /documents/{id}                  → Detalle [JWT Owner]
DELETE /documents/{id}?chatbot_id=    → Eliminar metadatos + contenido [JWT Owner]

POST /chat/{id}                       → Inferencia síncrona con memoria — 100/min/IP
POST /chat/{id}/stream                → Streaming token a token vía SSE
GET  /chat/{id}/history               → Historial [JWT: Owner | Admin | Student asociado]

GET  /teacher/metrics                 → Métricas del docente [JWT Teacher]

POST /admin/teachers                  → Crear docente [JWT Admin]
GET  /admin/teachers                  → Listar docentes [JWT Admin]
PUT  /admin/teachers/{id}             → Editar docente [JWT Admin]
DELETE /admin/teachers/{id}           → Eliminar docente [JWT Admin]
```

---

## Testing y Calidad

```bash
# Backend (61 pruebas unitarias y de integración herméticas)
cd backend
pytest -v

# Frontend (82 pruebas unitarias con Vitest)
cd frontend
npm test

# Build de producción Next.js (TypeScript + turbopack)
cd frontend
npm run build
```

---

## Convenciones Git

```
feat:     nueva funcionalidad
fix:      corrección de bug
docs:     documentación técnica
refactor: refactorización sin cambio de comportamiento
test:     adición o mejora de tests
chore:    mantenimiento de dependencias y CI
```

**Ramas:**
```
master          → producción (despliegue automático)
develop         → integración
feature/nombre
fix/nombre
```

---

## Variables de Entorno Críticas

| Variable | Módulo | Obligatoria | Descripción |
|---|---|---|---|
| `SUPABASE_URL` | backend | Sí | URL de la API de Supabase |
| `SUPABASE_KEY` | backend | Sí | service_role key |
| `JWT_SECRET` | backend | Sí | Secreto para firma de tokens JWT (≥32 caracteres) |
| `ENCRYPTION_KEY` | backend | Sí | Clave simétrica Fernet para cifrado de API keys BYOK |
| `OPENROUTER_API_KEY` | backend | Opcional | Clave del sistema para cuentas en whitelist |
| `CORS_ORIGINS` | backend | Sí | Orígenes permitidos (Vercel, Railway, localhost) |
| `NEXT_PUBLIC_API_URL` | frontend | Sí | URL base del backend FastAPI |
