# Checklist de Auditoría Técnica — EduRAG Platform

Este documento sirve como la lista de verificación oficial para hacer el seguimiento del estado de resolución de las observaciones identificadas en la [Auditoría Técnica](file:///C:/Users/dario/OneDrive/Escritorio/EduRAG-Platform/EduRAG-Platform/EduRAG_Auditoria_Tecnica.md).

---

## Resumen del Progreso

* **Total de ítems auditados:** 31
* **Resueltos:** 27
* **Parciales / Mitigados:** 4
* **Pendientes:** 0

---

## 1. Seguridad (8 ítems)

| Estado | Ítem | Descripción | Notas / Solución |
| :---: | :--- | :--- | :--- |
| ✅ | 1 | Fallback silencioso a texto plano en `security_utils.py` | **Resuelto.** Se eliminó el bloque `try-except` en la función de cifrado; ahora lanza una excepción ruidosa si falla, evitando que se guarden API keys en texto plano. |
| ✅ | 2 | Rate Limiting en endpoints de Auth | **Resuelto.** Se añadió `@limiter.limit` a `/auth/login` (10/min) y `/auth/register` (5/min) para mitigar ataques de fuerza bruta y de denegación de servicio. |
| ⚠️ | 3 | Almacenamiento de tokens JWT en `localStorage` | **Mitigado.** Aceptado conscientemente por limitaciones de persistencia sin estado. Se añadieron CSP headers y políticas de seguridad estrictas en `vercel.json` para reducir vectores de ataque XSS. |
| ✅ | 4 | Validación y sanitización de longitud de `system_prompt_override` | **Resuelto.** Se configuró un límite de `2000` caracteres (`MAX_SYSTEM_PROMPT_LENGTH`) validado tanto en creación como en edición de chatbots. |
| ✅ | 5 | Historial de conversaciones público sin autenticación | **Resuelto.** El endpoint `/chat/{chatbot_id}/history` ahora valida JWT y restringe el acceso únicamente al estudiante de la conversación, al dueño del bot o al administrador. |
| ✅ | 6 | `SUPABASE_KEY` con valor vacío como default en settings | **Resuelto.** Se removieron los valores por defecto en `settings.py` para variables críticas (`SUPABASE_URL`, `SUPABASE_KEY`, `JWT_SECRET`, `ENCRYPTION_KEY`) para asegurar que la app no arranque mal configurada. |
| ✅ | 7 | Sanitización del input del usuario en el chat | **Resuelto.** El input de texto en el frontend (`ChatClient.tsx`) limita los caracteres a 4000 (`maxLength={4000}`) y el backend valida el modelo Pydantic con un máximo de 4000 caracteres. |
| ✅ | 8 | Prevención de Path Traversal en almacenamiento de archivos | **Resuelto.** Se implementó una función robusta `sanitize_filename` en `main.py` utilizando normalización unicode y expresiones regulares antes de subir a Supabase Storage. |

---

## 2. Calidad de Código Backend (FastAPI - 7 ítems)

| Estado | Ítem | Descripción | Notas / Solución |
| :---: | :--- | :--- | :--- |
| ✅ | 9 | Carga de imports dentro de funciones en `main.py` | **Resuelto.** Todos los imports (ej. `decrypt_api_key`) se movieron al top del archivo `main.py` eliminando el anti-patrón de importación dinámica. |
| ✅ | 10 | Caché en memoria local no thread-safe | **Resuelto.** Se implementó un `threading.RLock()` (`response_cache_lock`) para controlar la lectura y escritura concurrente en el caché de memoria. |
| ✅ | 11 | Caché sin tiempo de expiración (TTL) | **Resuelto.** Se añadió un TTL de 5 minutos (`CACHE_TTL_SECONDS = 300`) y limpieza dinámica de registros expirados para liberar recursos. |
| ✅ | 12 | Endpoint `/teacher/metrics` lento / queries secuenciales | **Resuelto.** Optimizado. El backend recupera documentos y conversaciones semanales con solo 2 consultas agrupadas (`list_documents_for_chatbots` y `list_conversations_for_chatbots`) usando filtros `in_`. |
| ✅ | 13 | Acceso directo a `get_client()` en delete_teacher | **Resuelto.** Se creó la función helper `delete_user()` en `supabase_db.py` para abstraer la base de datos y evitar el acoplamiento directo de `main.py`. |
| ✅ | 14 | Estadísticas ficticias en la Landing Page | **Resuelto.** Se creó el endpoint público `/platform/stats` que realiza conteos agregados reales en Supabase (bots públicos, docentes activos y total mensajes). |
| ✅ | 15 | Modelo por defecto (`DEFAULT_MODEL`) de LLM hardcodeado | **Resuelto.** Se movió como parámetro de configuración en `settings.py` como `DEFAULT_LLM_MODEL: str = "google/gemma-3-27b-it:free"`, permitiendo su cambio dinámico mediante variables de entorno. |

---

## 3. Calidad de Código Frontend (Next.js - 6 ítems)

| Estado | Ítem | Descripción | Notas / Solución |
| :---: | :--- | :--- | :--- |
| ✅ | 16 | Estado `conversations` muerto en `context.tsx` | **Resuelto.** Eliminado el estado no utilizado `conversations` y su respectiva inicialización, limpiando variables huérfanas en el contexto React. |
| ✅ | 17 | Bug de race condition en `assistantIndex` de `ChatClient.tsx` | **Resuelto.** Se reemplazó el cálculo dinámico por índice de array por un `useRef` estable que almacena el ID del placeholder del asistente, resolviendo el desfase del renderizado de React. |
| ✅ | 18 | Falta de renderizado de Markdown enriquecido (listas/bloques de código) | **Resuelto.** Se amplió la lógica de renderizado en `renderMessageContent` para parsear bloques de código con triple backtick y formatear listas no ordenadas de tipo `-` o `*`. |
| ✅ | 19 | Nombre del docente extraído de campo legacy `institution` | **Resuelto.** El frontend ahora consume la propiedad nativa `auth.user?.firstName` (o `auth.user?.first_name`) en lugar de extraerla por split del campo serializado de institución. |
| ✅ | 20 | Inconsistencia en la landing page para las estadísticas reales | **Resuelto.** La landing page en Next.js ahora consume el endpoint `/platform/stats` y tiene fallback defensivo (`—`) si el servidor no está en línea. |
| ✅ | 21 | Versiones del stack Next.js 16 / React 19 muy prematuras | **Resuelto/Aceptado.** Mantenidas por conveniencia del equipo de frontend, pero monitorizadas. Se confirmó compatibilidad en la compilación y pruebas de integración. |

---

## 4. Base de Datos (Supabase - 4 ítems)

| Estado | Ítem | Descripción | Notas / Solución |
| :---: | :--- | :--- | :--- |
| ⚠️ | 22 | Duplicidad de datos legacy (`institution` vs columnas nativas) | **Mitigado.** Las columnas nativas (`first_name`, `last_name`, etc.) son tratadas como prioritarias y mapeadas. Se mantiene la lógica de fallback legacy únicamente para retrocompatibilidad con cuentas antiguas. |
| ✅ | 23 | Falta de índices en tablas de Supabase | **Resuelto.** Creada y aplicada la migración SQL `20260607153000_add_missing_indexes.sql` con 12 índices idempotentes en las consultas más críticas. |
| ⚠️ | 24 | Tabla messages como JSONB creciente | **Mitigado (Fase 1).** Creada y aplicada la migración `20260607154000_extract_messages_table.sql` que extrae los mensajes del JSONB a una tabla separada estructurada `messages` y migra los datos de forma segura. La Fase 2 de cambio en código backend está planificada para el siguiente sprint. |
| ✅ | 25 | Falta de límites en la columna `content` de documentos subidos | **Resuelto.** Se configuró un límite estricto de 1M de caracteres extraídos (`MAX_EXTRACTED_TEXT_CHARS`), validado en el backend para proteger la cuota gratuita de base de datos. |

---

## 5. Pipeline RAG y Documentos (3 ítems)

| Estado | Ítem | Descripción | Notas / Solución |
| :---: | :--- | :--- | :--- |
| ✅ | 26 | Subida duplicada de un mismo archivo al chatbot | **Resuelto.** Se implementó validación por hash SHA-256 (`content_hash`) que detecta y rechaza archivos idénticos en el mismo tenant devolviendo un código `409 Conflict`. |
| ✅ | 27 | Extracción de tablas en documentos Word (DOCX) ignorada | **Resuelto.** Confirmado en `document_uploader.py`. El lector ahora parsea `doc.tables` y concatena celdas con el separador ` | ` de forma estructurada. |
| ✅ | 28 | Problemas al procesar PDFs escaneados sin OCR | **Resuelto.** Se añadió una advertencia explícita en la UI de carga de archivos (Drag-and-Drop) indicando que solo se soportan PDFs digitales, y se ajustó el atributo `accept` en el frontend. |

---

## 6. Testing, DevOps y Despliegue (3 ítems)

| Estado | Ítem | Descripción | Notas / Solución |
| :---: | :--- | :--- | :--- |
| ✅ | 29 | Cobertura de tests del backend extremadamente baja (~15%) | **Resuelto.** Se amplió la suite a 34 pruebas de integración que cubren RBAC, chat síncrono, SSE streaming, RAG context, seguridad multi-tenant y CRUD admin. Todas las pruebas pasan exitosamente. |
| ✅ | 30 | `ENCRYPTION_KEY` ausente de la configuración y `.env.example` | **Resuelto.** Añadida la variable a `settings.py` como requerida en el startup, e incluida la documentación y comando de generación en `.env.example`. |
| ✅ | 31 | Falta de encabezados de seguridad (CSP, X-Frame) en el frontend | **Resuelto.** Se añadió la configuración de headers HTTP seguros a `vercel.json` (incluyendo Content-Security-Policy con restricciones de dominio y X-Frame-Options: DENY). |

---

*Última verificación de checklist realizada: 8 de Junio de 2026.*
