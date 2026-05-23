# EduRAG Backend — AGENTS.md

Guía técnica de referencia para agentes de IA y desarrolladores que trabajen en el módulo `backend/`. Leer antes de modificar, agregar o depurar cualquier archivo de este directorio.

---

## Propósito del Módulo

API REST construida con **FastAPI (Python 3.11)**. Expone todos los endpoints del sistema: autenticación, gestión de chatbots, carga de documentos y chat con LLM. Desplegada en **Azure App Service Linux** (`edurag-api`, Basic B1, Central US). Sirve con **Gunicorn + Uvicorn** workers.

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
├── vector_store.py         # Almacén de texto — store/retrieve en Supabase (document_contents)
├── llm_client.py           # Abstracción LLMClient — Gemini activo / Claude stub
├── document_uploader.py    # Upload a Supabase Storage + extracción de texto (MD/TXT)
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
google-generativeai==0.8.6     # Gemini API
PyJWT==2.10.1
bcrypt==4.2.0
pytest==8.2.1                  # Testing automatizado
httpx==0.27.0                  # Cliente HTTP para tests
```

---

## Módulos — Descripción Técnica

### `main.py`
Punto de entrada de la aplicación FastAPI. Contiene:
- Configuración de CORS (orígenes desde `settings.CORS_ORIGINS`).
- Rate limiter con `slowapi` (100 req/min por IP en `/chat/{id}`).
- Caché en memoria con TTL (`response_cache: dict` y `CACHE_TTL_SECONDS = 300`) — máx. 1 000 entradas con tiempo de expiración de 5 minutos, LRU simple.
- Todos los endpoints de la API con parches de seguridad (autenticación obligatoria en documentos, ocultado de hashes de contraseñas, asignación segura de roles).

**Flujo de upload de documento:**
```python
content_bytes = await file.read()
text = extract_text_from_file(content_bytes, filename, content_type)
blob_url = await upload_file_to_blob(content_bytes, blob_path, content_type)
await store_document_content(document_id, chatbot_id, filename, text)
await create_document(metadata_dict)
```

**Flujo de chat:**
```python
doc_contents = await get_all_contents_for_chatbot(chatbot_id)
context = "\n\n".join(f"--- Documento: {d['filename']} ---\n{d['content']}" for d in doc_contents)
response = llm.generate(system_prompt, context, user_message, temperature)
```

### `settings.py`
`Pydantic Settings` con validación de tipos. Carga desde `.env`.
Obliga a declarar `JWT_SECRET` en el entorno (sin valores por defecto inseguros).

```python
settings.SUPABASE_URL            # URL de Supabase API
settings.SUPABASE_KEY            # Key service_role de Supabase (Admin bypass)
settings.GOOGLE_API_KEY          # Gemini API
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

### `vector_store.py`
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
Abstracción LLM con soporte multi-proveedor:
- `provider="gemini"` → llama a `gemini-2.0-flash` (activo).
- `provider="claude"` → `_generate_claude()` lanza `NotImplementedError` (stub).

### `document_uploader.py`
```python
# Upload del archivo original a Supabase Storage Bucket 'documents'
blob_url = await upload_file_to_blob(content: bytes, blob_path: str, content_type: str)

# Extracción de texto según tipo de archivo (Soporta .md y .txt)
text = extract_text_from_file(content: bytes, filename: str, content_type: str | None) -> str
```

---

## Endpoints — Detalles de Implementación

### `POST /documents/upload`
- Acepta `multipart/form-data` con campos `file` (UploadFile) y `chatbot_id` (str).
- **Parche de seguridad:** Requiere cabecera de autenticación y verifica que el usuario autenticado sea el creador/dueño del `chatbot_id` asociado.
- Valida tipo de archivo: MD, TXT.
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
4. Construir contexto concatenando todos los documentos.
5. Construir system_prompt desde configuración del chatbot.
6. `llm.generate(system_prompt, context, message, temperature)`.
7. Actualizar caché (con timestamp de creación).
8. Persistir conversación en Supabase Postgres.
9. Retornar `{ response, conversation_id, sources: [filenames] }`.

---

## Ejecución de Pruebas Automatizadas

La suite de pruebas automatizadas corre sobre `pytest`.

```bash
cd backend
pytest -v
```
