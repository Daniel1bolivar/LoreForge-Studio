import { setLocale } from '../i18n';
import type {
  AppState,
  ArchiveCategoryKey,
  ArchiveDocument,
  DiceRollRecord,
  FolderNoteValue,
  HomebrewTab,
  InitiativeEncounter,
  KanbanSceneCard,
  LanguageRarity,
  Locale,
  MapPin,
  PJMaster,
  SheetSectionFilter,
  StoreMutationResult,
  ThemeId,
  TimelineEvent,
  ViewId,
  WorldCalendar,
  WorldGraphLayout,
  WorldMap,
  WorldMaster,
  WorldModuleKey,
  WorldRelation,
} from '../types';
import {
  RESERVED_SLUGS,
  ensurePJDefaults,
  ensureWorldDefaults,
  isValidSlug,
  makePJ,
  makeWorld,
  slugify,
} from './defaults';
import { buildDemoSeedData } from './demoSeed';
import {
  type FileLinkStatus,
  loadFromLocalStorage,
  saveToLocalStorage,
  scheduleProjectFileWrite,
} from './persistence';

type StateListener = (state: AppState) => void;

const listeners = new Set<StateListener>();
let fileStatusCallback: ((status: FileLinkStatus, fileName?: string) => void) | undefined;
let state: AppState | null = null;

function applyDomPreferences(s: AppState): void {
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.theme = s.theme;
    document.documentElement.lang = s.locale;
  }
  setLocale(s.locale);
}

function syncActiveWorldDerivedState(s: AppState): void {
  const activeWorld =
    s.worlds.find((w) => w.id === s.activeWorldId) || s.worlds[0];
  if (!activeWorld) {
    s.explicitMode = false;
    s.activeMapId = '';
    return;
  }
  if (s.activeWorldId !== activeWorld.id) {
    s.activeWorldId = activeWorld.id;
  }
  if (!activeWorld.modules?.intimateModule) {
    s.explicitMode = false;
  }
  if (!activeWorld.maps?.some((m) => m.id === s.activeMapId)) {
    s.activeMapId = activeWorld.maps?.[0]?.id || '';
  }
}

function normalizeState(raw: Partial<AppState>): AppState {
  const demo = buildDemoSeedData();
  const worlds =
    Array.isArray(raw.worlds) && raw.worlds.length > 0
      ? raw.worlds.map((w) => ensureWorldDefaults(w))
      : demo.worlds;
  const activeWorldId =
    raw.activeWorldId && worlds.some((w) => w.id === raw.activeWorldId)
      ? raw.activeWorldId
      : worlds[0].id;
  const pjs = Array.isArray(raw.pjs)
    ? raw.pjs.map((p) => ensurePJDefaults(p, activeWorldId))
    : demo.pjs;

  const worldPjs = pjs.filter((p) => p.worldId === activeWorldId);
  const activePjId =
    raw.activePjId && worldPjs.some((p) => p.id === raw.activePjId)
      ? raw.activePjId
      : worldPjs[0]?.id || '';

  const normalized: AppState = {
    theme: raw.theme || 'cyberpunk',
    locale: raw.locale === 'en' ? 'en' : 'es',
    rpgMode: Boolean(raw.rpgMode),
    explicitMode: Boolean(raw.explicitMode),
    activeView: raw.activeView || 'dashboard',
    activeSection: raw.activeSection || 'all',
    activeHomebrewTab: raw.activeHomebrewTab || 'languages',
    activeGalleryCat: raw.activeGalleryCat || 'characters',
    activeDocCat: raw.activeDocCat || '',
    activeDocId: raw.activeDocId || '',
    activeMapId: raw.activeMapId || '',
    treeFilter: raw.treeFilter || '',
    sidebarCollapsed: Boolean(raw.sidebarCollapsed),
    lastPjByWorld:
      raw.lastPjByWorld && typeof raw.lastPjByWorld === 'object'
        ? raw.lastPjByWorld
        : {},
    treeExpanded:
      raw.treeExpanded && typeof raw.treeExpanded === 'object'
        ? raw.treeExpanded
        : { chapters: true, characters: true, locations: true, relations: true },
    activeWorldId,
    activePjId,
    worlds,
    pjs,
    diceHistory: Array.isArray(raw.diceHistory) ? raw.diceHistory : [],
  };
  syncActiveWorldDerivedState(normalized);
  return normalized;
}

export function initStore(
  onFileStatus?: (status: FileLinkStatus, fileName?: string) => void
): AppState {
  if (onFileStatus) fileStatusCallback = onFileStatus;
  const saved = loadFromLocalStorage();
  if (saved && Array.isArray(saved.worlds) && saved.worlds.length > 0) {
    state = normalizeState(saved);
  } else {
    state = buildDemoSeedData();
    saveToLocalStorage(state);
  }
  applyDomPreferences(state);
  return state;
}

export function getState(): AppState {
  if (!state) {
    return initStore();
  }
  return state;
}

export function subscribe(listener: StateListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function commit(): StoreMutationResult {
  const s = getState();
  applyDomPreferences(s);
  const ok = saveToLocalStorage(s);
  scheduleProjectFileWrite(() => getState(), fileStatusCallback);
  for (const listener of listeners) {
    listener(s);
  }
  return ok ? { ok: true } : { ok: false, errorKey: 'errors.quotaExceeded' };
}

export function getActiveWorld(): WorldMaster {
  const s = getState();
  return s.worlds.find((w) => w.id === s.activeWorldId) || s.worlds[0];
}

export function getWorldPJs(worldId?: string): PJMaster[] {
  const s = getState();
  const target = worldId || s.activeWorldId;
  return s.pjs.filter((p) => p.worldId === target);
}

export function getActivePJ(): PJMaster | null {
  const s = getState();
  const worldPjs = getWorldPJs(s.activeWorldId);
  return worldPjs.find((p) => p.id === s.activePjId) || worldPjs[0] || null;
}

export function isModuleEnabled(
  world: WorldMaster | undefined,
  key: WorldModuleKey
): boolean {
  return Boolean(world?.modules?.[key] === true);
}

export function isIntimateActive(
  s: AppState,
  world: WorldMaster | undefined
): boolean {
  return Boolean(world?.modules?.intimateModule === true && s.explicitMode === true);
}

// --- Navigation & UI state mutators ---

export function setView(view: ViewId): StoreMutationResult {
  const s = getState();
  s.activeView = view;
  return commit();
}

export function setTheme(theme: ThemeId): StoreMutationResult {
  const s = getState();
  s.theme = theme;
  return commit();
}

export function setLocaleState(locale: Locale): StoreMutationResult {
  const s = getState();
  s.locale = locale;
  return commit();
}

export function setSection(section: SheetSectionFilter): StoreMutationResult {
  const s = getState();
  s.activeSection = section;
  return commit();
}

export function setHomebrewTab(tab: HomebrewTab): StoreMutationResult {
  const s = getState();
  s.activeHomebrewTab = tab;
  return commit();
}

export function setGalleryCat(cat: string): StoreMutationResult {
  const s = getState();
  s.activeGalleryCat = cat;
  return commit();
}

export function setDocSelection(cat: string, docId: string): StoreMutationResult {
  const s = getState();
  s.activeDocCat = cat;
  s.activeDocId = docId;
  return commit();
}

export function setActiveMap(mapId: string): StoreMutationResult {
  const s = getState();
  s.activeMapId = mapId;
  return commit();
}

export function setTreeFilter(filter: string): StoreMutationResult {
  const s = getState();
  s.treeFilter = filter;
  return commit();
}

export function toggleTreeExpanded(key: string): StoreMutationResult {
  const s = getState();
  s.treeExpanded[key] = !s.treeExpanded[key];
  return commit();
}

export function setSidebarCollapsed(collapsed: boolean): StoreMutationResult {
  const s = getState();
  s.sidebarCollapsed = collapsed;
  return commit();
}

export function setRpgMode(enabled: boolean): StoreMutationResult {
  const s = getState();
  s.rpgMode = enabled;
  return commit();
}

export function setExplicitMode(enabled: boolean): StoreMutationResult {
  const s = getState();
  const world = getActiveWorld();
  s.explicitMode = Boolean(enabled && world?.modules?.intimateModule === true);
  return commit();
}

// --- World & PJ mutators ---

export function setActiveWorld(worldId: string): StoreMutationResult {
  const s = getState();
  if (!s.worlds.some((w) => w.id === worldId)) return { ok: false };
  s.activeWorldId = worldId;
  const worldPjs = getWorldPJs(worldId);
  const remembered = s.lastPjByWorld[worldId];
  s.activePjId =
    remembered && worldPjs.some((p) => p.id === remembered)
      ? remembered
      : worldPjs[0]?.id || '';
  s.activeMapId = '';
  syncActiveWorldDerivedState(s);
  return commit();
}

export function setActivePj(pjId: string): StoreMutationResult {
  const s = getState();
  const pj = s.pjs.find((p) => p.id === pjId);
  if (!pj) return { ok: false };
  if (pj.worldId && s.worlds.some((w) => w.id === pj.worldId)) {
    s.activeWorldId = pj.worldId;
    s.lastPjByWorld[pj.worldId] = pjId;
  }
  s.activePjId = pjId;
  syncActiveWorldDerivedState(s);
  return commit();
}

export function createWorld(
  name: string,
  patch: Partial<WorldMaster> = {}
): StoreMutationResult<WorldMaster> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, errorKey: 'errors.emptyLabel' };
  const s = getState();
  const world = makeWorld(trimmed, patch);
  s.worlds.push(world);
  s.activeWorldId = world.id;
  s.activePjId = '';
  s.activeMapId = '';
  syncActiveWorldDerivedState(s);
  const res = commit();
  return res.ok ? { ok: true, data: world } : { ...res, data: world };
}

export function deleteWorld(worldId: string): StoreMutationResult {
  const s = getState();
  if (s.worlds.length <= 1) {
    return { ok: false, errorKey: 'errors.minOneWorld' };
  }
  s.worlds = s.worlds.filter((w) => w.id !== worldId);
  s.pjs = s.pjs.filter((p) => p.worldId !== worldId);
  delete s.lastPjByWorld[worldId];
  if (s.activeWorldId === worldId) {
    s.activeWorldId = s.worlds[0].id;
    const worldPjs = getWorldPJs(s.activeWorldId);
    s.activePjId = worldPjs[0]?.id || '';
  }
  syncActiveWorldDerivedState(s);
  return commit();
}

export function updateWorld(
  worldId: string,
  updater: (world: WorldMaster) => void
): StoreMutationResult {
  const s = getState();
  const idx = s.worlds.findIndex((w) => w.id === worldId);
  if (idx === -1) return { ok: false };
  const clone = structuredClone(s.worlds[idx]);
  updater(clone);
  clone.last_edited = new Date().toISOString().slice(0, 10);
  s.worlds[idx] = clone;
  syncActiveWorldDerivedState(s);
  return commit();
}

export function toggleWorldModule(
  worldId: string,
  key: WorldModuleKey,
  value?: boolean
): StoreMutationResult {
  const s = getState();
  const res = updateWorld(worldId, (w) => {
    if (!w.modules) {
      w.modules = ensureWorldDefaults(w).modules!;
    }
    const next = typeof value === 'boolean' ? value : !w.modules[key];
    w.modules[key] = next;
  });
  syncActiveWorldDerivedState(s);
  return res;
}

export function createPj(
  name: string,
  worldId?: string
): StoreMutationResult<PJMaster> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, errorKey: 'errors.emptyLabel' };
  const s = getState();
  const targetWorldId = worldId || s.activeWorldId;
  const pj = makePJ(targetWorldId, trimmed);
  s.pjs.push(pj);
  s.activeWorldId = targetWorldId;
  if (pj.id) {
    s.activePjId = pj.id;
    s.lastPjByWorld[targetWorldId] = pj.id;
  }
  syncActiveWorldDerivedState(s);
  const res = commit();
  return res.ok ? { ok: true, data: pj } : { ...res, data: pj };
}

export function deletePj(pjId: string): StoreMutationResult {
  const s = getState();
  s.pjs = s.pjs.filter((p) => p.id !== pjId);
  if (s.activePjId === pjId) {
    const worldPjs = getWorldPJs(s.activeWorldId);
    s.activePjId = worldPjs[0]?.id || '';
    if (s.activePjId) {
      s.lastPjByWorld[s.activeWorldId] = s.activePjId;
    } else {
      delete s.lastPjByWorld[s.activeWorldId];
    }
  }
  return commit();
}

export function updatePj(
  pjId: string,
  updater: (pj: PJMaster) => void
): StoreMutationResult {
  const s = getState();
  const idx = s.pjs.findIndex((p) => p.id === pjId);
  if (idx === -1) return { ok: false };
  const clone = structuredClone(s.pjs[idx]);
  updater(clone);
  s.pjs[idx] = clone;
  return commit();
}

// --- Archive & Folder Notes ---

export function addArchiveItem(
  worldId: string,
  cat: ArchiveCategoryKey,
  doc: Omit<ArchiveDocument, 'id'> & { id?: string }
): StoreMutationResult<ArchiveDocument> {
  const created: ArchiveDocument = {
    ...doc,
    id: doc.id || `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    updated_at: new Date().toISOString().slice(0, 10),
  };
  const res = updateWorld(worldId, (w) => {
    if (!w.archive) w.archive = ensureWorldDefaults(w).archive!;
    if (!Array.isArray(w.archive[cat])) w.archive[cat] = [];
    w.archive[cat].push(created);
  });
  return res.ok ? { ok: true, data: created } : { ...res, data: created };
}

export function updateArchiveItem(
  worldId: string,
  cat: ArchiveCategoryKey,
  docId: string,
  patch: Partial<ArchiveDocument>
): StoreMutationResult {
  return updateWorld(worldId, (w) => {
    const list = w.archive?.[cat];
    if (!list) return;
    const idx = list.findIndex((d) => d.id === docId);
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        ...patch,
        updated_at: new Date().toISOString().slice(0, 10),
      };
    }
  });
}

export function deleteArchiveItem(
  worldId: string,
  cat: ArchiveCategoryKey,
  docId: string
): StoreMutationResult {
  const s = getState();
  const res = updateWorld(worldId, (w) => {
    const list = w.archive?.[cat];
    if (!list) return;
    w.archive![cat] = list.filter((d) => d.id !== docId);
  });
  if (s.activeDocCat === cat && s.activeDocId === docId) {
    s.activeDocId = '';
  }
  return res;
}

export function setFolderNote(
  worldId: string,
  categoryKey: string,
  note: FolderNoteValue
): StoreMutationResult {
  return updateWorld(worldId, (w) => {
    if (!w.folder_notes) w.folder_notes = {};
    w.folder_notes[categoryKey] = note;
  });
}

// --- Relations & Graph ---

export function upsertRelation(
  worldId: string,
  rel: WorldRelation
): StoreMutationResult {
  return updateWorld(worldId, (w) => {
    if (!w.relations) w.relations = [];
    const idx = w.relations.findIndex((r) => r.id === rel.id);
    if (idx !== -1) {
      w.relations[idx] = rel;
    } else {
      w.relations.push(rel);
    }
  });
}

export function deleteRelation(
  worldId: string,
  relId: string
): StoreMutationResult {
  return updateWorld(worldId, (w) => {
    if (!w.relations) return;
    w.relations = w.relations.filter((r) => r.id !== relId);
  });
}

export function updateGraphLayout(
  worldId: string,
  layout: WorldGraphLayout
): StoreMutationResult {
  return updateWorld(worldId, (w) => {
    w.graph_layout = layout;
  });
}

// --- Timeline ---

export function addTimelineEvent(
  worldId: string,
  ev: TimelineEvent
): StoreMutationResult {
  return updateWorld(worldId, (w) => {
    if (!w.timeline_events) w.timeline_events = [];
    w.timeline_events.push(ev);
  });
}

export function updateTimelineEvent(
  worldId: string,
  evId: string,
  patch: Partial<TimelineEvent>
): StoreMutationResult {
  return updateWorld(worldId, (w) => {
    if (!w.timeline_events) return;
    const idx = w.timeline_events.findIndex((e) => e.id === evId);
    if (idx !== -1) {
      w.timeline_events[idx] = { ...w.timeline_events[idx], ...patch };
    }
  });
}

export function deleteTimelineEvent(
  worldId: string,
  evId: string
): StoreMutationResult {
  return updateWorld(worldId, (w) => {
    if (!w.timeline_events) return;
    w.timeline_events = w.timeline_events.filter((e) => e.id !== evId);
  });
}

// --- Maps & Pins ---

export function addMap(worldId: string, map: WorldMap): StoreMutationResult {
  const s = getState();
  s.activeMapId = map.id;
  return updateWorld(worldId, (w) => {
    if (!w.maps) w.maps = [];
    w.maps.push(map);
  });
}

export function updateMap(
  worldId: string,
  mapId: string,
  patch: Partial<WorldMap>
): StoreMutationResult {
  return updateWorld(worldId, (w) => {
    if (!w.maps) return;
    const idx = w.maps.findIndex((m) => m.id === mapId);
    if (idx !== -1) {
      w.maps[idx] = { ...w.maps[idx], ...patch };
    }
  });
}

export function deleteMap(worldId: string, mapId: string): StoreMutationResult {
  const s = getState();
  const res = updateWorld(worldId, (w) => {
    if (!w.maps) return;
    w.maps = w.maps.filter((m) => m.id !== mapId);
  });
  if (s.activeMapId === mapId) {
    const world = getActiveWorld();
    s.activeMapId = world.maps?.[0]?.id || '';
  }
  return res;
}

export function upsertMapPin(
  worldId: string,
  mapId: string,
  pin: MapPin
): StoreMutationResult {
  return updateWorld(worldId, (w) => {
    const map = w.maps?.find((m) => m.id === mapId);
    if (!map) return;
    const idx = map.pins.findIndex((p) => p.id === pin.id);
    if (idx !== -1) {
      map.pins[idx] = pin;
    } else {
      map.pins.push(pin);
    }
  });
}

export function deleteMapPin(
  worldId: string,
  mapId: string,
  pinId: string
): StoreMutationResult {
  return updateWorld(worldId, (w) => {
    const map = w.maps?.find((m) => m.id === mapId);
    if (!map) return;
    map.pins = map.pins.filter((p) => p.id !== pinId);
  });
}

// --- Homebrew Elements (with slugify + RESERVED_SLUGS + duplicate guards) ---

function resolveHomebrewSlug(
  label: string
): { ok: true; trimmed: string; slug: string } | { ok: false; result: StoreMutationResult } {
  const trimmed = label.trim();
  if (!trimmed) {
    return { ok: false, result: { ok: false, errorKey: 'errors.emptyLabel' } };
  }
  const lower = trimmed.toLowerCase();
  if (RESERVED_SLUGS.has(lower)) {
    return {
      ok: false,
      result: {
        ok: false,
        errorKey: 'errors.reservedSlug',
        errorParams: { slug: lower },
      },
    };
  }
  const slug = slugify(trimmed);
  if (!isValidSlug(slug)) {
    return {
      ok: false,
      result: {
        ok: false,
        errorKey: slug ? 'errors.reservedSlug' : 'errors.emptyLabel',
        errorParams: slug ? { slug } : undefined,
      },
    };
  }
  return { ok: true, trimmed, slug };
}

export function addHomebrewLanguage(
  worldId: string,
  label: string,
  rarity: LanguageRarity = 'common'
): StoreMutationResult {
  const parsed = resolveHomebrewSlug(label);
  if (!parsed.ok) return parsed.result;
  const { trimmed, slug } = parsed;
  const world = getState().worlds.find((w) => w.id === worldId);
  if (!world) return { ok: false };
  if (world.homebrew.languages.registered.some((l) => l.slug === slug)) {
    return { ok: false, errorKey: 'errors.duplicateSlug', errorParams: { slug } };
  }
  return updateWorld(worldId, (w) => {
    w.homebrew.languages.registered.push({ slug, label: trimmed, custom: true });
    if (rarity !== 'common') {
      w.homebrew.languages[rarity].push(slug);
    }
  });
}

export function moveLanguageRarity(
  worldId: string,
  slug: string,
  targetRarity: LanguageRarity
): StoreMutationResult {
  const world = getState().worlds.find((w) => w.id === worldId);
  if (!world) return { ok: false };
  if (!world.homebrew.languages.registered.some((l) => l.slug === slug)) {
    return { ok: false, errorKey: 'errors.notFound', errorParams: { slug } };
  }
  return updateWorld(worldId, (w) => {
    const langs = w.homebrew.languages;
    langs.uncommon = langs.uncommon.filter((s) => s !== slug);
    langs.rare = langs.rare.filter((s) => s !== slug);
    langs.secret = langs.secret.filter((s) => s !== slug);
    langs.unavailable = langs.unavailable.filter((s) => s !== slug);
    if (targetRarity !== 'common') {
      langs[targetRarity].push(slug);
      if (langs.commonLanguage === slug) {
        langs.commonLanguage = null;
      }
    }
  });
}

export function setCommonLanguage(
  worldId: string,
  slug: string | null
): StoreMutationResult {
  const world = getState().worlds.find((w) => w.id === worldId);
  if (!world) return { ok: false };
  if (
    slug !== null &&
    !world.homebrew.languages.registered.some((l) => l.slug === slug)
  ) {
    return { ok: false, errorKey: 'errors.notFound', errorParams: { slug } };
  }
  return updateWorld(worldId, (w) => {
    const langs = w.homebrew.languages;
    langs.commonLanguage = slug;
    if (slug !== null) {
      langs.uncommon = langs.uncommon.filter((s) => s !== slug);
      langs.rare = langs.rare.filter((s) => s !== slug);
      langs.secret = langs.secret.filter((s) => s !== slug);
      langs.unavailable = langs.unavailable.filter((s) => s !== slug);
    }
  });
}

export function deleteHomebrewLanguage(
  worldId: string,
  slug: string
): StoreMutationResult {
  return updateWorld(worldId, (w) => {
    const langs = w.homebrew.languages;
    langs.registered = langs.registered.filter((l) => l.slug !== slug);
    langs.uncommon = langs.uncommon.filter((s) => s !== slug);
    langs.rare = langs.rare.filter((s) => s !== slug);
    langs.secret = langs.secret.filter((s) => s !== slug);
    langs.unavailable = langs.unavailable.filter((s) => s !== slug);
    if (langs.commonLanguage === slug) {
      langs.commonLanguage = null;
    }
  });
}

export function addHomebrewSpecies(
  worldId: string,
  label: string,
  notes = ''
): StoreMutationResult {
  const parsed = resolveHomebrewSlug(label);
  if (!parsed.ok) return parsed.result;
  const { trimmed, slug } = parsed;
  const world = getState().worlds.find((w) => w.id === worldId);
  if (!world) return { ok: false };
  if (world.homebrew.species.some((sp) => sp.slug === slug)) {
    return { ok: false, errorKey: 'errors.duplicateSlug', errorParams: { slug } };
  }
  return updateWorld(worldId, (w) => {
    w.homebrew.species.push({ slug, label: trimmed, notes: notes.trim() });
  });
}

export function deleteHomebrewSpecies(
  worldId: string,
  slug: string
): StoreMutationResult {
  return updateWorld(worldId, (w) => {
    w.homebrew.species = w.homebrew.species.filter((sp) => sp.slug !== slug);
  });
}

export function addHomebrewTrait(
  worldId: string,
  label: string,
  category = 'General'
): StoreMutationResult {
  const parsed = resolveHomebrewSlug(label);
  if (!parsed.ok) return parsed.result;
  const { trimmed, slug } = parsed;
  const world = getState().worlds.find((w) => w.id === worldId);
  if (!world) return { ok: false };
  if (world.homebrew.traits.some((tr) => tr.slug === slug)) {
    return { ok: false, errorKey: 'errors.duplicateSlug', errorParams: { slug } };
  }
  return updateWorld(worldId, (w) => {
    w.homebrew.traits.push({
      slug,
      label: trimmed,
      category: category.trim() || 'General',
    });
  });
}

export function deleteHomebrewTrait(
  worldId: string,
  slug: string
): StoreMutationResult {
  return updateWorld(worldId, (w) => {
    w.homebrew.traits = w.homebrew.traits.filter((tr) => tr.slug !== slug);
  });
}

// --- Optional Module Data Mutators (Kanban, Calendar, Initiative, Dice) ---

export function upsertKanbanCard(
  worldId: string,
  card: KanbanSceneCard
): StoreMutationResult {
  return updateWorld(worldId, (w) => {
    if (!w.scenes_kanban) w.scenes_kanban = [];
    const idx = w.scenes_kanban.findIndex((c) => c.id === card.id);
    if (idx !== -1) {
      w.scenes_kanban[idx] = card;
    } else {
      w.scenes_kanban.push(card);
    }
  });
}

export function deleteKanbanCard(
  worldId: string,
  cardId: string
): StoreMutationResult {
  return updateWorld(worldId, (w) => {
    if (!w.scenes_kanban) return;
    w.scenes_kanban = w.scenes_kanban.filter((c) => c.id !== cardId);
  });
}

export function updateCalendar(
  worldId: string,
  calendar: WorldCalendar
): StoreMutationResult {
  return updateWorld(worldId, (w) => {
    w.calendar = calendar;
  });
}

export function updateInitiativeEncounter(
  worldId: string,
  encounter: InitiativeEncounter
): StoreMutationResult {
  return updateWorld(worldId, (w) => {
    w.initiative_encounter = encounter;
  });
}

export function recordDiceRoll(entry: DiceRollRecord): StoreMutationResult {
  const s = getState();
  const prev = s.diceHistory || [];
  s.diceHistory = [entry, ...prev].slice(0, 30);
  return commit();
}

// --- Full State Reset / Import Replacement ---

export function resetToDemoSeed(): StoreMutationResult {
  state = buildDemoSeedData();
  return commit();
}

export function replaceProjectState(next: Partial<AppState>): StoreMutationResult {
  state = normalizeState(next);
  return commit();
}

export async function restoreMasterGemaBook(): Promise<{ ok: boolean; count: number; error?: string }> {
  try {
    const res = await fetch('/api/local-gema');
    if (!res.ok) return { ok: false, count: 0, error: 'Endpoint local no disponible' };
    const data = await res.json();
    if (!data || !data.state || !Array.isArray(data.state.worlds) || !data.state.worlds[0]) {
      return { ok: false, count: 0, error: 'Formato inválido de archivo maestro' };
    }
    const gWorld: WorldMaster = data.state.worlds[0];
    const gPjs: PJMaster[] = data.state.pjs || [];

    appStore.mutate((s) => {
      const wIdx = s.worlds.findIndex((w) => w.id === gWorld.id);
      if (wIdx >= 0) {
        s.worlds[wIdx] = JSON.parse(JSON.stringify(gWorld));
      } else {
        s.worlds.unshift(JSON.parse(JSON.stringify(gWorld)));
      }

      s.pjs = s.pjs.filter((p) => p.worldId !== gWorld.id);
      for (const p of gPjs) {
        s.pjs.push(JSON.parse(JSON.stringify(p)));
      }

      s.activeWorldId = gWorld.id;
      s.activePjId = gPjs[0]?.id || '';
      s.theme = 'cyberpunk';
    });

    return { ok: true, count: gPjs.length };
  } catch (err: any) {
    return { ok: false, count: 0, error: err?.message || 'Error de conexión' };
  }
}

export const setThemeState = setTheme;
export const toggleRpgMode = (): StoreMutationResult => setRpgMode(!getState().rpgMode);
export const toggleExplicitMode = (): StoreMutationResult => setExplicitMode(!getState().explicitMode);
export const setGalleryCategory = setGalleryCat;

export const appStore = {
  getState,
  getActiveWorld,
  getCharactersForWorld: (worldId?: string) => getWorldPJs(worldId),
  getActivePj: getActivePJ,
  mutate: (fn: (s: AppState) => void): StoreMutationResult => {
    const s = getState();
    fn(s);
    return commit();
  }
};

