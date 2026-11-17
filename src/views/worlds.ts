import { t } from '../i18n';
import {
  appStore,
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
    { class: 'card-grid world-grid', role: 'list', style: 'display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:18px; margin-top:20px;' },
    ...s.worlds.map((w) => {
      const pjCount = s.pjs.filter((p) => p.worldId === w.id).length;
      const isActive = w.id === s.activeWorldId;
      return h(
        'article',
        {
          class: `card world-card${isActive ? ' active' : ''}`,
          role: 'listitem',
          style: `cursor:pointer; background:var(--surface-elevated); border:2px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-subtle)'}; border-radius:12px; padding:18px; display:flex; flex-direction:column; gap:10px; transition:transform 0.15s, border-color 0.15s;`,
          onclick: (e: MouseEvent) => {
            if ((e.target as HTMLElement).closest('button')) return;
            setActiveWorld(w.id);
            setView('dashboard');
          }
        },
        pixelBanner(w.pixel_banner, w.id, 72),
        h('h3', { class: 'card-title', style: 'font-size:17px; font-weight:700; margin:0;' }, w.name),
        h('p', { class: 'card-desc', style: 'font-size:13px; color:var(--text-secondary); margin:0; line-height:1.4;' }, w.genre_tone || t('common.empty')),
        h('div', { class: 'chip-row', style: 'display:flex; gap:6px; flex-wrap:wrap;' },
          badge(w.system_tag || 'narrativa'),
          badge(`${pjCount} ${t('dashboard.stats.characters').toLowerCase()}`),
          isActive ? badge(t('worlds.active'), 'accent') : null
        ),
        h(
          'div',
          { class: 'row-end', style: 'display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:10px; border-top:1px solid var(--border-subtle);' },
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
    { class: 'view worlds', style: 'padding:28px 36px; max-width:1300px; margin:0 auto; overflow-y:auto; height:100%;' },
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
      btn('Cargar La gema de las almas (32 PJs)', async () => {
        try {
          const res = await fetch('/api/local-gema');
          if (res.ok) {
            const data = await res.json();
            if (data && data.state) {
              const gWorld = data.state.worlds[0];
              const gPjs = data.state.pjs || [];
              appStore.mutate((state) => {
                if (!state.worlds.some((w) => w.id === gWorld.id)) {
                  state.worlds.unshift(gWorld);
                }
                for (const p of gPjs) {
                  if (!state.pjs.some((x) => x.id === p.id)) {
                    state.pjs.push(p);
                  }
                }
                state.activeWorldId = gWorld.id;
                state.activePjId = gPjs[0]?.id || '';
                state.theme = 'cyberpunk';
              });
              toast('¡La gema de las almas cargada con éxito!');
              setView('dashboard');
            }
          } else {
            toast('No se encontró el archivo local en private/');
          }
        } catch (err) {
          toast('Error al conectar con la API local');
        }
      }, { icon: 'download', variant: 'primary' }),
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
