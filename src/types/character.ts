export type PJMode = 'sfw' | 'explicit';
export type PJStatus = 'alive' | 'deceased' | 'missing' | 'unknown';

export interface PJVariant {
  id?: string;
  label: string;
  source: string;
  notes: string;
  apply_name?: string;
  apply_alias?: string;
  apply_species?: string;
}

export interface PJIdentity {
  name: string;
  internal_alias?: string;
  age?: number | string;
  species_lineage: string;
  role_occupation: string;
  homeland: string;
  deity_creed?: string;
  alignment_morality?: string;
  languages?: string[];
  virtues?: string[];
  flaws?: string[];
}

export interface PJAttributes {
  STR: number;
  DEX: number;
  CON: number;
  INT: number;
  WIS: number;
  CHA: number;
}

export interface PJCompetencies {
  knowledge?: string[];
  craft?: string[];
  profession?: string[];
  special_training?: string[];
}

export interface PJWorldbuilding101 {
  core_motivation: string;
  everyday_life: string;
  off_screen_life: string;
  personal_history: string;
  anchor_props?: string[];
}

export interface PJActiveParadox {
  spoken_dialogue?: string;
  body_betrayal?: string;
  hidden_thought?: string;
}

export interface PJPsychology {
  social_mask?: string;
  self_deception?: string;
  nuclear_desire_or_wound?: string;
  active_paradox?: PJActiveParadox;
  asymmetric_secret?: string;
  autonomous_scene_agenda?: string[];
}

export interface PJBiometricsAndVoice {
  height_cm?: number;
  weight_kg?: number;
  appearance_summary?: string;
  posture_and_gait?: string;
  scent_and_marks?: string;
  signature_wardrobe?: string[];
  vocal_fingerprint?: string;
}

export interface PJProgressionStages {
  initial_control_pct?: number;
  stage_1_barrier?: string;
  stage_2_fissure?: string;
  stage_3_double_standard?: string;
  stage_4_surrender?: string;
}

export interface PJIntimateModule {
  enabled?: boolean;
  experience_status?: string;
  anatomy_and_sensory?: string;
  core_fantasies_and_fetishes?: string[];
  solo_habits?: string;
  post_climax_ritual?: string;
  progression_stages?: PJProgressionStages;
  regression_triggers?: string[];
  hard_locks?: string[];
}

export interface PJRpgAttack {
  id?: string;
  name: string;
  bonus: string;
  damage: string;
  notes?: string;
}

export interface PJRpgAbility {
  name: string;
  description: string;
}

export interface PJRpgResource {
  name: string;
  current: number;
  max: number;
}

export interface PJRpgStatblock {
  level?: number;
  class_or_archetype?: string;
  hp?: number;
  max_hp?: number;
  ac?: number;
  speed?: string;
  initiative_bonus?: number;
  proficiency_bonus?: number;
  attacks?: PJRpgAttack[];
  abilities?: PJRpgAbility[];
  resources?: PJRpgResource[];
  notes?: string;
}

export interface TheoryOfMindEntry {
  target_id: string;
  target_name?: string;
  knows: string[];
  suspects?: string[];
  hides?: string[];
  misconception?: string;
}

export interface PJCommunicationMode {
  mode: string;
  range?: string;
  notes?: string;
}

export interface PJMaster {
  schema_version: '1.0.0';
  id?: string;
  worldId?: string;
  avatar?: string;
  mode: PJMode;
  status?: PJStatus;
  death_order?: number | null;
  death_event_id?: string | null;
  canonical_version?: string;
  variants?: PJVariant[];
  identity: PJIdentity;
  attributes: PJAttributes;
  competencies?: PJCompetencies;
  worldbuilding_101: PJWorldbuilding101;
  psychology: PJPsychology;
  biometrics_and_voice?: PJBiometricsAndVoice;
  intimate_module?: PJIntimateModule;
  rpg_statblock?: PJRpgStatblock;
  theory_of_mind?: TheoryOfMindEntry[];
  communication_modes?: PJCommunicationMode[];
  traits?: string[];
}
