# Auditoría de `https://github.com/foundryvtt` y Extrapolación a LoreForge Studio

> **Nota de alcance:** El núcleo propietario de Foundry VTT no es open source en GitHub; la auditoría se realizó sobre los repositorios públicos oficiales bajo `https://github.com/foundryvtt` (`pf2e`, `dnd5e`, `worldbuilding`, `crucible`, `foundryvtt`, `foundryvtt-cli`, `world-anvil`).

---

## 1. Patrones de Datos y `DataModel` (`pf2e` y `dnd5e`)

1. **Separación estricta `DataModel` vs. UI (`Application` / `FormApplication`):**
   - En `foundryvtt/pf2e` (`src/module/system/settings/homebrew/data.ts`, L75–120), `LanguageSettings` extiende `foundry.abstract.DataModel` y declara su esquema con `defineSchema()` (`StringField` para `commonLanguage` y `SetField` para `uncommon`, `rare`, `secret`, `unavailable`).
   - **Derivación sin duplicación (`_initialize`, L82–92):** En lugar de almacenar también una lista `common` redundante, `pf2e` la calcula dinámicamente filtrando todos los idiomas registrados que **no** están en `uncommon`, `rare`, `secret` o `unavailable`.
   - **Extrapolado a LoreForge:** Implementado en `getLanguageBuckets(hbLang)` dentro de `src/state/defaults.ts` y tipado en `schemas/world-master.schema.json`.

2. **Propagación declarativa de rasgos (`TRAIT_PROPAGATIONS`):**
   - En `pf2e/src/module/system/settings/homebrew/data.ts` (L26–32), un diccionario declara qué rasgos se propagan automáticamente a categorías hijas (p. ej. `creatureTraits -> ["ancestryTraits", "hazardTraits"]`).
   - **Extrapolación:** Útil cuando LoreForge gestiona ítems, hechizos o taxonomías de mundo mediante `trait_propagations`, para que los rasgos definidos en el mundo se hereden en fichas de facciones, criaturas y objetos ancla.

3. **Slugs únicos y términos reservados (`helpers.ts` / `menu.ts`):**
   - En `pf2e/src/module/system/settings/homebrew/menu.ts` (L154–160), cada elemento homebrew genera un identificador estable con `sluggify()` y valida contra `reservedTerms` para evitar colisiones con claves base del sistema.
   - **Extrapolado a Worldbuilder:** `addHomebrewLanguage()`, `addHomebrewSpecies()` y `addHomebrewTrait()` normalizan claves con `slugify()` y bloquean duplicados.

---

## 2. Arquitectura de Configuración Homebrew (`pf2e` Homebrew Elements)

1. **Pestañas temáticas en un solo panel (`menu.ts`, L88–147):**
   - `HomebrewElements` agrupa dinámicamente sus settings en pestañas (`languages`, `campaign`, `traits`, `taxonomies`, `damageTypes`) según el prefijo/sufijo de cada clave.
   - **Extrapolado a Worldbuilder:** La sección **Elementos Homebrew** en `Biblia Mundo` replica esta organización con pestañas `Idiomas`, `Razas / Especies` y `Rasgos y Etiquetas`.

2. **Gestor de Rarezas de Idiomas (`languages.ts`, L21–194):**
   - `LanguagesManager` mantiene sincronizado el `<select>` de `commonLanguage` (el idioma que representa "Común" en ese mundo) con el cubo `COMÚN`: si mueves un idioma a `RARO` o `SECRETO` (`#onDropLanguage`, L108–156), deja de ser elegible como idioma común del mundo.
   - **Extrapolado a Worldbuilder:** `moveLanguageRarity()` limpia `commonLanguage` si el idioma deja de ser `common` y actualiza el selector al instante.

---

## 3. Fichas de Actor, Comunicación y Sistemas Genéricos (`dnd5e` & `worldbuilding`)

1. **Configuración modular de rasgos y comunicación (`dnd5e/module/applications/actor/config/languages-config.mjs`, L6–48):**
   - `LanguagesConfig` hereda de un `TraitsConfig` genérico y añade modos de comunicación con unidades (`communicationTypes` + `movementUnits`).
   - **Extrapolación:** Permite extender fácilmente la ficha de PJ con canales no verbales (p. ej. vínculos telepáticos entre personajes o códigos de señales de exploradores).

2. **Sistema `foundryvtt/worldbuilding`:**
   - Permite definir atributos flexibles en `Actors` e `Items` sin acoplarse a un reglamento fijo, idea equivalente a los **Módulos del Mundo** opcionales (`rpgStatblocks`, `initiativeTracker`) de LoreForge Studio y el selector visual de **Mundos de Juego (Game Worlds)** con tarjetas, filtro y badges de sistema.

---

## 4. Qué NO extrapolar (YAGNI)
- Dependencias pesadas de Foundry (`Tagify`, `SortableJS`, `Handlebars`, `remeda`) ni compiladores heredados complejos: LoreForge Studio utiliza TypeScript estricto + Vite con cero dependencias de runtime innecesarias.
