import { t } from '../i18n';
import {
  deleteRelation,
  getActiveWorld,
  getWorldPJs,
  setView,
  upsertRelation,
} from '../state/store';
import type { WorldRelation } from '../types';
import { buildEntityIndex } from '../engines/wikilinks';
import { h, uid } from '../ui/dom';
import { btn, emptyState, iconBtn, pageHeader, textInput } from '../ui/widgets';

export function renderRelations(): HTMLElement {
  const world = getActiveWorld();
  const index = buildEntityIndex(world, getWorldPJs());
  const listId = uid('entities');
  const datalist = h(
    'datalist',
    { id: listId },
    ...[...new Set(index.filter((e) => e.kind === 'pj' || e.kind === 'faction').map((e) => e.name))].map((n) => h('option', { value: n }))
  );

  const row = (rel: WorldRelation) => {
    const patch = (p: Partial<WorldRelation>) => {
      Object.assign(rel, p);
      upsertRelation(world.id, rel);
    };
    return h(
      'div',
      { class: 'relation-row' },
      textInput({ value: rel.from, list: listId, placeholder: t('relations.from'), ariaLabel: t('relations.from'), onInput: (v) => patch({ from: v }) }),
      textInput({ value: rel.relation, placeholder: t('relations.type'), ariaLabel: t('relations.type'), onInput: (v) => patch({ relation: v }) }),
      textInput({ value: rel.to, list: listId, placeholder: t('relations.to'), ariaLabel: t('relations.to'), onInput: (v) => patch({ to: v }) }),
      textInput({ value: rel.faction_tag || '', placeholder: t('relations.faction'), ariaLabel: t('relations.faction'), onInput: (v) => patch({ faction_tag: v }) }),
      textInput({ value: rel.notes || '', placeholder: t('relations.notes'), ariaLabel: t('relations.notes'), onInput: (v) => patch({ notes: v }) }),
      iconBtn('trash', t('common.delete'), () => deleteRelation(world.id, rel.id), 'danger')
    );
  };

  const rels = world.relations || [];
  return h(
    'div',
    { class: 'view relations' },
    pageHeader(
      t('views.relations'),
      t('relations.subtitle'),
      btn(t('nav.graph'), () => setView('graph'), { icon: 'network', variant: 'ghost' }),
      btn(t('relations.add'), () => upsertRelation(world.id, { id: uid('rel'), from: '', relation: '', to: '' }), { icon: 'plus', variant: 'primary' })
    ),
    datalist,
    rels.length ? h('div', { class: 'stack' }, ...rels.map(row)) : emptyState(t('relations.empty'))
  );
}
