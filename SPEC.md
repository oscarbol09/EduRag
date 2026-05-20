# EduRAG - Plataforma SaaS Educativa

## 1. Concepto & Visión

EduRAG es una plataforma multi-tenant donde los docentes crean agentes conversacionales basados en sus propios documentos, y los estudiantes los consumen a través de un marketplace centralizado o mediante integración con LMS externos (Moodle). El sistema prioriza costo mínimo ($0/mes post-primer-mes), arquitectura extensible para múltiples LLMs, y experiencias diferenciadas por perfil.

## 2. Arquitectura del Sistema

### Stack Tecnológico

| Componente | Servicio Azure | Tier |
|------------|----------------|------|
| Frontend SPA | Azure Static Web Apps | Free |
| API Backend | Azure App Service Linux (B1) | Basic B1 |
| Base de datos principal | Azure Cosmos DB for NoSQL | Free Tier permanente |
| Almacenamiento documentos | Azure Blob Storage | Free (5 GB) |
| Cola procesamiento asíncrono | Azure Queue Storage | Free |
| Autenticación | JWT propio (PyJWT + bcrypt) | Free |
| LLM | Google Gemini 2.0 Flash | Free tier |

> **Decisión arquitectural:** ChromaDB fue eliminado. Ver sección 5 (Estrategia de Documentos) para el enfoque actual.

### Estructura del Proyecto

```
/
├── frontend/          # Next.js 16 SPA
├── backend/           # FastAPI REST API
├── worker/            # Procesamiento asíncrono (legacy, no activo)
└── SPEC.md
```

## 3. Modelo de Datos (Cosmos DB)

### Colección: users
```json
{
  "id": "string",
  "email": "string",
  "password": "bcrypt_hash",
  "role": "teacher" | "student" | "admin",
  "auth_method": "pre_created" | "email_password" | "google" | "microsoft",
  "institution": "string",
  "country": "string",
  "created_at": "ISO8601",
  "is_active": boolean
}
```

### Colección: chatbots
```json
{
  "id": "string",
  "owner_id": "string (user.id)",
  "name": "string",
  "subject_area": "string",
  "education_level": "secondary" | "university",
  "tone": "formal" | "friendly" | "technical",
  "welcome_message": "string",
  "system_prompt_override": "string",
  "restriction_level": "strict" | "guided" | "open",
  "llm_provider": "gemini" | "claude",
  "public_url": "string",
  "embed_code": "string",
  "is_published": boolean,
  "created_at": "ISO8601",
  "updated_at": "ISO8601"
}
```

### Colección: documents
```json
{
  "id": "string",
  "chatbot_id": "string",
  "blob_url": "string",
  "filename": "string",
  "mime_type": "string",
  "status": "indexed",
  "chunk_count": 1,
  "created_at": "ISO8601",
  "processed_at": "ISO8601"
}
```

### Colección: document_contents *(nueva)*
```json
{
  "id": "string (= document.id)",
  "chatbot_id": "string",
  "filename": "string",
  "content": "texto completo extraído del documento"
}
```

> Almacena el texto plano de cada documento. Partition key: `/chatbot_id`.

### Colección: conversations
```json
{
  "id": "string",
  "chatbot_id": "string",
  "student_id": "string | null",
  "messages": [
    { "role": "user" | "assistant", "content": "string", "timestamp": "ISO8601" }
  ],
  "created_at": "ISO8601"
}
```

## 4. API Endpoints

### Autenticación
- `POST /auth/login` — Login con email/password
- `POST /auth/register` — Registro de estudiantes
- `GET /auth/me` — Usuario actual

### Chatbots
- `GET /chatbots` — Listar chatbots del docente
- `POST /chatbots` — Crear chatbot
- `GET /chatbots/{id}` — Obtener chatbot
- `PUT /chatbots/{id}` — Actualizar chatbot
- `DELETE /chatbots/{id}` — Eliminar chatbot + contenidos
- `POST /chatbots/{id}/publish` — Publicar chatbot
- `GET /chatbots/{id}/embed` — Obtener código embed

### Documentos
- `POST /documents/upload` — Subir documento (PDF, DOCX, MD, TXT)
- `GET /documents/{id}` — Estado del documento
- `GET /documents` — Listar documentos de un chatbot
- `DELETE /documents/{id}` — Eliminar documento y su contenido

### Chat
- `POST /chat/{chatbot_id}` — Enviar mensaje
- `GET /chat/{chatbot_id}/history` — Historial de conversación

### Admin
- `POST /admin/teachers` — Crear cuenta de docente
- `GET /admin/teachers` — Listar docentes

### Sistema
- `GET /health` — Health check
- `GET /ready` — Readiness check (verifica Cosmos DB)

## 5. Estrategia de Documentos

### Por qué se eliminó ChromaDB

ChromaDB 1.x y sus dependencias (onnxruntime, numpy, tokenizers, pysqlite3) suman ~500 MB al virtualenv. En Azure App Service, el proceso de extracción del venv en cada arranque del contenedor superaba el límite de 230 segundos, causando `ContainerTimeout`. La plataforma no puede arrancar con esa dependencia.

### Enfoque actual: texto directo a Gemini

**Upload (síncrono):**
```
Docente sube archivo (PDF / DOCX / MD / TXT)
    → Extracción de texto en memoria (PyMuPDF / python-docx / UTF-8 decode)
    → Blob Storage: archivo original
    → Cosmos DB (document_contents): texto extraído
    → Cosmos DB (documents): metadatos, status: "indexed"
```

**Chat (síncrono):**
```
Estudiante envía mensaje
    → Recuperar todos los document_contents del chatbot desde Cosmos DB
    → Construir contexto: "--- Documento: {filename} ---\n{content}"
    → Prompt: system_prompt + contexto + pregunta
    → Gemini 2.0 Flash (context window ~1M tokens)
    → Respuesta con nombres de documentos como fuentes
```

### Formatos soportados

| Formato | MIME type | Extracción |
|---|---|---|
| PDF | application/pdf | PyMuPDF (fitz) |
| DOCX | application/vnd.openxmlformats-officedocument.wordprocessingml.document | python-docx |
| Markdown | text/markdown + .md | UTF-8 decode |
| Texto plano | text/plain + .txt | UTF-8 decode |

### Niveles de Restricción
| Nivel | Temperature | Comportamiento |
|-------|-------------|-----------------|
| strict | 0.2 | Solo del contexto de documentos |
| guided | 0.5 | Contexto como base principal |
| open | 0.8 | Puede expandir más allá del contexto |

## 6. Seguridad

### Controles Implementados
1. **Aislamiento multi-tenant**: Filtro obligatorio por `chatbot_id` en todas las queries a Cosmos DB
2. **Validación de archivos**: Tipo verificado por extensión y content_type; límite 20 MB
3. **Rate limiting**: slowapi en endpoints de chat (100 req/min por IP)
4. **CORS**: Política explícita de orígenes en `settings.py`
5. **Autenticación**: JWT HS256 con bcrypt para contraseñas

## 7. Plan de Ejecución por Fases

### Fase 0 — Setup e Infraestructura
- [x] Estructura monorepo
- [x] Aprovisionar Azure resources
- [x] Configurar GitHub Actions CI/CD
- [x] Variables de entorno y secretos

### Fase 1 — Autenticación y Gestión de Usuarios
- [x] JWT propio + bcrypt
- [x] Endpoints de auth (login, register, me)
- [x] Admin básico (crear/listar docentes)

### Fase 2 — Pipeline de Documentos y Chat
- [x] Upload sincrónico con extracción de texto
- [x] Soporte PDF, DOCX, MD, TXT
- [x] Almacenamiento en Cosmos DB (document_contents)
- [x] Endpoint de chat con contexto completo a Gemini
- [x] Deployment estable en Azure App Service

### Fase 3 — Dashboard del Docente
- [ ] Formulario de creación multi-paso
- [ ] Estado de procesamiento en tiempo real
- [ ] Gestión de documentos subidos

### Fase 4 — Portal del Estudiante y Chatbot Embebible
- [ ] Marketplace público con búsqueda
- [ ] Interfaz de chat con SSE streaming
- [ ] Validación de embed en iframe

### Fase 5 — Hardening, Monitoreo y Lanzamiento
- [ ] Application Insights
- [ ] Alertas de presupuesto
- [ ] Runbook operativo

## 8. Configuración por Defecto

### Temperatures por nivel
```python
RESTRICTION_TEMPERATURES = {
    "strict": 0.2,
    "guided": 0.5,
    "open": 0.8
}
```

### Límites
```python
MAX_FILE_SIZE_MB = 20
MAX_CACHE_SIZE = 1000  # preguntas frecuentes en caché
```
