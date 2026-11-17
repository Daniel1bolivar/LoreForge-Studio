import { t } from '../i18n';
import {
  createWorld,
  getActiveWorld,
  getState,
  getWorldPJs,
  isModuleEnabled,
  restoreMasterGemaBook,
  setActiveWorld,
  setGalleryCat,
  setView,
} from '../state/store';
import type { ViewId } from '../types';
import { detectContradictions } from '../engines/contradictions';
import { countWords } from '../engines/wikilinks';
import { ARCHIVE_CATEGORY_KEYS } from '../state/defaults';
import { pixelBanner } from '../ui/banner';
import { h, toast } from '../ui/dom';
import { icon } from '../ui/icons';
import { badge, btn, openModal, promptDialog, section } from '../ui/widgets';

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

export function openQuickWorldSwitcher(): void {
  const s = getState();
  const content = h('div', { style: 'display:flex; flex-direction:column; gap:16px; padding:16px;' }, [
    h('p', { class: 'text-sm text-muted' }, [
      'Haz clic en cualquier ficha de mundo para activarlo y trabajar en él de inmediato:'
    ]),
    h('div', {
      class: 'world-switcher-list',
      style: 'display:flex; flex-direction:column; gap:10px; max-height:360px; overflow-y:auto;'
    }, ...s.worlds.map((w) => {
      const pjs = s.pjs.filter((p) => p.worldId === w.id);
      const isActive = w.id === s.activeWorldId;
      return h('div', {
        class: `world-card-item ${isActive ? 'active' : ''}`,
        style: `display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-radius:8px; border:1px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-subtle)'}; background:${isActive ? 'var(--surface-elevated)' : 'var(--surface-sunken)'}; cursor:pointer; transition:all 0.15s;`,
        onclick: () => {
          setActiveWorld(w.id);
          toast(`Mundo activo: ${w.name}`);
          closeModal();
          setView('dashboard');
        }
      }, [
        h('div', { style: 'display:flex; flex-direction:column; gap:4px;' }, [
          h('div', { style: 'display:flex; align-items:center; gap:8px;' }, [
            icon('globe', 16),
            h('strong', { style: 'font-size:14px;' }, [w.name]),
            isActive ? badge('Activo', 'accent') : null
          ]),
          h('span', { class: 'text-xs text-muted' }, [w.genre_tone || 'Sin descripción']),
          h('span', { class: 'text-xs text-muted' }, [`${pjs.length} personaje(s) registrados`])
        ]),
        h('button', {
          class: `btn btn-sm ${isActive ? 'btn-ghost' : 'btn-primary'}`,
          onclick: (e: MouseEvent) => {
            e.stopPropagation();
            setActiveWorld(w.id);
            toast(`Mundo activo: ${w.name}`);
            closeModal();
            setView('dashboard');
          }
        }, [isActive ? 'Seleccionado' : 'Cambiar a este'])
      ]);
    })),
    h('div', { style: 'display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:8px; border-top:1px solid var(--border-subtle); padding-top:12px;' }, [
      btn('+ Crear Nuevo Mundo', () => {
        closeModal();
        promptDialog(t('worlds.create'), t('common.name'), '', (name) => {
          const res = createWorld(name);
          if (res.ok && res.data) {
            setActiveWorld(res.data.id);
            toast(t('toasts.worldCreated', { name }));
            setView('dashboard');
          }
        });
      }, { variant: 'ghost', small: true, icon: 'plus' }),
      btn('🔄 Restaurar copia maestra ("La gema de las almas")', async () => {
        closeModal();
        const res = await restoreMasterGemaBook();
        if (res.ok) {
          toast(`¡"La gema de las almas" restaurada con éxito! (${res.count} PJs y lore recuperados)`);
          setView('dashboard');
        } else {
          toast(res.error || 'No se pudo contactar con el respaldo maestro');
        }
      }, { variant: 'primary', small: true, icon: 'refresh' })
    ])
  ]);

  const closeModal = openModal('Cambiar de Mundo (1 Clic)', content);
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
      {
        class: 'hero hero-interactive',
        style: 'cursor:pointer; position:relative;',
        title: 'Haz clic aquí para cambiar entre los mundos creados',
        onclick: (e: MouseEvent) => {
          if ((e.target as HTMLElement).closest('button')) return;
          openQuickWorldSwitcher();
        }
      },
      pixelBanner(world.pixel_banner, world.id, 96),
      h(
        'div',
        { class: 'hero-body' },
        h('div', { style: 'display:flex; justify-content:space-between; align-items:flex-start; gap:12px;' }, [
          h('div', { style: 'display:flex; flex-direction:column; gap:4px;' }, [
            h('h2', {
              class: 'hero-title hero-title-interactive',
              style: 'display:flex; align-items:center; gap:8px;'
            }, [
              world.name,
              icon('chevron-down', 20)
            ]),
            h('p', { class: 'hero-sub' }, world.genre_tone || t('common.empty'))
          ]),
          h('button', {
            class: 'btn btn-secondary btn-sm',
            style: 'flex-shrink:0; display:flex; align-items:center; gap:6px;',
            title: 'Cambiar de mundo con un clic',
            onclick: (e: MouseEvent) => {
              e.stopPropagation();
              openQuickWorldSwitcher();
            }
          }, [icon('globe', 14), document.createTextNode('Cambiar Mundo ▾')])
        ]),
        h('div', { class: 'hero-meta' }, [
          badge(world.system_tag || 'narrativa'),
          badge(`${pjs.length} ${t('dashboard.stats.characters').toLowerCase()}`),
          h('button', {
            class: 'badge badge-interactive',
            style: 'cursor:pointer; background:var(--accent-subtle); color:var(--accent-primary); border:1px solid var(--accent-primary); display:inline-flex; align-items:center; gap:4px;',
            onclick: (e: MouseEvent) => {
              e.stopPropagation();
              openQuickWorldSwitcher();
            }
          }, [icon('globe', 12), document.createTextNode('Ver Mundos')])
        ])
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
