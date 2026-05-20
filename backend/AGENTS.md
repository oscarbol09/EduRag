# EduRAG Backend — AGENTS.md

Guía técnica de referencia para agentes de IA y desarrolladores que trabajen en el módulo `backend/`. Leer antes de modificar, agregar o depurar cualquier archivo de este directorio.

---

## Propósito del Módulo

API REST construida con **FastAPI (Python 3.11)**. Expone todos los endpoints del sistema: autenticación, gestión de chatbots, carga de documentos y chat con LLM. Desplegada en **Azure App Service Linux** (`edurag-api`, Basic B1, Central US). Sirve con **Gunicorn + Uvicorn** workers.

---

## Estructura de Archivos

```
backend/
├── main.py                 # FastAPI app, todos los endpoints, middleware CORS y rate limiting
├── settings.py             # Variables de entorno tipadas con Pydantic Settings
├── models.py               # Modelos Pydantic — request bodies y response schemas
├── auth.py                 # Middleware de autenticación JWT (get_current_user / opcional)
├── jwt_token.py            # create_jwt_token / verify_jwt_token — PyJWT HS256
├── password.py             # hash_password / verify_password — bcrypt
├── azure_cosmos_db.py      # CRUD para las 5 colecciones de Cosmos DB
├── vector_store.py         # Almacén de texto — store/retrieve en Cosmos DB (document_contents)
├── llm_client.py           # Abstracción LLMClient — Gemini activo / Claude stub
├── document_uploader.py    # Upload a Blob Storage + extracción de texto (PDF/DOCX/MD/TXT)
├── configure_azure.py      # Script de utilidad: crea contenedores y colas en Azure
├── startup.sh              # Script de arranque de referencia
├── Dockerfile              # Imagen Docker (referencia — no en uso activo)
├── test_api.py             # Script de pruebas de integración contra la API
├── simple_test.py          # Pruebas unitarias básicas
├── requirements.txt        # Dependencias Python
├── .env                    # Variables de entorno locales (NO commitear)
└── .env.example            # Plantilla de variables de entorno
```

---

## Dependencias Principales

```txt
fastapi==0.136.1
uvicorn[standard]==0.45.0
gunicorn==23.0.0               # WSGI server para producción
pydantic==2.13.2
pydantic-settings==2.14.0
azure-cosmos==4.15.0
azure-storage-blob==12.25.1
azure-storage-queue==12.12.0
python-dotenv==1.2.2
python-multipart==0.0.26       # multipart/form-data (upload)
slowapi==0.1.9                 # Rate limiting
pymupdf==1.27.2                # Extracción texto PDF
python-docx==1.2.0             # Extracción texto DOCX
google-generativeai==0.8.6     # Gemini API
msal==1.35.1
PyJWT==2.10.1
bcrypt==4.2.0
```

> **¿Por qué sin ChromaDB?** ChromaDB + onnxruntime + numpy + tokenizers suman ~500 MB al virtualenv, causando `ContainerTimeout` en Azure App Service (límite de 230s para extraer el venv). La arquitectura actual no requiere embeddings ni vector search.

---

## Módulos — Descripción Técnica

### `main.py`
Punto de entrada de la aplicación FastAPI. Contiene:
- Configuración de CORS (orígenes desde `settings.CORS_ORIGINS`).
- Rate limiter con `slowapi` (100 req/min por IP en `/chat/{id}`).
- Caché en memoria (`response_cache: dict`) — máx. 1 000 entradas, LRU simple.
- Todos los endpoints de la API.
- `get_default_system_prompt(tone, restriction_level)` — genera el prompt base según configuración del chatbot.

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

```python
settings.COSMOS_DB_ENDPOINT      # URL Cosmos DB
settings.COSMOS_DB_DATABASE      # Nombre DB (edubot)
settings.GOOGLE_API_KEY          # Gemini API
settings.JWT_SECRET              # Secret JWT (≥32 chars en producción)
settings.MAX_CACHE_SIZE          # 1000
settings.MAX_FILE_SIZE_MB        # 20
settings.CORS_ORIGINS            # Lista de orígenes permitidos
settings.APP_PORT                # 8080 (Azure) / 8000 (local)
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
token = create_jwt_token(user_id, email, role)  # expira en 7 días
payload = verify_jwt_token(token)                # retorna payload o None
```

Algoritmo HS256. Secret: `settings.JWT_SECRET`.

### `azure_cosmos_db.py`
CRUD sobre las 5 colecciones. Nomenclatura de funciones:
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

La colección `document_contents` se accede directamente a través de `get_container("document_contents")` en `vector_store.py`.

**Regla crítica:** siempre pasar `partition_key` en consultas para evitar cross-partition queries y reducir consumo de RUs.

### `vector_store.py`
Almacén de texto de documentos en Cosmos DB. **No usa ChromaDB ni embeddings.**

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

**Aislamiento:** `get_all_contents_for_chatbot` filtra estrictamente por `chatbot_id`. Nunca mezclar contenidos de distintos tenants.

### `llm_client.py`
Abstracción LLM con soporte multi-proveedor:

```python
class LLMClient:
    def generate(
        self,
        system_prompt: str,
        context: str,
        user_message: str,
        temperature: float
    ) -> str
```

- `provider="gemini"` → llama a `gemini-2.0-flash` (activo).
- `provider="claude"` → `_generate_claude()` lanza `NotImplementedError` (stub).

**Para agregar Claude:** implementar `_generate_claude()` usando `anthropic` SDK. No cambiar la firma de `generate()`.

### `document_uploader.py`
```python
# Upload del archivo original a Azure Blob Storage
blob_url = await upload_file_to_blob(content: bytes, blob_path: str, content_type: str)

# Extracción de texto según tipo de archivo
text = extract_text_from_file(content: bytes, filename: str, content_type: str | None) -> str
# Soporta: PDF (PyMuPDF), DOCX (python-docx), MD/TXT (UTF-8 decode)
```

---

## Endpoints — Detalles de Implementación

### `POST /documents/upload`
- Acepta `multipart/form-data` con campos `file` (UploadFile) y `chatbot_id` (str).
- Valida tipo de archivo: PDF, DOCX, MD, TXT (por extensión y content_type).
- Valida tamaño contra `settings.MAX_FILE_SIZE_MB` (20 MB).
- Extrae texto síncronamente en el mismo request.
- Sube archivo original a Blob Storage: `documents/{chatbot_id}/{document_id}/{filename}`.
- Guarda texto en Cosmos DB (`document_contents`).
- Crea registro en `documents` con `status: "indexed"` inmediatamente.

### `POST /chat/{chatbot_id}`
Rate limit: `@limiter.limit("100/minute")` por IP.

Flujo:
1. Buscar chatbot en Cosmos DB.
2. Verificar caché (`response_cache[f"{chatbot_id}:{message[:50]}"]`).
3. `get_all_contents_for_chatbot(chatbot_id)` → lista de documentos con texto.
4. Construir contexto concatenando todos los documentos.
5. Construir system_prompt desde configuración del chatbot.
6. `llm.generate(system_prompt, context, message, temperature)`.
7. Actualizar caché (LRU: evict oldest si `len > MAX_CACHE_SIZE`).
8. Persistir conversación en Cosmos DB.
9. Retornar `{ response, conversation_id, sources: [filenames] }`.

**Temperatures:**

| `restriction_level` | `temperature` |
|---|---|
| `strict` | `0.2` |
| `guided` | `0.5` |
| `open` | `0.8` |

### `DELETE /chatbots/{chatbot_id}`
Elimina el chatbot Y llama a `delete_all_contents_for_chatbot(chatbot_id)` para limpiar todos los textos en `document_contents`.

### `DELETE /documents/{document_id}`
Elimina el registro en `documents` Y llama a `delete_document_content(document_id, chatbot_id)`.

---

## Variables de Entorno

```env
# Azure Cosmos DB
COSMOS_DB_ENDPOINT=https://edu-bot-cosmos.documents.azure.com:443/
COSMOS_DB_KEY=<primary-key>
COSMOS_DB_DATABASE=edubot

# Azure Storage
AZURE_STORAGE_CONNECTION_STRING=<connection-string>
AZURE_STORAGE_CONTAINER_NAME=documents
AZURE_QUEUE_CONNECTION_STRING=<connection-string>
AZURE_QUEUE_NAME=document-processing

# JWT
JWT_SECRET=<mínimo 32 chars — openssl rand -hex 32>

# Google AI
GOOGLE_API_KEY=<api-key>

# App
APP_HOST=0.0.0.0
APP_PORT=8080
CORS_ORIGINS=["https://delightful-sea-04066b61e.7.azurestaticapps.net","http://localhost:3000"]
MAX_FILE_SIZE_MB=20
MAX_CACHE_SIZE=1000
```

> Variables eliminadas (ya no necesarias): `CHROMA_DB_PATH`, `CHUNK_SIZE`, `CHUNK_OVERLAP`, `RETRIEVAL_TOP_K`.

---

## Ejecución Local

```bash
cd backend

# 1. Crear entorno virtual
python -m venv .venv
source .venv/bin/activate   # Linux/Mac
.venv\Scripts\activate      # Windows

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con credenciales reales

# 4. Iniciar servidor
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Con gunicorn (como en producción)
gunicorn --bind=0.0.0.0:8000 --worker-class uvicorn.workers.UvicornWorker --reload main:app

# 5. Correr tests
python test_api.py
```

API disponible en `http://localhost:8000`. Documentación interactiva: `http://localhost:8000/docs`.

---

## Despliegue — App Service `edurag-api`

**Via GitHub Actions (recomendado):** push a `master` dispara `.github/workflows/master_edurag-api.yml`.

```bash
# ZIP deploy manual (solo código Python — sin venv)
mkdir deploy_tmp
cp backend/*.py deploy_tmp/
cp requirements.txt deploy_tmp/
cd deploy_tmp
zip -r ../backend-deploy.zip . --exclude "*.pyc" --exclude "__pycache__/*"
cd ..

az webapp deploy \
  --name edurag-api \
  --resource-group edubot-app \
  --src-path backend-deploy.zip \
  --type zip
```

**Startup command en App Service:**
```
gunicorn --bind=0.0.0.0:8080 --worker-class uvicorn.workers.UvicornWorker --timeout 120 main:app
```

**App Settings requeridos en Azure:**
```
SCM_DO_BUILD_DURING_DEPLOYMENT=true
ENABLE_ORYX_BUILD=true
WEBSITES_PORT=8080
WEBSITES_CONTAINER_START_TIME_LIMIT=600
```

---

## Notas Importantes

- `auth.py` puede contener código duplicado al final (artefacto de refactoring). Limpiar en la próxima iteración.
- El endpoint `/admin/teachers` verifica `role == "admin"` en el JWT.
- El archivo original del documento se sube a Blob Storage únicamente para referencia/descarga futura. El texto extraído que usa el chat vive en `document_contents` en Cosmos DB.
- Si un documento no tiene texto extraíble (PDF solo con imágenes), el upload retorna `400`. Considerar OCR (Azure AI Document Intelligence) en Fase 5.
- El context window de Gemini 2.0 Flash es ~1M tokens (~750K palabras). Para chatbots con muchos documentos largos, evaluar estrategias de truncado en Fase 5.
- La cola Azure Queue (`document-processing`) está configurada pero no se usa en la arquitectura actual. Se reserva para futuras integraciones (OCR, notificaciones, etc.).
