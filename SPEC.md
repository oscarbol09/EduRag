# EduRAG - Plataforma SaaS Educativa (Especificación Técnica)

## 1. Concepto & Visión

EduRAG es una plataforma multi-tenant donde los docentes crean agentes conversacionales basados en sus propios documentos, y los estudiantes los consumen a través de un marketplace centralizado o mediante integración con LMS externos (Moodle). El sistema prioriza costo mínimo ($0/mes post-primer-mes), arquitectura extensible para múltiples LLMs, y experiencias de RAG directas en context window.

---

## 2. Arquitectura del Sistema

### Stack Tecnológico

| Frontend SPA | Vercel | Free |
| API Backend | Railway | Free / Económico |
| Base de datos principal | Supabase PostgreSQL | Free Tier permanente |
| Almacenamiento documentos | Supabase Storage (Bucket: `documents`) | Free (1 GB) |
| Autenticación | JWT propio (PyJWT + bcrypt) | Free |
| LLM | OpenRouter (Gemini, Llama, Nemotron) | Free tier |

> **Decisión arquitectural:** ChromaDB fue eliminado para evitar problemas de ContainerTimeout en servicios de hosting (~500 MB venv). El texto plano se pasa de forma directa al context window de OpenRouter.

### Estructura del Proyecto

```
/
├── frontend/          # Next.js 1 SPA
├── backend/           # FastAPI REST API (Supabase & Pytest)
└── SPEC.md
```

---

## 3. Modelo de Datos (PostgreSQL - Supabase)

### Tabla: users
```sql
create table users (
  id text primary key,
  email text unique not null,
  password text,
  role text not null default 'student' check (role in ('teacher', 'student', 'admin')),
  auth_method text not null default 'email_password',
  first_name text,
  last_name text,
  institution_name text,
  openrouter_api_key text,
  openrouter_model text,
  is_test_account boolean default false,
  institution text, -- Retenido para compatibilidad legacy
  country text,
  is_active boolean default true,
  created_at timestamptz default now()
);
```

### Tabla: chatbots
```sql
create table chatbots (
  id text primary key,
  owner_id text references users(id) on delete cascade,
  name text not null,
  subject_area text,
  education_level text,
  tone text default 'friendly' check (tone in ('formal', 'friendly', 'technical')),
  welcome_message text,
  system_prompt_override text,
  restriction_level text default 'guided' check (restriction_level in ('strict', 'guided', 'open')),
  llm_provider text default 'gemini' check (llm_provider in ('gemini', 'claude')),
  public_url text,
  embed_code text,
  is_published boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### Tabla: documents
```sql
create table documents (
  id text primary key,
  chatbot_id text references chatbots(id) on delete cascade,
  filename text,
  mime_type text,
  blob_url text,
  status text default 'indexed' check (status in ('queued', 'processing', 'indexed', 'error')),
  chunk_count int default 1,
  created_at timestamptz default now(),
  processed_at timestamptz default now()
);
```

### Tabla: document_contents
```sql
create table document_contents (
  id text primary key,
  chatbot_id text references chatbots(id) on delete cascade,
  filename text,
  content text
);
```

### Tabla: conversations
```sql
create table conversations (
  id text primary key,
  chatbot_id text references chatbots(id) on delete cascade,
  student_id text,
  messages jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

---

## 4. API Endpoints

### Autenticación
- `POST /auth/login` — Login con email/password (retorna JSON seguro sin hash de clave)
- `POST /auth/register` — Registro de estudiantes (fuerza rol student y filtra hash de clave)
- `GET /auth/me` — Usuario actual

### Chatbots
- `GET /chatbots` — Listar chatbots del docente
- `POST /chatbots` — Crear chatbot
- `GET /chatbots/{id}` — Obtener chatbot
- `PUT /chatbots/{id}` — Actualizar chatbot
- `DELETE /chatbots/{id}` — Eliminar chatbot + contenidos
- `POST /chatbots/{id}/publish` — Publicar chatbot
- `GET /chatbots/{id}/embed` — Obtener código embed

### Documentos (Parches de seguridad activos)
- `POST /documents/upload` [JWT] — Subir documento (MD, TXT, PDF, DOCX). Valida propiedad del bot.
- `GET /documents/{id}` [JWT] — Estado del documento. Valida propiedad del bot.
- `GET /documents` [JWT] — Listar documentos de un chatbot. Valida propiedad del bot.
- `DELETE /documents/{id}` [JWT] — Eliminar documento y su contenido. Valida propiedad del bot.

### Chat
- `POST /chat/{chatbot_id}` — Enviar mensaje (Caché local con TTL de 5 min)
- `GET /chat/{chatbot_id}/history` — Historial de conversación

### Admin
- `POST /admin/teachers` — Crear cuenta de docente
- `GET /admin/teachers` — Listar docentes

### Sistema
- `GET /health` — Health check
- `GET /ready` — Readiness check (verifica conexión a Supabase)

---

## 5. Estrategia de Documentos

### Por qué se eliminó ChromaDB

ChromaDB y sus dependencias (onnxruntime, numpy, tokenizers, pysqlite3) suman ~500 MB al virtualenv. En entornos de hosting como Railway o Azure, el proceso de extracción del venv en cada arranque del contenedor superaba el límite de 230 segundos, causando `ContainerTimeout`. La plataforma no puede arrancar con esa dependencia.

### Enfoque actual: texto directo a OpenRouter LLMs

**Upload (síncrono):**
```
Docente sube archivo (MD / TXT / PDF / DOCX)
    → Extracción de texto en memoria (UTF-8 decode, PyMuPDF, python-docx)
    → Supabase Storage: archivo original
    → Supabase Postgres (document_contents): texto completo
    → Supabase Postgres (documents): metadatos, status: "indexed"
```

**Chat (síncrono):**
```
Estudiante envía mensaje
    → Recuperar todos los document_contents del chatbot desde Supabase
    → Construir contexto: "--- Documento: {filename} ---\n{content}"
    → Prompt: system_prompt + contexto + pregunta
    → OpenRouter LLM (Gemini, Llama, Nemotron - context window hasta ~1M tokens)
    → Respuesta con nombres de documentos como fuentes
```

### Formatos soportados

| Formato | MIME type | Extracción |
|---|---|---|
| Markdown | text/markdown + .md | UTF-8 decode |
| Texto plano | text/plain + .txt | UTF-8 decode |
| PDF | application/pdf + .pdf | PyMuPDF (fitz) |
| Word | application/vnd.openxmlformats-officedocument.wordprocessingml.document + .docx | python-docx |

---

## 6. Seguridad

### Controles Implementados
1. **Aislamiento multi-tenant**: Filtro obligatorio por `chatbot_id` y validación de `owner_id` en todas las operaciones del backend.
2. **Endpoints Protegidos**: Todos los endpoints de carga y visualización de documentos requieren autenticación JWT obligatoria y verifican la propiedad del bot.
3. **Filtro de Contraseñas**: El backend elimina el campo `password` de todas las respuestas públicas en login y registro.
4. **Caché Seguro con TTL**: Respuestas cacheadas en memoria poseen un tiempo de vida (TTL) estricto de 5 minutos para evitar persistencias obsoletas y fugas de datos.
5. **Autenticación sin Fallbacks**: La firma JWT con `JWT_SECRET` es obligatoria y no posee fallbacks en el código para prevenir la falsificación de tokens.
