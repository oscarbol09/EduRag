# Auditoría de Frontend — EduRAG Platform (Versión Escritorio)

> **Fecha de auditoría:** 10 de junio de 2026  
> **Rama auditada:** versión de trabajo local — `C:\Users\dario\OneDrive\Escritorio\EduRAG-Platform\EduRAG-Platform`  
> **Archivos analizados:** 16 archivos fuente del directorio `frontend/src`  
> **Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS v4 · React 18

---

## Índice

1. [Resumen ejecutivo](#1-resumen-ejecutivo)
2. [Inventario de archivos auditados](#2-inventario-de-archivos-auditados)
3. [Fortalezas detectadas](#3-fortalezas-detectadas)
4. [Fallas y problemas encontrados](#4-fallas-y-problemas-encontrados)
   - 4.1 [Críticos — rompen la experiencia o la funcionalidad](#41-críticos)
   - 4.2 [Importantes — deuda técnica y regresiones latentes](#42-importantes)
   - 4.3 [Menores — calidad de código y consistencia](#43-menores)
5. [Recomendaciones de mejora](#5-recomendaciones-de-mejora)
6. [Tabla resumen de hallazgos](#6-tabla-resumen-de-hallazgos)

---

## 1. Resumen ejecutivo

EduRAG es una plataforma SaaS educativa multi-tenant construida sobre Next.js App Router con un sistema de diseño propio basado en tokens `brand-*` y `accent-*` sobre Tailwind v4. La versión del Escritorio representa una evolución clara sobre versiones anteriores: la capa de API está bien diseñada (timeouts diferenciados, AbortController, streaming SSE con doble fallback), el contexto de autenticación está limpio, y el flujo del docente —creación, edición, publicación de chatbots— está bien pensado.

Sin embargo, persisten fallas de consistencia visual entre módulos, el uso de diálogos nativos del navegador en acciones destructivas, y problemas de accesibilidad que deben resolverse antes de cualquier despliegue a producción.

**Scores por categoría:**

| Categoría | Puntuación |
|---|---|
| Consistencia visual y diseño | 7.5 / 10 |
| Calidad de código TypeScript | 7.5 / 10 |
| UX / Flujo de usuario | 8.5 / 10 |
| Manejo de errores | 5.0 / 10 |
| Accesibilidad | 4.0 / 10 |

---

## 2. Inventario de archivos auditados

```
frontend/src/
├── app/
│   ├── globals.css                          ✓ auditado
│   ├── layout.tsx                           ✓ auditado
│   ├── page.tsx                             ✓ auditado
│   ├── login/page.tsx                       ✓ auditado
│   ├── register/page.tsx                    ✓ auditado
│   ├── marketplace/page.tsx                 ✓ auditado
│   ├── admin/page.tsx                       ✓ auditado
│   ├── chat/[botId]/
│   │   ├── page.tsx                         ✓ auditado
│   │   └── ChatClient.tsx                   ✓ auditado
│   └── teacher/
│       ├── page.tsx                         ✓ auditado
│       ├── chatbots/new/page.tsx            ✓ auditado
│       └── chatbots/[id]/EditChatbotClient.tsx  ✓ auditado
├── components/
│   ├── AuthLayout.tsx                       ✓ auditado
│   ├── EmptyState.tsx                       ✓ auditado
│   ├── HelpTooltip.tsx                      ✓ auditado
│   ├── Navbar.tsx                           ✓ auditado
│   ├── Spinner.tsx                          ✓ auditado
│   ├── StatusBadge.tsx                      ✓ auditado
│   └── SupportWidget.tsx                    ✓ auditado
└── lib/
    ├── api.ts                               ✓ auditado
    ├── context.tsx                          ✓ auditado
    ├── types.ts                             ✓ auditado
    └── utils.ts                             ✓ auditado
```

---

## 3. Fortalezas detectadas

### 3.1 Capa de API bien diseñada (`lib/api.ts`)

El cliente HTTP central tiene dos timeouts diferenciados: `LIGHT_TIMEOUT_MS = 30s` para operaciones ligeras (auth, listados, CRUD) y `DEFAULT_TIMEOUT_MS = 120s` para operaciones pesadas (chat, upload de documentos). Cada llamada tiene su propio `AbortController` con limpieza en `finally`, lo que evita peticiones zombie. El mensaje de error en caso de timeout es legible para el usuario.

### 3.2 Streaming SSE robusto con doble fallback (`ChatClient.tsx`)

El cliente de chat implementa un parser SSE completo con manejo de eventos nombrados (`token`, `done`, `error`), un primer fallback al endpoint REST si el stream no entrega tokens, y un segundo fallback que muestra un mensaje de error controlado al usuario. El patrón `assistantMsgIdRef` para evitar el race condition de React batching en mensajes en streaming es una solución correcta y documentada.

### 3.3 Sistema de diseño coherente y distintivo

La paleta `brand-500/600/700` + `accent-500/600`, la tipografía Plus Jakarta Sans + DM Serif Display, el patrón `bg-dot-grid`, y el efecto `glow-card` crean una identidad visual reconocible y consistente en la mayoría de los módulos. Los tokens están definidos correctamente en `globals.css` con `@theme` de Tailwind v4.

### 3.4 Componentes reutilizables de calidad

- **`Navbar`**: variantes `public/teacher/admin`, slot `actions`, prop `backTo`/`backLabel` y `title` — patrón composable muy limpio.
- **`HelpTooltip`**: maneja `onMouseEnter/Leave` y `onFocus/Blur` correctamente para accesibilidad de teclado.
- **`StatusBadge`**: defaults extensibles con `labels` y `colors` override — diseñado para ser reutilizable.
- **`Spinner`**: componente centralizado que debería usarse consistentemente en toda la app.

### 3.5 Contexto de autenticación limpio (`lib/context.tsx`)

El estado de autenticación usa `sessionStorage` (token se borra al cerrar la pestaña, más seguro que `localStorage`). El dead state `conversations` fue eliminado con comentario explicativo. Los callbacks están memorizados con `useCallback`. El flujo de auto-carga del usuario desde el token es correcto.

### 3.6 Landing con estadísticas conectadas a la API (`app/page.tsx`)

La sección de estadísticas hace `fetch` real a `/platform/stats` y muestra `"—"` como fallback si el endpoint no responde. Esto es correcto y honesto — sin datos inventados hardcodeados.

### 3.7 Formulario de nuevo chatbot (`teacher/chatbots/new/page.tsx`)

Es el formulario más completo y consistente de toda la app. Usa tarjetas visuales para los selectores (nivel educativo, tono, restricción, proveedor LLM) con descripciones completas, `HelpTooltip` en todos los campos, y labels sin abreviaturas. Es el patrón que deberían seguir los demás formularios.

---

## 4. Fallas y problemas encontrados

### 4.1 Críticos

#### CRIT-01 · `app/page.tsx` es `"use client"` — elimina SSG y perjudica SEO

**Archivo:** `app/page.tsx`  
**Descripción:** La directiva `"use client"` fue añadida para poder usar `useEffect` en el fetch de estadísticas. Esto convierte toda la página de inicio en un Client Component, lo que impide el prerenderizado estático (SSG) de Next.js. La landing es la página más importante para SEO y debería ser un Server Component.  
**Impacto:** Sin SSG, los motores de búsqueda recibirán HTML vacío hasta que React hidrate en el cliente. El tiempo de First Contentful Paint aumenta. El bundle inicial se incrementa.  
**Solución:**
```tsx
// Extraer solo la sección de stats en un componente cliente pequeño:
// app/components/StatsSection.tsx → "use client"
// app/page.tsx → eliminar "use client", queda como Server Component
```

---

#### CRIT-02 · Diálogos nativos `alert()` y `confirm()` en acciones destructivas

**Archivos:** `EditChatbotClient.tsx`, `teacher/page.tsx`, `admin/page.tsx`, `teacher/chatbots/new/page.tsx`  
**Descripción:** Se encontraron 8 llamadas a `alert()` y 5 llamadas a `confirm()` distribuidas en los módulos del docente y administrador.

Listado completo:
- `EditChatbotClient.tsx`: `alert("Chatbot actualizado")`, `alert("Error al actualizar")`, `alert("Error al subir")`, `alert("Error al eliminar")`, `alert("Error al publicar")`, `confirm("¿Eliminar documento?")`, `confirm("¿Publicar?")`, `confirm("¿Despublicar?")`
- `teacher/page.tsx`: `confirm("¿Eliminar este chatbot?")`
- `teacher/chatbots/new/page.tsx`: `alert("Error al crear el chatbot")`
- `admin/page.tsx`: `confirm("¿Eliminar este docente?")`

**Impacto:** Los diálogos nativos bloquean el hilo principal de JavaScript. En Chrome v92+, `confirm()` y `alert()` son bloqueados silenciosamente cuando la app corre dentro de un iframe cross-origin (por ejemplo, embebida en Moodle). El docente realizaría acciones destructivas sin confirmación efectiva.  
**Solución:** Implementar un componente `<ConfirmModal>` React con estado local, y un sistema de toast/notificación para mensajes de éxito/error:
```tsx
// Estado mínimo para modal de confirmación:
const [confirmState, setConfirmState] = useState<{
  open: boolean;
  message: string;
  onConfirm: () => void;
} | null>(null);
```

---

#### CRIT-03 · Botones OAuth (Google/Microsoft) no funcionales sin indicación al usuario

**Archivos:** `login/page.tsx`, `register/page.tsx`  
**Descripción:** Los botones de "Iniciar sesión con Google" y "Continuar con Microsoft" son elementos `<button>` sin `onClick`, sin `disabled`, sin `type="button"`. Al hacer clic no ocurre absolutamente nada. No hay ningún indicador visual de que están pendientes de implementación.  
**Impacto:** Un usuario que intente autenticarse con Google o Microsoft verá un botón que no responde. Esto es especialmente dañino en la pantalla de login, la más visitada de la plataforma.  
**Solución inmediata (sin implementar OAuth):**
```tsx
<button
  type="button"
  disabled
  title="Próximamente disponible"
  className="... opacity-50 cursor-not-allowed"
>
  Google
</button>
```
**Solución completa:** Integrar con Supabase Auth, que ya está en el stack (`supabase/` en la raíz del proyecto).

---

#### CRIT-04 · `ChatClient.tsx` detecta rol de docente via `sessionStorage` — lógica incorrecta

**Archivo:** `chat/[botId]/ChatClient.tsx`  
**Descripción:**
```tsx
const isTeacherPreview =
  typeof window !== "undefined" && Boolean(sessionStorage.getItem("token"));
```
Esta lógica considera que cualquier usuario autenticado (con token en sessionStorage) es un docente. Un estudiante con cuenta propia también tiene token en sessionStorage y verá el botón "Publicar" en el chat.  
**Impacto:** Los estudiantes registrados podrán intentar publicar chatbots que no les pertenecen. Aunque el backend debería rechazarlo, la UI presenta una acción inapropiada.  
**Solución:**
```tsx
// ChatClient debe consumir el contexto de autenticación:
import { useApp } from "@/lib/context";
const { auth } = useApp();
const isTeacherPreview = auth.user?.role === "teacher";
```

---

### 4.2 Importantes

#### IMP-01 · `login/page.tsx` y `register/page.tsx` fuera del sistema de tokens

**Archivos:** `login/page.tsx`, `register/page.tsx`  
**Descripción:** Ambas páginas de autenticación usan clases de Tailwind genéricas en lugar de los tokens del sistema de diseño:
- Inputs: `focus:ring-blue-500 focus:border-blue-500` → debería ser `focus:ring-brand-500 focus:border-brand-500`
- Botón submit: `bg-blue-600 hover:bg-blue-700` → debería ser `bg-brand-600 hover:bg-brand-700`
- Links: `text-blue-600` → debería ser `text-brand-600`
- Borders: `border-gray-300` → debería ser `border-gray-200` (estándar en el resto de la app)

**Impacto:** Las páginas de login y registro visualmente "no pertenecen" a la misma aplicación. El azul genérico de Tailwind (`#2563eb`) difiere del `brand-600` (`#4f46e5`) del resto de la app.

---

#### IMP-02 · Panel de administración fuera del sistema de diseño (`admin/page.tsx`)

**Archivo:** `admin/page.tsx`  
**Descripción:** El formulario de creación/edición de docentes usa:
- `rounded-xl shadow` en lugar de `rounded-2xl border border-gray-100 shadow-sm`
- Spinner inline `animate-spin ... border-brand-600` en lugar del componente `<Spinner />` importado
- `rounded-xl` en la lista de docentes (correcto) pero inconsistente con el formulario del mismo archivo

**Impacto:** Inconsistencia visual interna dentro del mismo módulo.

---

#### IMP-03 · `SupportWidget.tsx` — número de WhatsApp placeholder en producción

**Archivo:** `components/SupportWidget.tsx`  
**Descripción:**
```tsx
const ADMIN_WHATSAPP = "573000000000"; // Cambiar al número real del administrador
```
El número `573000000000` es ficticio. Si el widget llega a producción sin cambiar este valor, todos los mensajes de soporte enviados por WhatsApp se perderán sin que el usuario lo sepa.  
**Impacto:** Pérdida silenciosa de todas las solicitudes de soporte por WhatsApp.  
**Solución:**
```bash
# Mover a variable de entorno:
NEXT_PUBLIC_SUPPORT_WHATSAPP=57XXXXXXXXXX
NEXT_PUBLIC_SUPPORT_EMAIL=soporte@edurag.com
```

---

#### IMP-04 · `SupportWidget.tsx` — "Mensaje Directo" es un `console.log` simulado

**Archivo:** `components/SupportWidget.tsx`  
**Descripción:** La pestaña "Mensaje Directo" del widget de soporte simula el envío con `await new Promise(resolve => setTimeout(resolve, 1000))` y hace `console.log` del mensaje. No hay ningún endpoint real. El usuario ve "Mensaje enviado con éxito" pero el mensaje no llega a ningún lado.  
**Impacto:** Comunicación falsa con el usuario. En un contexto educativo esto puede generar problemas serios de confianza.  
**Solución:** Implementar un endpoint `/support/message` en el backend, o eliminar la pestaña "Mensaje Directo" hasta que exista el backend correspondiente.

---

#### IMP-05 · `EmptyState.tsx` y `AuthLayout.tsx` usan `<a>` nativo en lugar de `<Link>`

**Archivos:** `components/EmptyState.tsx`, `components/AuthLayout.tsx`  
**Descripción:** Ambos componentes usan `<a href="...">` para navegación interna, causando un hard refresh completo del navegador en lugar de navegación client-side de Next.js.

```tsx
// EmptyState.tsx — línea del CTA:
<a href={action.href}>  // ❌ hard refresh

// AuthLayout.tsx — logo y "Volver al inicio":
<a href="/">  // ❌ hard refresh (aparece dos veces)
```

**Impacto:** El estado del contexto React (auth, chatbots cargados) se reinicia en cada navegación. El usuario experimenta un flash de pantalla blanca innecesario.

---

#### IMP-06 · Inconsistencia en el nombre del parámetro de ruta del chat

**Descripción:** La carpeta del chat se llama `[botId]` pero todos los demás módulos con parámetros usan `[id]` (e.g., `teacher/chatbots/[id]`). Los links al chat usan `chatbot.id` sin referencia explícita al nombre del param.  
**Impacto:** No afecta el funcionamiento pero genera confusión de convención en un proyecto multi-desarrollador.  
**Solución:** Normalizar a `[id]` en todos los segmentos dinámicos, o documentar la excepción en `AGENTS.md`.

---

#### IMP-07 · Lógica de parsing de `institution` duplicada en `admin/page.tsx`

**Archivo:** `admin/page.tsx`  
**Descripción:** El split `institution.includes(" | ")` para extraer nombre e institución aparece en 3 lugares del mismo archivo: `handleEditClick`, y dos veces en el bloque de render de la lista de docentes.  
**Impacto:** Si el formato del campo `institution` cambia en el backend, hay que actualizar 3 lugares con riesgo de inconsistencias.  
**Solución:**
```ts
// lib/utils.ts
export function parseTeacherInstitution(teacher: User): {
  fullName: string;
  institution: string;
} { ... }
```

---

#### IMP-08 · `marketplace/page.tsx` usa el hack `institution.split(" | ")` para el saludo

**Archivo:** `marketplace/page.tsx`  
**Descripción:**
```tsx
auth.user.firstName || (auth.user.institution && auth.user.institution.includes(" | ") 
  ? auth.user.institution.split(" | ")[0] 
  : auth.user.email)
```
Este hack de parseo del campo `institution` para extraer el nombre de usuario debería estar resuelto con `auth.user.firstName` directamente (como se hace correctamente en `teacher/page.tsx`). La condición compleja aquí es código legacy que no fue limpiado.

---

### 4.3 Menores

#### MEN-01 · Animaciones sin `prefers-reduced-motion`

**Archivos:** `globals.css`, `app/page.tsx`, `ChatClient.tsx`, `SupportWidget.tsx`  
**Descripción:** Ninguna de las animaciones de la app respeta la preferencia de sistema `prefers-reduced-motion`. Las afectadas son:
- Blobs del hero (`animate-pulse` con duración de 8s y 12s)
- Badge "Plataforma Activa" (ping animado)
- Typing indicator en el chat (tres puntos con `animate-bounce`)
- Ping del botón flotante del SupportWidget

**Impacto:** Para usuarios con epilepsia fotosensible, vértigo o migraña, estas animaciones pueden ser problemáticas.  
**Solución en `globals.css`:**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

---

#### MEN-02 · Toggles de selección sin atributos ARIA en `EditChatbotClient.tsx`

**Archivo:** `EditChatbotClient.tsx`  
**Descripción:** Los grupos de botones para nivel educativo, tono, restricción y proveedor LLM son elementos `<button>` que actúan como radio buttons pero sin roles ARIA semánticos.  
**Solución:**
```tsx
// En el wrapper del grupo:
<div role="radiogroup" aria-label="Nivel educativo">
// En cada botón:
<button role="radio" aria-checked={formData.education_level === "secondary"}>
```

---

#### MEN-03 · `EditChatbotClient.tsx` usa `as any` en mutaciones de datos

**Archivo:** `EditChatbotClient.tsx`  
**Descripción:**
```tsx
api.chatbots.update(chatbotId, formData as Partial<Chatbot>)  // ❌
api.chatbots.update(chatbotId, { is_published: false } as Partial<Chatbot>)  // ❌
```
Los casts `as any`/`as Partial<Chatbot>` deshabilitan la verificación de tipos de TypeScript en la capa más crítica (mutación de datos hacia el backend).  
**Solución:**
```ts
// lib/types.ts — agregar:
export type UpdateChatbotPayload = Partial<Omit<Chatbot, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>;
// lib/api.ts — usar el tipo explícito en la firma de update()
```

---

#### MEN-04 · Spinner inconsistente: inline vs componente `<Spinner />`

**Archivos:** `admin/page.tsx`, `EditChatbotClient.tsx`  
**Descripción:** Existen spinners de carga inline (`<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600">`) duplicados en múltiples archivos, mientras existe el componente `<Spinner />` que debería usarse de forma centralizada. En `EditChatbotClient.tsx` el spinner de carga del chatbot usa `border-blue-600` en lugar de `border-brand-600`.

---

#### MEN-05 · `EmptyState.tsx` tiene texto inconsistente con `documents.length === 0`

**Archivo:** `EditChatbotClient.tsx` (sección de documentos)  
**Descripción:** El estado vacío de documentos dice "Sube documentos MD o TXT para entrenar tu chatbot" pero el `<input type="file" accept=".md,.txt,.pdf,.docx">` acepta también PDF y DOCX. El texto no está actualizado con los formatos reales soportados.

---

#### MEN-06 · `SupportWidget.tsx` usa tokens `blue-*` y `indigo-*` fuera del sistema de diseño

**Archivo:** `components/SupportWidget.tsx`  
**Descripción:** El widget de soporte usa `from-blue-600 to-indigo-600`, `border-blue-600`, `bg-emerald-600`, `bg-blue-600`, `bg-indigo-600` — todos colores hardcodeados de Tailwind sin relación con los tokens `brand-*` del sistema de diseño. Es el componente más desconectado visualmente del resto de la app.

---

## 5. Recomendaciones de mejora

### R-01 · Prioridad inmediata (antes del próximo despliegue)

**1. Extraer `<StatsSection>` como Client Component separado** para recuperar SSG en la landing.

```
app/
├── page.tsx              ← Server Component (sin "use client")
└── _components/
    └── StatsSection.tsx  ← "use client" con el useEffect de fetch
```

**2. Desactivar botones OAuth con estado visual claro:**
```tsx
<button disabled title="Próximamente disponible" className="... opacity-50 cursor-not-allowed">
  Google
</button>
```

**3. Reemplazar `login/page.tsx` y `register/page.tsx` con tokens `brand-*`:**
Búsqueda y reemplazo en ambos archivos:
- `blue-500` → `brand-500`
- `blue-600` → `brand-600`  
- `blue-700` → `brand-700`
- `border-gray-300` → `border-gray-200`

**4. Configurar `NEXT_PUBLIC_SUPPORT_WHATSAPP` como variable de entorno** y validar en CI que no existan valores placeholder.

---

### R-02 · Corto plazo (sprint siguiente)

**5. Implementar `<ConfirmModal>` reutilizable** para reemplazar todos los `confirm()` nativos:

```tsx
// components/ConfirmModal.tsx
interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "warning";
}
```

**6. Implementar sistema de toast** para reemplazar todos los `alert()`:
```tsx
// hook simple sin dependencias externas:
// hooks/useToast.ts → estado en contexto o Zustand
// components/ToastContainer.tsx → fixed en layout.tsx
```

**7. Corregir `ChatClient.tsx` para verificar rol via contexto:**
```tsx
const { auth } = useApp();
const isTeacherPreview = auth.user?.role === "teacher";
```

**8. Unificar todos los componentes con `<Link>` de Next.js** en `EmptyState.tsx` y `AuthLayout.tsx`.

**9. Agregar `prefers-reduced-motion`** en `globals.css`.

---

### R-03 · Medio plazo (calidad de código)

**10. Crear `parseTeacherInstitution()` en `lib/utils.ts`** y usarla en `admin/page.tsx` y `marketplace/page.tsx`.

**11. Definir `UpdateChatbotPayload`** en `lib/types.ts` para eliminar los casts `as Partial<Chatbot>`.

**12. Agregar atributos ARIA a los grupos de toggles** en `EditChatbotClient.tsx` (`role="radiogroup"`, `role="radio"`, `aria-checked`).

**13. Estandarizar el uso de `<Spinner />`** en todos los estados de carga — eliminar spinners inline.

**14. Normalizar la convención de nombres de parámetros de ruta** (`[id]` en todos los segmentos dinámicos) y documentar en `AGENTS.md`.

**15. Implementar endpoint real `/support/message`** o eliminar la pestaña "Mensaje Directo" del `SupportWidget` hasta que exista.

---

### R-04 · Arquitectura — refactor de auth guard

Los tres paneles (`teacher/page.tsx`, `admin/page.tsx`, y el futuro settings) repiten el mismo bloque de guardado de autenticación:

```tsx
useEffect(() => {
  if (!auth.isLoading) {
    if (!auth.token) { router.push("/login"); }
    else if (auth.user) {
      if (auth.user.role !== "teacher") { /* redirigir */ }
      else { loadData(); }
    }
  }
}, [auth.user, auth.token, auth.isLoading]);
```

**Recomendación:** Crear un hook `useRequireRole(role: UserRole)` que encapsule esta lógica y retorne `{ isAuthorized, isChecking }`. Un cambio en la lógica de auth se propaga automáticamente a todos los módulos protegidos.

```tsx
// hooks/useRequireRole.ts
export function useRequireRole(role: "teacher" | "admin") {
  const { auth } = useApp();
  const router = useRouter();
  
  useEffect(() => {
    if (!auth.isLoading && !auth.token) router.push("/login");
    if (!auth.isLoading && auth.user && auth.user.role !== role) {
      router.push(auth.user.role === "admin" ? "/admin" : "/teacher");
    }
  }, [auth.user, auth.token, auth.isLoading]);
  
  return {
    isAuthorized: !auth.isLoading && auth.user?.role === role,
    isChecking: auth.isLoading || (!!auth.token && !auth.user),
  };
}
```

---

## 6. Tabla resumen de hallazgos

| ID | Severidad | Archivo(s) | Descripción breve | Estado sugerido |
|---|---|---|---|---|
| CRIT-01 | 🔴 Crítico | `app/page.tsx` | `"use client"` en la landing elimina SSG | Refactorizar |
| CRIT-02 | 🔴 Crítico | `EditChatbotClient`, `teacher/page`, `admin/page`, `chatbots/new` | 8× `alert()` + 5× `confirm()` nativos | Reemplazar con modal/toast |
| CRIT-03 | 🔴 Crítico | `login/page`, `register/page` | Botones OAuth no funcionales sin aviso | Desactivar o implementar |
| CRIT-04 | 🔴 Crítico | `chat/[botId]/ChatClient` | Detección de rol docente via `sessionStorage` incorrecta | Usar contexto de auth |
| IMP-01 | 🟡 Importante | `login/page`, `register/page` | Tokens `blue-*` en lugar de `brand-*` | Buscar y reemplazar |
| IMP-02 | 🟡 Importante | `admin/page` | Panel fuera del sistema de diseño | Unificar tokens |
| IMP-03 | 🟡 Importante | `SupportWidget` | Número WhatsApp ficticio hardcodeado | Mover a `.env` |
| IMP-04 | 🟡 Importante | `SupportWidget` | "Mensaje Directo" es un `console.log` simulado | Implementar o eliminar |
| IMP-05 | 🟡 Importante | `EmptyState`, `AuthLayout` | `<a>` nativo en lugar de `<Link>` de Next.js | Sustituir |
| IMP-06 | 🟡 Importante | `chat/[botId]/` | Convención de nombre de param inconsistente | Normalizar |
| IMP-07 | 🟡 Importante | `admin/page` | Parsing de `institution` duplicado 3 veces | Extraer a `utils.ts` |
| IMP-08 | 🟡 Importante | `marketplace/page` | Hack de `institution.split` no limpiado | Usar `firstName` directamente |
| MEN-01 | 🔵 Menor | `globals.css`, múltiples | Animaciones sin `prefers-reduced-motion` | Agregar media query |
| MEN-02 | 🔵 Menor | `EditChatbotClient` | Toggles sin roles ARIA (`radiogroup`/`radio`) | Agregar atributos |
| MEN-03 | 🔵 Menor | `EditChatbotClient` | Casts `as Partial<Chatbot>` en mutaciones | Definir tipo explícito |
| MEN-04 | 🔵 Menor | `admin/page`, `EditChatbotClient` | Spinners inline duplicados, ignorando `<Spinner />` | Centralizar |
| MEN-05 | 🔵 Menor | `EditChatbotClient` (docs) | Texto del empty state desactualizado (solo menciona MD/TXT) | Actualizar copy |
| MEN-06 | 🔵 Menor | `SupportWidget` | Colores `blue-*`/`indigo-*` fuera del sistema de diseño | Migrar a tokens |

---

*Auditoría generada por análisis estático de código fuente. No incluye análisis de comportamiento en runtime ni pruebas de integración con el backend.*
