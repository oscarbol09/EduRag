# EduRAG Frontend — AGENTS.md

Guía técnica para agentes de IA y desarrolladores que trabajen en el módulo `frontend/`. Leer antes de modificar, agregar o depurar cualquier archivo de este directorio.

---

## Propósito del Módulo

SPA construida con **Next.js 16 (App Router)** + **Tailwind CSS** + **Radix UI**. Alojada en **Vercel** (`edu-rag`). Sirve tres superficies de usuario distintas:

- **Dashboard del docente** — crear y gestionar chatbots, subir documentos.
- **Marketplace público** — estudiantes descubren y acceden a chatbots publicados.
- **Interfaz de chat** (`/chat/[botId]`) — embebible vía `<iframe>` en Moodle u otros LMS.

---

## Estructura del Proyecto

```
frontend/
├── src/
│   ├── app/                        # Next.js App Router — file-based routing
│   │   ├── layout.tsx              # Root layout — providers globales, fuentes
│   │   ├── page.tsx                # Home / landing page
│   │   ├── login/
│   │   │   └── page.tsx            # Login de usuarios (email + password)
│   │   ├── teacher/
│   │   │   ├── page.tsx            # Dashboard del docente — lista de chatbots
│   │   │   └── chatbots/
│   │   │       └── new/
│   │   │           └── page.tsx    # Formulario de creación de chatbot
│   │   ├── marketplace/
│   │   │   └── page.tsx            # Marketplace público con búsqueda y filtros
│   │   └── chat/
│   │       └── [botId]/
│   │           └── page.tsx        # Interfaz de chat — embebible vía iframe
│   ├── lib/
│   │   ├── api.ts                  # Cliente HTTP centralizado — todos los llamados a la API
│   │   ├── types.ts                # Tipos TypeScript de dominio
│   │   ├── context.tsx             # AuthContext — estado global de autenticación
│   │   └── utils.ts                # Funciones helper (formateo, fechas, etc.)
│   └── components/                 # Componentes reutilizables
├── public/                         # Assets estáticos
├── test/                           # Tests (Vitest)
├── package.json
├── next.config.ts                  # Configuración Next.js
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
├── vercel.json                     # Fuerza el preset de Next.js en Vercel
├── .env.local                      # Variables de entorno locales (NO commitear)
└── AGENTS.md                       # Este archivo
```

---

## Cliente API (`src/lib/api.ts`)

Todos los llamados al backend pasan por `api.ts`. Usa `NEXT_PUBLIC_API_URL` como base URL y adjunta automáticamente el token JWT desde `localStorage`.

```typescript
// Importación
import { api } from '@/lib/api';

// Ejemplos de uso
const chatbots = await api.chatbots.list();
const chatbot = await api.chatbots.create(payload);
const response = await api.chat.send(botId, { message: 'texto', conversation_id: '...' });

// Streaming SSE — recibe tokens uno a uno vía callback
await api.chat.sendStream(botId, { message: 'texto', conversation_id: '...' }, {
  onToken: (chunk) => { /* acumular en UI */ },
  onDone: (meta) => { /* meta.conversation_id, meta.sources */ },
  onError: (err) => { /* mostrar error */ },
});

const docs = await api.documents.list(chatbotId);
```

**Convención:** nunca usar `fetch` directamente en componentes. Centralizar toda la lógica HTTP en `api.ts`.

**Timeouts:** `fetchApi` usa `AbortController` con timeouts por tipo de operación (30s para CRUD ligero, 120s para chat y upload). Configurables en `api.ts`.

---

## AuthContext (`src/lib/context.tsx`)

Provee estado global de autenticación via React Context.

```typescript
const { user, token, login, logout, isLoading } = useAuth();
```

- `token` se persiste en `localStorage` bajo la clave `token`.
- `user` se deserializa del payload JWT: `{ id, email, role }`.
- En rutas protegidas, verificar `user?.role === 'teacher'` o redirigir a `/login`.

---

## Tipos Principales (`src/lib/types.ts`)

```typescript
interface User {
  id: string;
  email: string;
  role: 'teacher' | 'student' | 'admin';
  first_name?: string;
  last_name?: string;
  institution_name?: string;
  openrouter_api_key?: string;
  openrouter_model?: string;
  is_test_account?: boolean;
}

interface Chatbot {
  id: string;
  owner_id: string;
  name: string;
  subject_area: string;
  education_level: 'secondary' | 'university';
  tone: 'formal' | 'friendly' | 'technical';
  welcome_message: string;
  system_prompt_override?: string;
  restriction_level: 'strict' | 'guided' | 'open';
  llm_provider: string; // Nombre del modelo de OpenRouter (e.g. google/gemini-2.5-flash:free)
  public_url: string;
  embed_code: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

interface Document {
  id: string;
  chatbot_id: string;
  filename: string;
  mime_type: string;  // application/pdf | application/vnd.openxmlformats-officedocument.wordprocessingml.document | text/markdown | text/plain
  blob_url: string;
  status: 'indexed' | 'error';  // siempre llega a 'indexed' de forma síncrona en el upload
  chunk_count: number;
  error_message?: string;
  created_at: string;
  processed_at: string;
}

interface ChatMessage {
  message: string;
  conversation_id?: string;
}

interface ChatResponse {
  response: string;
  conversation_id: string;
  sources: string[];
}
```

---

## Rutas y Páginas

| Ruta | Descripción | Auth requerida |
|---|---|---|
| `/` | Landing page / entrada al marketplace | No |
| `/login` | Login con email + password | No |
| `/teacher` | Dashboard del docente — lista de chatbots propios | `role: teacher` |
| `/teacher/chatbots/new` | Formulario de creación de chatbot | `role: teacher` |
| `/marketplace` | Lista pública de chatbots publicados con búsqueda | No |
| `/chat/[botId]` | Interfaz de chat — diseñada para funcionar dentro de iframe | No |

### Ruta `/chat/[botId]` — Embebible

Esta ruta es especial: debe funcionar correctamente dentro de un `<iframe>` en Moodle u otro LMS. Consideraciones:

- No incluir headers de navegación globales — la página debe ser autónoma.
- Evitar redirecciones que rompan el iframe.
- El embed code generado por el backend es: `<iframe src="/chat/{botId}" width="100%" height="600"></iframe>`.
- La URL pública de producción base es: `https://edu-rag-red.vercel.app`.

**Streaming SSE en `ChatClient.tsx`:**
- `handleSend` invoca `api.chat.sendStream(...)` y va acumulando los tokens en un placeholder del assistant insertado en `messages` desde el inicio.
- Indicador de carga (3 puntitos bouncing) se renderiza **dentro de la burbuja del assistant** mientras `content === ""` (no se duplica con un spinner global).
- Si `sendStream` falla o no entrega ningún token, hace **fallback automático** a `api.chat.send()` (endpoint no-stream) para evitar regresiones si el stream se rompe.

---

## Variables de Entorno

```env
# frontend/.env.local (NO commitear)
NEXT_PUBLIC_API_URL=https://edurag-production.up.railway.app
```

Para desarrollo local contra backend local:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Scripts Disponibles

```bash
npm run dev       # Servidor de desarrollo en http://localhost:3000
npm run build     # Build de producción (verifica errores TypeScript)
npm run start     # Servidor de producción local (requiere build previo)
npm run lint      # ESLint
npm run test      # Vitest (tests unitarios)
```

---

## Tecnologías y Convenciones

### Styling
- **Tailwind CSS** — utility-first. No usar CSS modules ni styled-components.
- **Radix UI** — para componentes accesibles (Dialog, Select, Tabs, etc.).
- Paleta de colores y tokens definidos en `tailwind.config.ts`.

### Estado
- **React Context** (`context.tsx`) para estado de autenticación global.
- **useState / useEffect** para estado local de componentes.
- No usar Redux ni Zustand — el scope del MVP no lo requiere.

### TypeScript
- Tipado estricto en todos los archivos.
- Nunca usar `any` salvo casos excepcionales documentados con `// eslint-disable-next-line`.
- Exportar todos los tipos desde `types.ts`.

### Fetch y Async
- Todos los llamados a API via `api.ts` — nunca `fetch` directo en componentes.
- `fetchApi` internamente usa `AbortController` con timeouts por tipo: 30s para CRUD ligero, 120s para chat (síncrono o stream) y upload de documentos.
- `api.chat.sendStream(...)` parsea el `text/event-stream` manualmente sobre `ReadableStream` con `TextDecoder` y separación por `\n\n`; acepta callbacks `onToken` / `onDone` / `onError`.
- Manejar siempre estados `loading` y `error` en componentes que hacen fetch.

---

## Vercel — Configuración y Despliegue

El despliegue está configurado en **Vercel** (`edu-rag`) con el preset de Next.js:

- **Automático** vía integración Git en Vercel en cada push a la rama `master`.
- **Compilación**: Vercel ejecuta `npm run build` y sirve la aplicación con soporte completo del App Router de Next.js.
- **URL de producción**: `https://edu-rag-red.vercel.app`.
- **Configuración local (`vercel.json`)**: Fuerza el framework de compilación a `"nextjs"` para evitar problemas de autodetección.

---

## Testing

```bash
# Unitarios
npm run test

# Verificar build sin desplegar
npm run build
```

Tests ubicados en `test/`. Framework: **Vitest**.

---

## Notas Importantes

- El token JWT se guarda en `localStorage`. Para mayor seguridad en producción, evaluar migrar a `httpOnly cookies` con un endpoint de refresh.
- Las páginas del docente deben verificar `role === 'teacher'` y redirigir a `/login` si el usuario no está autenticado o no tiene el rol correcto.
- El upload de documentos es síncrono: el backend extrae el texto y devuelve `status: "indexed"` en el mismo request. No es necesario hacer polling de estado. El campo `status` puede mostrar directamente el valor del response del upload.
- Formatos de documento soportados por el backend: **PDF, DOCX, MD, TXT**. Actualizar el input de file upload para aceptar `.pdf,.docx,.md,.txt`.
- El `CLAUDE.md` en este directorio es un alias que apunta a `AGENTS.md` — ambos contienen la misma guía.
