# EduRAG — Especificación Técnica (SPEC.md)

## 1. Visión y Restricciones

Plataforma SaaS educativa multi-tenant para transformar materiales de clase en asistentes interactivos. 

**Restricciones inquebrantables:**
- **Costo operativo $0/mes:** Operación exclusiva en capas gratuitas (Supabase, Vercel, Railway) usando modelos LLM BYOK (Bring Your Own Key).
- **Aislamiento multi-tenant estricto:** Validación de la tupla `(owner_id, chatbot_id)` obligatoria en toda consulta relacional.
- **Arquitectura sin vector store:** La inclusión de motores vectoriales (como ChromaDB) provocaba caídas por `ContainerTimeout` debido al exceso de RAM (>500 MB). El texto se almacena crudo en PostgreSQL y se somete a ranking léxico en memoria temporal.

## 2. Stack de Infraestructura

- **Frontend SPA:** Next.js 16 (App Router), Tailwind CSS, Radix UI. Despliegue en Vercel (Free Tier).
- **API Backend:** FastAPI, Uvicorn, Python 3.11/3.12. Despliegue en Railway (Free Tier).
- **Base de Datos y Almacenamiento binario:** Supabase PostgreSQL 15, Supabase Storage (Free Tier).
- **Criptografía y Autenticación:** PyJWT (HS256) con rotación continua y tabla de revocación, bcrypt, Fernet para encriptación de claves externas.
- **Inferencia de Modelos:** Integración asíncrona a OpenRouter vía `httpx.AsyncClient`.

## 3. Esquema PostgreSQL

Las definiciones formales y secuencias de creación residen en `supabase/migrations/`.
Entidades:
1. `users`: Identidades (docentes, estudiantes, admins), perfiles y credenciales encriptadas (`openrouter_api_key`).
2. `chatbots`: Agentes (configuración de restricciones, LLM objetivo, prompt inyectado). Relación con `owner_id`.
3. `documents`: Metadatos y URLs firmadas de archivos originales.
4. `document_contents`: Almacén de bloques de texto plano (`chatbot_id`, `content`).
5. `conversations`: Identificador lógico para sesiones activas.
6. `messages`: Registro atómico de turnos conversacionales de estudiantes y bots (`conversation_id`, `role`, `content`).
7. `revoked_tokens`: Registro histórico de identificadores `jti` prohibidos para neutralizar JWTs emitidos y robados.

Todos los barridos de lectura aplican índices B-tree sobre combinaciones de `chatbot_id` y `owner_id`.

## 4. Flujos API de Negocio

- **Manejo de Sesión (`/auth`):** `/login` emite JWT base y refresh con rate limit de 10 req/min. `/logout` inserta el `jti` activo en la tabla `revoked_tokens` bloqueando usos inmediatos.
- **Entidades Chatbot (`/chatbots`):** Validación exhaustiva de titularidad antes del CRUD. Exposición del fragmento HTML de `iframe` en la ruta `/embed`.
- **Procesamiento de Archivos (`/documents/upload`):** 
  - Límite duro de 20 MB por subida.
  - Parseo síncrono. Soporta UTF-8 directo, `python-docx` para lectura XML, y `fitz` (PyMuPDF) para extracción de capas de texto. Rechaza PDFs que carecen de caracteres digitales (solo imágenes).
  - Deduplicación lógica: computa y almacena un hash SHA-256 del texto para evitar doble indexación bajo el mismo agente.
- **Ciclo de Inferencia RAG (`/chat/{id}/stream`):** 
  - Limita peticiones a 100/min/IP.
  - Reconstruye los últimos 20 turnos conversacionales para proveer memoria.
  - Fragmenta el conjunto textual asociado al `chatbot_id` en bloques superpuestos (1,500 chars tamaño, 200 chars solape). Evalúa coincidencias de término exacto con la pregunta del alumno.
  - Alimenta la ventana del LLM hasta el umbral estricto de 60,000 caracteres.
  - Transmite la respuesta mediante Server-Sent Events (`text/event-stream`).

## 5. Parámetros de Control Pedagógico

El docente define el nivel de autonomía del bot configurando el nivel de restricción. El backend transfiere este parámetro directamente al campo `temperature` del LLM objetivo:
- `strict` (T = 0.2): Predicciones de baja entropía; anclaje total al material literal indexado.
- `guided` (T = 0.5): Balance intermedio. Genera inferencias o resúmenes sin salirse del área de conocimiento.
- `open` (T = 0.8): Entropía alta. Explora discusiones creativas vinculadas pero periféricas al documento base.

## 6. Barreras de Seguridad 

- **Data en Reposo:** Cifrado simétrico activo (Fernet) de los secretos de terceros de los usuarios (`users.openrouter_api_key`).
- **Fuga de Secretos en Respuestas HTTP:** Rutinas sanitizadoras en backend descartan activamente el hash `password` en las serializaciones de perfil de cuenta antes del envío JSON.
- **Mitigación de DoS:** Rate Limiter (`slowapi`) residente en memoria sobre todos los puntos de entrada HTTP públicos.
- **Protección Content Security Policy (CSP):** Next.js aplica `frame-ancestors *` solo en la visualización del bot público, previniendo secuestros Clickjacking en la consola administrativa.

## 7. Pruebas y Contratos

- **Backend:** 61 aserciones en `pytest` construidas sobre dobles (`MockSupabaseClient`) garantizando ejecución en CI desprovista de red o secretos reales.
- **Frontend:** 82 aserciones en `vitest` simulando DOM y eventos de interacción del usuario con los contextos React.
