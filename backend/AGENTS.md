# EduRAG Backend — AGENTS.md

Guía técnica para agentes de IA y desarrolladores que trabajen en `backend/`. Leer antes de modificar cualquier archivo.

---

## Propósito del Módulo

API REST con **FastAPI (Python 3.11)**. Desplegada en **Railway**. Sirve con **Uvicorn**. Conecta con Supabase PostgreSQL, Supabase Storage y OpenRouter.

---

## Estructura de Archivos

```
backend/
├── main.py                 # App principal: endpoints, CORS, caché TTL, rate limiting, map_user_response
├── settings.py             # Pydantic Settings — todos los campos requeridos (sin defaults inseguros)
├── models.py               # Modelos Pydantic request/response
├── auth.py                 # Middleware JWT (get_current_user / get_current_user_optional)
├── jwt_token.py            # create_jwt_token / verify_jwt_token (PyJWT HS256)
├── password.py             # hash_password / verify_password (bcrypt)
├── security_utils.py       # encrypt_api_key / decrypt_api_key (Fernet — sin fallback silencioso)
├── supabase_db.py          # CRUD — 6 tablas Postgres + fallback gracioso en tabla messages
├── document_content_store.py # store/retrieve texto en document_contents
├── context_builder.py      # Chunking léxico + ranking por overlap + presupuesto 60k chars
├── llm_client.py           # Cliente async httpx → OpenRouter (generate + generate_stream)
├── document_uploader.py    # Upload Supabase Storage + extracción texto (MD/TXT/PDF/DOCX con tablas)
├── railway.toml            # Config deploy Railway (Uvicorn --timeout-keep-alive 120)
├── test_main.py            # Suite pytest — 44 tests
├── requirements.txt        # Dependencias Python
├── .env                    # Variables locales (NO commitear)
└── .env.example            # Plantilla completa
```

---

## Módulos — Descripción Técnica

### `main.py`
Punto de entrada FastAPI. Contiene:
- CORS desde `settings.cors_origins_list` (Vercel + Railway + localhost).
- Rate limiter `slowapi`: login 10/min, register 5/min, chat 100/min/IP.
- Caché en memoria con TTL 5 min (`threading.RLock` + LRU simple, máx 1000 entradas). **Nota:** no comparte estado entre workers Gunicorn. Redis sería la solución para multi-worker.
- `map_user_response(user)` — mapea columnas nativas a camelCase; hace `res.pop("institution", None)` y `res.pop("name", None)` para eliminar campos legacy.
- `_prepare_chat_generation()` — recupera documentos, construye contexto, valida API key, carga historial desde tabla `messages` con fallback a JSONB legacy.
- `_persist_chat_turn()` — escribe en tabla `messages` via `create_messages_batch()`.
- `_sse(event, data)` — formatea eventos SSE.
- `GET /platform/stats` — consulta `public.messages` (tabla normalizada) para conteo de mensajes.

### `settings.py`
```python
settings.SUPABASE_URL            # requerido
settings.SUPABASE_KEY            # requerido (service_role)
settings.JWT_SECRET              # requerido (≥32 chars)
settings.ENCRYPTION_KEY          # requerido (Fernet key)
settings.OPENROUTER_API_KEY      # fallback para whitelist
settings.TEST_ACCOUNTS_WHITELIST # comma-separated emails
settings.test_accounts_list      # property: lista parseada
settings.cors_origins_list       # property: lista parseada desde CORS_ORIGINS
settings.MAX_SYSTEM_PROMPT_LENGTH  # 2000 chars
settings.MAX_FILE_SIZE_MB        # 20
settings.ALLOWED_MIME_TYPES      # [text/markdown, text/plain, application/pdf, ...docx]
settings.MAX_CACHE_SIZE          # 1000
```

### `security_utils.py`
```python
encrypt_api_key(api_key: str) -> str   # Fernet — lanza excepción si falla (sin fallback)
decrypt_api_key(encrypted: str) -> str # Fernet — warning + retorna crudo si es dato legacy
```
`ENCRYPTION_KEY` puede ser una Fernet key válida (44 bytes base64url) o un string arbitrario (derivado con SHA-256).
Si se usa SHA-256 (key inválida), se registra un `logger.warning` para alertar al administrador.

### `auth.py`
```python
user = await get_current_user(request)          # requiere JWT válido — 401 si falta
user = await get_current_user_optional(request) # acepta sin token — retorna role: "anonymous"
```
Payload JWT: `{ sub, email, role, exp, jti }`.
Revocación: tabla `revoked_tokens` — `_verify_token()` chequea `jti` antes de aceptar el token.

### `supabase_db.py`
CRUD sobre 6 tablas. Todas las funciones son `async`. Cliente Supabase con singleton thread-safe (`threading.Lock`).

```python
# users
await create_user(doc)  /  get_user(id)  /  get_user_by_email(email)
await list_users(role, limit, offset)    /  update_user(id, updates)
await update_user_auth_claim(id, hash)   /  delete_user(id) -> bool

# chatbots
await create_chatbot(doc)  /  get_chatbot(id)
await update_chatbot(id, updates, owner_id)  /  delete_chatbot(id, owner_id)
await list_chatbots(owner_id, published_only, limit, offset)

# documents
await create_document(doc)  /  get_document(id)
await update_document(id, updates, chatbot_id)
await list_documents(chatbot_id, limit, offset)
await list_documents_for_chatbots(chatbot_ids)  # batch por lista de IDs
await delete_document(id, chatbot_id)

# conversations
await create_conversation(doc)  /  get_conversation(id)
await save_conversation(doc)    /  list_conversations(chatbot_id)
await list_conversations_for_chatbots(chatbot_ids)  # batch

# messages (tabla normalizada)
await create_message(doc)
await create_messages_batch(messages)         # con fallback gracioso si tabla no existe
await list_messages_for_conversation(id, limit)  # retorna [] si tabla no existe (activa fallback JSONB)
```

> **Fallback gracioso:** si la tabla `public.messages` aún no existe en Supabase (migraciones pendientes), `create_messages_batch` y `list_messages_for_conversation` no lanzan excepción — registran un `logger.warning` y continúan. El historial sigue disponible vía JSONB legacy.

### `context_builder.py`
```python
build_context(documents: list[dict], query: str, max_chars=60_000) -> str
# documents: [{"filename": "...", "content": "..."}]
# Retorna: "--- Documento: {filename} ---\n{chunk}" concatenado hasta presupuesto
```
Chunking: 1500 chars con overlap 200. Ranking: overlap de tokens entre la query y cada chunk.

### `llm_client.py`
```python
llm = get_llm_client()
response = await llm.generate(system_prompt, context, message, temperature,
                               api_key=key, model_id=model, history_messages=hist)
async for token in llm.generate_stream(...):  # yields str chunks
    ...
```
Cliente `httpx.AsyncClient` — no bloquea el event loop. Soporta `history_messages` para memoria conversacional.

### `document_uploader.py`
```python
blob_url = await upload_file_to_blob(content: bytes, path: str, content_type: str)
text = extract_text_from_file(content: bytes, filename: str, content_type: str) -> str
# Extrae párrafos y tablas de DOCX (python-docx con doc.tables)
# Extrae texto de PDFs digitales (PyMuPDF) — PDFs escaneados retornan error 400
```

---

## Flujo de Chat — Detalles de Implementación

### `POST /chat/{chatbot_id}` (síncrono)
1. Busca chatbot → 404 si no existe.
2. Verifica caché TTL (clave: `chatbot_id:sha256(message)`).
3. Llama `_prepare_chat_generation()`:
   - `get_all_contents_for_chatbot()` → docs.
   - `build_context(docs, message)` → contexto.
   - `list_messages_for_conversation(conversation_id, limit=20)` → historial (tabla `messages`, fallback JSONB).
   - Decrypt API key del docente → fallback a OPENROUTER_API_KEY si es whitelist.
4. `await llm.generate(...)`.
5. `_set_cached_response(...)`.
6. `_persist_chat_turn(...)` → `create_messages_batch([user_msg, assistant_msg])`.
7. Retorna `ChatResponse { response, conversation_id, sources }`.

### `POST /chat/{chatbot_id}/stream` (SSE)
Mismo pipeline hasta paso 3. Luego:
- `StreamingResponse(media_type="text/event-stream")`.
- Generator async: itera `llm.generate_stream()` → emite `event: token`.
- Al finalizar: `_persist_chat_turn()` → emite `event: done { conversation_id, sources }`.
- En error: emite `event: error { message }`.
- Headers: `X-Accel-Buffering: no`, `Cache-Control: no-cache, no-transform`.

---

## Tests — Cobertura Actual

```bash
cd backend && pytest -v   # 44 tests
```

| Grupo | Tests |
|---|---|---|
| Sistema | `test_health`, `test_readiness` |
| Auth | `test_auth_flow_and_chatbot_creation`, `test_register_forces_student_role`, `test_password_hash_not_exposed_in_login`, `test_login_wrong_password_returns_401`, `test_refresh_token_rotation`, `test_refresh_token_requires_valid_token` |
| Seguridad multi-tenant | `test_chatbot_ownership_isolation`, `test_document_upload_rejects_wrong_owner`, `test_persist_rejects_cross_chatbot_conversation_id`, `test_chat_history_requires_auth`, `test_unpublished_chatbot_rejected_in_chat` |
| Chat | `test_chat_returns_response_for_published_chatbot`, `test_chat_unknown_chatbot_returns_404`, `test_chat_preserves_conversation_id_across_turns`, `test_chat_rejects_cross_chatbot_conversation`, `test_chat_history_returns_messages`, `test_chat_stream_returns_sse_events` |
| Validación | `test_system_prompt_override_too_long_rejected`, `test_system_prompt_override_at_limit_accepted`, `test_chat_message_too_long_rejected`, `test_chatbots_listing_with_limit` |
| Admin | `test_admin_create_teacher`, `test_admin_create_teacher_rejects_duplicate_email`, `test_admin_list_teachers`, `test_admin_update_teacher`, `test_admin_delete_teacher`, `test_non_admin_cannot_access_admin_endpoints`, `test_admin_cannot_delete_nonexistent_teacher` |
| Document Upload | `test_document_upload_pdf`, `test_document_upload_docx`, `test_document_upload_txt`, `test_document_upload_rejects_invalid_type` |
| security_utils | `test_encrypt_decrypt_roundtrip`, `test_encrypt_empty_key_returns_empty`, `test_decrypt_empty_key_returns_empty`, `test_sha256_fallback_logs_warning` |
| context_builder | `test_context_builder_respects_budget`, `test_context_builder_no_docs_returns_message`, `test_context_builder_scores_relevant_chunks_first`, `test_context_builder_budget_edge_cases` |

---

## Pendientes de Infraestructura

```bash
# Aplicar migraciones SQL al remoto (desde la raíz del proyecto)
supabase db push

# Las 4 migraciones crean/modifican:
# - Columnas nativas en users y chatbots
# - 12 índices de rendimiento
# - Tabla messages + migración de datos JSONB
# - DROP de conversations.messages (JSONB legacy)
```

El backend funciona sin migraciones aplicadas gracias al fallback gracioso en `supabase_db.py`, pero el historial de mensajes no se persistirá hasta que `public.messages` exista.
