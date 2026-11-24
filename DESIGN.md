# DESIGN.md — LoreForge Studio

## 1. Visual Theme & Atmosphere
- **Personalidad del producto:** Estudio narrativo y de worldbuilding offline-first, limpio, legible y táctil, adaptado tanto para uso intensivo en escritorio como para **lectura y edición cómoda en móviles por personas de todas las edades (+60 años)**.
- **Densidad y ritmo:** Unidad base de `4px` (`--space-1: 4px`, `--space-2: 8px`, `--space-4: 16px`, `--space-6: 24px`). Agrupación por proximidad y tarjetas limpias antes que exceso de líneas divisorias.
- **Modo Lectura Fácil (+60 / Accesibilidad Táctil):** Interruptor persistente (`data-a11y="senior"`) que amplía la tipografía base (`17px–18px`), refuerza el contraste de bordes y texto secundario, y garantiza botones y objetivos táctiles de `>= 48px` sin gestos ocultos.

## 2. Color Palette & Surface Tokens (WCAG AA Verificado)
- **Temas de aplicación (`[data-theme]`):**
  - `pergamino` (Cálido editorial / papel clásico)
  - `grimorio` (Obsidiana oscura / fantasía)
  - `dossier` (Archivo limpio de alto contraste)
  - `cyberpunk` (OLED oscuro táctico)
- **Temas del Grafo de Relaciones (`[data-graph-theme]` inspirado en *Dramatis Personae*):**
  - `limpio`: Fondo neutro de alto contraste, tarjetas nítidas y etiquetas claras.
  - `fantasia`: Pergamino/tinta cálida con marcos ornamentales sutiles.
  - `detective`: Tablero de corcho/pizarra con pines y líneas de evidencia de alta visibilidad.
- **Jerarquía de superficies y texto:**
  - `--surface-base`, `--surface-sunken`, `--surface-elevated` con bordes `1px` (`--border-subtle`, `--border-strong`).
  - Texto primario `>= 7:1` y secundario `>= 4.5:1` (en `data-a11y="senior"`, `--text-muted` se eleva para cumplir `>= 4.5:1`).
- **Estados semánticos:** `--status-success`, `--status-warning`, `--status-danger` y foco visible `--focus-ring`.

## 3. Typography Scale
- **Font Families:** `--font-sans` del sistema para máxima legibilidad nativa; `--font-mono` con `font-variant-numeric: tabular-nums` para métricas, contadores, fechas y tablas.
- **Reglas móviles (+60 / iOS & Android):**
  - Inputs, `<select>` y `<textarea>` con `font-size >= 16px` en móvil (evita el zoom forzado de iOS y mejora lectura).
  - Ancho de lectura máximo `65ch` en bloques de texto largo.
  - Sin texto informativo crítico por debajo de `14px` en móvil (`16px` en Modo Lectura Fácil).

## 4. Spacing, Radius, Finish & Accessibility
- **Border Radius System:** `R_outer = R_inner + padding` (`6px` controles, `10px–12px` tarjetas y modales).
- **Touch Targets & Zero Hover Traps:**
  - Mínimo `44x44px` en controles táctiles estándar y `48x48px` en barra inferior móvil y Modo Lectura Fácil.
  - Ninguna acción crítica depende de `:hover` o `dblclick`; todo tiene botón o toque simple explícito.
- **Navegación Móvil (`<= 768px`):**
  - Barra inferior fija (`bottom-nav`) con **5 destinos claros** en zona del pulgar: **Inicio**, **Personajes**, **Relaciones**, **Mundo** y **Menú** (que abre el cajón lateral completo).
  - Botón de **Lectura Fácil (A+)** siempre accesible en la barra superior.
- **Grafo de Relaciones Dual (Móvil + Desktop):**
  - En móvil, vista dual con pestañas grandes: **Lista Clara** (por defecto, buscable y con botón grande para crear vínculo) y **Lienzo Visual** (arrastre táctil con `PointerEvent`, botones grandes `+`, `-`, `Centrar`, `Unir`, y selector de tema).
- **Keyboard & Motion:**
  - Anillo `:focus-visible` de `2px` de alto contraste en todo elemento interactivo.
  - Soporte `prefers-reduced-motion: reduce`.
