# EduRAG Design System Specification — Cyber-Academic Neo-Bento & Precision Liquid Glass

Especificación técnica de tokens de diseño, superficies, tipografía y física de interacción para la plataforma EduRAG.

---

## 1. Arquetipo Visual & Atmósfera de Marca
- **Arquetipo:** Cyber-Academic Neo-Bento & Precision Liquid Glass.
- **Voz y Tono:** Rigor académico universitario, alta densidad de información, estética de terminal de investigación y cero clichés de plantillas de IA genéricas.
- **Lienzo Base:** Obsidian Dark (`#07080c` y `#0d0f17`) con cuadrícula blueprint milimétrica técnica y difusores orgánicos de luz ambiental en cian (`#06b6d4`), índigo académico (`#4338ca`) y ámbar (`#f59e0b`).

---

## 2. Tokens de Color y Superficies

```css
:root {
  /* Lienzo y Fondo */
  --bg-canvas: #07080c;
  --bg-surface-glass: rgba(13, 15, 23, 0.72);
  --bg-surface-card: rgba(18, 21, 32, 0.65);
  --bg-surface-interactive: rgba(255, 255, 255, 0.05);

  /* Bordes y Resplandores Especulares */
  --border-glass: rgba(255, 255, 255, 0.09);
  --border-glass-hover: rgba(255, 255, 255, 0.22);
  --border-specular: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.18), transparent);

  /* Acentos Semánticos */
  --accent-cyan: #06b6d4;
  --accent-cyan-glow: rgba(6, 182, 212, 0.15);
  --accent-brand: #6366f1;
  --accent-brand-light: #818cf8;
  --accent-amber: #f59e0b;
  --accent-emerald: #10b981;
  --accent-rose: #f43f5e;

  /* Texto y Contrastes */
  --text-primary: #f8fafc;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
}
```

---

## 3. Jerarquía Tipográfica

| Rol | Familia | Pesos | Uso |
|---|---|---|---|
| **Editorial & Display** | `DM Serif Display` (`--font-display`) | 400 | Titulares principales, hero, nombres de módulos institucionales. |
| **Cuerpo & Controles** | `Plus Jakarta Sans` (`--font-sans`) | 400, 500, 600, 700 | Lectura, botones, etiquetas de formularios, descripciones. |
| **Datos & Terminal** | `JetBrains Mono / Geist Mono` (`font-mono`) | 500, 700 | Numerales tabulares (`tabular-nums`), badges de chunks, seriales de archivo y LaTeX. |

---

## 4. Geometría y Elevación

- **Radios de Esquina:**
  - Controles e inputs: `rounded-lg` (8px)
  - Tarjetas Bento y Paneles: `rounded-xl` (12px) a `rounded-2xl` (16px)
  - Badges y Chips: `rounded-full` o `rounded-md` (6px)
- **Física de Micro-interacción:**
  - `.btn-press:active`: `transform: scale(0.97)` con transición de 150ms `cubic-bezier(0.16, 1, 0.3, 1)`.
  - Hover en tarjetas Bento: Elevación de 2px (`translate-y-[-2px]`), realce de borde especular y foco de luz ambiental.

---

## 5. Criterios de Accesibilidad y Control de Calidad
- [x] Contraste mínimo WCAG 2.2 AA (≥ 4.5:1 en texto regular, ≥ 3:1 en encabezados).
- [x] Numerales tabulares obligatorios (`font-variant-numeric: tabular-nums`) para prevenir saltos de layout.
- [x] Región ARIA `aria-live="polite"` en respuestas de chat streaming.
- [x] Soporte de `prefers-reduced-motion` para usuarios con sensibilidades vestibulares.
