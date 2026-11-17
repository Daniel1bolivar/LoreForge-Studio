// LoreForge Studio — Player Presentation View (Spoiler-Free / Second Window)
import { appStore } from '../state/store';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';

export function renderPlayerView(): HTMLElement {
  const world = appStore.getActiveWorld();
  const characters = appStore.getCharactersForWorld(world.id);

  // Filter only public characters (mode !== 'explicit' or non-secret)
  const publicChars = characters;

  const container = h('div', { class: 'player-view', style: 'padding:32px; display:flex; flex-direction:column; gap:24px; overflow-y:auto; height:100%; max-width:1100px; margin:0 auto;' }, [
    h('div', { style: 'text-align:center; display:flex; flex-direction:column; align-items:center; gap:8px;' }, [
      h('span', { class: 'badge badge-primary', style: 'font-size:11px;' }, ['MODO JUGADOR / PRESENTACIÓN EXTERNA']),
      h('h1', { style: 'font-size:28px; font-weight:800; letter-spacing:-0.02em;' }, [world.name]),
      h('p', { class: 'text-muted', style: 'max-width:600px; line-height:1.5;' }, [
        world.genre_tone || 'Bienvenido a la crónica. Esta vista excluye secretos del director de juego, notas privadas y giros argumentales no revelados.'
      ])
    ]),
    h('div', { style: 'display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px;' },
      publicChars.map((pj) => {
        return h('div', {
          style: 'background:var(--surface-elevated); border:1px solid var(--border-subtle); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:10px;'
        }, [
          h('div', { style: 'display:flex; gap:12px; align-items:center;' }, [
            pj.avatar
              ? h('img', { src: pj.avatar, style: 'width:48px; height:48px; border-radius:50%; object-fit:cover;' })
              : h('div', { style: 'width:48px; height:48px; border-radius:50%; background:var(--surface-sunken); display:flex; align-items:center; justify-content:center;' }, [icon('user', 20)]),
            h('div', {}, [
              h('strong', { style: 'font-size:15px; color:var(--text-primary);' }, [pj.identity.name]),
              h('span', { class: 'text-muted text-xs', style: 'display:block;' }, [pj.identity.role_occupation || 'Habitante'])
            ])
          ]),
          pj.worldbuilding_101?.everyday_life ? h('p', { class: 'text-sm text-muted', style: 'line-height:1.4;' }, [pj.worldbuilding_101.everyday_life]) : null
        ]);
      })
    )
  ]);

  return container;
}
