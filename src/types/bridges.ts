import type { PJMaster, PJMode } from './character';

export interface PJMasterExport extends PJMaster {
  schema_version: '1.0.0';
  mode: PJMode;
}

export interface NexusV3Card {
  spec: 'chara_card_v3_nexus_extended' | 'chara_card_v3';
  spec_version: '3.0';
  avatar?: string;
  data: {
    name: string;
    internal_alias?: string;
    description?: string;
    personality?: string;
    first_mes?: string;
    amino_profile: {
      full_name: string;
      occupation_role: string;
      backstory_summary: string;
      core_motivation: string;
      species: string;
      virtues: string[];
      flaws: string[];
    };
    module_1_biometrics_and_sensory: {
      body_geometry: string;
      experience_and_virginity_status: string;
      local_explicit_slots: Record<string, unknown>;
    };
    module_2_psychological_triad: {
      social_mask: string;
      self_deception_rationalization: string;
      nuclear_desire_or_wound: string;
    };
    module_3_somatic_and_vocal_engine: {
      vocal_fingerprint: { cadence_and_sentence_length: string };
    };
    module_4_intimate_psychodynamics_lorebook:
      | {
          inject_only_at_stage_gte: number;
          solo_habits: { technique_and_rhythm: string };
          core_fantasies: string[];
        }
      | Record<string, never>;
    module_5_progression_clock_and_locks: {
      initial_control_pct: number;
      stages: {
        stage_1_barrier_0_25: { behavior: string };
        stage_2_fissure_26_50: { behavior: string };
        stage_3_double_standard_51_75: { behavior: string };
        stage_4_complicit_surrender_76_100: { behavior: string };
      };
      hard_locks: string[];
    };
    module_6_theory_of_mind_and_agency: {
      asymmetric_secret: string;
      interactive_environment_props: string[];
    };
    extensions?: {
      loreforge?: Partial<PJMaster>;
    };
  };
}

export interface LorebookEntry {
  uid: number;
  key: string[];
  keysecondary: string[];
  comment: string;
  content: string;
  constant: boolean;
  selective: boolean;
  order: number;
  position: number;
  disable: boolean;
}

export interface LorebookDocument {
  name: string;
  description: string;
  scanDepth: number;
  tokenBudget: number;
  recursiveScanning: boolean;
  extensions: Record<string, unknown>;
  entries: Record<string, LorebookEntry>;
}

export interface FoundryActorExport {
  name: string;
  type: 'character' | 'npc';
  img: string;
  system: {
    attributes: {
      abilities: Record<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA', { value: number; mod: number }>;
      hp?: { value: number; max: number };
      ac?: { value: number };
    };
    details: {
      biography: { value: string };
      species: string;
      homeland: string;
      alignment: string;
      occupation: string;
    };
    traits: {
      languages: { value: string[]; custom: string };
      traits: string[];
    };
  };
  prototypeToken: { name: string; texture: { src: string } };
  flags: { loreforge: { worldId?: string; pjId?: string; status?: string } };
}

export interface FoundryJournalPage {
  _id: string;
  name: string;
  type: 'text';
  text: { content: string; format: 1 };
}

export interface FoundryJournalEntryExport {
  name: string;
  pages: FoundryJournalPage[];
  flags: { loreforge: { category: string; docId: string } };
}

export interface FoundrySceneNote {
  x: number;
  y: number;
  text: string;
  entryId?: string;
}

export interface FoundrySceneExport {
  name: string;
  width: number;
  height: number;
  background: { src: string };
  notes: FoundrySceneNote[];
  flags: { loreforge: { mapId: string; level: string } };
}

export interface FoundryWorldBundle {
  world: { id: string; name: string; system: string; description: string };
  actors: FoundryActorExport[];
  journals: FoundryJournalEntryExport[];
  scenes: FoundrySceneExport[];
}
