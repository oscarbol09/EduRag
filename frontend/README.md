# EduRAG Frontend

Interfaz web de usuario para la plataforma SaaS educativa EduRAG. Construida con **Next.js 16 (App Router)**, **TypeScript** y **Tailwind CSS**, y desplegada en **Vercel**.

Permite a los docentes crear y configurar agentes conversacionales basados en sus documentos de cátedra, y a los estudiantes interactuar con ellos desde el catálogo público o embebidos en Entornos Virtuales de Aprendizaje (Moodle, Canvas).

---

## Tabla de Contenidos

- [Requisitos](#requisitos)
- [Instalación y Desarrollo Local](#instalación-y-desarrollo-local)
- [Variables de Entorno](#variables-de-entorno)
- [Scripts Disponibles](#scripts-disponibles)
- [Estructura de Rutas](#estructura-de-rutas)
- [Principios de Diseño e Interfaz](#principios-de-diseño-e-interfaz)
- [Testing y Verificación](#testing-y-verificación)
- [Despliegue](#despliegue)
- [Guía para Agentes de IA](#guía-para-agentes-de-ia)

---

## Requisitos

- Node.js 20+ (recomendado LTS)
- npm 10+

---

## Instalación y Desarrollo Local

```bash
# 1. Clonar el repositorio y entrar al directorio frontend
cd frontend

# 2. Instalar dependencias fijadas
npm install

# 3. Configurar variables de entorno locales
cp .env.local.example .env.local
# Configurar NEXT_PUBLIC_API_URL=http://localhost:8000 en .env.local

# 4. Iniciar el servidor de desarrollo
npm run dev
```

El servidor estará accesible en [http://localhost:3000](http://localhost:3000).

---

## Variables de Entorno

| Variable | Obligatoria | Descripción | Ejemplo |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Sí | URL base del backend FastAPI | `http://localhost:8000` (local) / `https://edurag-production.up.railway.app` (producción) |
| `NEXT_PUBLIC_SUPPORT_WHATSAPP` | No | Número de contacto de soporte para el widget | `+573001234567` |

---

## Scripts Disponibles

```bash
npm run dev      # Inicia el servidor de desarrollo con Turbopack y Fast Refresh
npm run build    # Compilación de producción estricta y chequeo de tipos TypeScript
npm run start    # Inicia el servidor de producción localmente (requiere build previo)
npm run lint     # Análisis estático de código con ESLint
npm test         # Ejecuta la suite de pruebas unitarias con Vitest (82 pruebas)
```

---

## Estructura de Rutas

| Ruta | Acceso | Propósito |
|---|---|---|
| `/` | Público | Landing page editorial con métricas de plataforma en tiempo real. |
| `/login` | Público | Autenticación de docentes, estudiantes y administradores. |
| `/register` | Público | Auto-registro de estudiantes (rol `student` forzado). |
| `/marketplace` | Público | Catálogo interactivo de chatbots publicados con filtros por nivel educativo. |
| `/chat/[botId]` | Público / Embebible | Interfaz de chat en streaming SSE optimizada para iframes en LMS. |
| `/teacher` | `role: teacher` | Panel de control docente: métricas de uso, listado y estado de chatbots. |
| `/teacher/chatbots/new` | `role: teacher` | Asistente de configuración pedagógica para nuevos chatbots. |
| `/teacher/chatbots/[id]` | `role: teacher` | Editor de chatbot, carga y gestión de documentos y código embed. |
| `/teacher/settings` | `role: teacher` | Configuración de clave OpenRouter (BYOK), modelo preferido y perfil. |
| `/admin` | `role: admin` | Gestión administrativa y alta/baja de docentes. |

---

## Principios de Diseño e Interfaz

El frontend implementa estándares rigurosos de ingeniería de interfaz humana:

- **Sin Clichés Visuales de IA:** Eliminación total de resplandores púrpuras, fondos de gradientes artificiales y emojis decorativos sueltos.
- **Tipografía Editorial:** Tipografía estructurada con soporte `font-mono tabular-nums` para métricas numéricas libres de fluctuaciones de layout.
- **Micro-interacciones Físicas:** Retroalimentación táctil ágil mediante `.btn-press:active { transform: scale(0.98); }` a 150ms.
- **Iconos Vectoriales Semánticos:** Iconos SVG limpios y accesibles con atributos para lectores de pantalla.
- **Accesibilidad y Compatibilidad Iframe:** Cabeceras CSP configuradas con `frame-ancestors *` para incrustación directa en plataformas Moodle o Canvas.

---

## Testing y Verificación

La suite de pruebas unitarias (`frontend/test/`) cuenta con **82 pruebas** ejecutadas sobre Vitest y JSDOM:

```bash
# Ejecutar suite de pruebas
npm test

# Ejecutar verificación de build
npm run build
```

---

## Despliegue

El frontend se despliega automáticamente en **Vercel** mediante integración continua en cada push a la rama `master`.

- **URL de Producción:** `https://edu-rag-red.vercel.app`
- **Cabeceras de Seguridad:** Gestionadas en `next.config.ts` (CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).

---

## Guía para Agentes de IA

Para consultar las normas de desarrollo, el manejo del cliente HTTP centralizado (`api.ts`), la estructura de autenticación (`context.tsx`) y las convenciones de componentes, ver [AGENTS.md](./AGENTS.md).
