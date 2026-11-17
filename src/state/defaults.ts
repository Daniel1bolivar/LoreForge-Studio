import type {
  ArchiveCategoryKey,
  ArchiveDocument,
  HomebrewLanguage,
  HomebrewLanguages,
  LanguageRarity,
  PJMaster,
  TreeCategoryDef,
  WorldArchive,
  WorldHomebrew,
  WorldMaster,
  WorldModulesConfig,
} from '../types';

export const STORAGE_KEY = 'worldbuilder_studio_v2';

export interface AuditItemDef {
  id: string;
  labelKey: string;
}

export const AUDIT_ITEMS: readonly AuditItemDef[] = [
  { id: 'c1', labelKey: 'world.audit.c1' },
  { id: 'c2', labelKey: 'world.audit.c2' },
  { id: 'c3', labelKey: 'world.audit.c3' },
  { id: 'c4', labelKey: 'world.audit.c4' },
  { id: 'c5', labelKey: 'world.audit.c5' },
  { id: 'c6', labelKey: 'world.audit.c6' },
];

export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'common',
  'uncommon',
  'rare',
  'secret',
  'unavailable',
  'none',
  'all',
  'default',
  'system',
  'admin',
  'custom',
  'null',
  'undefined',
  '__proto__',
  'constructor',
  'prototype',
]);

export const TRAIT_PROPAGATIONS: Readonly<Record<string, readonly string[]>> = {
  worldTraits: ['factionTraits', 'itemTraits', 'magicTraits'],
  ancestryTraits: ['characterTraits'],
  magicTraits: ['spellTraits', 'relicTraits'],
  factionTraits: ['locationTraits', 'politicalTraits'],
};

export function slugify(str: string): string {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function isValidSlug(slug: string): boolean {
  return slug.length > 0 && !RESERVED_SLUGS.has(slug);
}

export function makeDefaultWorldModules(): WorldModulesConfig {
  return {
    diceRoller: false,
    rpgStatblocks: false,
    initiativeTracker: false,
    sceneKanban: false,
    customCalendar: false,
    playerView: false,
    theoryOfMind: false,
    intimateModule: false,
  };
}

export function makeHomebrewDefaults(): WorldHomebrew {
  return {
    languages: {
      commonLanguage: 'comun',
      registered: [{ slug: 'comun', label: 'Común', custom: false }],
      uncommon: [],
      rare: [],
      secret: [],
      unavailable: [],
    },
    species: [
      {
        slug: 'humana',
        label: 'Humana',
        notes: 'Población humana base del mundo.',
      },
    ],
    traits: [],
    trait_propagations: Object.fromEntries(
      Object.entries(TRAIT_PROPAGATIONS).map(([k, v]) => [k, [...v]])
    ),
  };
}

export const ARCHIVE_CATEGORY_KEYS: readonly ArchiveCategoryKey[] = [
  'chapters',
  'locations',
  'events',
  'political_groups',
  'religious_groups',
  'magic_groups',
  'tech_groups',
  'items',
  'currencies',
  'myths',
];

export function makeArchiveDefaults(): WorldArchive {
  return {
    chapters: [],
    locations: [],
    events: [],
    political_groups: [],
    religious_groups: [],
    magic_groups: [],
    tech_groups: [],
    items: [],
    currencies: [],
    myths: [],
  };
}

export const TREE_CATEGORIES: readonly TreeCategoryDef[] = [
  { key: 'chapters', kind: 'archive', labelKey: 'tree.categories.chapters', iconKey: 'file-text' },
  { key: 'lore_entries', kind: 'lore', labelKey: 'tree.categories.lore_entries', iconKey: 'book-open' },
  { key: 'characters', kind: 'pjs', labelKey: 'tree.categories.characters', iconKey: 'user' },
  { key: 'locations', kind: 'archive', labelKey: 'tree.categories.locations', iconKey: 'map-pin' },
  { key: 'events', kind: 'archive', labelKey: 'tree.categories.events', iconKey: 'calendar' },
  { key: 'political_groups', kind: 'archive', labelKey: 'tree.categories.political_groups', iconKey: 'landmark' },
  { key: 'factions', kind: 'factions', labelKey: 'tree.categories.factions', iconKey: 'users' },
  { key: 'religious_groups', kind: 'archive', labelKey: 'tree.categories.religious_groups', iconKey: 'flame' },
  { key: 'magic_groups', kind: 'archive', labelKey: 'tree.categories.magic_groups', iconKey: 'sparkles' },
  { key: 'tech_groups', kind: 'archive', labelKey: 'tree.categories.tech_groups', iconKey: 'cog' },
  { key: 'species', kind: 'species', labelKey: 'tree.categories.species', iconKey: 'feather' },
  { key: 'items', kind: 'archive', labelKey: 'tree.categories.items', iconKey: 'sword' },
  { key: 'languages', kind: 'languages', labelKey: 'tree.categories.languages', iconKey: 'message-square' },
  { key: 'currencies', kind: 'archive', labelKey: 'tree.categories.currencies', iconKey: 'coins' },
  { key: 'myths', kind: 'archive', labelKey: 'tree.categories.myths', iconKey: 'scroll' },
  { key: 'relations', kind: 'relations', labelKey: 'tree.categories.relations', iconKey: 'git-branch' },
];

export const RARITY_BUCKETS: readonly { key: LanguageRarity; labelKey: string }[] = [
  { key: 'common', labelKey: 'world.homebrew.buckets.common' },
  { key: 'uncommon', labelKey: 'world.homebrew.buckets.uncommon' },
  { key: 'rare', labelKey: 'world.homebrew.buckets.rare' },
  { key: 'secret', labelKey: 'world.homebrew.buckets.secret' },
  { key: 'unavailable', labelKey: 'world.homebrew.buckets.unavailable' },
];

export function getLanguageBuckets(
  hbLang: HomebrewLanguages
): Record<LanguageRarity, HomebrewLanguage[]> {
  const nonCommon = new Set<string>([
    ...(hbLang.uncommon || []),
    ...(hbLang.rare || []),
    ...(hbLang.secret || []),
    ...(hbLang.unavailable || []),
  ]);
  const bySlug = new Map<string, HomebrewLanguage>(
    (hbLang.registered || []).map((l) => [l.slug, l])
  );
  const pick = (slugs: string[] | undefined): HomebrewLanguage[] =>
    (slugs || [])
      .map((s) => bySlug.get(s))
      .filter((x): x is HomebrewLanguage => Boolean(x));

  return {
    common: (hbLang.registered || []).filter((l) => !nonCommon.has(l.slug)),
    uncommon: pick(hbLang.uncommon),
    rare: pick(hbLang.rare),
    secret: pick(hbLang.secret),
    unavailable: pick(hbLang.unavailable),
  };
}

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (infer U)[]
    ? U[]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

const DANGEROUS_KEYS: ReadonlySet<string> = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

function deepMergeRecord<T extends Record<string, unknown>>(
  target: T,
  src: Record<string, unknown>
): T {
  const out: Record<string, unknown> = { ...target };
  for (const key of Object.keys(src)) {
    if (DANGEROUS_KEYS.has(key)) continue;
    const val = src[key];
    if (val === undefined) continue;
    const prev = out[key];
    if (isPlainObject(prev)) {
      if (!isPlainObject(val)) continue;
      out[key] = deepMergeRecord(prev, val);
    } else if (Array.isArray(prev)) {
      if (!Array.isArray(val)) continue;
      out[key] = val;
    } else {
      if (val === null && (typeof prev === 'string' || typeof prev === 'number' || typeof prev === 'boolean')) {
        continue;
      }
      out[key] = val;
    }
  }
  return out as T;
}

export function makePJ(
  worldId: string,
  name: string,
  patch: DeepPartial<PJMaster> = {}
): PJMaster {
  const base: PJMaster = {
    schema_version: '1.0.0',
    id: 'pj_' + Math.random().toString(36).slice(2, 9),
    worldId,
    avatar: '',
    mode: 'sfw',
    status: 'alive',
    death_order: null,
    death_event_id: null,
    identity: {
      name,
      internal_alias: '',
      species_lineage: 'Humana',
      role_occupation: '',
      homeland: '',
      deity_creed: '',
      alignment_morality: 'Zona gris',
      languages: ['Común'],
      virtues: [],
      flaws: [],
    },
    attributes: { STR: 5, DEX: 5, CON: 5, INT: 5, WIS: 5, CHA: 5 },
    competencies: {
      knowledge: [],
      craft: [],
      profession: [],
      special_training: [],
    },
    worldbuilding_101: {
      core_motivation: '',
      everyday_life: '',
      off_screen_life: '',
      personal_history: '',
      anchor_props: [],
    },
    psychology: {
      social_mask: '',
      self_deception: '',
      nuclear_desire_or_wound: '',
      asymmetric_secret: '',
      active_paradox: {
        spoken_dialogue: '',
        body_betrayal: '',
        hidden_thought: '',
      },
      autonomous_scene_agenda: [],
    },
    biometrics_and_voice: {
      appearance_summary: '',
      vocal_fingerprint: '',
    },
    intimate_module: {
      enabled: false,
      experience_status: '',
      anatomy_and_sensory: '',
      core_fantasies_and_fetishes: [],
      solo_habits: '',
      progression_stages: {
        initial_control_pct: 95,
        stage_1_barrier: '',
        stage_2_fissure: '',
        stage_3_double_standard: '',
        stage_4_surrender: '',
      },
      hard_locks: ['Nunca controla o decide acciones de {{user}}'],
    },
    theory_of_mind: [],
    communication_modes: [],
    traits: [],
  };

  return deepMergeRecord(
    base as unknown as Record<string, unknown>,
    patch as unknown as Record<string, unknown>
  ) as unknown as PJMaster;
}

export function makeWorld(
  name: string,
  patch: Partial<WorldMaster> = {}
): WorldMaster {
  const id = patch.id || 'world_' + Math.random().toString(36).slice(2, 9);
  const base: WorldMaster = {
    id,
    name,
    system_tag: 'narrativa-general',
    last_edited: new Date().toISOString().slice(0, 10),
    modules: makeDefaultWorldModules(),
    genre_tone: 'Fantasía y aventura',
    internal_laws: [],
    factions: [],
    everyday_life: '',
    economy_and_taboos: '',
    history_timeline: '',
    systems_and_limits: '',
    lore_entries: [],
    homebrew: makeHomebrewDefaults(),
    archive: makeArchiveDefaults(),
    folder_notes: {},
    relations: [],
    graph_layout: { nodes: {}, zoom: 1, panX: 0, panY: 0 },
    audit: {},
    timeline_events: [],
    maps: [],
    scenes_kanban: [],
  };
  return ensureWorldDefaults({ ...base, ...patch });
}

export function ensureWorldDefaults(raw: Partial<WorldMaster>): WorldMaster {
  const defHb = makeHomebrewDefaults();

  const rawHb = isPlainObject(raw.homebrew) ? raw.homebrew : null;
  const rawLangs = rawHb && isPlainObject(rawHb.languages) ? rawHb.languages : null;
  const homebrew: WorldHomebrew = !rawHb
    ? defHb
    : {
        languages: {
          commonLanguage:
            rawLangs &&
            (typeof rawLangs.commonLanguage === 'string' ||
              rawLangs.commonLanguage === null)
              ? rawLangs.commonLanguage
              : defHb.languages.commonLanguage,
          registered:
            rawLangs && Array.isArray(rawLangs.registered)
              ? (rawLangs.registered as HomebrewLanguage[])
              : defHb.languages.registered,
          uncommon:
            rawLangs && Array.isArray(rawLangs.uncommon)
              ? (rawLangs.uncommon as string[])
              : [],
          rare:
            rawLangs && Array.isArray(rawLangs.rare)
              ? (rawLangs.rare as string[])
              : [],
          secret:
            rawLangs && Array.isArray(rawLangs.secret)
              ? (rawLangs.secret as string[])
              : [],
          unavailable:
            rawLangs && Array.isArray(rawLangs.unavailable)
              ? (rawLangs.unavailable as string[])
              : [],
        },
        species: Array.isArray(rawHb.species)
          ? (rawHb.species as WorldHomebrew['species'])
          : defHb.species,
        traits: Array.isArray(rawHb.traits)
          ? (rawHb.traits as WorldHomebrew['traits'])
          : defHb.traits,
        trait_propagations: isPlainObject(rawHb.trait_propagations)
          ? (rawHb.trait_propagations as Record<string, string[]>)
          : defHb.trait_propagations,
      };

  const rawModules: Record<string, unknown> = isPlainObject(raw.modules)
    ? raw.modules
    : {};
  const modules: WorldModulesConfig = {
    diceRoller: Boolean(rawModules.diceRoller),
    rpgStatblocks: Boolean(rawModules.rpgStatblocks),
    initiativeTracker: Boolean(rawModules.initiativeTracker),
    sceneKanban: Boolean(rawModules.sceneKanban),
    customCalendar: Boolean(rawModules.customCalendar),
    playerView: Boolean(rawModules.playerView),
    theoryOfMind: Boolean(rawModules.theoryOfMind),
    intimateModule: Boolean(rawModules.intimateModule),
  };

  const rawArchive: Record<string, unknown> = isPlainObject(raw.archive)
    ? raw.archive
    : {};
  const archive = makeArchiveDefaults();
  for (const key of ARCHIVE_CATEGORY_KEYS) {
    archive[key] = Array.isArray(rawArchive[key])
      ? (rawArchive[key] as ArchiveDocument[])
      : [];
  }
  for (const [key, val] of Object.entries(rawArchive)) {
    if (
      DANGEROUS_KEYS.has(key) ||
      (ARCHIVE_CATEGORY_KEYS as readonly string[]).includes(key)
    ) {
      continue;
    }
    if (Array.isArray(val)) {
      archive[key] = val as ArchiveDocument[];
    }
  }

  const rawGraphLayout = isPlainObject(raw.graph_layout) ? raw.graph_layout : null;
  const graph_layout = rawGraphLayout
    ? {
        nodes: isPlainObject(rawGraphLayout.nodes)
          ? (rawGraphLayout.nodes as WorldMaster['graph_layout'] extends infer G
              ? G extends { nodes: infer N }
                ? N
                : never
              : never)
          : {},
        zoom: typeof rawGraphLayout.zoom === 'number' ? rawGraphLayout.zoom : 1,
        panX: typeof rawGraphLayout.panX === 'number' ? rawGraphLayout.panX : 0,
        panY: typeof rawGraphLayout.panY === 'number' ? rawGraphLayout.panY : 0,
      }
    : { nodes: {}, zoom: 1, panX: 0, panY: 0 };

  return {
    id:
      typeof raw.id === 'string' && raw.id.length > 0
        ? raw.id
        : 'world_' + Math.random().toString(36).slice(2, 9),
    name: typeof raw.name === 'string' && raw.name.length > 0 ? raw.name : 'Nuevo Mundo',
    system_tag:
      typeof raw.system_tag === 'string' && raw.system_tag.length > 0
        ? raw.system_tag
        : 'narrativa-general',
    cover_gradient: typeof raw.cover_gradient === 'string' ? raw.cover_gradient : undefined,
    pixel_banner:
      typeof raw.pixel_banner === 'string' || isPlainObject(raw.pixel_banner)
        ? (raw.pixel_banner as WorldMaster['pixel_banner'])
        : undefined,
    last_edited:
      typeof raw.last_edited === 'string' && raw.last_edited.length > 0
        ? raw.last_edited
        : new Date().toISOString().slice(0, 10),
    modules,
    genre_tone: typeof raw.genre_tone === 'string' ? raw.genre_tone : '',
    internal_laws: Array.isArray(raw.internal_laws) ? raw.internal_laws : [],
    factions: Array.isArray(raw.factions) ? raw.factions : [],
    everyday_life: typeof raw.everyday_life === 'string' ? raw.everyday_life : '',
    economy_and_taboos:
      typeof raw.economy_and_taboos === 'string' ? raw.economy_and_taboos : '',
    history_timeline:
      typeof raw.history_timeline === 'string' ? raw.history_timeline : '',
    systems_and_limits:
      typeof raw.systems_and_limits === 'string' ? raw.systems_and_limits : '',
    lore_entries: Array.isArray(raw.lore_entries) ? raw.lore_entries : [],
    homebrew,
    archive,
    folder_notes: isPlainObject(raw.folder_notes)
      ? (raw.folder_notes as NonNullable<WorldMaster['folder_notes']>)
      : {},
    relations: Array.isArray(raw.relations) ? raw.relations : [],
    graph_layout,
    audit: isPlainObject(raw.audit)
      ? (raw.audit as Record<string, boolean>)
      : {},
    timeline_events: Array.isArray(raw.timeline_events) ? raw.timeline_events : [],
    maps: Array.isArray(raw.maps) ? raw.maps : [],
    calendar: isPlainObject(raw.calendar)
      ? (raw.calendar as WorldMaster['calendar'])
      : undefined,
    scenes_kanban: Array.isArray(raw.scenes_kanban) ? raw.scenes_kanban : [],
    initiative_encounter: isPlainObject(raw.initiative_encounter)
      ? (raw.initiative_encounter as WorldMaster['initiative_encounter'])
      : undefined,
  };
}

export function ensurePJDefaults(
  raw: Partial<PJMaster>,
  fallbackWorldId: string
): PJMaster {
  const mode = raw.mode === 'explicit' ? 'explicit' : 'sfw';
  const normalizedTom = Array.isArray(raw.theory_of_mind)
    ? raw.theory_of_mind
    : [];
  const merged = makePJ(
    raw.worldId || fallbackWorldId,
    raw.identity?.name || 'Sin nombre',
    {
      ...raw,
      schema_version: '1.0.0',
      mode,
      theory_of_mind: normalizedTom,
    } as DeepPartial<PJMaster>
  );
  merged.schema_version = '1.0.0';
  merged.mode = mode;
  return merged;
}

export function getAttrMeta(val: number): { mod: string; tierKey: string } {
  const n = Math.max(1, Math.min(10, Math.round(Number(val) || 5)));
  const modNum = n - 5;
  const mod = modNum >= 0 ? `+${modNum}` : String(modNum);
  if (n <= 2) return { mod, tierKey: 'pj.tiers.tier1' };
  if (n <= 4) return { mod, tierKey: 'pj.tiers.tier2' };
  if (n <= 6) return { mod, tierKey: 'pj.tiers.tier3' };
  if (n <= 8) return { mod, tierKey: 'pj.tiers.tier4' };
  return { mod, tierKey: 'pj.tiers.tier5' };
}
