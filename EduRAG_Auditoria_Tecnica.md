# Auditoría Técnica — EduRAG Platform
**Fecha:** Junio 2026  
**Versión analizada:** Backend v0.2.0 · Frontend v0.1.0  
**Repositorio:** `oscarbol09/EduRag` · branch `master`  
**Realizado por:** Claude (Auditoría automatizada asistida por IA)

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura General](#2-arquitectura-general)
3. [Auditoría Backend (FastAPI)](#3-auditoría-backend-fastapi)
4. [Auditoría Frontend (Next.js)](#4-auditoría-frontend-nextjs)
5. [Seguridad](#5-seguridad)
6. [Base de Datos (Supabase)](#6-base-de-datos-supabase)
7. [Pipeline de Documentos y RAG](#7-pipeline-de-documentos-y-rag)
8. [Testing](#8-testing)
9. [DevOps y Despliegue](#9-devops-y-despliegue)
10. [Deuda Técnica y Mejoras Prioritarias](#10-deuda-técnica-y-mejoras-prioritarias)
11. [Puntuación Final](#11-puntuación-final)

---

## 1. Resumen Ejecutivo

EduRAG es una plataforma SaaS educativa multi-tenant bien concebida. El proyecto presenta una arquitectura coherente con decisiones de diseño justificadas (eliminación de ChromaDB por limitaciones de hosting, uso de contexto directo en vez de vector store), documentación interna de calidad y controles de seguridad básicos en su lugar.

**Estado general: BUENO con áreas críticas a resolver.**

| Área | Puntuación | Estado |
|------|-----------|--------|
| Arquitectura | 8/10 | ✅ Sólida |
| Seguridad | 6/10 | ⚠️ Riesgos activos |
| Calidad de código Backend | 7/10 | ✅ Buena |
| Calidad de código Frontend | 7.5/10 | ✅ Buena |
| Testing | 4/10 | ❌ Insuficiente |
| Pipeline RAG | 7/10 | ✅ Funcional |
| DevOps | 7/10 | ✅ Razonable |
| Documentación | 9/10 | ✅ Excelente |

**Hallazgos críticos (deben resolverse antes de producción a escala):**
1. `security_utils.py` tiene un fallback inseguro que puede exponer API keys en texto plano.
2. El caché en memoria (`response_cache`) no es thread-safe y no escala horizontalmente.
3. La cobertura de tests es mínima — solo 4 tests funcionales, sin tests para flujos críticos.
4. `ENCRYPTION_KEY` no está definida como variable de entorno requerida en `settings.py`.
5. Endpoint `/teacher/metrics` ausente de la documentación oficial (SPEC.md, README).

---

## 2. Arquitectura General

### Lo que funciona bien

La arquitectura es pragmática y apropiada para el contexto (free tier, despliegue rápido):

- **Separación clara** de responsabilidades entre módulos backend (`llm_client`, `context_builder`, `document_uploader`, `supabase_db`, `security_utils`).
- **Decisión correcta** de eliminar ChromaDB — el enfoque de contexto directo (60k chars) es válido para la escala actual y elimina una dependencia de 500 MB que causaba timeouts reales.
- **BYOK (Bring Your Own Key)** bien implementado: cada docente usa su propia API key de OpenRouter, con fallback solo para cuentas `@edurag.com`.
- **SSE streaming** correctamente implementado con fallback automático al endpoint síncrono.
- **Multi-tenant isolation** aplicado en todas las queries con filtros por `owner_id` y `chatbot_id`.

### Limitaciones arquitecturales

**Caché en memoria local (`response_cache`):** El diccionario Python en memoria no se comparte entre workers de Gunicorn ni entre instancias de Railway si hay escalado horizontal. Dos workers pueden generar la misma respuesta en paralelo y escribir en caches distintos. Solución recomendada: Redis o caché de Supabase con TTL.

**Sin paginación en endpoints de listado:** `GET /chatbots`, `GET /documents`, `GET /admin/teachers` devuelven todos los registros sin paginación. A escala esto puede generar respuestas lentas y payloads excesivos.

**Sin rate limiting en endpoints de escritura:** `slowapi` solo limita `/chat/{id}` (100 req/min). Endpoints como `POST /auth/register`, `POST /auth/login` y `POST /documents/upload` están sin protección, siendo vulnerables a brute-force y abuse.

**Modelo de datos `institution` legacy:** El campo `institution` serializado como `"Nombre | Institución | Key | Modelo"` coexiste con los campos nativos (`first_name`, `last_name`, `openrouter_api_key`, etc.) con lógica de fallback compleja en `map_user_response()`. Esto es deuda técnica activa — puede causar inconsistencias si la migración a columnas nativas no se completa en todos los usuarios.

---

## 3. Auditoría Backend (FastAPI)

### `main.py`

**Positivo:**
- Estructura de endpoints clara y RESTful.
- Separación en helpers privados (`_prepare_chat_generation`, `_persist_chat_turn`) reduce duplicación entre endpoints sync y stream.
- Security headers (`X-Content-Type-Options`, `X-XSS-Protection`) aplicados vía middleware.
- Validación de propiedad del chatbot antes de toda operación sobre documentos.
- Startup warning si `JWT_SECRET` es débil.

**Problemas identificados:**

```python
# ⚠️ PROBLEMA 1: Import dentro de función (múltiples veces)
# En _prepare_chat_generation, update_my_profile, create_teacher, etc.:
from security_utils import decrypt_api_key  # ← dentro del cuerpo de funciones async

# Impacto: Python cachea imports, no hay penalización severa, pero es anti-patrón.
# Fix: mover todos los imports al top del módulo.
```

```python
# ⚠️ PROBLEMA 2: Caché sin lock (race condition)
if len(response_cache) >= settings.MAX_CACHE_SIZE:
    response_cache.pop(next(iter(response_cache)))
response_cache[cache_key] = {...}

# En entornos multi-worker, dos requests concurrentes pueden pasar el size-check
# simultáneamente y ambas intentar escribir. Solución: threading.Lock o Redis.
```

```python
# ⚠️ PROBLEMA 3: Endpoint /teacher/metrics usa queries no optimizadas
# Hace 3 queries secuenciales a Supabase (chatbots → documentos → conversaciones).
# Mejor: una sola query con JOINs o RPC de Supabase.
```

```python
# ⚠️ PROBLEMA 4: delete_teacher hace acceso directo a get_client() en main.py
from supabase_db import get_client
get_client().table("users").delete().eq("id", teacher_id).execute()

# Rompe la abstracción de supabase_db.py. Debería haber delete_user() en supabase_db.
```

```python
# ⚠️ PROBLEMA 5: Estadísticas hardcodeadas en la landing
# La landing muestra "500+ Chatbots, 150+ Docentes, 30K+ Mensajes" — valores ficticios.
# Si la plataforma crece, esto puede dañar la credibilidad.
```

### `settings.py`

```python
# ❌ CRÍTICO: ENCRYPTION_KEY no está definida como campo requerido
class Settings(BaseSettings):
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    JWT_SECRET: str  # ← requerido, bien
    OPENROUTER_API_KEY: str = ""
    # ENCRYPTION_KEY NO EXISTE AQUÍ
```

`ENCRYPTION_KEY` solo se lee desde `os.environ.get()` en `security_utils.py`, sin pasar por el sistema de configuración de Pydantic. Esto significa que no se valida al startup, no aparece en `.env.example`, y puede estar ausente silenciosamente en producción.

### `security_utils.py`

```python
# ❌ CRÍTICO: Fallback inseguro en encrypt/decrypt
def encrypt_api_key(api_key: str) -> str:
    try:
        f = Fernet(get_encryption_key())
        return f.encrypt(api_key.encode("utf-8")).decode("utf-8")
    except Exception:
        return api_key  # ← devuelve la key EN TEXTO PLANO si falla el cifrado

def decrypt_api_key(encrypted_key: str) -> str:
    try:
        ...
    except Exception:
        return encrypted_key  # ← devuelve el valor crudo (puede ser texto plano)
```

Si `ENCRYPTION_KEY` no está configurada en producción y el `JWT_SECRET` no es válido para derivar la clave Fernet, las API keys de OpenRouter se almacenan **en texto plano** en Supabase sin ninguna advertencia. Esto es un riesgo de seguridad real.

**Fix recomendado:**
```python
def encrypt_api_key(api_key: str) -> str:
    if not api_key:
        return ""
    f = Fernet(get_encryption_key())  # Sin try/except — que falle ruidosamente
    return f.encrypt(api_key.encode("utf-8")).decode("utf-8")
```

### `context_builder.py`

Implementación sólida y bien documentada. El chunking léxico con overlap y ranking por tokens es una solución pragmática y eficiente.

**Observaciones menores:**
- `_STOPWORDS` podría externalizarse como constante de configuración.
- No hay límite en el número de documentos procesados por chatbot — si un docente sube 1000 documentos, `get_all_contents_for_chatbot()` recupera todo a memoria antes de chunking. Considerar lazy loading o límite de documentos por chatbot.

### `llm_client.py`

Bien estructurado. El patrón `_build_payload` / `_resolve_auth` / métodos públicos es limpio.

**Observación:** `DEFAULT_MODEL = "google/gemma-4-26b-a4b-it:free"` está hardcodeado. Si este modelo se descontinúa en OpenRouter, todos los chatbots sin modelo configurado fallan silenciosamente. Debería estar en `settings.py` como variable de entorno con fallback.

### `supabase_db.py`

Bien organizado. El patrón singleton con `threading.Lock` para el cliente Supabase es correcto.

**Funciones faltantes que se acceden directamente desde `main.py`:**
- `delete_user()` — ausente, accedido con `get_client().table("users").delete()` desde main.
- Esto rompe la abstracción y hace el código de main más acoplado.

---

## 4. Auditoría Frontend (Next.js)

### Estructura y organización

La arquitectura App Router está bien organizada. La separación `app/` → `components/` → `lib/` es correcta y consistente.

**Rutas implementadas:**
- `/` — Landing page
- `/login`, `/register` — Autenticación
- `/teacher` — Dashboard docente
- `/teacher/chatbots/new` — Crear chatbot
- `/teacher/chatbots/[id]` — Editar chatbot
- `/teacher/settings` — Configuración de perfil
- `/marketplace` — Marketplace público
- `/chat/[botId]` — Interfaz de chat
- `/admin` — Panel de administración

### `lib/api.ts`

**Muy bien diseñado.** El cliente HTTP centralizado con timeouts diferenciados (30s ligeros, 120s chat/upload) y manejo de AbortController es correcto.

**Observación:**
```typescript
// ⚠️ Token en localStorage — vulnerable a XSS
const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
```
localStorage es vulnerable a ataques XSS. Para mayor seguridad se recomienda `httpOnly cookies` o, como mínimo, `sessionStorage`. En el contexto actual (free tier, escala pequeña) es aceptable, pero debe documentarse como riesgo conocido.

### `lib/context.tsx`

Context bien implementado con separación de estado de auth, chatbots y conversaciones.

**Observación:**
```typescript
// ⚠️ conversations en el contexto global no se usa en ningún componente visible
const [conversations, setConversations] = useState<Record<string, Conversation>>({});
// setConversations nunca se llama fuera del reset en logout().
```
Estado muerto — puede eliminarse o implementarse el uso correspondiente.

### `ChatClient.tsx`

**Positivo:**
- Streaming SSE con fallback automático correctamente implementado.
- Indicador de "typing" (dots animados) mientras se recibe la respuesta.
- `renderMessageContent` con soporte de Markdown básico (bold, italic, inline code).

**Problemas:**

```typescript
// ❌ BUG: assistantIndex calculado ANTES de que setMessages actualice el estado
const assistantIndex = messages.length + 1; // ← usa el valor capturado en el closure

setMessages((prev) => [...prev, userMsgObj, assistantPlaceholder]);
// messages.length no ha cambiado todavía en React (batching)

const appendToAssistant = (chunk: string) => {
  setMessages((prev) => {
    const next = [...prev];
    const target = next[assistantIndex]; // ← puede apuntar al índice incorrecto
```

Este es un bug activo. El índice calculado con `messages.length + 1` puede estar desfasado si hay múltiples renders pendientes. La solución correcta es usar un `useRef` para rastrear el mensaje del assistant o identificarlo por un `id` único.

```typescript
// ⚠️ Sin límite de caracteres en el input
<input type="text" value={input} onChange={(e) => setInput(e.target.value)} />
// Un usuario puede enviar mensajes de cientos de miles de caracteres.
// Añadir maxLength o validación en el frontend.
```

```typescript
// ⚠️ renderMessageContent no maneja listas Markdown (- item, * item, 1. item)
// ni bloques de código (```), que son comunes en respuestas educativas de LLMs.
// Considerar usar react-markdown para un rendering más robusto.
```

### `teacher/page.tsx`

**Observación:**
```tsx
// ⚠️ Nombre del docente se extrae del campo legacy 'institution'
{auth.user?.institution && auth.user.institution.includes(" | ")
  ? auth.user.institution.split(" | ")[0]
  : auth.user?.email}

// Debería usar auth.user?.firstName directamente ahora que existe el campo nativo.
```

### `page.tsx` (Landing)

Diseño visual sólido y consistente con la identidad de marca. La sección de estadísticas muestra valores ficticios hardcodeados ("500+ Chatbots", "150+ Docentes") que deberían alimentarse de la API o eliminarse hasta tener datos reales.

### `package.json`

```json
// ⚠️ Versiones muy recientes con posibles inestabilidades
"next": "16.2.6",        // Muy reciente — verificar stabilidad
"react": "19.2.4",       // React 19 — API en evolución
"lucide-react": "^1.14.0" // Versión major alta — verificar breaking changes
```

---

## 5. Seguridad

### Controles correctamente implementados ✅

| Control | Implementación |
|---------|---------------|
| JWT HS256 con issuer/audience | `jwt_token.py` — correcto |
| Filtrado de password hash en respuestas | `main.py` — correcto |
| Forzar rol `student` en auto-registro | `main.py` — correcto |
| Validación de propiedad del chatbot en docs | `main.py` — correcto |
| Rate limiting en endpoints de chat | `slowapi` 100/min — correcto |
| Security headers HTTP | Middleware — correcto |
| Aislamiento multi-tenant | `supabase_db.py` — correcto |
| Cifrado de API keys con Fernet | `security_utils.py` — correcto en teoría |

### Vulnerabilidades identificadas ⚠️❌

**CRÍTICO — Cifrado silencioso con fallback a texto plano:**
Como se documenta en la sección de `security_utils.py`, si `ENCRYPTION_KEY` no está configurada o es inválida, las API keys se guardan sin cifrar. No hay logging ni alerta de este comportamiento.

**ALTO — Sin rate limiting en auth:**
`POST /auth/login` y `POST /auth/register` sin límite permiten ataques de brute-force y registro masivo de cuentas. Añadir `@limiter.limit("5/minute")` en login y `@limiter.limit("3/minute")` en register.

**MEDIO — Token JWT en localStorage:**
Vulnerable a XSS. Mitigación recomendada: `httpOnly` cookies o al menos `Content-Security-Policy` headers en Vercel.

**MEDIO — `system_prompt_override` sin sanitización:**
Los docentes pueden configurar prompts personalizados que el sistema inyecta directamente en las llamadas al LLM. No hay validación de longitud ni de contenido potencialmente malicioso (prompt injection hacia el LLM). Añadir límite de longitud (p.ej. 2000 chars) y policy de uso aceptable.

**BAJO — Conversaciones accesibles sin autenticación:**
`GET /chat/{chatbot_id}/history?conversation_id=X` no requiere autenticación. Cualquiera que conozca un `conversation_id` puede ver el historial completo. Esto puede exponer preguntas y respuestas de estudiantes.

**BAJO — `SUPABASE_KEY` en settings con valor vacío como default:**
```python
SUPABASE_KEY: str = ""  # ← si no se configura, arranque exitoso con DB rota
```
Debería ser requerido (sin default) como `JWT_SECRET`.

---

## 6. Base de Datos (Supabase)

### Modelo de datos

El esquema de 5 tablas está bien diseñado para el alcance del proyecto. Las relaciones con `ON DELETE CASCADE` son correctas para evitar datos huérfanos.

**Observaciones:**

**Campo `institution` legacy vs columnas nativas:** La coexistencia del campo serializado `"Nombre | Institución | Key | Modelo"` con columnas nativas (`first_name`, `last_name`, etc.) genera complejidad innecesaria en `map_user_response()`. Se recomienda una migración completa y la eliminación del campo legacy.

**`document_contents.content` sin límite definido:** El texto completo de documentos de hasta 20 MB puede almacenarse en una columna `text` de Postgres. Supabase Free Tier tiene límite de 500 MB de base de datos. Con documentos grandes, este límite puede alcanzarse rápidamente. Considerar un límite por documento (p.ej. 1 MB de texto extraído) o compresión.

**Sin índices explícitos documentados:** Las queries más frecuentes (`chatbot_id` en `document_contents`, `owner_id` en `chatbots`) requieren índices. Asegurarse de que existan en la instancia de Supabase:
```sql
CREATE INDEX IF NOT EXISTS idx_document_contents_chatbot_id ON document_contents(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_chatbots_owner_id ON chatbots(owner_id);
CREATE INDEX IF NOT EXISTS idx_documents_chatbot_id ON documents(chatbot_id);
CREATE INDEX IF NOT EXISTS idx_conversations_chatbot_id ON conversations(chatbot_id);
```

**`conversations.messages` como JSONB:** Almacenar el historial de mensajes como un array JSONB que crece indefinidamente es un anti-patrón. En conversaciones largas el payload se vuelve grande. Considerar una tabla `messages` separada con FK a `conversations`.

---

## 7. Pipeline de Documentos y RAG

### Fortalezas

- El chunking léxico con overlap (1500/200 chars) y ranking por tokens es una solución simple y efectiva para la escala actual.
- El presupuesto de 60k chars (~15k tokens) deja margen razonable para system prompt y respuesta.
- La extracción de texto soporta 4 formatos (MD, TXT, PDF, DOCX) con manejo de errores explícito.
- El filename sanitization en uploads previene path traversal en Storage.

### Limitaciones y mejoras

**Sin deduplicación de documentos:** Un docente puede subir el mismo archivo múltiples veces, duplicando el contenido en `document_contents` y aumentando el contexto innecesariamente. Añadir hash de contenido como check antes de insertar.

**Extracción de DOCX solo de párrafos:** `document_uploader.py` extrae solo `doc.paragraphs`, ignorando tablas, headers, footers y celdas. En documentos académicos esto puede omitir contenido importante.

**Sin extracción de texto de PDFs con OCR:** PyMuPDF extrae texto solo de PDFs digitales. PDFs escaneados devuelven texto vacío (o muy poco), causando que el endpoint devuelva `400 "No se pudo extraer texto del archivo"`. Documentar claramente esta limitación.

**El ranking por overlap de tokens es O(n×m):** Con muchos documentos y chunks, el scoring puede ser lento. Para la escala actual (free tier) es aceptable, pero documentar el límite práctico.

---

## 8. Testing

### Estado actual

```
backend/test_main.py — 4 tests:
  ✅ test_health
  ✅ test_readiness  
  ✅ test_auth_me_anonymous
  ✅ test_auth_flow_and_chatbot_creation

frontend/test/ — 5 archivos de test (AuthLayout, EmptyState, Navbar, Spinner, StatusBadge)
```

### Cobertura real: ~15% estimada

**Flujos críticos sin tests:**
- Upload de documentos
- Endpoint de chat (sync y stream)
- Endpoints de admin (crear/editar/eliminar docente)
- Validación de propiedad del chatbot (el control de seguridad principal)
- Endpoint de perfil del docente
- `context_builder.build_context()` con múltiples documentos
- `security_utils.encrypt_api_key / decrypt_api_key`
- Flujo de "registro de docente pre-creado"

**Recomendaciones:**

```python
# Tests prioritarios a añadir:

def test_document_ownership_enforcement():
    """Un usuario no puede subir documentos a un chatbot ajeno"""

def test_chat_without_api_key():
    """Chatbot sin API key configurada devuelve mensaje de error apropiado"""

def test_context_builder_with_multiple_docs():
    """build_context respeta el presupuesto de 60k chars"""

def test_security_utils_encrypt_decrypt_roundtrip():
    """encrypt → decrypt devuelve el valor original"""

def test_admin_cannot_access_teacher_endpoints():
    """RBAC: admin no puede acceder a /chat ni /teacher/chatbots"""
```

---

## 9. DevOps y Despliegue

### Configuración Railway (`railway.toml`)

No se leyó el contenido de `railway.toml`, pero la arquitectura describe Uvicorn + Gunicorn en Railway con timeouts ajustados — configuración correcta para FastAPI.

### Variables de entorno

**`.env.example` bien documentado.** Sin embargo, `ENCRYPTION_KEY` está ausente de `.env.example` a pesar de ser crítica para el cifrado de API keys.

**Variables faltantes en `.env.example`:**
```env
# Añadir:
ENCRYPTION_KEY=<generar con: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">
TEST_ACCOUNTS_WHITELIST=admin@edurag.com,test@edurag.com
```

### Vercel (`frontend/vercel.json`)

No se leyó el contenido, pero la configuración de CORS en el backend (`CORS_ORIGINS`) debe mantenerse sincronizada con los dominios de Vercel — este fue un problema previo documentado en el historial del proyecto.

### `.gitignore`

Se recomienda verificar que `.env`, `backend/.env`, y `frontend/.env.local` estén explícitamente ignorados para prevenir commits accidentales de credenciales.

---

## 10. Deuda Técnica y Mejoras Prioritarias

### 🔴 Crítico (resolver antes de escalar)

1. **Añadir `ENCRYPTION_KEY` a `settings.py` como campo requerido** y eliminar el fallback silencioso en `security_utils.py`.
2. **Rate limiting en `/auth/login` y `/auth/register`** para prevenir brute-force.
3. **Fix del bug de `assistantIndex`** en `ChatClient.tsx` — puede causar mensajes del assistant en posición incorrecta.
4. **Añadir `delete_user()` a `supabase_db.py`** y eliminar el acceso directo a `get_client()` desde `main.py`.

### 🟡 Alto (resolver en próximo sprint)

5. **Migrar completamente el campo `institution` legacy** — eliminar la lógica de fallback en `map_user_response()` una vez confirmado que todos los usuarios tienen columnas nativas.
6. **Añadir índices de base de datos** en `chatbot_id`, `owner_id` si no existen en Supabase.
7. **Añadir paginación** en `GET /chatbots`, `GET /admin/teachers`, `GET /documents`.
8. **Mover imports de funciones** al top de `main.py` (eliminar imports dentro de funciones).
9. **Proteger `GET /chat/{chatbot_id}/history`** con autenticación.

### 🟢 Mejoras recomendadas (backlog)

10. **Reemplazar `react-markdown` para ChatClient** — el renderizador custom no soporta listas ni bloques de código.
11. **Extraer tablas de DOCX** en `document_uploader.py` además de párrafos.
12. **Documentar limitación de PDFs escaneados** en la UI del upload.
13. **Añadir endpoint de métricas de plataforma** (total chatbots, usuarios) para reemplazar estadísticas hardcodeadas en la landing.
14. **Implementar `conversations` como tabla de mensajes** separada en lugar de JSONB creciente.
15. **Migrar caché de respuestas** a Redis o caché de Supabase para funcionamiento multi-worker.
16. **Ampliar cobertura de tests** al 60%+ en flujos críticos (chat, documentos, seguridad multi-tenant).

---

## 11. Puntuación Final

| Dimensión | Peso | Puntuación | Ponderado |
|-----------|------|-----------|----------|
| Arquitectura y diseño | 20% | 8.0 | 1.60 |
| Seguridad | 20% | 6.0 | 1.20 |
| Calidad de código Backend | 15% | 7.0 | 1.05 |
| Calidad de código Frontend | 15% | 7.5 | 1.13 |
| Testing | 10% | 4.0 | 0.40 |
| Pipeline RAG y documentos | 10% | 7.0 | 0.70 |
| DevOps y configuración | 5% | 7.0 | 0.35 |
| Documentación técnica | 5% | 9.0 | 0.45 |

**Puntuación total: 6.88 / 10**

> El proyecto está en un estado sólido para prototipo/MVP y producción controlada. Para escalar a un producto con cientos de docentes, los hallazgos críticos de seguridad y el bug de frontend deben resolverse. La documentación interna (SPEC.md, AGENTS.md, README) es un activo valioso que pocos proyectos de este tamaño tienen — mantenerla actualizada con los cambios es importante.

---

*Auditoría generada automáticamente analizando 20+ archivos fuente. Última actualización: Junio 2026.*
