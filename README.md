# LoreForge Studio

**Offline-first modular worldbuilding, character master, and narrative studio.**  
Open Source MIT · TypeScript + Vite · Local-First JSON (`File System Access API` + `IndexedDB` + `localStorage`)

---

## English

LoreForge Studio is an offline-first workspace for novelists, narrative designers, and tabletop/roleplay game masters. It combines structured Worldbuilding 101 bibles, deep character sheets (psychology, active paradoxes, theory of mind), a 15-category archive tree, interactive relation graphs, multi-track timelines, nested interactive maps, automated contradiction detection, and VTT/roleplay/EPUB exporters in a single self-contained web/PWA/Android app.

### Quick Start

```bash
npm install
npm run dev
```

Available scripts:

- `npm run dev` — Start local Vite dev server
- `npm run build` — Typecheck (`tsc --noEmit`) and build production bundle (`dist/`)
- `npm run typecheck` — Strict TypeScript check
- `npm run validate:schemas` — Validate Draft 2020-12 JSON schemas, defaults, demo seed, and local archives via Ajv
- `npm run test:e2e` — Run Playwright end-to-end suite

### Compatibility Formats

LoreForge Studio preserves full import/export compatibility with:

- `.worldbuilder.json` (`schema_version: "2.0.0"` project state envelope & legacy `worldbuilder-studio.html` exports)
- `.pj-master.json` (`schema_version: "1.0.0"` character master files)
- `.nexus_v3.json` (`chara_card_v3_nexus_extended` / `chara_card_v3`)
- `.lorebook.json` (SillyTavern World Info)
- Foundry VTT bundles (`Actor`, `JournalEntry`, `Scene`), Markdown manuscripts, Print HTML (`@media print`), and EPUB 3

### Comparison: LoreForge Studio vs. Fantasia Archive vs. Obsidian

| Capability | LoreForge Studio | Fantasia Archive | Obsidian |
|---|---|---|---|
| **Storage & Privacy** | Local JSON via File System Access API, IndexedDB & `localStorage` (100% offline, MIT) | Local database / desktop app | Local Markdown vault (core closed-source) |
| **15-Category World Tree & Relations** | Built-in (`chapters`..`myths`, `lore_entries`, `factions`, `species`, `languages`, `relations`) | Built-in | Manual folders + community plugins |
| **Deep Character Psychology** | Native PJ Master (active paradox, self-deception, theory of mind, variants) | Basic character fields | Manual templates |
| **Visual Graph, Timeline & Nested Maps** | Native zero-plugin canvas graph, multi-track timeline, Continent→City→Dungeon pins | Basic connections & maps | Requires external plugins (Canvas/Leaflet/Timeline) |
| **Contradiction Detector** | Automatic post-death timeline, overlap, orphan faction/language & broken `[[wiki-link]]` checks | None | None natively |
| **Optional RPG & VTT/RP Bridges** | Per-world toggleable modules (Dice, Statblocks, Initiative, Kanban, Calendar, Player View) + Foundry/Nexus V3/Lorebook/EPUB | Basic export | Requires third-party plugins |

---

## Español

LoreForge Studio es un estudio local-first y sin conexión para escritores, diseñadores narrativos y directores de rol. Reúne biblias de mundo (Worldbuilding 101), fichas profundas de personaje (psicología, paradoja activa, teoría de la mente), árbol de archivo en 15 categorías, grafo visual de relaciones, línea temporal multi-track, mapas interactivos anidados, detector automático de contradicciones y compilación/puentes VTT, roleplay y EPUB.

### Inicio rápido

```bash
npm install
npm run dev
```

Comandos principales:

- `npm run dev` — Inicia el servidor local de desarrollo con Vite
- `npm run build` — Verifica tipos (`tsc --noEmit`) y compila la versión de producción en `dist/`
- `npm run validate:schemas` — Valida los esquemas JSON Draft 2020-12 y los datos mediante Ajv
- `npm run test:e2e` — Ejecuta la batería E2E en Playwright

### Formatos compatibles

- `.worldbuilder.json` (`schema_version: "2.0.0"` y archivos previos de `worldbuilder-studio.html`)
- `.pj-master.json` (`schema_version: "1.0.0"`)
- `.nexus_v3.json` (`chara_card_v3_nexus_extended`)
- `.lorebook.json` (SillyTavern World Info)
- Foundry VTT (`Actor`, `JournalEntry`, `Scene`), compilador Markdown, HTML imprimible (`@media print`) y `.epub`

### Comparativa breve

- **Frente a Fantasia Archive:** añade psicología avanzada de personajes, detector automático de contradicciones, línea temporal multi-track con detección de solapes, mapas jerárquicos anidados, módulos RPG activables por mundo y puentes directos a Foundry VTT / Nexus V3 / EPUB 3, todo bajo licencia MIT en navegador, PWA y Android.
- **Frente a Obsidian:** ofrece de fábrica árbol narrativo de 15 categorías, wiki-links `[[entidad]]` con vista previa, grafo, timeline, mapas con pines y validaciones narrativas sin configurar docenas de plugins ni depender de software propietario.

---

## License

[MIT](./LICENSE) © 2026 LoreForge Studio / Daniel1bolivar contributors
