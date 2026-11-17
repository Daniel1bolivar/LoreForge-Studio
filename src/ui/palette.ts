// LoreForge Studio — Command Palette (Ctrl+K)
import { appStore, setView, setActivePj, setDocSelection } from '../state/store';
import { h } from './dom';
import { icon } from './icons';
import { buildEntityIndex } from '../engines/wikilinks';
import type { ViewId } from '../types/state';

export function openCommandPalette(): void {
  const existing = document.getElementById('lf-command-palette');
  if (existing) existing.remove();

  const world = appStore.getActiveWorld();
  const characters = appStore.getCharactersForWorld(world.id);
  const entities = buildEntityIndex(world, characters);

  const viewCommands: { title: string; view: ViewId; iconName: any }[] = [
    { title: 'Dashboard General', view: 'dashboard', iconName: 'layout' },
    { title: 'Ficha de Personaje Activo', view: 'pj', iconName: 'user' },
    { title: 'Biblia del Mundo & Homebrew', view: 'world', iconName: 'globe' },
    { title: 'Gestor de Mundos', view: 'worlds', iconName: 'database' },
    { title: 'Grafo de Relaciones Canvas', view: 'graph', iconName: 'git-fork' },
    { title: 'Línea Temporal Multitrack', view: 'timeline', iconName: 'calendar' },
    { title: 'Atlas & Mapas Interactivos', view: 'maps', iconName: 'map' },
    { title: 'Detector de Contradicciones', view: 'contradictions', iconName: 'alert-triangle' },
    { title: 'Mesa TTRPG & Iniciativa', view: 'rpg', iconName: 'sword' },
    { title: 'Tablero Kanban de Escenas', view: 'kanban', iconName: 'layout' },
    { title: 'Calendario Fantástico', view: 'calendar', iconName: 'calendar' },
    { title: 'Vista Modo Jugador', view: 'player', iconName: 'eye' },
    { title: 'Matriz ToM (Teoría de la Mente)', view: 'tom', iconName: 'eye' },
    { title: 'Compilador & Exportación VTT', view: 'export', iconName: 'download' }
  ];

  const backdrop = h('div', {
    id: 'lf-command-palette',
    style: 'position:fixed; inset:0; background:rgba(0,0,0,0.65); backdrop-filter:blur(4px); z-index:9999; display:flex; align-items:flex-start; justify-content:center; padding-top:10vh;'
  });

  const modal = h('div', {
    style: 'background:var(--surface-elevated, #18181b); width:100%; max-width:620px; border-radius:12px; border:1px solid var(--border-subtle, #3f3f46); box-shadow:0 20px 40px rgba(0,0,0,0.5); overflow:hidden; display:flex; flex-direction:column;'
  });

  const input = h('input', {
    class: 'palette-input',
    placeholder: 'Escribe un comando o busca en tu mundo (personajes, capítulos, lugares)...',
    style: 'width:100%; padding:16px 20px; background:transparent; border:none; border-bottom:1px solid var(--border-subtle); color:var(--text-primary); font-size:15px; outline:none;'
  }) as HTMLInputElement;

  const resultsList = h('div', {
    style: 'max-height:360px; overflow-y:auto; padding:8px;'
  });

  function close() {
    backdrop.remove();
  }

  function filter(query: string) {
    resultsList.innerHTML = '';
    const q = query.trim().toLowerCase();

    // 1. Matched views
    const matchedViews = viewCommands.filter((v) => v.title.toLowerCase().includes(q));
    matchedViews.forEach((item) => {
      const el = h('div', {
        class: 'palette-item',
        style: 'display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:6px; cursor:pointer; color:var(--text-primary); font-size:13px;',
        onclick: () => {
          setView(item.view);
          close();
        }
      }, [
        icon(item.iconName, 16),
        document.createTextNode(item.title),
        h('span', { class: 'badge', style: 'margin-left:auto; font-size:10px;' }, ['VISTA'])
      ]);
      resultsList.appendChild(el);
    });

    // 2. Matched entities
    const matchedEntities = entities.filter((e) => e.name.toLowerCase().includes(q));
    matchedEntities.slice(0, 20).forEach((entity) => {
      const el = h('div', {
        class: 'palette-item',
        style: 'display:flex; align-items:center; gap:12px; padding:10px 14px; border-radius:6px; cursor:pointer; color:var(--text-primary); font-size:13px;',
        onclick: () => {
          if (entity.kind === 'pj' && entity.id) {
            setActivePj(entity.id);
            setView('pj');
          } else if (entity.kind === 'archive' && entity.cat && entity.id) {
            setDocSelection(entity.cat, entity.id);
            setView('doc');
          }
          close();
        }
      }, [
        icon(entity.kind === 'pj' ? 'user' : 'file-text', 16),
        document.createTextNode(entity.name),
        h('span', { class: 'text-muted text-xs', style: 'margin-left:auto;' }, [entity.cat || entity.kind])
      ]);
      resultsList.appendChild(el);
    });

    if (resultsList.children.length === 0) {
      resultsList.appendChild(
        h('div', { style: 'padding:24px; text-align:center; color:var(--text-muted); font-size:13px;' }, ['No se encontraron coincidencias.'])
      );
    }
  }

  input.addEventListener('input', () => filter(input.value));

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });

  window.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      close();
      window.removeEventListener('keydown', escHandler);
    }
  });

  modal.appendChild(input);
  modal.appendChild(resultsList);
  backdrop.appendChild(modal);
  document.body.appendChild(backdrop);

  filter('');
  setTimeout(() => input.focus(), 50);
}
