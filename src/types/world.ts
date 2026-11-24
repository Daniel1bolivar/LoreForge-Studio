import type {
  InitiativeEncounter,
  KanbanSceneCard,
  TimelineEvent,
  WorldCalendar,
  WorldMap,
  WorldModulesConfig,
} from './modules';

export type ArchiveCategoryKey =
  | 'chapters'
  | 'locations'
  | 'events'
  | 'political_groups'
  | 'religious_groups'
  | 'magic_groups'
  | 'tech_groups'
  | 'items'
  | 'currencies'
  | 'myths';

export type TreeCategoryKey =
  | ArchiveCategoryKey
  | 'lore_entries'
  | 'characters'
  | 'factions'
  | 'species'
  | 'languages'
  | 'relations';

export type TreeCategoryKind =
  | 'archive'
  | 'lore'
  | 'pjs'
  | 'factions'
  | 'species'
  | 'languages'
  | 'relations';

export interface TreeCategoryDef {
  key: TreeCategoryKey;
  kind: TreeCategoryKind;
  labelKey: string;
  iconKey: string;
}

export interface WorldFaction {
  id?: string;
  name: string;
  type: string;
  details: string;
  color?: string;
}

export interface LoreEntry {
  term: string;
  keys: string;
  content: string;
}

export interface HomebrewLanguage {
  slug: string;
  label: string;
  custom?: boolean;
}

export type LanguageRarity = 'common' | 'uncommon' | 'rare' | 'secret' | 'unavailable';

export interface HomebrewLanguages {
  commonLanguage: string | null;
  registered: HomebrewLanguage[];
  uncommon: string[];
  rare: string[];
  secret: string[];
  unavailable: string[];
}

export interface HomebrewSpecies {
  slug: string;
  label: string;
  notes: string;
}

export interface HomebrewTrait {
  slug: string;
  label: string;
  category: string;
}

export interface WorldHomebrew {
  languages: HomebrewLanguages;
  species: HomebrewSpecies[];
  traits: HomebrewTrait[];
  trait_propagations?: Record<string, string[]>;
}

export interface PixelBannerConfig {
  seed: string;
  palette?: string[];
  style?: 'waves' | 'peaks' | 'grid' | 'constellation';
}

export interface FolderNoteEntry {
  title?: string;
  body_markdown: string;
  pixel_banner?: PixelBannerConfig | string;
}

export type FolderNoteValue = FolderNoteEntry | string;

export type ChapterTone = 'dark' | 'lumina' | 'mixed';
export type ChapterMilestone = 'start' | 'midpoint' | 'climax' | 'ending';

export interface ArchiveDocument {
  id: string;
  title: string;
  subtitle?: string;
  summary: string;
  tags?: string[];
  body_markdown?: string;
  is_folder_note?: boolean;
  pixel_banner?: PixelBannerConfig | string;
  updated_at?: string;
  parent_id?: string | null;
  tone?: ChapterTone;
  milestone?: ChapterMilestone;
  tracker_badge?: string;
}

export type WorldArchive = Record<ArchiveCategoryKey, ArchiveDocument[]> &
  Record<string, ArchiveDocument[]>;

export interface WorldRelation {
  id: string;
  from: string;
  relation: string;
  to: string;
  notes?: string;
  from_id?: string;
  to_id?: string;
  color?: string;
  bidirectional?: boolean;
  faction_tag?: string;
  strength?: number;
}

export interface GraphNodePosition {
  x: number;
  y: number;
  pinned?: boolean;
}

export interface WorldGraphLayout {
  nodes: Record<string, GraphNodePosition>;
  zoom?: number;
  panX?: number;
  panY?: number;
}

export type MagicSystemType = 'hard' | 'soft' | 'hybrid';

export interface WorldRealismOptions {
  economy_inflation?: boolean;
  travel_logistics?: boolean;
  crude_medicine?: boolean;
  borders_bureaucracy?: boolean;
  resource_ecology?: boolean;
}

export interface MagicPathEntry {
  name: string;
  ancient_name?: string;
  nickname?: string;
  domain: string;
  cost: string;
}

export interface MagicStudioConfig {
  enabled?: boolean;
  hardness_level?: 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI' | 'VII' | 'VI+III';
  constructive_rule?: string;
  categorical_rule?: string;
  static_rule?: string;
  empty_rule?: string;
  everyday_tactics?: {
    sense?: string;
    defend?: string;
    escalate?: string;
  };
  paths?: MagicPathEntry[];
}

export interface ConlangGlossaryEntry {
  root: string;
  gloss: string;
  category?: string;
}

export interface ConlangSpellEntry {
  title: string;
  text: string;
  translation: string;
}

export interface ConlangStudioConfig {
  enabled?: boolean;
  name?: string;
  sound_family?: string;
  diacritics?: string;
  syntax_order?: string;
  cases?: string;
  verb_modes?: string;
  glossary?: ConlangGlossaryEntry[];
  spells?: ConlangSpellEntry[];
}

export interface WorldMaster {
  id: string;
  name: string;
  system_tag?: string;
  cover_gradient?: string;
  pixel_banner?: PixelBannerConfig | string;
  last_edited?: string;
  modules?: WorldModulesConfig;
  genre_tone: string;
  magic_system_type?: MagicSystemType;
  realism_options?: WorldRealismOptions;
  magic_studio?: MagicStudioConfig;
  conlang_studio?: ConlangStudioConfig;
  internal_laws: string[];
  factions: WorldFaction[];
  everyday_life?: string;
  economy_and_taboos?: string;
  history_timeline?: string;
  systems_and_limits?: string;
  lore_entries?: LoreEntry[];
  homebrew: WorldHomebrew;
  archive?: WorldArchive;
  folder_notes?: Record<string, FolderNoteValue>;
  relations?: WorldRelation[];
  graph_layout?: WorldGraphLayout;
  audit?: Record<string, boolean>;
  timeline_events?: TimelineEvent[];
  maps?: WorldMap[];
  calendar?: WorldCalendar;
  scenes_kanban?: KanbanSceneCard[];
  initiative_encounter?: InitiativeEncounter;
}
