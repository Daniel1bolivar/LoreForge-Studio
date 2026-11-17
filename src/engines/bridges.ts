import type {
  FoundryActorExport,
  FoundryJournalEntryExport,
  FoundrySceneExport,
  FoundryWorldBundle,
  LorebookDocument,
  LorebookEntry,
  NexusV3Card,
  PJMaster,
  WorldMaster,
} from '../types';
import { ARCHIVE_CATEGORY_KEYS } from '../state/defaults';
import { stripMarkdown } from './wikilinks';

export function exportPJMaster(pj: PJMaster, includeIntimate: boolean): PJMaster {
  const copy = JSON.parse(JSON.stringify(pj)) as PJMaster;
  copy.schema_version = '1.0.0';
  copy.mode = includeIntimate ? 'explicit' : 'sfw';
  if (!includeIntimate) delete copy.intimate_module;
  return copy;
}

export function exportNexusV3(pj: PJMaster, includeIntimate: boolean): NexusV3Card {
  const im = pj.intimate_module || {};
  const stages = im.progression_stages || {};
  return {
    spec: 'chara_card_v3_nexus_extended',
    spec_version: '3.0',
    avatar: pj.avatar || '',
    data: {
      name: pj.identity.name,
      internal_alias: pj.identity.internal_alias,
      amino_profile: {
        full_name: pj.identity.name,
        occupation_role: pj.identity.role_occupation,
        backstory_summary: pj.worldbuilding_101.personal_history,
        core_motivation: pj.worldbuilding_101.core_motivation,
        species: pj.identity.species_lineage,
        virtues: pj.identity.virtues || [],
        flaws: pj.identity.flaws || [],
      },
      module_1_biometrics_and_sensory: {
        body_geometry: pj.biometrics_and_voice?.appearance_summary || '',
        experience_and_virginity_status: includeIntimate ? im.experience_status || '' : '',
        local_explicit_slots: includeIntimate ? { anatomy_proportions_and_tone: im.anatomy_and_sensory || '' } : {},
      },
      module_2_psychological_triad: {
        social_mask: pj.psychology.social_mask || '',
        self_deception_rationalization: pj.psychology.self_deception || '',
        nuclear_desire_or_wound: pj.psychology.nuclear_desire_or_wound || '',
      },
      module_3_somatic_and_vocal_engine: {
        vocal_fingerprint: { cadence_and_sentence_length: pj.biometrics_and_voice?.vocal_fingerprint || '' },
      },
      module_4_intimate_psychodynamics_lorebook: includeIntimate
        ? {
            inject_only_at_stage_gte: 3,
            solo_habits: { technique_and_rhythm: im.solo_habits || '' },
            core_fantasies: im.core_fantasies_and_fetishes || [],
          }
        : {},
      module_5_progression_clock_and_locks: {
        initial_control_pct: includeIntimate ? stages.initial_control_pct ?? 95 : 100,
        stages: {
          stage_1_barrier_0_25: { behavior: includeIntimate ? stages.stage_1_barrier || '' : '' },
          stage_2_fissure_26_50: { behavior: includeIntimate ? stages.stage_2_fissure || '' : '' },
          stage_3_double_standard_51_75: { behavior: includeIntimate ? stages.stage_3_double_standard || '' : '' },
          stage_4_complicit_surrender_76_100: { behavior: includeIntimate ? stages.stage_4_surrender || '' : '' },
        },
        hard_locks: includeIntimate ? im.hard_locks || [] : [],
      },
      module_6_theory_of_mind_and_agency: {
        asymmetric_secret: pj.psychology.asymmetric_secret || '',
        interactive_environment_props: pj.worldbuilding_101.anchor_props || [],
      },
    },
  };
}

export function exportLorebook(world: WorldMaster, pjs: PJMaster[]): LorebookDocument {
  const entries: Record<string, LorebookEntry> = {};
  let uid = 0;
  const push = (comment: string, keys: string[], content: string, constant = false) => {
    const text = content.trim();
    if (!text) return;
    entries[String(uid)] = {
      uid,
      key: keys.filter(Boolean),
      keysecondary: [],
      comment,
      content: text,
      constant,
      selective: !constant,
      order: 100 - uid,
      position: 0,
      disable: false,
    };
    uid += 1;
  };
  if (world.internal_laws?.length) push('World laws', ['law', 'rule'], world.internal_laws.join('\n'), true);
  if (world.systems_and_limits) push('Systems and limits', ['system', 'magic', 'technology'], world.systems_and_limits);
  for (const f of world.factions || []) push(`${f.type}: ${f.name}`, [f.name.toLowerCase()], f.details);
  for (const l of world.lore_entries || []) {
    push(l.term, l.keys.split(',').map((k) => k.trim()), l.content);
  }
  for (const cat of ARCHIVE_CATEGORY_KEYS) {
    for (const d of world.archive?.[cat] || []) {
      push(d.title, [d.title.toLowerCase(), ...(d.tags || [])], stripMarkdown(d.body_markdown || d.summary));
    }
  }
  for (const pj of pjs) {
    push(
      `Character: ${pj.identity.name}`,
      [pj.identity.name.toLowerCase(), (pj.identity.internal_alias || '').toLowerCase()],
      [pj.identity.role_occupation, pj.worldbuilding_101.core_motivation, pj.worldbuilding_101.personal_history]
        .filter(Boolean)
        .join('\n')
    );
  }
  return {
    name: world.name,
    description: world.genre_tone,
    scanDepth: 4,
    tokenBudget: 512,
    recursiveScanning: true,
    extensions: {},
    entries,
  };
}

function abilityEntry(score: number): { value: number; mod: number } {
  const value = Math.max(1, Math.min(30, Math.round(score * 2)));
  return { value, mod: Math.floor((value - 10) / 2) };
}

export function exportFoundry(world: WorldMaster, pjs: PJMaster[]): FoundryWorldBundle {
  const actors: FoundryActorExport[] = pjs.map((pj) => ({
    name: pj.identity.name,
    type: 'character',
    img: pj.avatar || 'icons/svg/mystery-man.svg',
    system: {
      attributes: {
        abilities: {
          STR: abilityEntry(pj.attributes.STR),
          DEX: abilityEntry(pj.attributes.DEX),
          CON: abilityEntry(pj.attributes.CON),
          INT: abilityEntry(pj.attributes.INT),
          WIS: abilityEntry(pj.attributes.WIS),
          CHA: abilityEntry(pj.attributes.CHA),
        },
        hp: pj.rpg_statblock?.hp !== undefined ? { value: pj.rpg_statblock.hp, max: pj.rpg_statblock.max_hp ?? pj.rpg_statblock.hp } : undefined,
        ac: pj.rpg_statblock?.ac !== undefined ? { value: pj.rpg_statblock.ac } : undefined,
      },
      details: {
        biography: { value: `<p>${(pj.worldbuilding_101.personal_history || '').replace(/</g, '&lt;')}</p>` },
        species: pj.identity.species_lineage,
        homeland: pj.identity.homeland,
        alignment: pj.identity.alignment_morality || '',
        occupation: pj.identity.role_occupation,
      },
      traits: {
        languages: { value: [], custom: (pj.identity.languages || []).join('; ') },
        traits: pj.traits || [],
      },
    },
    prototypeToken: { name: pj.identity.name, texture: { src: pj.avatar || 'icons/svg/mystery-man.svg' } },
    flags: { loreforge: { worldId: world.id, pjId: pj.id, status: pj.status } },
  }));

  const journals: FoundryJournalEntryExport[] = [];
  for (const cat of ARCHIVE_CATEGORY_KEYS) {
    for (const d of world.archive?.[cat] || []) {
      journals.push({
        name: d.title,
        pages: [
          {
            _id: d.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16).padEnd(16, '0'),
            name: d.title,
            type: 'text',
            text: { content: `<p>${(stripMarkdown(d.body_markdown || d.summary)).replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>`, format: 1 },
          },
        ],
        flags: { loreforge: { category: cat, docId: d.id } },
      });
    }
  }

  const scenes: FoundrySceneExport[] = (world.maps || []).map((m) => ({
    name: m.name,
    width: 4000,
    height: 3000,
    background: { src: m.image_src.startsWith('data:') ? '' : m.image_src },
    notes: m.pins.map((p) => ({ x: Math.round((p.x_pct / 100) * 4000), y: Math.round((p.y_pct / 100) * 3000), text: p.label })),
    flags: { loreforge: { mapId: m.id, level: m.level } },
  }));

  return {
    world: { id: world.id, name: world.name, system: world.system_tag || 'generic', description: world.genre_tone },
    actors,
    journals,
    scenes,
  };
}

// ---------- Importers (pure conversions) ----------

export type ImportKind = 'project' | 'pj-master' | 'nexus' | 'lorebook' | 'world' | 'unknown';

export function detectImportKind(data: unknown): ImportKind {
  if (!data || typeof data !== 'object') return 'unknown';
  const rec = data as Record<string, unknown>;
  if ('state' in rec && rec.state && typeof rec.state === 'object') return 'project';
  if (Array.isArray(rec.worlds)) return 'project';
  if (typeof rec.spec === 'string' && rec.spec.startsWith('chara_card_v3')) return 'nexus';
  if (rec.entries && typeof rec.entries === 'object' && !Array.isArray(rec.entries)) return 'lorebook';
  if (rec.identity && rec.worldbuilding_101) return 'pj-master';
  if (rec.homebrew && rec.factions) return 'world';
  return 'unknown';
}

export function nexusToPJPatch(card: NexusV3Card): Partial<PJMaster> & { identity: PJMaster['identity'] } {
  const d = card.data;
  return {
    avatar: card.avatar || '',
    identity: {
      name: d.name || 'Imported',
      internal_alias: d.internal_alias || '',
      species_lineage: d.amino_profile?.species || '',
      role_occupation: d.amino_profile?.occupation_role || '',
      homeland: '',
      virtues: d.amino_profile?.virtues || [],
      flaws: d.amino_profile?.flaws || [],
    },
    worldbuilding_101: {
      core_motivation: d.amino_profile?.core_motivation || '',
      everyday_life: '',
      off_screen_life: '',
      personal_history: d.amino_profile?.backstory_summary || '',
      anchor_props: d.module_6_theory_of_mind_and_agency?.interactive_environment_props || [],
    },
    psychology: {
      social_mask: d.module_2_psychological_triad?.social_mask || '',
      self_deception: d.module_2_psychological_triad?.self_deception_rationalization || '',
      nuclear_desire_or_wound: d.module_2_psychological_triad?.nuclear_desire_or_wound || '',
      asymmetric_secret: d.module_6_theory_of_mind_and_agency?.asymmetric_secret || '',
    },
    biometrics_and_voice: {
      appearance_summary: d.module_1_biometrics_and_sensory?.body_geometry || '',
      vocal_fingerprint: d.module_3_somatic_and_vocal_engine?.vocal_fingerprint?.cadence_and_sentence_length || '',
    },
  };
}

export function lorebookToLore(doc: LorebookDocument): Array<{ term: string; keys: string; content: string }> {
  return Object.values(doc.entries || {}).map((e) => ({
    term: e.comment || 'Entry',
    keys: Array.isArray(e.key) ? e.key.join(', ') : '',
    content: e.content || '',
  }));
}
