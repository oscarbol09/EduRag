# EduRAG Frontend

SPA del proyecto EduRAG — plataforma SaaS educativa con chatbots RAG. Construida con **Next.js 16 (App Router)** y desplegada en **Vercel**.

---

## Requisitos

- Node.js 18+
- npm 9+

---

## Instalación y Desarrollo Local

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local → NEXT_PUBLIC_API_URL=http://localhost:8000

# 3. Iniciar servidor de desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000) en el navegador.

---

## Variables de Entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL base del backend FastAPI | `https://edurag-production.up.railway.app` |

Para desarrollo local contra backend en localhost:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Scripts

```bash
npm run dev      # Servidor de desarrollo con hot-reload
npm run build    # Build de producción — verifica TypeScript y genera estáticos
npm run start    # Servidor de producción local (requiere build previo)
npm run lint     # ESLint
npm run test     # Tests con Vitest
```

---

## Estructura de Rutas

| Ruta | Descripción |
|---|---|
| `/` | Landing page |
| `/login` | Login de usuarios |
| `/teacher` | Dashboard del docente |
| `/teacher/chatbots/new` | Formulario de creación de chatbot |
| `/marketplace` | Marketplace público de chatbots |
| `/chat/[botId]` | Interfaz de chat (embebible en Moodle via `<iframe>`) |

---

## Stack Técnico

- **Next.js 16** — App Router, SSR para marketplace (SEO), estático para chat embebible.
- **Tailwind CSS** — utility-first styling.
- **Radix UI** — componentes accesibles (Dialog, Select, Tabs, etc.).
- **TypeScript** — tipado estricto en toda la base de código.
- **Vitest** — tests unitarios.

---

## Despliegue

Despliegue automático vía integración Git en Vercel en cada push a la rama `master`.

**URL de producción:** `https://edu-rag-red.vercel.app`

**Servicio:** Next.js App en Vercel (`edu-rag`) — Free Tier.

---

## Guía para Agentes de IA

Ver [AGENTS.md](./AGENTS.md) para la guía técnica completa: estructura de archivos, uso del cliente API, AuthContext, convenciones de código y notas de implementación.
