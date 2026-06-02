# EduRAG Backend — AGENTS.md

Guía técnica de referencia para agentes de IA y desarrolladores que trabajen en el módulo `backend/`. Leer antes de modificar, agregar o depurar cualquier archivo de este directorio.

---

## Propósito del Módulo

API REST construida con **FastAPI (Python 3.11)**. Expone todos los endpoints del sistema: autenticación, gestión de chatbots, carga de documentos y chat con LLM. Desplegada en **Railway** (`edurag`). Sirve con **Uvicorn** worker.

---

## Estructura de Archivos

```
backend/
├── main.py                 # FastAPI app, todos los endpoints, middleware CORS, cache con TTL y rate limiting
├── settings.py             # Variables de entorno tipadas con Pydantic Settings
├── models.py               # Modelos Pydantic — request bodies y response schemas
├── auth.py                 # Middleware de autenticación JWT (get_current_user / opcional)
├── jwt_token.py            # create_jwt_token / verify_jwt_token — PyJWT HS256 (JWT_SECRET seguro)
├── password.py             # hash_password / verify_password — bcrypt
├── supabase_db.py          # CRUD utilizando el SDK de Supabase para PostgreSQL
├── document_content_store.py # Almacén de texto — store/retrieve en Supabase (document_contents)
├── context_builder.py      # Chunking léxico + ranking por overlap de tokens + presupuesto 60k chars
├── llm_client.py           # Cliente async httpx → OpenRouter con `generate()` y `generate_stream()`
├── document_uploader.py    # Upload a Supabase Storage + extracción de texto (MD/TXT/PDF/DOCX)
├── railway.toml            # Config de deploy Railway (Uvicorn con --timeout-keep-alive 120)
├── Dockerfile              # Imagen Docker (referencia — no en uso activo)
├── test_api.py             # Script manual de pruebas de integración contra la API
├── test_main.py            # Suite de pruebas automatizadas con pytest
├── requirements.txt        # Dependencias Python
├── .env                    # Variables de entorno locales (NO commitear)
└── .env.example            # Plantilla de variables de entorno (Supabase)
```

---

## Dependencias Principales

```txt
fastapi==0.136.1
uvicorn==0.45.0
gunicorn==23.0.0               # WSGI server para producción
supabase==2.15.0               # Supabase Python SDK
pydantic==2.13.2
pydantic-settings==2.14.0
python-dotenv==1.2.2
python-multipart==0.0.26       # multipart/form-data (upload)
slowapi==0.1.9                 # Rate limiting
google-generativeai==0.8.6     # Gemini API (legacy, sin uso activo)
PyJWT==2.10.1
bcrypt==4.2.0
PyMuPDF==1.24.10               # Extracción de texto PDF
python-docx==1.1.2             # Extracción de texto DOCX
pytest==8.2.1                  # Testing automatizado
httpx==0.27.0                  # Cliente HTTP async (LLM) + usado en tests
```

---

## Módulos — Descripción Técnica

### `main.py`
Punto de entrada de la aplicación FastAPI. Contiene:
- Configuración de CORS (orígenes desde `settings.CORS_ORIGINS`).
- Rate limiter con `slowapi` (100 req/min por IP en `/chat/{id}`).
- Caché en memoria con TTL (`response_cache: dict` y `CACHE_TTL_SECONDS = 300`) — máx. 1 000 entradas con tiempo de expiración de 5 minutos, LRU simple.
- Helpers privados reutilizados por los dos endpoints de chat:
  - `_prepare_chat_generation(chatbot, message, owner)` — recupera documentos, construye contexto con `context_builder`, valida API key.
  - `_persist_chat_turn(chatbot_id, user_msg, assistant_msg, sources, conversation_id)` — guarda historial y actualiza caché.
  - `_sse(event, data)` — formatea eventos SSE (`event: <name>\ndata: <json>\n\n`).
- Todos los endpoints de la API con parches de seguridad (autenticación obligatoria en documentos, ocultado de hashes de contraseñas, asignación segura de roles).
- Dos endpoints de chat: `/chat/{id}` (síncrono) y `/chat/{id}/stream` (SSE).

**Flujo de upload de documento:**
```python
content_bytes = await file.read()
text = extract_text_from_file(content_bytes, filename, content_type)
blob_url = await upload_file_to_blob(content_bytes, blob_path, content_type)
await store_document_content(document_id, chatbot_id, filename, text)
await create_document(metadata_dict)
```

**Flujo de chat (síncrono):**
```python
doc_contents = await get_all_contents_for_chatbot(chatbot_id)
context = context_builder.build_context(doc_contents, user_message, max_chars=60_000)
response = await llm.generate(system_prompt, context, user_message, temperature)
# Persiste y retorna ChatResponse
```

**Flujo de chat (streaming SSE):**
```python
doc_contents = await get_all_contents_for_chatbot(chatbot_id)
context = context_builder.build_context(doc_contents, user_message, max_chars=60_000)

async def event_stream():
    async for token in llm.generate_stream(system_prompt, context, user_message, temperature):
        yield _sse("token", {"content": token})
    yield _sse("done", {"conversation_id": ..., "sources": [...]})

return StreamingResponse(event_stream(), media_type="text/event-stream",
                         headers={"X-Accel-Buffering": "no", "Cache-Control": "no-cache, no-transform"})
```

### `settings.py`
`Pydantic Settings` con validación de tipos. Carga desde `.env`.
Obliga a declarar `JWT_SECRET` en el entorno (sin valores por defecto inseguros).

```python
settings.SUPABASE_URL            # URL de Supabase API
settings.SUPABASE_KEY            # Key service_role de Supabase (Admin bypass)
settings.OPENROUTER_API_KEY      # Fallback para cuentas @edurag.com (BYOK)
settings.JWT_SECRET              # Secret JWT (≥32 chars en producción)
settings.MAX_CACHE_SIZE          # 1000
settings.MAX_FILE_SIZE_MB        # 20
settings.CORS_ORIGINS            # Lista de orígenes permitidos
```

### `auth.py`
Dos funciones de dependencia:

```python
# Requiere token válido — lanza 401 si no hay token o es inválido
user = await get_current_user(request)

# Acepta requests sin token — retorna {"sub": None, "role": "anonymous"}
user = await get_current_user_optional(request)
```

El payload del JWT expuesto: `{ sub, email, role }`.

### `jwt_token.py`
```python
token = create_jwt_token(user_id, email, role)  # expira en 24 horas
payload = verify_jwt_token(token)                # retorna payload o None
```

Algoritmo HS256. Secret: `settings.JWT_SECRET`. No posee fallbacks hardcodeados en el código.

### `supabase_db.py`
CRUD sobre las 5 tablas PostgreSQL en Supabase. Nomenclatura de funciones:
```python
# users
await create_user(doc: dict)
await get_user(user_id: str)
await get_user_by_email(email: str)
await list_users(role: str)

# chatbots
await create_chatbot(doc: dict)
await get_chatbot(chatbot_id: str)
await update_chatbot(chatbot_id, updates, owner_id)
await delete_chatbot(chatbot_id, owner_id)
await list_chatbots(owner_id, published_only)

# documents
await create_document(doc: dict)
await get_document(document_id: str)
await update_document(document_id, updates, chatbot_id)
await list_documents(chatbot_id: str)
await delete_document(document_id, chatbot_id)

# conversations
await create_conversation(doc: dict)
await get_conversation(conversation_id: str)
await save_conversation(doc: dict)
await list_conversations(chatbot_id: str)
```

### `document_content_store.py`
Almacén de texto de documentos en Supabase. **No usa ChromaDB ni embeddings.**

```python
# Guardar texto extraído de un documento
await store_document_content(document_id, chatbot_id, filename, content)

# Recuperar texto de un documento específico
doc = await get_document_content(document_id, chatbot_id)

# Recuperar todos los documentos de un chatbot (para el contexto del chat)
docs = await get_all_contents_for_chatbot(chatbot_id)
# → [{"id": ..., "filename": ..., "content": "texto completo"}, ...]

# Eliminar el contenido de un documento
await delete_document_content(document_id, chatbot_id)

# Eliminar todos los contenidos de un chatbot
await delete_all_contents_for_chatbot(chatbot_id)
```

### `llm_client.py`
Cliente async de OpenRouter basado en `httpx.AsyncClient` (no bloquea el event loop):
- `generate(system_prompt, context, user_message, temperature, *, model, api_key) -> str` — respuesta completa.
- `generate_stream(...) -> AsyncIterator[str]` — itera tokens del stream SSE de OpenRouter (consume `data: {...}\n\n` y emite `delta.content` por chunk).
- Soporta modelos libres de OpenRouter como `google/gemini-2.5-flash:free`, `nvidia/llama-3.1-nemotron-70b:free`, `meta-llama/llama-3.1-8b-instruct:free`, etc.
- Permite la autenticación **BYOK** por docente y un fallback seguro con la API Key del sistema (`OPENROUTER_API_KEY`) para cuentas `@edurag.com` y cuentas de prueba.
- Interfaz estable: cualquier cambio de proveedor (Gemini directo, Anthropic, local) debe pasar por este módulo.

### `context_builder.py`
Reconstructor de contexto sin embeddings (sin ChromaDB ni vector store):
- `chunk_document(text, chunk_size=1500, overlap=200) -> list[str]` — chunking léxico con overlap configurable.
- `rank_chunks(chunks, query, top_k) -> list[str]` — ranking por overlap de tokens entre la query y cada chunk.
- `build_context(documents, query, max_chars=60_000) -> str` — orquesta chunking + ranking + truncado a presupuesto máximo, retornando texto formateado con `--- Documento: {filename} ---\n{chunk}`.
- Se invoca desde `main.py` antes de cada llamada a `llm.generate()` / `llm.generate_stream()`.

### `document_uploader.py`
```python
# Upload del archivo original a Supabase Storage Bucket 'documents'
blob_url = await upload_file_to_blob(content: bytes, blob_path: str, content_type: str)

# Extracción de texto según tipo de archivo (Soporta .md, .txt, .pdf, .docx)
text = extract_text_from_file(content: bytes, filename: str, content_type: str | None) -> str
```

---

## Endpoints — Detalles de Implementación

### `POST /documents/upload`
- Acepta `multipart/form-data` con campos `file` (UploadFile) y `chatbot_id` (str).
- **Parche de seguridad:** Requiere cabecera de autenticación y verifica que el usuario autenticado sea el creador/dueño del `chatbot_id` asociado.
- Valida tipo de archivo: MD, TXT, PDF, DOCX.
- Valida tamaño contra `settings.MAX_FILE_SIZE_MB` (20 MB).
- Extrae texto síncronamente en el mismo request.
- Sube archivo original a Supabase Storage: `documents/{chatbot_id}/{document_id}/{filename}`.
- Guarda texto en la tabla Postgres `document_contents`.
- Crea registro en la tabla `documents` con `status: "indexed"` inmediatamente.

### `POST /chat/{chatbot_id}`
Rate limit: `@limiter.limit("100/minute")` por IP.

Flujo:
1. Buscar chatbot en Supabase.
2. Verificar caché con expiración TTL (5 minutos).
3. `get_all_contents_for_chatbot(chatbot_id)` → lista de documentos con texto.
4. Construir contexto con `context_builder.build_context(docs, user_message, max_chars=60_000)`.
5. Construir system_prompt desde configuración del chatbot.
6. `await llm.generate(system_prompt, context, message, temperature, model=..., api_key=...)`.
7. Actualizar caché (con timestamp de creación).
8. Persistir conversación en Supabase Postgres.
9. Retornar `{ response, conversation_id, sources: [filenames] }`.

### `POST /chat/{chatbot_id}/stream`
Mismo pipeline que el endpoint síncrono, pero la respuesta se emite vía SSE:

1–5. Idénticos al endpoint síncrono.
6. Retorna `StreamingResponse(media_type="text/event-stream")` con generador async que itera `llm.generate_stream(...)`.
7. Emite eventos `event: token` con `{"content": "..."}` por chunk, `event: done` con `{conversation_id, sources}` al final, o `event: error` si algo falla.
8. Headers: `X-Accel-Buffering: no`, `Cache-Control: no-cache, no-transform` (evita buffering en proxies).
9. El frontend hace fallback automático a `/chat/{chatbot_id}` si el stream no entrega tokens.

---

## Ejecución de Pruebas Automatizadas

La suite de pruebas automatizadas corre sobre `pytest`.

```bash
cd backend
pytest -v
```
