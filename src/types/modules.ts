export type WorldModuleKey =
  | 'diceRoller'
  | 'rpgStatblocks'
  | 'initiativeTracker'
  | 'sceneKanban'
  | 'customCalendar'
  | 'playerView'
  | 'theoryOfMind'
  | 'intimateModule';

export interface WorldModulesConfig {
  diceRoller: boolean;
  rpgStatblocks: boolean;
  initiativeTracker: boolean;
  sceneKanban: boolean;
  customCalendar: boolean;
  playerView: boolean;
  theoryOfMind: boolean;
  intimateModule: boolean;
}

export interface TimelineEvent {
  id: string;
  title: string;
  date_label: string;
  order: number;
  duration?: number;
  track: string;
  faction_id?: string;
  character_ids?: string[];
  location_id?: string;
  summary: string;
  tags?: string[];
}

export type MapLevel = 'continent' | 'region' | 'city' | 'dungeon';

export type MapPinKind = 'location' | 'event' | 'portal' | 'danger';

export interface MapPin {
  id: string;
  label: string;
  x_pct: number;
  y_pct: number;
  kind?: MapPinKind;
  notes?: string;
  linked_location_id?: string;
  linked_event_id?: string;
  child_map_id?: string;
}

export interface WorldMap {
  id: string;
  name: string;
  level: MapLevel;
  parent_map_id?: string | null;
  image_src: string;
  asset_id?: string;
  description?: string;
  scale_leagues_per_100pct?: number;
  pins: MapPin[];
}

export interface CalendarMonth {
  name: string;
  days: number;
}

export interface WorldCalendar {
  name: string;
  era: string;
  current_year: number;
  current_month_idx: number;
  current_day: number;
  weekdays: string[];
  months: CalendarMonth[];
}

export type KanbanColumn = 'idea' | 'draft' | 'revision' | 'canon';

export interface KanbanSceneCard {
  id: string;
  title: string;
  column: KanbanColumn;
  summary: string;
  arc?: string;
  chapter_id?: string;
  character_ids?: string[];
  location_id?: string;
  tags?: string[];
  order: number;
}

export interface InitiativeCombatant {
  id: string;
  name: string;
  pj_id?: string;
  initiative: number;
  hp_current: number;
  hp_max: number;
  ac: number;
  conditions: string[];
  is_npc?: boolean;
}

export interface InitiativeEncounter {
  round: number;
  active_index: number;
  active?: boolean;
  combatants: InitiativeCombatant[];
}

export interface DiceRollRecord {
  id: string;
  expression: string;
  rolls: number[];
  modifier: number;
  total: number;
  label?: string;
  timestamp: string;
}
