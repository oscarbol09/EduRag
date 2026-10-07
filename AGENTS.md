# EduRAG — AGENTS.md (Referencia Técnica Central)

Documento normativo de arquitectura para guiar a desarrolladores y modificar el código. Reglas granulares de módulo residen en `backend/AGENTS.md` y `frontend/AGENTS.md`.

## 1. Topología del Proyecto y Restricciones Duras

EduRAG convierte documentos estáticos de docentes en chatbots para plataformas Moodle o Canvas.
Tres reglas arquitectónicas dictan la construcción del sistema:
1. **Infraestructura Zero-Cost:** Supabase Free Tier, Vercel, Railway. Base de datos PostgreSQL únicamente.
2. **Inviolabilidad de Tenant:** Los datos pertenecen a un `owner_id` y a un `chatbot_id`. La omisión de estos cruces en cláusulas `WHERE` se considera un fallo de seguridad crítico.
3. **Ausencia Vectorial (RAG Léxico):** Se prohibió el uso de bases vectoriales especializadas, ChromaDB y extensiones `pgvector` por limitaciones de RAM en los microcontenedores. El backend extrae contexto fraccionando textos almacenados en SQL puro y aplicando algoritmos léxicos en memoria contra el input del usuario.

## 2. Mapa de Localización y Responsabilidades

- `backend/main.py`: Arranque FastAPI, registro de middlewares, control de tasas (rate-limiting) y defición de rutas API.
- `backend/auth.py` / `backend/jwt_token.py`: Implementación JWT interna manual. Manejo de firmas, emisión, decodificación, chequeo de expiración y estado de revocación.
- `backend/security_utils.py`: Envoltura Fernet de 128-bits para el cifrado bidireccional asimétrico de tokens LLM BYOK (OpenRouter API keys).
- `backend/context_builder.py`: Motor RAG. Define la longitud de chunking, la partición de superposición (overlap) y el ranking de bloques de texto plano por co-ocurrencia léxica, con un coto duro de longitud (60K caracteres).
- `backend/llm_client.py`: Módulo cliente asíncrono para emitir llamadas a la API remota OpenRouter, procesando un flujo binario en chunks (Server-Sent Events).
- `supabase/migrations/`: Única fuente autoritativa de la estructura de tablas y políticas relacionales. Modificaciones al esquema deben provenir exclusivamente de nuevos scripts de migración.
- `frontend/src/app`: Definición de enrutamiento web Next.js App Router.
- `frontend/src/lib`: Bibliotecas base del frontend, interceptores HTTP, estado global y helpers genéricos.

## 3. Entidades Relacionales Base

El sistema mantiene el estado mediante 7 tablas:
- `users`: Registra la identidad base (nombre, correo) y las propiedades de seguridad de sesión.
- `chatbots`: Cada instancia de chatbot representa un contexto documental unificado y un perfil restrictivo para interactuar con los alumnos.
- `documents`: Metadatos estructurales y descriptivos de los ficheros físicos cargados a S3 (Supabase Storage).
- `document_contents`: Texto base plano preprocesado listo para servir al motor RAG asociado a su bot específico.
- `conversations`: Modelo transaccional agrupador de un hilo de chat vivo.
- `messages`: Instancia atómica inmutable representando una única participación en el diálogo (alumno o LLM).
- `revoked_tokens`: Base de datos de denegación temporal. Invalida prematuramente tokens JWT mediante el índice `jti` tras un cierre de sesión explícito.

Modificar el modelo exige ejecutar `supabase db push` localmente aplicando las diferencias a la nube.

## 4. Normativas para la Inyección de Código

Cualquier parche, función, o clase inyectada en el repositorio debe cumplir las siguientes heurísticas de la ingeniería de software:
- **Ausencia de bloqueos pasivos (Try/Catch de Pánico):** No protejas bloques lógicos lineales con clausulas `try/catch`. Identifica, mapea y atrapa excepciones concretas exclusivamente sobre interfaces externas de red, parseadores o E/S binaria.
- **Simplicidad Declarativa:** Evita patrones abstractos burocráticos y clases superpuestas para funciones de paso simple.
- **Documentación Sustantiva ("¿Por qué?"):** Redacta comentarios inline orientados a revelar restricciones de la API externa ignoradas, requerimientos atípicos de formato, o atajos de rendimiento temporales. Evita traducciones literales obvias del código a español.
- **Seguridad Predeterminada (Filtros FK):** Todas las consultas SQL u ORM subyacentes, deben validar que la operación del objeto pertenece lógicamente al usuario que porta el JWT en curso (`owner_id == auth.id`).

## 5. Ejecución Hermética de Tests

Verificación local aislada. Modificar las reglas obliga al cumplimiento total del banco de pruebas interno.

Ejecutar validadores de la capa de API (Python):
```bash
cd backend
pytest -v
```

Ejecutar validadores de interfaz (TypeScript):
```bash
cd frontend
npm test
```
Ambos bancos de pruebas evitan dependencias de red o de variables de entorno globales. Recrean un entorno volátil mockeado bajo la aserción de que no se produzcan bloqueos mutuos o excepciones sin atrapar.
