// LoreForge Studio — Main Application Shell & Responsive Workspace
import {
  appStore,
  getState,
  setView,
  setThemeState,
  setLocaleState,
  toggleRpgMode,
  setGalleryCategory
} from '../state/store';
import { t } from '../i18n';
import { TREE_CATEGORIES } from '../state/defaults';
import { h } from './dom';
import { icon } from './icons';
import { openCommandPalette } from './palette';
import type { ViewId, ThemeId } from '../types/state';

// Views
import { renderDashboard } from '../views/dashboard';
import { renderPJ } from '../views/pj';
import { renderWorldView } from '../views/world';
import { renderWorlds } from '../views/worlds';
import { renderGallery } from '../views/gallery';
import { renderDoc } from '../views/doc';
import { renderRelations } from '../views/relations';
import { renderGraphView } from '../views/graph';
import { renderTimelineView } from '../views/timeline';
import { renderMapsView } from '../views/maps';
import { renderContradictionsView } from '../views/contradictions';
import { renderRpgView } from '../views/rpg';
import { renderKanbanView } from '../views/kanban';
import { renderCalendarView } from '../views/calendar';
import { renderPlayerView } from '../views/player';
import { renderTomView } from '../views/tom';
import { renderCompilerView } from '../views/compiler';

export function renderAppShell(): HTMLElement {
  const state = getState();
  const world = appStore.getActiveWorld();
  const characters = appStore.getCharactersForWorld(world.id);
  const activePj = appStore.getActivePj();

  const root = h('div', {
    class: 'lf-workspace',
    'data-theme': state.theme,
    style: 'display:flex; flex-direction:column; width:100vw; height:100vh; overflow:hidden; background:var(--surface-base); color:var(--text-primary); font-family:var(--font-sans);'
  });

  // 1. Top Header
  const header = h('header', {
    class: 'lf-header',
    style: 'height:52px; display:flex; align-items:center; justify-content:space-between; padding:0 16px; background:var(--surface-elevated); border-bottom:1px solid var(--border-subtle); flex-shrink:0; z-index:20;'
  }, [
    // Brand & Active World
    h('div', { style: 'display:flex; align-items:center; gap:16px;' }, [
      h('div', {
        style: 'display:flex; align-items:center; gap:8px; cursor:pointer;',
        onclick: () => setView('dashboard')
      }, [
        icon('book-open', 20),
        h('span', { style: 'font-weight:800; font-size:16px; letter-spacing:-0.03em;' }, ['LoreForge Studio'])
      ]),
      // World Selector Pill
      h('div', {
        class: 'header-pill',
        style: 'display:flex; align-items:center; gap:6px; background:var(--surface-sunken); padding:4px 10px; border-radius:6px; border:1px solid var(--border-subtle); font-size:12px; cursor:pointer;',
        onclick: () => setView('worlds')
      }, [
        icon('globe', 14),
        h('span', { style: 'font-weight:600;' }, [world.name]),
        icon('chevron-down', 12)
      ]),
      // Active PJ Pill
      activePj ? h('div', {
        class: 'header-pill',
        style: 'display:flex; align-items:center; gap:6px; background:var(--surface-sunken); padding:4px 10px; border-radius:6px; border:1px solid var(--border-subtle); font-size:12px; cursor:pointer;',
        onclick: () => setView('pj')
      }, [
        icon('user', 14),
        h('span', { style: 'font-weight:600;' }, [activePj.identity.name]),
        h('span', { class: 'badge', style: 'font-size:10px;' }, [`PJ (${characters.length})`])
      ]) : null
    ]),

    // Center: Search / Command Palette Shortcut
    h('button', {
      class: 'btn btn-secondary btn-sm',
      style: 'display:flex; align-items:center; gap:8px; padding:6px 14px; min-width:220px; color:var(--text-muted); justify-content:space-between;',
      onclick: () => openCommandPalette()
    }, [
      h('span', { style: 'display:flex; align-items:center; gap:6px;' }, [icon('search', 14), document.createTextNode('Buscar en mundo...')]),
      h('kbd', { style: 'font-size:11px; background:var(--surface-sunken); padding:2px 6px; border-radius:4px; border:1px solid var(--border-subtle);' }, ['Ctrl K'])
    ]),

    // Right Controls
    h('div', { style: 'display:flex; align-items:center; gap:10px;' }, [
      // RPG Mode Toggle
      h('button', {
        class: `btn btn-sm ${state.rpgMode ? 'btn-primary' : 'btn-secondary'}`,
        onclick: () => toggleRpgMode()
      }, [icon('sword', 14), document.createTextNode(state.rpgMode ? 'RPG: ON' : 'RPG: OFF')]),

      // Theme Selector
      h('select', {
        class: 'input-select input-sm',
        style: 'min-width:110px;',
        onchange: (e: any) => setThemeState(e.target.value as ThemeId)
      }, [
        h('option', { value: 'pergamino' }, ['Pergamino']),
        h('option', { value: 'grimorio' }, ['Grimorio']),
        h('option', { value: 'dossier' }, ['Dossier']),
        h('option', { value: 'cyberpunk' }, ['Cyberpunk'])
      ].map((opt: any) => {
        if (opt.value === state.theme) opt.selected = true;
        return opt;
      })),

      // Locale Toggle
      h('button', {
        class: 'btn btn-secondary btn-sm',
        onclick: () => setLocaleState(state.locale === 'es' ? 'en' : 'es')
      }, [state.locale.toUpperCase()])
    ])
  ]);

  // 2. Main Workspace Layout (Sidebar + Body)
  const workspaceBody = h('div', {
    class: 'lf-workspace-body',
    style: 'display:flex; flex:1; height:calc(100vh - 52px); overflow:hidden;'
  });

  // Sidebar
  const sidebar = renderSidebar(state, world, characters);
  workspaceBody.appendChild(sidebar);

  // Main View Container
  const mainPane = h('main', {
    class: 'lf-main-pane',
    style: 'flex:1; height:100%; overflow:hidden; background:var(--surface-base); position:relative;'
  });

  mainPane.appendChild(renderActiveView(state.activeView));
  workspaceBody.appendChild(mainPane);

  root.appendChild(header);
  root.appendChild(workspaceBody);

  // Global key listener for Ctrl+K
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      openCommandPalette();
    }
  });

  return root;
}

function renderSidebar(state: any, world: any, characters: any[]): HTMLElement {
  const sidebarEl = h('aside', {
    class: 'lf-sidebar',
    style: 'width:280px; height:100%; background:var(--surface-sunken); border-right:1px solid var(--border-subtle); display:flex; flex-direction:column; overflow-y:auto; flex-shrink:0;'
  });

  // Quick Tools Navigation
  const quickNav = h('div', { style: 'padding:12px; display:flex; flex-direction:column; gap:2px; border-bottom:1px solid var(--border-subtle);' }, [
    createNavItem('dashboard', 'Dashboard', 'layout', state.activeView === 'dashboard'),
    createNavItem('world', 'Biblia del Mundo', 'globe', state.activeView === 'world'),
    createNavItem('graph', 'Grafo Canvas', 'git-fork', state.activeView === 'graph'),
    createNavItem('timeline', 'Línea Temporal', 'calendar', state.activeView === 'timeline'),
    createNavItem('maps', 'Atlas & Mapas', 'map', state.activeView === 'maps'),
    createNavItem('contradictions', 'Contradicciones', 'alert-triangle', state.activeView === 'contradictions'),
    createNavItem('rpg', 'Mesa TTRPG', 'sword', state.activeView === 'rpg'),
    createNavItem('kanban', 'Tablero Kanban', 'layout', state.activeView === 'kanban'),
    createNavItem('calendar', 'Calendario', 'calendar', state.activeView === 'calendar'),
    createNavItem('player', 'Vista Jugador', 'eye', state.activeView === 'player'),
    createNavItem('tom', 'Matriz ToM', 'eye', state.activeView === 'tom'),
    createNavItem('export', 'Compilador & VTT', 'download', state.activeView === 'export')
  ]);

  sidebarEl.appendChild(quickNav);

  // 15-Category Document & Entity Tree
  const treeContainer = h('div', { style: 'padding:12px; display:flex; flex-direction:column; gap:4px;' }, [
    h('div', { style: 'font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted); margin-bottom:6px; padding:0 4px;' }, ['Árbol de Documentos'])
  ]);

  TREE_CATEGORIES.forEach((cat) => {
    let count = 0;
    if (cat.kind === 'pjs') count = characters.length;
    else if (cat.kind === 'archive') count = (world.archive?.[cat.key as any] || []).length;
    else if (cat.kind === 'lore') count = (world.lore_entries || []).length;
    else if (cat.kind === 'factions') count = (world.factions || []).length;
    else if (cat.kind === 'species') count = (world.homebrew?.species || []).length;
    else if (cat.kind === 'languages') count = (world.homebrew?.languages?.registered || []).length;
    else if (cat.kind === 'relations') count = (world.relations || []).length;

    const isActive = state.activeView === 'gallery' && state.activeGalleryCat === cat.key;

    const catHeader = h('div', {
      class: `tree-cat-header ${isActive ? 'tree-cat-active' : ''}`,
      style: `display:flex; justify-content:space-between; align-items:center; padding:7px 10px; border-radius:6px; cursor:pointer; font-size:12px; font-weight:${isActive ? '700' : '500'}; color:${isActive ? 'var(--text-primary)' : 'var(--text-secondary)'}; background:${isActive ? 'var(--surface-elevated)' : 'transparent'}; border-left:${isActive ? '3px solid var(--accent-primary)' : '3px solid transparent'};`,
      onclick: () => {
        setGalleryCategory(cat.key);
        setView('gallery');
      }
    }, [
      h('div', { style: 'display:flex; align-items:center; gap:8px;' }, [
        icon(cat.iconKey, 14),
        document.createTextNode(t(cat.labelKey) || cat.key)
      ]),
      h('span', { class: 'badge', style: 'font-size:10px;' }, [String(count)])
    ]);

    treeContainer.appendChild(catHeader);
  });

  sidebarEl.appendChild(treeContainer);
  return sidebarEl;
}

function createNavItem(viewId: ViewId, title: string, iconName: any, isActive: boolean): HTMLElement {
  return h('div', {
    class: `nav-item ${isActive ? 'nav-item-active' : ''}`,
    style: `display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:6px; cursor:pointer; font-size:13px; font-weight:${isActive ? '600' : '500'}; background:${isActive ? 'var(--surface-elevated)' : 'transparent'}; color:${isActive ? 'var(--accent-primary, #60a5fa)' : 'var(--text-secondary)'};`,
    onclick: () => setView(viewId)
  }, [
    icon(iconName, 16),
    document.createTextNode(title)
  ]);
}

function renderActiveView(viewId: ViewId): HTMLElement {
  switch (viewId) {
    case 'dashboard': return renderDashboard();
    case 'pj': return renderPJ();
    case 'world': return renderWorldView();
    case 'worlds': return renderWorlds();
    case 'gallery': return renderGallery();
    case 'doc': return renderDoc();
    case 'relations': return renderRelations();
    case 'graph': return renderGraphView();
    case 'timeline': return renderTimelineView();
    case 'maps': return renderMapsView();
    case 'contradictions': return renderContradictionsView();
    case 'rpg': return renderRpgView();
    case 'kanban': return renderKanbanView();
    case 'calendar': return renderCalendarView();
    case 'player': return renderPlayerView();
    case 'tom': return renderTomView();
    case 'export': return renderCompilerView();
    default: return renderDashboard();
  }
}
