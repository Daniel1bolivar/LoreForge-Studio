import type { PJMaster } from './character';
import type { DiceRollRecord } from './modules';
import type { WorldMaster } from './world';

export type ThemeId = 'pergamino' | 'grimorio' | 'dossier' | 'cyberpunk';
export type Locale = 'es' | 'en';
export type HomebrewTab = 'languages' | 'species' | 'traits';
export type SheetSectionFilter = 'all' | 'identidad' | 'rpg' | 'wb' | 'psico' | 'intimo';

export type ViewId =
  | 'dashboard'
  | 'pj'
  | 'world'
  | 'worlds'
  | 'gallery'
  | 'doc'
  | 'relations'
  | 'graph'
  | 'timeline'
  | 'maps'
  | 'contradictions'
  | 'rpg'
  | 'kanban'
  | 'calendar'
  | 'player'
  | 'tom'
  | 'export';

export interface AppState {
  theme: ThemeId;
  locale: Locale;
  rpgMode: boolean;
  explicitMode: boolean;
  activeView: ViewId;
  activeSection: SheetSectionFilter;
  activeHomebrewTab: HomebrewTab;
  activeGalleryCat: string;
  activeDocCat: string;
  activeDocId: string;
  activeMapId: string;
  treeFilter: string;
  sidebarCollapsed: boolean;
  lastPjByWorld: Record<string, string>;
  treeExpanded: Record<string, boolean>;
  activeWorldId: string;
  activePjId: string;
  worlds: WorldMaster[];
  pjs: PJMaster[];
  diceHistory?: DiceRollRecord[];
}

export interface ProjectFileEnvelope {
  schema_version: '2.0.0';
  saved_at: string;
  state: AppState;
}

export interface StoreMutationResult<T = void> {
  ok: boolean;
  data?: T;
  errorKey?: string;
  errorParams?: Record<string, string | number>;
}
