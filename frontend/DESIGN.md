# EduRAG — Contrato de Sistema de Diseño (Kokonut UI / Clean SaaS)

Guía de tokens, componentes y patrones visuales inspirados en **Kokonut UI**, **Linear**, **Vercel** y **shadcn/ui**.

---

## 1. Principios de Diseño
1. **Tipografía Sans-Serif Limpia**: Usar `Plus Jakarta Sans` o `Inter` en toda la interfaz con `tracking-tight` en títulos. Cero serifas arcaicas forzadas.
2. **Paleta Neutra & Alto Contraste**: Base en `zinc-950` (`#09090b`), superficies en `zinc-900/60` y bordes sutiles en `zinc-800` (`border-zinc-800`). Cero neón ni gradientes estridentes.
3. **Botones y Controles Táctiles**: Botones primarios sólidos (`bg-zinc-100 text-zinc-900 hover:bg-white`) y secundarios con bordes sutiles (`bg-zinc-900 text-zinc-100 border border-zinc-800 hover:bg-zinc-800`).
4. **Tarjetas Limpias (`.card-clean`)**: Bordes neutrales sutiles, esquinas `rounded-2xl` y transiciones suaves al hover.
5. **Cero Etiquetas Artificiales**: Sin separadores de estilo hacker (`// ...`) ni frases de marketing robóticas. Redacción directa, concisa y humana.

---

## 2. Tokens de Color

| Token | Hex | Uso |
|---|---|---|
| `zinc-950` | `#09090b` | Fondo base de la aplicación |
| `zinc-900` | `#18181b` | Superficies de tarjetas y modales |
| `zinc-800` | `#27272a` | Bordes sutiles y separadores |
| `zinc-700` | `#3f3f46` | Bordes activos y hover |
| `zinc-400` | `#a1a1aa` | Texto secundario y leyendas |
| `zinc-100` | `#f4f4f5` | Texto principal y botones primarios |
| `emerald-500` | `#10b981` | Estados publicados / activos |
| `amber-500` | `#f59e0b` | Estados en cola / pendientes |
| `rose-500` | `#f43f5e` | Estados de error / peligro |

---

## 3. Componentes Base
- **Pill Badges**: `bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-0.5 text-xs rounded-full`
- **Inputs**: `bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-xl px-3.5 py-2.5 focus:border-zinc-600`
- **Modales & Drawers**: `bg-zinc-950 border border-zinc-800 rounded-2xl`
