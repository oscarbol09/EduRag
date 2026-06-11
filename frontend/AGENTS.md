# EduRAG Frontend — AGENTS.md

Guía técnica para agentes de IA y desarrolladores que trabajen en `frontend/`. Leer antes de modificar cualquier archivo.

---

## Propósito del Módulo

SPA con **Next.js 16 (App Router)** + **Tailwind CSS** + **Radix UI**. Desplegada en **Vercel** (`edu-rag-red`). Tres superficies:

- **Dashboard del docente** — crear y gestionar chatbots, subir documentos.
- **Marketplace público** — estudiantes descubren chatbots publicados.
- **Interfaz de chat** (`/chat/[botId]`) — embebible vía `<iframe>` en Moodle u otros LMS.

---

## Estructura del Proyecto

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout — providers globales
│   │   ├── page.tsx                # Landing — stats en vivo desde GET /platform/stats
│   │   ├── login/page.tsx          # Login email + password
│   │   ├── teacher/
│   │   │   ├── page.tsx            # Dashboard del docente
│   │   │   └── chatbots/
│   │   │       ├── new/page.tsx    # Crear chatbot
│   │   │       └── [id]/           # Editar chatbot + gestión de documentos
│   │   │           └── EditChatbotClient.tsx  # Aviso PDFs escaneados, accept .md/.txt/.pdf/.docx
│   │   ├── marketplace/page.tsx    # Marketplace público
│   │   └── chat/[botId]/
│   │       ├── page.tsx            # Server component — carga datos del chatbot
│   │       └── ChatClient.tsx      # Client — interfaz de chat con streaming SSE
│   ├── lib/
│   │   ├── api.ts                  # Cliente HTTP centralizado
│   │   ├── types.ts                # Tipos TypeScript de dominio
│   │   ├── context.tsx             # AuthContext (localStorage)
│   │   └── utils.ts                # Helpers
│   └── components/
├── test/                           # Vitest
├── vercel.json                     # Framework nextjs + 5 security headers
├── next.config.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── .env.local                      # NO commitear
```

---

## Cliente API (`src/lib/api.ts`)

Todos los llamados al backend pasan por `api.ts`. Usa `NEXT_PUBLIC_API_URL` + token JWT de `localStorage`.

```typescript
import { api } from '@/lib/api';

// Chatbots
const chatbots = await api.chatbots.list();
const chatbot  = await api.chatbots.create(payload);

// Chat síncrono
const res = await api.chat.send(botId, { message: '...', conversation_id: '...' });

// Chat streaming SSE
await api.chat.sendStream(botId, { message: '...' }, {
  onToken: (chunk) => { /* acumular en UI */ },
  onDone:  (meta)  => { /* meta.conversation_id, meta.sources */ },
  onError: (err)   => { /* mostrar error */ },
});

// Documentos
const docs = await api.documents.list(chatbotId);
```

**Regla:** nunca usar `fetch` directo en componentes. Centralizar toda la lógica HTTP en `api.ts`.

**Timeouts:** `AbortController` — 30s para CRUD ligero, 120s para chat y upload.

---

## AuthContext (`src/lib/context.tsx`)

```typescript
const { user, token, login, logout, isLoading } = useAuth();
```

- Token persiste en **`localStorage`** (clave `token`) — compartido entre pestañas, mitigado por expiración JWT 24h + revocación backend.
- `user` expone: `{ id, email, role, firstName, lastName, institutionName, openrouterApiKey, openrouterModel }`.
- El estado `conversations` fue eliminado (era dead state — nunca se actualizaba).

---

## Seguridad Frontend

| Control | Implementación |
|---|---|---|
| Token en localStorage | Compartido entre pestañas — riesgo mitigado por JWT expira 24h + revocación backend (tabla `revoked_tokens`) |
| CSP | `next.config.ts`: `connect-src` incluye `*.supabase.co`, `openrouter.ai`, `edurag-production.up.railway.app` |
| X-Frame-Options | Reemplazado por CSP `frame-ancestors *` en next.config.ts (necesario para iframes en Moodle) |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | `camera=(), microphone=(), geolocation=()` |

> **Nota sobre iframes:** `frame-ancestors *` permite embeber el chatbot en cualquier LMS. Si se necesita restringir a dominios específicos en el futuro, se puede cambiar a `frame-ancestors moodle.miinstitucion.edu`.

---

## Tipos Principales (`src/lib/types.ts`)

```typescript
interface User {
  id: string;
  email: string;
  role: 'teacher' | 'student' | 'admin';
  firstName?: string;
  lastName?: string;
  institutionName?: string;
  openrouterApiKey?: string;
  openrouterModel?: string;
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
  system_prompt_override?: string;  // máx 2000 chars
  restriction_level: 'strict' | 'guided' | 'open';
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
  mime_type: string;  // text/markdown | text/plain | application/pdf | ...docx
  blob_url: string;
  status: 'indexed' | 'error';
  chunk_count: number;
  created_at: string;
  processed_at: string;
}
```

---

## Rutas y Páginas

| Ruta | Descripción | Auth |
|---|---|---|
| `/` | Landing — stats en vivo (`GET /platform/stats`) con fallback a "—" | No |
| `/login` | Login email + password | No |
| `/teacher` | Dashboard docente — lista de chatbots + `auth.user.firstName` | `role: teacher` |
| `/teacher/chatbots/new` | Crear chatbot | `role: teacher` |
| `/teacher/chatbots/[id]` | Editar chatbot + subir documentos | `role: teacher` |
| `/marketplace` | Lista pública de chatbots publicados | No |
| `/chat/[botId]` | Interfaz de chat embebible | No |

### `/chat/[botId]` — `ChatClient.tsx`

- `assistantMsgId` + `useRef` + `findIndex` — evita el race condition de React batching al actualizar el mensaje del asistente durante el stream.
- Indicador de carga dentro de la burbuja del asistente mientras `content === ""`.
- `renderMessageContent()` — procesa Markdown: code blocks, listas (`-`, `*`, `1.`), bold, italic, inline code.
- `maxLength={4000}` en el input — validación en frontend (el backend también valida en el modelo Pydantic).
- Fallback automático a `api.chat.send()` si el stream no entrega tokens.

### `EditChatbotClient.tsx` — Subida de documentos

- `accept=".md,.txt,.pdf,.docx"` — coincide con los tipos que el backend acepta.
- Aviso visible: `⚠️ Solo PDFs digitales — los PDFs escaneados no son compatibles`.
- PyMuPDF solo extrae texto de PDFs con capa de texto. PDFs escaneados (solo imagen) devuelven 400.

---

## Variables de Entorno

```env
# frontend/.env.local (NO commitear)
NEXT_PUBLIC_API_URL=https://edurag-production.up.railway.app

# Desarrollo local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Scripts

```bash
npm run dev       # http://localhost:3000
npm run build     # build producción (verifica TypeScript)
npm run start     # servidor producción local
npm run lint      # ESLint
npm run test      # Vitest
```

---

## Convenciones

- **Styling:** Tailwind CSS — no CSS modules ni styled-components.
- **Estado:** React Context para auth, `useState`/`useEffect` para estado local. Sin Redux ni Zustand.
- **TypeScript:** estricto. Sin `any` salvo casos documentados. Exportar tipos desde `types.ts`.
- **Fetch:** siempre vía `api.ts`. Manejar siempre `loading` y `error`.
- **Vercel:** deploy automático en cada push a `master`. URL: `https://edu-rag-red.vercel.app`.
