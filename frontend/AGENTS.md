# EduRAG Frontend — AGENTS.md

Guía técnica para agentes de IA y desarrolladores que trabajen en `frontend/`. Leer antes de modificar cualquier archivo.

---

## Propósito del Módulo

SPA construida con **Next.js 16 (App Router)** + **Tailwind CSS**. Desplegada en **Vercel** (`https://edu-rag-red.vercel.app`).

Comprende tres áreas funcionales principales:
1. **Panel Docente (`/teacher`):** Creación y edición de chatbots, subida de materiales pedagógicos, configuración de claves BYOK y código de inserción para LMS.
2. **Catálogo Público (`/marketplace`):** Exploración y búsqueda de chatbots publicados para estudiantes.
3. **Interfaz de Chat (`/chat/[botId]`):** Experiencia de diálogo en tiempo real (streaming SSE) con citas documentales, embebible en Moodle o Canvas mediante `<iframe>`.

---

## Estructura del Proyecto

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout — tipografía editorial y providers globales
│   │   ├── globals.css             # Tokens CSS de elevación, cuadrícula y micro-interacciones (.btn-press)
│   │   ├── page.tsx                # Landing editorial con métricas en vivo (/platform/stats)
│   │   ├── login/page.tsx          # Autenticación de usuarios
│   │   ├── register/page.tsx       # Registro público de estudiantes
│   │   ├── teacher/
│   │   │   ├── page.tsx            # Dashboard del docente con métricas tabulares y lista de chatbots
│   │   │   ├── settings/page.tsx   # Configuración de perfil y API keys OpenRouter (BYOK)
│   │   │   └── chatbots/
│   │   │       ├── new/page.tsx    # Asistente de creación de nuevo chatbot
│   │   │       └── [id]/           # Editor y gestor de documentos (EditChatbotClient.tsx)
│   │   ├── marketplace/page.tsx    # Catálogo público con filtros y búsqueda
│   │   └── chat/[botId]/
│   │       ├── page.tsx            # Server component
│   │       └── ChatClient.tsx      # Cliente de chat con SSE, formato de citas y renderizado Markdown
│   ├── lib/
│   │   ├── api.ts                  # Cliente HTTP centralizado y tipado
│   │   ├── types.ts                # Modelos y contratos de TypeScript
│   │   ├── context.tsx             # AuthContext (almacenamiento en localStorage)
│   │   └── utils.ts                # Funciones auxiliares de formateo y validación
│   └── components/
│       ├── Navbar.tsx              # Navegación con isotipo vectorial y roles
│       ├── StatusBadge.tsx         # Badges de estado con contrastes accesibles
│       ├── EmptyState.tsx          # Estados vacíos con ilustraciones SVG vectoriales
│       ├── ConfirmModal.tsx        # Diálogo modal accesible con focus trap
│       ├── Toast.tsx               # Notificaciones de retroalimentación
│       ├── HelpTooltip.tsx         # Tooltips explicativos de parámetros pedagógicos
│       └── SupportWidget.tsx       # Widget flotante de soporte y canal institucional
├── test/                           # Suite de pruebas unitarias Vitest (82 tests)
├── vitest.config.ts                # Configuración de Vitest con runner multi-hilo
├── next.config.ts                  # Configuración de CSP y headers de iframe
└── package.json                    # Dependencias y scripts
```

---

## Sistema de Diseño y Artesanía UI (Anti-AI Craftsmanship)

El frontend sigue un estándar riguroso de artesanía de software humano (`senior-frontend-craftsmanship`), eliminando los clichés visuales de plantillas automáticas:

- **Elevación Natural de 3 Capas:** En lugar de resplandores o gradientes púrpuras, se utiliza `--shadow-card` (sombras sutiles con capas difusas) y bordes neutrales `border-gray-200`.
- **Micro-interacciones Físicas:** Retroalimentación háptica visual mediante `.btn-press:active { transform: scale(0.98); }` con tiempos de respuesta ágiles (150ms).
- **Tipografía Editorial y Numerales Estables:** Uso de `font-mono tabular-nums` en todas las métricas, tarjetas numéricas y marcas de tiempo para evitar vibraciones o saltos de layout durante la renderización.
- **Iconografía Vectorial Accesible:** Cero emojis decorativos en botones o encabezados. Todos los iconos son SVG semánticos con `aria-hidden="true"` y texto accesible para lectores de pantalla.
- **Radio de Esquinas Coherente:** `rounded-lg` para botones, inputs y controles interactivos; `rounded-xl` para tarjetas y contenedores principales.

---

## Cliente de API (`src/lib/api.ts`)

Toda comunicación HTTP con el backend FastAPI está centralizada en `api.ts`. Utiliza `NEXT_PUBLIC_API_URL` e inyecta el token Bearer desde `localStorage`.

```typescript
import { api } from '@/lib/api';

// Chatbots
const chatbots = await api.chatbots.list();
const chatbot  = await api.chatbots.create(payload);

// Chat Síncrono
const res = await api.chat.send(botId, { message: '...', conversation_id: '...' });

// Chat Streaming SSE
await api.chat.sendStream(botId, { message: '...' }, {
  onToken: (chunk) => { /* Actualización progresiva en UI */ },
  onDone:  (meta)  => { /* meta.conversation_id, meta.sources */ },
  onError: (err)   => { /* Manejo de contingencia */ },
});

// Documentos
const docs = await api.documents.list(chatbotId);
```

**Regla obligatoria:** Nunca invocar `fetch()` directamente dentro de los componentes. Centralizar los endpoints y contratos en `api.ts`.

---

## Gestión de Sesión (`src/lib/context.tsx`)

```typescript
const { auth, login, logout } = useApp();
```

- El token JWT y los datos de perfil residen en **`localStorage`**, permitiendo sincronización entre pestañas y sesiones embebidas en iframe.
- La expiración corta (24 horas) y la tabla de revocación backend (`revoked_tokens`) mitigan los riesgos asociados a almacenamiento local.

---

## Seguridad Frontend y Cabeceras HTTP

| Cabecera / Control | Implementación |
|---|---|
| **Content-Security-Policy** | `next.config.ts`: `connect-src` restringido a Railway, Supabase y orígenes autorizados. |
| **Iframe Embedding** | `frame-ancestors *` en `next.config.ts` para permitir la integración en plataformas LMS externas (Moodle, Canvas, Blackboard). |
| **Protección MIME** | `X-Content-Type-Options: nosniff`. |
| **Políticas de Referrer** | `Referrer-Policy: strict-origin-when-cross-origin`. |

---

## Testing y Calidad

La suite de frontend cuenta con **82 pruebas unitarias** ejecutadas con Vitest y JSDOM:

```bash
# Ejecución de pruebas unitarias
cd frontend
npm test

# Verificación estricta de compilación y tipos TypeScript
npm run build
```

| Archivo de Prueba | Cobertura |
|---|---|
| `test/api.test.ts` | 24 pruebas sobre el cliente HTTP, manejo de tokens, endpoints y streaming SSE. |
| `test/context.test.tsx` | 7 pruebas sobre autenticación, login, logout e invalidación de credenciales. |
| `test/ConfirmModal.test.tsx` | 8 pruebas sobre accesibilidad, focus trap, confirmación y cancelación. |
| `test/StatusBadge.test.tsx` | 5 pruebas sobre variantes de estado y clases visuales. |
| `test/Toast.test.tsx` | 5 pruebas sobre alertas temporales y renderizado condicional. |
| `test/EmptyState.test.tsx` | 4 pruebas sobre ilustraciones SVG y llamadas a la acción. |
| `test/Navbar.test.tsx` | 4 pruebas sobre enlaces de navegación y badges de rol. |
| `test/HelpTooltip.test.tsx` | 3 pruebas sobre accesibilidad de popovers. |
| `test/Spinner.test.tsx` | 3 pruebas sobre tamaños y animación de carga. |
| `test/AuthLayout.test.tsx` | 4 pruebas sobre estructura de layout de autenticación. |
| `test/useRequireRole.test.tsx` | 2 pruebas sobre protección de rutas por rol. |
| `test/utils.test.ts` | 13 pruebas sobre formateadores de fecha, tamaño de archivo y texto. |
