import { t } from '../i18n';
import {
  deletePj,
  createPj,
  getActivePJ,
  getActiveWorld,
  getState,
  isIntimateActive,
  isModuleEnabled,
  recordDiceRoll,
  setSection,
  setView,
  updatePj,
} from '../state/store';
import type { PJMaster, SheetSectionFilter } from '../types';
import { getAttrMeta } from '../state/defaults';
import { rollExpression } from '../engines/dice';
import { h, readImageScaled, toast } from '../ui/dom';
import { icon } from '../ui/icons';
import { attachWikiAutocomplete, richText } from '../ui/rich';
import { refreshChrome } from '../ui/runtime';
import {
  badge,
  btn,
  confirmDialog,
  emptyState,
  field,
  promptDialog,
  section,
  selectBox,
  textArea,
  textInput,
} from '../ui/widgets';

type Path = string;

function getPath(obj: unknown, path: Path): unknown {
  return path.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), obj);
}

function setPath(obj: unknown, path: Path, value: unknown): void {
  const keys = path.split('.');
  let cur = obj as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i += 1) {
    const next = cur[keys[i]];
    if (!next || typeof next !== 'object') cur[keys[i]] = {};
    cur = cur[keys[i]] as Record<string, unknown>;
  }
  cur[keys[keys.length - 1]] = value;
}

function chipGroup(
  options: string[],
  isActive: (o: string) => boolean,
  onToggle: (o: string) => void,
  label: string
): HTMLElement {
  return h(
    'div',
    { class: 'chip-row', role: 'group', 'aria-label': label },
    ...options.map((o) =>
      h(
        'button',
        { type: 'button', class: `chip${isActive(o) ? ' active' : ''}`, 'aria-pressed': isActive(o) ? 'true' : 'false', onClick: () => onToggle(o) },
        o
      )
    )
  );
}

function splitList(v: string): string[] {
  return v.split(',').map((x) => x.trim()).filter(Boolean);
}

export function renderPJ(): HTMLElement {
  const pj = getActivePJ();
  if (!pj || !pj.id) {
    return h(
      'div',
      { class: 'view' },
      emptyState(
        t('pj.none'),
        btn(t('gallery.newCharacter'), () => promptDialog(t('gallery.newCharacter'), t('common.name'), '', (n) => { createPj(n); }), { icon: 'plus', variant: 'primary' })
      )
    );
  }
  const pjId = pj.id;
  const world = getActiveWorld();
  const s = getState();
  const edit = (fn: (p: PJMaster) => void) => {
    updatePj(pjId, fn);
  };
  const bindText = (path: Path, opts: { area?: boolean; rows?: number; wiki?: boolean; list?: boolean } = {}) => {
    const raw = getPath(pj, path);
    const current = opts.list ? (Array.isArray(raw) ? (raw as string[]).join(', ') : '') : String(raw ?? '');
    const onInput = (v: string) => {
      const next = opts.list ? splitList(v) : v;
      setPath(pj, path, next);
      edit((p) => setPath(p, path, next));
    };
    if (opts.area) {
      const el = textArea({ value: current, rows: opts.rows || 3, onInput });
      if (opts.wiki) attachWikiAutocomplete(el);
      return el;
    }
    return textInput({ value: current, onInput });
  };

  const rpgAvailable = s.rpgMode || isModuleEnabled(world, 'rpgStatblocks');
  const intimate = isIntimateActive(s, world);
  const section_ = s.activeSection;
  const show = (g: SheetSectionFilter) => section_ === 'all' || section_ === g;

  // Portrait
  const fileInput = h('input', { type: 'file', accept: 'image/*', class: 'visually-hidden', 'aria-label': t('pj.portraitModal'), tabindex: -1 });
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    try {
      const data = await readImageScaled(f, 360);
      edit((p) => { p.avatar = data; });
    } catch {
      toast(t('errors.fileReadError'));
    }
  });
  const portrait = h(
    'button',
    { type: 'button', class: 'portrait', 'aria-label': t('pj.portraitModal'), onClick: () => fileInput.click() },
    pj.avatar ? h('img', { src: pj.avatar, alt: pj.identity.name }) : icon('user', 56),
    h('span', { class: 'portrait-hint' }, t('pj.changePortrait'))
  );

  // Hero
  const nameInput = textInput({
    value: pj.identity.name,
    class: 'hero-name-input',
    ariaLabel: t('common.name'),
    onInput: (v) => {
      pj.identity.name = v;
      edit((p) => { p.identity.name = v; });
      refreshChrome();
    },
  });

  const locations = (world.archive?.locations || []).map((d) => d.title.split('(')[0].trim()).filter(Boolean);
  const homelandInput = bindText('identity.homeland') as HTMLInputElement;
  const speciesInput = bindText('identity.species_lineage') as HTMLInputElement;
  const deityInput = bindText('identity.deity_creed') as HTMLInputElement;
  const languagesInput = bindText('identity.languages', { list: true }) as HTMLInputElement;

  const quickSet = (path: Path, input: HTMLInputElement, value: string) => {
    input.value = value;
    setPath(pj, path, value);
    edit((p) => setPath(p, path, value));
  };

  const speciesChips = chipGroup(
    world.homebrew.species.map((sp) => sp.label),
    (o) => (pj.identity.species_lineage || '').toLowerCase() === o.toLowerCase(),
    (o) => quickSet('identity.species_lineage', speciesInput, o),
    t('pj.fields.species')
  );
  const homelandChips = locations.length
    ? chipGroup(locations, (o) => (pj.identity.homeland || '').toLowerCase().includes(o.toLowerCase()), (o) => quickSet('identity.homeland', homelandInput, o), t('pj.fields.homeland'))
    : null;
  const deityChips = world.factions.length
    ? chipGroup(world.factions.map((f) => f.name), (o) => (pj.identity.deity_creed || '').toLowerCase().includes(o.toLowerCase()), (o) => quickSet('identity.deity_creed', deityInput, o), t('pj.fields.faction'))
    : null;
  const langOptions = world.homebrew.languages.registered
    .filter((l) => !world.homebrew.languages.unavailable.includes(l.slug))
    .map((l) => l.label);
  const langChips = chipGroup(
    langOptions,
    (o) => (pj.identity.languages || []).some((l) => l.toLowerCase() === o.toLowerCase()),
    (o) => {
      const list = [...(pj.identity.languages || [])];
      const idx = list.findIndex((l) => l.toLowerCase() === o.toLowerCase());
      if (idx >= 0) list.splice(idx, 1);
      else list.push(o);
      pj.identity.languages = list;
      languagesInput.value = list.join(', ');
      edit((p) => { p.identity.languages = list; });
    },
    t('pj.fields.languages')
  );

  const statusSelect = selectBox(
    (['alive', 'deceased', 'missing', 'unknown'] as const).map((k) => ({ value: k, label: t(`pj.status.${k}`) })),
    pj.status || 'alive',
    (v) => edit((p) => { p.status = v as PJMaster['status']; })
  );

  const tabs: Array<[SheetSectionFilter, string]> = [
    ['all', 'pj.tabs.all'],
    ['identidad', 'pj.tabs.identidad'],
    ['wb', 'pj.tabs.wb'],
    ['psico', 'pj.tabs.psico'],
  ];
  if (rpgAvailable) tabs.splice(2, 0, ['rpg', 'pj.tabs.rpg']);
  if (intimate) tabs.push(['intimo', 'pj.tabs.intimo']);

  const tabBar = h(
    'nav',
    { class: 'tabs', 'aria-label': t('pj.tabsLabel') },
    ...tabs.map(([key, label]) =>
      h('button', { type: 'button', class: `tab${section_ === key ? ' active' : ''}`, 'aria-pressed': section_ === key ? 'true' : 'false', onClick: () => setSection(key) }, t(label))
    )
  );

  const sections: HTMLElement[] = [];

  if (show('identidad')) {
    const variantsPanel = (pj.variants || []).length
      ? section(
          t('pj.variants'),
          h('p', { class: 'muted' }, pj.canonical_version ? t('pj.canonical', { label: pj.canonical_version }) : t('pj.noCanonical')),
          h(
            'div',
            { class: 'stack' },
            ...(pj.variants || []).map((v) => {
              const isCanon = pj.canonical_version === v.label;
              return h(
                'div',
                { class: `variant${isCanon ? ' canonical' : ''}` },
                h('div', null, h('strong', null, v.label), h('small', { class: 'muted' }, ` ${v.source}`), h('p', null, v.notes)),
                btn(isCanon ? t('pj.isFinal') : t('pj.setFinal'), () => {
                  edit((p) => {
                    if (v.apply_name) p.identity.name = v.apply_name;
                    if (v.apply_alias) p.identity.internal_alias = v.apply_alias;
                    if (v.apply_species) p.identity.species_lineage = v.apply_species;
                    p.canonical_version = v.label;
                  });
                  toast(t('pj.canonicalSet', { label: v.label }));
                }, { variant: isCanon ? 'primary' : 'ghost', small: true })
              );
            })
          )
        )
      : null;
    sections.push(
      section(
        t('pj.identity'),
        h(
          'div',
          { class: 'form-grid' },
          field(t('pj.fields.species'), speciesInput, ''),
          field(t('pj.fields.faction'), deityInput),
          field(t('pj.fields.alignment'), bindText('identity.alignment_morality')),
          field(t('pj.fields.age'), bindText('identity.age')),
          field(t('pj.fields.languages'), languagesInput, 'span-2'),
          field(t('pj.fields.virtues'), bindText('identity.virtues', { list: true })),
          field(t('pj.fields.flaws'), bindText('identity.flaws', { list: true }))
        ),
        h('div', { class: 'quick-block' }, h('small', { class: 'muted' }, t('pj.fields.species')), speciesChips),
        deityChips ? h('div', { class: 'quick-block' }, h('small', { class: 'muted' }, t('pj.fields.faction')), deityChips) : null,
        h('div', { class: 'quick-block' }, h('small', { class: 'muted' }, t('pj.fields.languages')), langChips)
      )
    );
    if (variantsPanel) sections.push(variantsPanel);
  }

  if (show('rpg') && rpgAvailable) {
    const attrs = h(
      'div',
      { class: 'attr-grid' },
      ...(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const).map((k) => {
        const meta = getAttrMeta(pj.attributes[k]);
        const out = h('output', null, `${pj.attributes[k]} (${meta.mod})`);
        const tier = h('small', { class: 'muted' }, t(`pj.${meta.tierKey}`));
        const range = h('input', { type: 'range', min: 1, max: 10, step: 1, value: String(pj.attributes[k]), 'aria-label': k });
        range.addEventListener('input', () => {
          const v = Number(range.value);
          pj.attributes[k] = v;
          const m = getAttrMeta(v);
          out.textContent = `${v} (${m.mod})`;
          tier.textContent = t(`pj.${m.tierKey}`);
          edit((p) => { p.attributes[k] = v; });
        });
        const rollBtn = isModuleEnabled(world, 'diceRoller')
          ? h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('rpg.rollAttr', { attr: k }), title: t('rpg.rollAttr', { attr: k }), onClick: () => {
              const mod = Math.floor((Math.round(pj.attributes[k] * 2) - 10) / 2);
              const res = rollExpression(`1d20${mod >= 0 ? '+' : ''}${mod}`, `${pj.identity.name} ${k}`);
              if (res.ok && res.record) {
                recordDiceRoll(res.record);
                toast(`${k}: ${res.record.total}`);
              }
            } }, icon('dice', 16))
          : null;
        return h('div', { class: 'attr' }, h('span', { class: 'attr-name' }, k), range, out, tier, rollBtn);
      })
    );
    const sb = pj.rpg_statblock || {};
    const sbField = (label: string, key: 'hp' | 'max_hp' | 'ac' | 'level') =>
      field(label, textInput({
        type: 'number',
        value: sb[key] !== undefined ? String(sb[key]) : '',
        onInput: (v) => {
          const n = v === '' ? undefined : Number(v);
          edit((p) => {
            p.rpg_statblock = { ...(p.rpg_statblock || {}), [key]: n };
          });
        },
      }));
    sections.push(
      section(
        t('pj.attributes'),
        attrs,
        h(
          'div',
          { class: 'form-grid' },
          field(t('pj.comp.knowledge'), bindText('competencies.knowledge', { list: true })),
          field(t('pj.comp.craft'), bindText('competencies.craft', { list: true })),
          field(t('pj.comp.profession'), bindText('competencies.profession', { list: true })),
          field(t('pj.comp.training'), bindText('competencies.special_training', { list: true }))
        )
      )
    );
    if (isModuleEnabled(world, 'rpgStatblocks')) {
      sections.push(
        section(
          t('rpg.statblock'),
          h(
            'div',
            { class: 'form-grid' },
            sbField(t('rpg.level'), 'level'),
            sbField(t('rpg.hp'), 'hp'),
            sbField(t('rpg.maxHp'), 'max_hp'),
            sbField(t('rpg.ac'), 'ac'),
            field(t('rpg.class'), textInput({
              value: sb.class_or_archetype || '',
              onInput: (v) => edit((p) => { p.rpg_statblock = { ...(p.rpg_statblock || {}), class_or_archetype: v }; }),
            })),
            field(t('rpg.speed'), textInput({
              value: sb.speed || '',
              onInput: (v) => edit((p) => { p.rpg_statblock = { ...(p.rpg_statblock || {}), speed: v }; }),
            }))
          ),
          field(t('rpg.notes'), textArea({
            value: sb.notes || '',
            rows: 3,
            onInput: (v) => edit((p) => { p.rpg_statblock = { ...(p.rpg_statblock || {}), notes: v }; }),
          }))
        )
      );
    }
  }

  if (show('wb')) {
    sections.push(
      section(
        t('pj.wb101'),
        h(
          'div',
          { class: 'form-grid' },
          field(t('pj.fields.motive'), bindText('worldbuilding_101.core_motivation', { area: true, wiki: true })),
          field(t('pj.fields.everyday'), bindText('worldbuilding_101.everyday_life', { area: true, wiki: true })),
          field(t('pj.fields.offscreen'), bindText('worldbuilding_101.off_screen_life', { area: true, wiki: true })),
          field(t('pj.fields.history'), bindText('worldbuilding_101.personal_history', { area: true, rows: 5, wiki: true })),
          field(t('pj.fields.props'), bindText('worldbuilding_101.anchor_props', { list: true }), 'span-2')
        ),
        pj.worldbuilding_101.personal_history.includes('[[')
          ? h('div', { class: 'field' }, h('span', { class: 'field-label' }, t('doc.preview')), richText(pj.worldbuilding_101.personal_history))
          : null
      )
    );
  }

  if (show('psico')) {
    sections.push(
      section(
        t('pj.psychology'),
        h(
          'div',
          { class: 'form-grid' },
          field(t('pj.fields.mask'), bindText('psychology.social_mask', { area: true })),
          field(t('pj.fields.deception'), bindText('psychology.self_deception', { area: true })),
          field(t('pj.fields.wound'), bindText('psychology.nuclear_desire_or_wound', { area: true })),
          field(t('pj.fields.secret'), bindText('psychology.asymmetric_secret', { area: true })),
          field(t('pj.fields.appearance'), bindText('biometrics_and_voice.appearance_summary', { area: true })),
          field(t('pj.fields.voice'), bindText('biometrics_and_voice.vocal_fingerprint', { area: true }))
        )
      ),
      section(
        t('pj.activeParadox'),
        h(
          'div',
          { class: 'form-grid' },
          field(t('pj.fields.spoken'), bindText('psychology.active_paradox.spoken_dialogue', { area: true, rows: 2 })),
          field(t('pj.fields.body'), bindText('psychology.active_paradox.body_betrayal', { area: true, rows: 2 })),
          field(t('pj.fields.hidden'), bindText('psychology.active_paradox.hidden_thought', { area: true, rows: 2 }))
        )
      )
    );
  }

  if (show('intimo') && intimate) {
    sections.push(
      section(
        t('pj.intimateTitle'),
        h('p', { class: 'muted' }, t('pj.intimateHint')),
        h(
          'div',
          { class: 'form-grid' },
          field(t('pj.fields.experience'), bindText('intimate_module.experience_status', { area: true })),
          field(t('pj.fields.anatomy'), bindText('intimate_module.anatomy_and_sensory', { area: true })),
          field(t('pj.fields.fantasies'), bindText('intimate_module.core_fantasies_and_fetishes', { list: true })),
          field(t('pj.fields.solo'), bindText('intimate_module.solo_habits', { area: true })),
          field(t('pj.fields.stage1'), bindText('intimate_module.progression_stages.stage_1_barrier')),
          field(t('pj.fields.stage2'), bindText('intimate_module.progression_stages.stage_2_fissure')),
          field(t('pj.fields.stage3'), bindText('intimate_module.progression_stages.stage_3_double_standard')),
          field(t('pj.fields.stage4'), bindText('intimate_module.progression_stages.stage_4_surrender')),
          field(t('pj.fields.locks'), bindText('intimate_module.hard_locks', { list: true }), 'span-2')
        )
      )
    );
  }

  return h(
    'div',
    { class: 'view pj' },
    h(
      'header',
      { class: 'pj-hero' },
      portrait,
      fileInput,
      h(
        'div',
        { class: 'pj-hero-body' },
        nameInput,
        h(
          'div',
          { class: 'form-grid compact' },
          field(t('pj.fields.alias'), bindText('identity.internal_alias')),
          field(t('pj.fields.role'), bindText('identity.role_occupation')),
          field(t('pj.fields.homeland'), homelandInput),
          field(t('pj.status.label'), statusSelect)
        ),
        homelandChips,
        h(
          'div',
          { class: 'row-end' },
          badge(pj.canonical_version ? t('pj.canonical', { label: pj.canonical_version }) : t('pj.noCanonical')),
          btn(t('gallery.newCharacter'), () => promptDialog(t('gallery.newCharacter'), t('common.name'), '', (n) => { createPj(n); }), { icon: 'plus', variant: 'ghost', small: true }),
          btn(t('common.delete'), () =>
            confirmDialog(t('pj.confirmDelete', { name: pj.identity.name }), t('common.delete'), () => {
              deletePj(pjId);
              toast(t('toasts.pjDeleted'));
              setView('gallery');
            }),
            { icon: 'trash', variant: 'danger', small: true })
        )
      )
    ),
    tabBar,
    ...sections
  );
}
