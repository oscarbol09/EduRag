# EduRAG Backend — AGENTS.md

Guía técnica para agentes de IA y desarrolladores que trabajen en `backend/`. Leer antes de modificar cualquier archivo.

---

## Propósito del Módulo

API REST construida con **FastAPI (Python 3.11/3.12)**. Desplegada en **Railway** con **Uvicorn**. Gestiona la persistencia en Supabase PostgreSQL, almacenamiento binario en Supabase Storage, construcción de contexto RAG léxico e inferencia asíncrona vía OpenRouter.

---

## Estructura de Archivos

```
backend/
├── main.py                   # App FastAPI, endpoints, CORS, rate limiting, lifespan context manager
├── settings.py               # Pydantic Settings v2 (SettingsConfigDict) sin defaults inseguros
├── models.py                 # Schemas Pydantic v2 (ConfigDict(from_attributes=True))
├── auth.py                   # Dependencias FastAPI (get_current_user / get_current_user_optional)
├── jwt_token.py              # Emisión, decodificación y verificación de JWT + refresh tokens con jti
├── password.py               # Hash y verificación de contraseñas con bcrypt
├── security_utils.py         # Cifrado y descifrado simétrico Fernet para API keys BYOK
├── supabase_db.py            # Persistencia asíncrona sobre 6 tablas + tabla revoked_tokens
├── document_content_store.py # Almacén de texto plano en document_contents
├── context_builder.py        # Chunking léxico (1500c / 200c overlap) y selección presupuestaria (60k chars)
├── llm_client.py             # Cliente async httpx para OpenRouter (generate + generate_stream)
├── document_uploader.py      # Extracción de texto (UTF-8, PyMuPDF, python-docx) y upload a Supabase Storage
├── conftest.py               # Arnés de pruebas con dobles herméticos (MockSupabaseClient, MockStorageClient)
├── test_main.py              # Suite de pruebas automatizadas (61 tests)
├── railway.toml              # Configuración de despliegue en Railway
├── requirements.txt          # Dependencias fijadas
├── .env                      # Variables locales (NO commitear)
└── .env.example              # Plantilla documentada de variables de entorno
```

---

## Módulos — Descripción Técnica

### `main.py`
Punto de entrada de FastAPI:
- Lifespan context manager (`@asynccontextmanager`) para inicialización y cierre limpio de recursos.
- Configuración de CORS desde `settings.cors_origins_list` (Vercel, Railway, localhost).
- Rate limiter con `slowapi`: `/auth/login` (10/min), `/auth/register` (5/min), `/chat/{id}` (100/min por IP).
- Caché en memoria con TTL de 5 min (`threading.RLock` + LRU simple, máx. 1000 entradas).
- `map_user_response(user)` — mapea columnas a formato público y purga campos sensibles (`password`, hashes).
- Inferencia SSE token-a-token mediante `StreamingResponse` y eventos estructurados (`token`, `done`, `error`).

### `settings.py`
Validador de configuración basado en `pydantic_settings.BaseSettings`:
```python
settings.SUPABASE_URL            # Obligatorio
settings.SUPABASE_KEY            # Obligatorio (service_role)
settings.JWT_SECRET              # Obligatorio (≥32 caracteres)
settings.ENCRYPTION_KEY          # Obligatorio (Fernet key)
settings.OPENROUTER_API_KEY      # Opcional (fallback para whitelist)
settings.TEST_ACCOUNTS_WHITELIST # String separado por comas
settings.test_accounts_list      # Property: lista de emails
settings.cors_origins_list       # Property: lista de URLs permitidas
settings.MAX_SYSTEM_PROMPT_LENGTH  # 2000 caracteres
settings.MAX_FILE_SIZE_MB        # 20 MB
settings.MAX_CACHE_SIZE          # 1000 entradas
```

### `security_utils.py`
```python
encrypt_api_key(api_key: str) -> str   # Fernet — lanza excepción si falla (sin fallback silencioso a texto plano)
decrypt_api_key(encrypted: str) -> str # Fernet — decodifica token simétrico autenticado
```

### `auth.py`
```python
user = await get_current_user(request)          # Exige JWT válido con jti no revocado (401 si falta o es inválido)
user = await get_current_user_optional(request) # Retorna usuario anónimo si no hay cabecera Authorization
```
Payload JWT: `{ sub, email, role, exp, jti }`. Se extrae mediante cabecera `Authorization: Bearer <token>` de forma insensible a mayúsculas.

### `supabase_db.py`
Operaciones CRUD asíncronas sobre Supabase PostgreSQL:
- **`users`:** `create_user`, `get_user`, `get_user_by_email`, `list_users`, `update_user`, `delete_user`.
- **`chatbots`:** `create_chatbot`, `get_chatbot`, `update_chatbot`, `delete_chatbot`, `list_chatbots`.
- **`documents`:** `create_document`, `get_document`, `update_document`, `list_documents`, `delete_document`.
- **`conversations`:** `create_conversation`, `get_conversation`, `save_conversation`, `list_conversations`.
- **`messages`:** `create_message`, `create_messages_batch`, `list_messages_for_conversation` (con fallback de contingencia a JSONB legacy).
- **`revoked_tokens`:** `revoke_token`, `is_token_revoked`.

### `context_builder.py`
```python
build_context(documents: list[dict], query: str, max_chars=60_000) -> str
```
Divide el texto en chunks de 1500 caracteres con 200 de solapamiento. Clasifica los fragmentos según la intersección léxica de tokens con la pregunta del usuario y selecciona de forma codiciosa hasta copar el límite presupuestario de 60,000 caracteres.

### `llm_client.py`
Cliente asíncrono sobre `httpx.AsyncClient`:
- `generate(...)` para respuestas síncronas completas.
- `generate_stream(...)` para emisión token a token vía generador asíncrono.
- Soporte para historial conversacional en formato estándar OpenAI/OpenRouter (`messages: [{"role": "...", "content": "..."}]`).

---

## Flujo de Inferencia Conversacional

### `POST /chat/{chatbot_id}` (Síncrono)
1. Búsqueda y validación del chatbot (404 si no existe o 403 si no está publicado).
2. Verificación de caché en memoria (clave: `chatbot_id:sha256(message)`).
3. Construcción del contexto léxico con `context_builder.build_context()`.
4. Carga de los últimos 20 turnos de mensajes desde `public.messages`.
5. Descifrado de la clave OpenRouter del docente (o fallback a cuenta de test).
6. Invocación asíncrona de `llm.generate()`.
7. Almacenamiento en caché y persistencia atómica del turno (`create_messages_batch`).
8. Retorno de `ChatResponse { response, conversation_id, sources }`.

### `POST /chat/{chatbot_id}/stream` (SSE)
Mismo flujo preparatorio, retornando `StreamingResponse(media_type="text/event-stream")`:
- Emisión de `event: token` por cada chunk recibido del proveedor LLM.
- Persistencia al terminar e emisión de `event: done { conversation_id, sources }`.
- En caso de error, emisión de `event: error { message }`.

---

## Suite de Pruebas Automatizadas

La suite de backend está compuesta por **61 pruebas unitarias y de integración** completamente herméticas (sin dependencia de credenciales ni red externa):

```bash
cd backend
pytest -v
```

| Módulo / Categoría | Aspectos Validados |
|---|---|
| **Sistema & Diagnóstico** | Endpoints `/health`, `/ready` y `/platform/stats`. |
| **Autenticación & JWT** | Login, registro forzado como estudiante, hash no expuesto, refresh tokens con rotación, `jti`, expiración y logout. |
| **Seguridad Multi-tenant** | Aislamiento de chatbots entre docentes, subida de documentos con validación de titularidad, historial protegido y rechazo cross-chatbot. |
| **Inferencia & Streaming** | Respuestas síncronas, persistencia de `conversation_id`, eventos SSE (`token`, `done`, `error`) y manejo de errores 404/403. |
| **Ingesta de Documentos** | Extracción de Markdown, TXT, DOCX estructurado con tablas, rechazo de PDFs inválidos o escaneados y límites de tamaño. |
| **Criptografía & Configuración** | Cifrado y descifrado Fernet, derivación SHA-256 de contingencia, Pydantic settings y listas de CORS. |
| **Context Builder** | Respeto estricto del presupuesto de 60,000 caracteres, ranking de chunks relevantes y manejo de documentos vacíos o unitarios. |
