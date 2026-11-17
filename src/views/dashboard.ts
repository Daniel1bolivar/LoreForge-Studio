import { t } from '../i18n';
import {
  getActiveWorld,
  getState,
  getWorldPJs,
  isModuleEnabled,
  setGalleryCat,
  setView,
} from '../state/store';
import type { ViewId } from '../types';
import { detectContradictions } from '../engines/contradictions';
import { countWords } from '../engines/wikilinks';
import { ARCHIVE_CATEGORY_KEYS } from '../state/defaults';
import { pixelBanner } from '../ui/banner';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { badge, section } from '../ui/widgets';

interface QuickAction {
  icon: string;
  labelKey: string;
  descKey: string;
  run: () => void;
  moduleKey?: 'diceRoller' | 'sceneKanban' | 'customCalendar' | 'theoryOfMind' | 'playerView';
}

function go(view: ViewId): () => void {
  return () => setView(view);
}

export function renderDashboard(): HTMLElement {
  const world = getActiveWorld();
  const pjs = getWorldPJs();
  const issues = detectContradictions(world, pjs);
  const alerts = issues.filter((i) => i.severity !== 'info').length;

  let archiveDocs = 0;
  let words = 0;
  for (const cat of ARCHIVE_CATEGORY_KEYS) {
    for (const d of world.archive?.[cat] || []) {
      archiveDocs += 1;
      words += countWords(`${d.summary} ${d.body_markdown || ''}`);
    }
  }
  for (const pj of pjs) {
    words += countWords(
      `${pj.worldbuilding_101.core_motivation} ${pj.worldbuilding_101.personal_history} ${pj.worldbuilding_101.everyday_life}`
    );
  }
  for (const l of world.lore_entries || []) words += countWords(l.content);

  const stats: Array<[string, number]> = [
    [t('dashboard.stats.characters'), pjs.length],
    [t('dashboard.stats.archiveDocs'), archiveDocs],
    [t('dashboard.stats.relations'), (world.relations || []).length],
    [t('dashboard.stats.words'), words],
    [t('dashboard.stats.contradictions'), alerts],
  ];

  const actions: QuickAction[] = [
    { icon: 'user', labelKey: 'nav.pj', descKey: 'dashboard.actions.pj', run: () => { setGalleryCat('characters'); setView('gallery'); } },
    { icon: 'network', labelKey: 'nav.graph', descKey: 'dashboard.actions.graph', run: go('graph') },
    { icon: 'clock', labelKey: 'nav.timeline', descKey: 'dashboard.actions.timeline', run: go('timeline') },
    { icon: 'map', labelKey: 'nav.maps', descKey: 'dashboard.actions.maps', run: go('maps') },
    { icon: 'file-text', labelKey: 'tree.categories.chapters', descKey: 'dashboard.actions.chapters', run: () => { setGalleryCat('chapters'); setView('gallery'); } },
    { icon: 'alert', labelKey: 'nav.contradictions', descKey: 'dashboard.actions.contradictions', run: go('contradictions') },
    { icon: 'share', labelKey: 'nav.export', descKey: 'dashboard.actions.export', run: go('export') },
    { icon: 'kanban', labelKey: 'nav.kanban', descKey: 'dashboard.actions.kanban', run: go('kanban'), moduleKey: 'sceneKanban' as const },
    { icon: 'calendar', labelKey: 'nav.calendar', descKey: 'dashboard.actions.calendar', run: go('calendar'), moduleKey: 'customCalendar' as const },
    { icon: 'dice', labelKey: 'nav.rpg', descKey: 'dashboard.actions.rpg', run: go('rpg'), moduleKey: 'diceRoller' as const },
    { icon: 'brain', labelKey: 'nav.tom', descKey: 'dashboard.actions.tom', run: go('tom'), moduleKey: 'theoryOfMind' as const },
    { icon: 'eye', labelKey: 'nav.player', descKey: 'dashboard.actions.player', run: go('player'), moduleKey: 'playerView' as const },
  ].filter((a) => !a.moduleKey || isModuleEnabled(world, a.moduleKey as any));

  const topIssues = issues.slice(0, 4);

  return h(
    'div',
    { class: 'view dashboard' },
    h(
      'header',
      { class: 'hero' },
      pixelBanner(world.pixel_banner, world.id, 96),
      h(
        'div',
        { class: 'hero-body' },
        h('h2', { class: 'hero-title' }, world.name),
        h('p', { class: 'hero-sub' }, world.genre_tone || t('common.empty')),
        h('div', { class: 'hero-meta' }, badge(world.system_tag || 'narrativa'), badge(`${pjs.length} ${t('dashboard.stats.characters').toLowerCase()}`))
      )
    ),
    h(
      'dl',
      { class: 'stats', 'aria-label': t('dashboard.title') },
      ...stats.map(([label, value]) =>
        h('div', { class: 'stat' }, h('dt', null, label), h('dd', null, new Intl.NumberFormat(getState().locale).format(value)))
      )
    ),
    h('h3', { class: 'section-heading' }, t('dashboard.quickActions')),
    h(
      'div',
      { class: 'action-grid' },
      ...actions.map((a) =>
        h(
          'button',
          { type: 'button', class: 'action-card', onClick: a.run },
          icon(a.icon, 22),
          h('span', { class: 'action-title' }, t(a.labelKey)),
          h('span', { class: 'action-desc' }, t(a.descKey))
        )
      )
    ),
    topIssues.length
      ? section(
          t('dashboard.attention'),
          h(
            'ul',
            { class: 'issue-list compact' },
            ...topIssues.map((i) =>
              h('li', { class: `issue issue-${i.severity}` }, icon('alert', 16), h('span', null, t(i.messageKey, i.params)))
            )
          ),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onClick: go('contradictions') }, t('dashboard.seeAll'))
        )
      : null
  );
}
