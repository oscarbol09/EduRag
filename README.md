# EduRAG

EduRAG transforma materiales de clase (Markdown, TXT, PDF digital, DOCX) en tutores conversacionales mediante un pipeline RAG léxico. Está diseñado para instituciones educativas públicas o docentes independientes sin presupuesto para infraestructura. Los chatbots se embeben en plataformas LMS (Moodle, Canvas) vía `<iframe>`.

## Por qué existe EduRAG

Construí EduRAG porque las soluciones comerciales tienen costos por asiento insostenibles para universidades públicas en LatAm y sufren de alucinaciones al ignorar el material específico de la cátedra. EduRAG opera a $0/mes aprovechando capas gratuitas y modelos BYOK, garantizando que el LLM responda estrictamente basándose en el material subido.

## Principios de Arquitectura

- **Costo Operativo $0/mes:** Supabase Free Tier (PostgreSQL + Storage), Vercel (Next.js), y Railway (FastAPI).
- **Aislamiento Multi-tenant:** Toda query incluye `owner_id` y `chatbot_id`. Un docente no puede leer ni indexar datos de otro.
- **RAG Léxico (Sin Base Vectorial):** ChromaDB requería ~500 MB en memoria, provocando `ContainerTimeout` en Railway. Se eliminó el almacenamiento vectorial. EduRAG indexa el texto en PostgreSQL y realiza chunking/ranking léxico al vuelo.
- **BYOK (Bring Your Own Key):** Los docentes configuran su propia clave de OpenRouter. Se almacena cifrada con Fernet (AES-128-CBC + HMAC-SHA256).
- **Streaming SSE:** Latencia percibida inferior a 300ms entregando tokens bajo demanda mediante Server-Sent Events.

## Arquitectura del Sistema

```text
Supabase (Cloud)                                OpenRouter API
 ├── PostgreSQL (6 tablas + RLS)                 └── (BYOK / Modelos Gratuitos)
 └── Storage (bucket: documents)                        ▲
        ▲                                               │
        │                                               │
Frontend (Next.js 16) ──────────────▶ Backend (FastAPI / Railway)
```

## Stack Tecnológico

- **Frontend:** Next.js 16 App Router. SSR para catálogo público, renderizado estático para el iframe del chat.
- **Backend:** FastAPI (Python 3.11/3.12). Validación estricta de esquemas de datos con Pydantic v2.
- **Base de Datos:** Supabase PostgreSQL 15.
- **Almacenamiento:** Supabase Storage para archivos originales.
- **Autenticación:** JWT HS256 + bcrypt con tabla de revocación en base de datos.
- **Inferencia LLM:** Cliente HTTP asíncrono (`httpx`) contra OpenRouter.

## Modelo de Datos

Persistencia relacional distribuida en 7 tablas:
1. `users`: Docentes, estudiantes y admins.
2. `chatbots`: Configuración de cada agente y prompts de sistema.
3. `documents`: Metadatos y control de estado de archivos subidos.
4. `document_contents`: Texto plano particionado por chatbot.
5. `conversations`: Agrupación lógica de sesiones.
6. `messages`: Historial conversacional normalizado.
7. `revoked_tokens`: Lista negra de tokens JWT para invalidación de sesiones.

## Pipeline de Ingesta e Inferencia

1. **Ingesta (`POST /documents/upload`):**
   Extrae UTF-8 directo de TXT/MD, usa `python-docx` para estructuras DOCX, y `fitz` (PyMuPDF) para extraer capas de texto de PDFs digitales. Retorna HTTP 400 si detecta un PDF escaneado basado en imágenes. Calcula el hash SHA-256 del contenido para descartar archivos duplicados en el mismo chatbot.
2. **Contexto (`context_builder.py`):**
   Trocea los documentos en fragmentos de 1,500 caracteres (solapamiento de 200). Puntúa cada fragmento evaluando el cruce de tokens con los términos de la consulta. Selecciona y concatena los mejores bloques hasta completar un presupuesto de 60,000 caracteres.
3. **Inferencia (`POST /chat/{id}/stream`):**
   Recupera los últimos 20 mensajes del historial conversacional de la sesión. Inyecta el prompt de sistema y el contexto construido al cliente LLM y emite la respuesta mediante eventos SSE al frontend.

## Límites Conocidos y Trade-offs (Decisiones de Diseño)

- **RAG Léxico sobre PostgreSQL:** Al prescindir de embeddings densos y bases vectoriales (como pgvector o ChromaDB), las búsquedas semánticas abstractas pueden fallar. El ranking prioriza coincidencias exactas de términos. Aceptamos esta limitación para garantizar despliegue en capas gratuitas con restricciones de RAM.
- **Sin Motor OCR:** El sistema rechaza documentos escaneados o imágenes PDF. El usuario debe procesar estos archivos externamente antes de subirlos. Implementar OCR in-house requeriría servidores pesados incompatibles con el presupuesto.
- **Caché Monoproceso Volátil:** La caché de peticiones recientes usa la memoria local del proceso de FastAPI. Un escalado horizontal a múltiples contenedores reducirá drásticamente la tasa de hit y requerirá instanciar un clúster de Redis externo.
- **Autenticación Frontend en `localStorage`:** Los JWT se almacenan en el cliente para permitir navegación consistente dentro de múltiples iframes cross-domain. Mitigamos ataques XSS mediante un tiempo de expiración corto (24h) y una tabla centralizada de revocación de sesiones (`jti`).

## Ejecución Local

### Configuración del Backend
```bash
cd backend
python -m venv venv
# Windows: .\venv\Scripts\activate
# macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```
Requiere definir `SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET`, y `ENCRYPTION_KEY` en `.env`.

Levantar el servidor:
```bash
uvicorn main:app --reload --port 8000
```

### Configuración del Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
```
Requiere definir `NEXT_PUBLIC_API_URL=http://localhost:8000` en `.env.local`.

Iniciar servidor de desarrollo:
```bash
npm run dev
```

## Pruebas y CI/CD

- **Backend:** 61 pruebas unitarias y de integración en `pytest` utilizando dobles herméticos locales (mocks de Supabase).
- **Frontend:** 82 pruebas funcionales en `vitest` con JSDOM para renderizado de componentes y flujos de UI.
- **CI/CD:** El pipeline de GitHub Actions ejecuta verificaciones estáticas (linting) y suites completas de tests cruzando matrices de Node.js (20, 22) y Python (3.11, 3.12) en cada push a la rama principal.

## Autor
**Oscar Madera** — [@oscarbol09](https://github.com/oscarbol09)
