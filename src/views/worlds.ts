import { t } from '../i18n';
import {
  createWorld,
  deleteWorld,
  getState,
  resetToDemoSeed,
  setActiveWorld,
  setView,
} from '../state/store';
import { pixelBanner } from '../ui/banner';
import { h, toast } from '../ui/dom';
import { badge, btn, confirmDialog, pageHeader, promptDialog } from '../ui/widgets';

export function renderWorlds(): HTMLElement {
  const s = getState();
  const grid = h(
    'div',
    { class: 'card-grid world-grid', role: 'list' },
    ...s.worlds.map((w) => {
      const pjCount = s.pjs.filter((p) => p.worldId === w.id).length;
      const isActive = w.id === s.activeWorldId;
      return h(
        'article',
        { class: `card world-card${isActive ? ' active' : ''}`, role: 'listitem' },
        pixelBanner(w.pixel_banner, w.id, 72),
        h('h3', { class: 'card-title' }, w.name),
        h('p', { class: 'card-desc' }, w.genre_tone || t('common.empty')),
        h('div', { class: 'chip-row' }, badge(w.system_tag || 'narrativa'), badge(`${pjCount} ${t('dashboard.stats.characters').toLowerCase()}`), isActive ? badge(t('worlds.active'), 'accent') : null),
        h(
          'div',
          { class: 'row-end' },
          btn(isActive ? t('worlds.openDashboard') : t('worlds.activate'), () => {
            setActiveWorld(w.id);
            setView('dashboard');
          }, { variant: isActive ? 'ghost' : 'primary' }),
          btn(t('common.delete'), () =>
            confirmDialog(t('worlds.confirmDelete', { name: w.name }), t('common.delete'), () => {
              const res = deleteWorld(w.id);
              if (res.ok) toast(t('toasts.worldDeleted'));
              else if (res.errorKey) toast(t(res.errorKey));
            }),
            { variant: 'danger', icon: 'trash' })
        )
      );
    })
  );

  return h(
    'div',
    { class: 'view worlds' },
    pageHeader(
      t('worlds.title'),
      t('worlds.subtitle'),
      btn(t('worlds.create'), () =>
        promptDialog(t('worlds.create'), t('common.name'), '', (name) => {
          const res = createWorld(name);
          if (res.ok && res.data) {
            setActiveWorld(res.data.id);
            toast(t('toasts.worldCreated', { name }));
            setView('dashboard');
          }
        }),
        { icon: 'plus', variant: 'primary' }),
      btn(t('app.demoReset'), () =>
        confirmDialog(t('worlds.confirmDemo'), t('app.demoReset'), () => {
          resetToDemoSeed();
          toast(t('toasts.demoReloaded'));
        }),
        { icon: 'layers', variant: 'ghost' })
    ),
    grid
  );
}
