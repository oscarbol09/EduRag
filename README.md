# EduRAG — Plataforma SaaS Educativa con RAG

Plataforma multi-tenant orientada a instituciones educativas y docentes independientes. Permite transformar materiales de clase estructurados (Markdown, TXT, PDF digital y DOCX) en tutores conversacionales especializados para estudiantes, consumibles vía catálogo web o integrables directamente en Entornos Virtuales de Aprendizaje (LMS como Moodle o Canvas) mediante `<iframe>`.

---

## Tabla de Contenidos

- [Por qué existe EduRAG](#por-qué-existe-edurag)
- [Principios de Arquitectura](#principios-de-arquitectura)
- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Stack Tecnológico](#stack-tecnológico)
- [Estructura del Repositorio](#estructura-del-repositorio)
- [Modelo de Datos](#modelo-de-datos)
- [Pipeline de Documentos e Inferencia](#pipeline-de-documentos-e-inferencia)
- [API Reference](#api-reference)
- [Límites y Decisiones de Diseño (Trade-offs)](#límites-y-decisiones-de-diseño-trade-offs)
- [Configuración del Entorno Local](#configuración-del-entorno-local)
- [Testing y Verificación](#testing-y-verificación)
- [Integración Continua (CI/CD)](#integración-continua-cicd)
- [Seguridad y Aislamiento Multi-tenant](#seguridad-y-aislamiento-multi-tenant)
- [Autor](#autor)

---

## Por qué existe EduRAG

En la mayoría de los cursos universitarios y de secundaria, el material pedagógico (guías de laboratorio, lecturas complementarias, apuntes de cátedra) permanece fragmentado en repositorios de archivos que los estudiantes rara vez consultan de manera interactiva. Las soluciones comerciales de chatbot presentan tres fricciones críticas:

1. **Costos recurrentes elevados:** Tarifas por usuario o suscripciones mensuales que las instituciones públicas o docentes individuales no pueden sostener.
2. **Riesgo de alucinación y falta de contexto:** Modelos generalistas responden con información externa no validada por el docente a cargo del curso.
3. **Complejidad de despliegue:** Exigencia de infraestructura compleja (servidores de bases de datos vectoriales dedicados, GPUs, pipelines de embedding de pago).

EduRAG resuelve esto mediante un pipeline RAG léxico ligero ejecutado en contenedores de bajo consumo sobre el Free Tier permanente de Supabase y modelos de lenguaje vía OpenRouter (BYOK), garantizando aislamiento estricto por docente y costo operativo \$0/mes.

---

## Principios de Arquitectura

- **Costo Operativo \$0/mes Permanente:** Infraestructura basada exclusivamente en capas gratuitas (Supabase PostgreSQL + Storage, Vercel para frontend, Railway para backend con bajo consumo de memoria).
- **Aislamiento Multi-tenant Riguroso:** Toda consulta a base de datos y almacenamiento de archivos valida la tupla `(owner_id, chatbot_id)`. Ningún tenant puede leer o indexar documentos de otro.
- **RAG Léxico sin Vector Store Pesado:** Eliminación de motores vectoriales locales (como ChromaDB, que requería ~500 MB de venv y provocaba `ContainerTimeout` en entornos serverless). El texto se almacena en PostgreSQL y se clasifica al vuelo mediante chunking semántico y solapamiento léxico de tokens.
- **BYOK (Bring Your Own Key) con Cifrado Fuerte:** Los docentes configuran su propia clave de API de OpenRouter. Las claves se almacenan cifradas mediante Fernet (AES-128-CBC + HMAC-SHA256).
- **Streaming de Respuestas (SSE):** Respuestas token-a-token mediante `Server-Sent Events` para latencia percibida inferior a 300ms.

---

## Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                     Supabase (Cloud)                            │
│                                                                 │
│  ┌──────────────────┐           ┌──────────────────┐            │
│  │    Frontend       │           │     Backend       │            │
│  │  Next.js 16       │──────────▶│  FastAPI          │            │
│  │  (Vercel)         │           │  (Railway)        │            │
│  └──────────────────┘           └────────┬─────────┘            │
│                                          │                      │
│                 ┌────────────────────────┴───────────────┐      │
│                 ▼                                        ▼      │
│  ┌───────────────────────────┐        ┌────────────────────┐    │
│  │   Supabase PostgreSQL     │        │  Supabase Storage  │    │
│  │   6 tablas + RLS          │        │  Bucket: documents │    │
│  └───────────────────────────┘        └────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                               │
                   ┌───────────▼────────────┐
                   │   OpenRouter API        │
                   │   (Modelos Gratuitos)   │
                   └────────────────────────┘
```

---

## Stack Tecnológico

| Capa | Tecnología | Justificación de Elección |
|---|---|---|
| **Frontend** | Next.js 16 (App Router) + Tailwind CSS | Renderizado híbrido (SSR para catálogo público, estático para embeds de chat), tipografía editorial y micro-interacciones sin dependencias pesadas. |
| **Backend** | FastAPI (Python 3.11/3.12) + Uvicorn | Framework asíncrono de alto rendimiento con validación estricta Pydantic v2 y soporte nativo de streaming SSE. |
| **Base de Datos** | Supabase PostgreSQL 15 | Relacional ACID, índices B-tree optimizados, funciones SQL y retención persistente en free tier. |
| **Almacenamiento** | Supabase Storage (`documents` bucket) | Almacenamiento seguro de archivos binarios originales (PDF, DOCX) con URLs firmadas. |
| **Autenticación** | JWT HS256 + bcrypt | Tokens con rotación, identificador `jti` y tabla de revocación para invalidación inmediata de sesiones. |
| **Cifrado** | Fernet (`cryptography`) | Cifrado simétrico autenticado para credenciales BYOK en reposo. |
| **Inferencia LLM** | OpenRouter Client (`httpx.AsyncClient`) | Acceso unificado a múltiples proveedores (Google Gemma, Meta Llama, etc.) con streaming async sin bloqueos de event loop. |

---

## Estructura del Repositorio

```
.
├── .github/
│   └── workflows/
│       └── ci.yml                  # Matriz de CI (Python 3.11/3.12 + Node 20/22)
├── backend/
│   ├── main.py                     # API REST, endpoints, rate limiting y streaming SSE
│   ├── settings.py                 # Validación de variables de entorno con Pydantic Settings v2
│   ├── models.py                   # Schemas de request/response
│   ├── auth.py                     # Dependencias de autenticación y verificación de roles
│   ├── jwt_token.py                # Emisión, decodificación y verificación de JWT + refresh tokens
│   ├── password.py                 # Hashing de contraseñas con bcrypt
│   ├── security_utils.py           # Cifrado y descifrado simétrico Fernet
│   ├── supabase_db.py              # Capa de persistencia en Supabase PostgreSQL
│   ├── document_content_store.py   # Gestión del almacén de contenido de texto plano
│   ├── context_builder.py          # Chunking léxico (1500c / overlap 200c) y ranking de contexto
│   ├── llm_client.py               # Cliente HTTP asíncrono para OpenRouter
│   ├── document_uploader.py        # Extracción de texto (PyMuPDF, python-docx, UTF-8) y upload
│   ├── conftest.py                 # Arnés de pruebas con dobles herméticos de Supabase y Storage
│   ├── test_main.py                # Suite de pruebas unitarias y de integración (61 tests)
│   ├── requirements.txt            # Dependencias fijadas del backend
│   └── railway.toml                # Configuración de despliegue en Railway
├── frontend/
│   ├── src/
│   │   ├── app/                    # Rutas de Next.js App Router (Landing, Chat, Docente, Admin)
│   │   ├── components/             # Componentes de UI accesibles (Navbar, Modales, Toast, etc.)
│   │   └── lib/                    # Cliente de API centralizado, contexto de auth y utilidades
│   ├── test/                       # Suite de pruebas unitarias con Vitest y JSDOM (82 tests)
│   ├── vitest.config.ts            # Configuración de Vitest con runner multi-hilo
│   └── next.config.ts              # Configuración de seguridad, CSP y headers de iframe
├── supabase/
│   └── migrations/                 # Migraciones SQL reproducibles
├── AGENTS.md                       # Guía de contexto para asistentes y agentes
├── SPEC.md                         # Especificación técnica formal del sistema
└── README.md                       # Documentación principal del proyecto
```

---

## Modelo de Datos

Persistencia relacional estructurada en 6 tablas:

1. **`users`:** Cuentas de docentes, estudiantes y administradores (`id`, `email`, `password` bcrypt, `role`, `openrouter_api_key` Fernet, `openrouter_model`, `is_test_account`).
2. **`chatbots`:** Configuración pedagógica del agente (`owner_id`, `name`, `subject_area`, `education_level`, `tone`, `restriction_level`, `system_prompt_override`, `is_published`).
3. **`documents`:** Metadatos de los archivos adjuntos a cada chatbot (`chatbot_id`, `filename`, `mime_type`, `blob_url`, `content_hash` SHA-256, `status`).
4. **`document_contents`:** Texto completo extraído de cada documento para construcción de contexto (`chatbot_id`, `filename`, `content`, `content_hash`).
5. **`conversations`:** Registro de sesiones de chat (`id`, `chatbot_id`, `student_id`).
6. **`messages`:** Historial de mensajes normalizado (`id`, `conversation_id`, `role`, `content`, `created_at`).
7. **`revoked_tokens`:** Lista negra de `jti` para invalidación instantánea de tokens JWT al cerrar sesión o rotar credenciales.

---

## Pipeline de Documentos e Inferencia

### 1. Ingesta y Extracción de Documentos (`POST /documents/upload`)
- Validación de identidad del docente y titularidad del chatbot.
- Límite de tamaño: 20 MB por archivo.
- Extracción según formato:
  - **Markdown / TXT:** Decodificación UTF-8 directa.
  - **DOCX:** Extracción estructurada de párrafos y celdas de tablas con `python-docx`.
  - **PDF Digital:** Extracción de capas de texto con `PyMuPDF` (`fitz`). *Nota: PDFs escaneados sin OCR devuelven HTTP 400 informativo.*
- Cálculo de hash SHA-256 para prevenir indexación duplicada.
- Guardado asíncrono en Supabase Storage (`documents`) y en `document_contents`.

### 2. Construcción de Contexto (`context_builder.py`)
- Segmentación en chunks de 1,500 caracteres con un solapamiento (overlap) de 200 caracteres.
- Puntuación léxica contra los términos de la consulta del estudiante.
- Selección codiciosa (greedy) hasta alcanzar el presupuesto estricto de **60,000 caracteres**.

### 3. Generación y Streaming (`POST /chat/{id}/stream`)
- Recuperación del historial conversacional reciente (últimos 20 turnos).
- Inyección del prompt de sistema según el tono (`formal`, `friendly`, `technical`) y nivel de restricción (`strict`, `guided`, `open`).
- Streaming mediante Server-Sent Events (`event: token`, `event: done`, `event: error`).

---

## API Reference

### Sistema y Diagnóstico
- `GET /health` — Verificación de disponibilidad del servicio.
- `GET /ready` — Comprobación de conectividad con Supabase.
- `GET /platform/stats` — Estadísticas públicas en vivo (chatbots publicados, docentes activos, mensajes).

### Autenticación y Perfil
- `POST /auth/login` — Autenticación con email/contraseña (límite: 10 req/min). Retorna access token, refresh token y datos de usuario (sin hash).
- `POST /auth/register` — Registro público (fuerza rol `student`, límite: 5 req/min).
- `POST /auth/refresh` — Rotación de par access/refresh token e invalidación del token anterior.
- `POST /auth/logout` — Revocación inmediata del token actual.
- `GET /auth/me` — Consulta de la sesión activa `[JWT]`.
- `PUT /auth/me/profile` — Actualización de perfil y credenciales OpenRouter `[JWT]`.

### Gestión de Chatbots
- `GET /chatbots` — Listado con filtros (`owner_id`, `published_only`, paginación).
- `POST /chatbots` — Creación de nuevo chatbot con validación de prompt (máx. 2,000 chars) `[JWT Teacher]`.
- `GET /chatbots/{id}` — Detalle del chatbot (el prompt de sistema se oculta a terceros).
- `PUT /chatbots/{id}` — Edición de configuración pedagógica `[JWT Owner]`.
- `DELETE /chatbots/{id}` — Eliminación en cascada del chatbot, documentos y contenidos `[JWT Owner]`.
- `POST /chatbots/{id}/publish` — Publicación al marketplace `[JWT Owner]`.
- `GET /chatbots/{id}/embed` — Código `<iframe>` y URL pública para LMS.

### Documentos
- `POST /documents/upload` — Carga y procesamiento síncrono de documentos `[JWT Owner]`.
- `GET /documents?chatbot_id=` — Listado de documentos asociados `[JWT Owner]`.
- `GET /documents/{id}` — Metadatos de un documento `[JWT Owner]`.
- `DELETE /documents/{id}?chatbot_id=` — Eliminación de archivo y texto indexado `[JWT Owner]`.

### Chat e Inferencia
- `POST /chat/{id}` — Consulta síncrona con memoria (límite: 100 req/min/IP).
- `POST /chat/{id}/stream` — Consulta con streaming token a token vía SSE.
- `GET /chat/{id}/history` — Historial de mensajes `[JWT: Docente dueño, Admin o Estudiante participante]`.

### Métricas y Administración
- `GET /teacher/metrics` — Métricas del docente (chatbots, documentos indexados, conversaciones) `[JWT Teacher]`.
- `POST /admin/teachers` — Creación administrativa de cuentas docentes `[JWT Admin]`.
- `GET /admin/teachers` — Listado de docentes registrados `[JWT Admin]`.
- `PUT /admin/teachers/{id}` — Modificación de docente `[JWT Admin]`.
- `DELETE /admin/teachers/{id}` — Baja de docente `[JWT Admin]`.

---

## Límites y Decisiones de Diseño (Trade-offs)

Para garantizar estabilidad operativa y coste cero, el sistema asume de forma consciente las siguientes decisiones:

1. **RAG Léxico vs. Embeddings Vectoriales:**
   - *Decisión:* No se utiliza una base de datos vectorial (como pgvector o ChromaDB) para evitar sobrecarga de memoria y cuotas de API de embeddings.
   - *Compromiso:* Para colecciones documentales gigantescas (>200 páginas por chatbot), la selección de fragmentos se basa en solapamiento léxico de términos en lugar de similitud semántica latente.
2. **Documentos Escaneados sin OCR Integrado:**
   - *Decisión:* El extractor de PDF (`PyMuPDF`) solo lee PDFs con capa de texto digital.
   - *Compromiso:* Documentos escaneados o basados exclusivamente en imágenes deben ser procesados previamente mediante OCR antes de subirse.
3. **Caché en Memoria Monoproceso:**
   - *Decisión:* La caché TTL (5 minutos) opera en la memoria del proceso FastAPI (`RLock` + diccionario LRU).
   - *Compromiso:* La caché es local a cada instancia del backend. En un despliegue multi-instancia horizontal requeriría Redis.
4. **Almacenamiento de Tokens en Frontend:**
   - *Decisión:* El access token se almacena en `localStorage` para permitir sincronización entre pestañas y sesiones embebidas en iframe.
   - *Mitigación:* Expiración de corta duración (24 horas) y tabla de revocación backend (`revoked_tokens`) con validación de `jti`.

---

## Configuración del Entorno Local

### Requisitos
- Python 3.11 o 3.12
- Node.js 20+ y npm 10+
- Proyecto Supabase configurado (o instancia local de Supabase CLI)

### 1. Configuración del Backend

```bash
cd backend
python -m venv venv

# En Windows:
.\venv\Scripts\activate
# En Linux/macOS:
# source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

Configurar las siguientes variables en `backend/.env`:
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu-service-role-key
JWT_SECRET=tu-secreto-jwt-minimo-32-caracteres
ENCRYPTION_KEY=tu-clave-fernet-generada
OPENROUTER_API_KEY=sk-or-v1-opcional-para-whitelist
TEST_ACCOUNTS_WHITELIST=admin@edurag.com,test@edurag.com
CORS_ORIGINS=http://localhost:3000,https://edu-rag-red.vercel.app
```

Iniciar el servidor backend:
```bash
uvicorn main:app --reload --port 8000
```

### 2. Configuración del Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local
```

Configurar en `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Iniciar el servidor de desarrollo:
```bash
npm run dev
```
Acceder a [http://localhost:3000](http://localhost:3000).

---

## Testing y Verificación

El proyecto cuenta con suites de pruebas automatizadas y herméticas en ambas capas:

### Backend (Pytest — 61 pruebas)
Pruebas unitarias y de integración que utilizan dobles de prueba para Supabase y Storage, garantizando ejecución sin dependencias de red externas:

```bash
cd backend
pytest -v
```

### Frontend (Vitest — 82 pruebas)
Pruebas de componentes, validaciones de formularios, manejo de autenticación y cliente HTTP con JSDOM:

```bash
cd frontend
npm test
```

### Verificación de Compilación de Producción
```bash
cd frontend
npm run build
```

---

## Integración Continua (CI/CD)

El repositorio cuenta con un pipeline automatizado de GitHub Actions configurado en `.github/workflows/ci.yml`:

- **Matriz de Entornos:**
  - Python: `3.11`, `3.12`
  - Node.js: `20.x`, `22.x`
- **Puertas de Calidad (Quality Gates):**
  - Ejecución completa de la suite de backend (`pytest -v`).
  - Linter y análisis estático de frontend (`npm run lint`).
  - Suite de pruebas unitarias de frontend (`npm test`).
  - Compilación estricta de producción Next.js (`npm run build`).

---

## Seguridad y Aislamiento Multi-tenant

- **Cifrado en Reposo:** Las claves de API de OpenRouter se almacenan cifradas en la base de datos con Fernet.
- **Control de Fugas de Información:** La función `map_user_response()` en el backend elimina sistemáticamente cualquier referencia al campo `password` antes de serializar respuestas JSON.
- **Políticas de Cabeceras HTTP:** Cabeceras CSP estrictas con permisos explícitos de orígenes para Railway y Supabase, además de permitir `frame-ancestors *` exclusivamente para la visualización del chatbot embebido en LMS.
- **Rate Limiting:** Control de ráfagas con `slowapi` en endpoints de autenticación y chat para mitigar ataques de fuerza bruta y abusos de cuota.

---

## Autor

**Oscar Madera** — [@oscarbol09](https://github.com/oscarbol09)
