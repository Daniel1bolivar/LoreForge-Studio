// LoreForge Studio — Main Application Shell & Responsive Workspace
import {
  appStore,
  getState,
  setView,
  setActiveWorld,
  setThemeState,
  setLocaleState,
  toggleRpgMode,
  setGalleryCategory
} from '../state/store';
import { t } from '../i18n';
import { TREE_CATEGORIES } from '../state/defaults';
import { h, toast } from './dom';
import { icon } from './icons';
import { openCommandPalette } from './palette';
import {
  cycleFontScale,
  exportQuickJsonBackup,
  getFontScale,
  hasPendingBackup,
  isKeepAwakeEnabled,
  registerDrawerController,
  toggleKeepAwake,
  triggerHaptic,
} from './mobile';
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

let keyListenerRegistered = false;
let mobileDrawerOpen = false;

function fontScaleLabel(scale: 'normal' | 'large' | 'extra'): string {
  if (scale === 'extra') return 'A++ Extra';
  if (scale === 'large') return 'A+ Grande';
  return 'A Normal';
}

export function renderAppShell(): HTMLElement {
  const state = getState();
  const world = appStore.getActiveWorld();
  const characters = appStore.getCharactersForWorld(world.id);
  const activePj = appStore.getActivePj();
  const fontScale = getFontScale();
  const keepAwake = isKeepAwakeEnabled();
  const pendingBackup = hasPendingBackup();

  const root = h('div', {
    class: 'lf-workspace',
    'data-theme': state.theme,
    'data-font-scale': fontScale,
    ...(fontScale === 'extra' ? { 'data-a11y': 'senior' } : {}),
  });

  const setDrawerOpen = (open: boolean) => {
    mobileDrawerOpen = open;
    const sidebarEl = root.querySelector('.lf-sidebar');
    const backdropEl = root.querySelector('.lf-sidebar-backdrop');
    sidebarEl?.classList.toggle('open', open);
    backdropEl?.classList.toggle('open', open);
    const menuNavBtn = root.querySelector('.bottom-nav-menu-btn');
    menuNavBtn?.classList.toggle('active', open);
  };

  registerDrawerController(
    () => mobileDrawerOpen,
    () => setDrawerOpen(false)
  );

  const fontBtn = h('button', {
    class: `btn btn-sm ${fontScale !== 'normal' ? 'btn-primary' : 'btn-secondary'}`,
    title: 'Cambiar escala de lectura (Normal / Grande / Extra)',
    'aria-label': 'Cambiar tamaño de letra',
    onclick: () => {
      const next = cycleFontScale();
      fontBtn.textContent = fontScaleLabel(next);
      fontBtn.classList.toggle('btn-primary', next !== 'normal');
      fontBtn.classList.toggle('btn-secondary', next === 'normal');
    },
  }, [fontScaleLabel(fontScale)]) as HTMLButtonElement;

  const awakeBtn = h('button', {
    class: `btn btn-sm header-hide-mobile ${keepAwake ? 'btn-primary' : 'btn-secondary'}`,
    title: 'Mantener pantalla encendida durante la lectura o escritura',
    'aria-pressed': String(keepAwake),
    onclick: async () => {
      const next = await toggleKeepAwake();
      awakeBtn.classList.toggle('btn-primary', next);
      awakeBtn.classList.toggle('btn-secondary', !next);
      awakeBtn.setAttribute('aria-pressed', String(next));
      awakeBtn.textContent = next ? 'Pantalla: ON' : 'Pantalla: AUTO';
    },
  }, [keepAwake ? 'Pantalla: ON' : 'Pantalla: AUTO']) as HTMLButtonElement;

  const backupDot = h('span', {
    class: `lf-backup-dot ${pendingBackup ? '' : 'hidden'}`,
    title: 'Hay cambios sin respaldar en archivo',
  });

  const quickBackupBtn = h('button', {
    class: 'btn btn-secondary btn-sm lf-backup-btn',
    title: 'Exportar y compartir respaldo JSON completo',
    'aria-label': 'Exportar respaldo JSON',
    onclick: () => {
      void exportQuickJsonBackup();
    },
  }, [icon('share-2', 14), h('span', { class: 'header-hide-mobile' }, ['Respaldar']), backupDot]);

  // 1. Top Header
  const header = h('header', {
    class: 'lf-header',
  }, [
    // Brand & Active World
    h('div', { style: 'display:flex; align-items:center; gap:10px; min-width:0;' }, [
      h('button', {
        class: 'btn btn-secondary btn-sm lf-mobile-menu-btn',
        'aria-label': 'Abrir menú',
        onclick: () => setDrawerOpen(!mobileDrawerOpen),
      }, [icon('menu', 18)]),
      h('div', {
        style: 'display:flex; align-items:center; gap:8px; cursor:pointer;',
        onclick: () => setView('dashboard')
      }, [
        icon('book-open', 20),
        h('span', { style: 'font-weight:800; font-size:16px; letter-spacing:-0.03em; white-space:nowrap;' }, ['LoreForge'])
      ]),
      // 1-Click World Switcher
      h('div', {
        class: 'header-world-selector',
        style: 'display:flex; align-items:center; gap:6px; background:var(--surface-sunken); padding:2px 8px; border-radius:6px; border:1px solid var(--border-subtle); font-size:12px; min-width:0;'
      }, [
        icon('globe', 14),
        h('select', {
          class: 'input-select input-sm',
          style: 'border:none; background:transparent; padding:4px 6px; font-weight:700; color:var(--text-primary); cursor:pointer; outline:none; max-width:200px;',
          title: 'Cambiar de mundo con un clic',
          'aria-label': 'Seleccionar mundo',
          onchange: (e: any) => {
            const val = e.target.value;
            if (val === '__manage_worlds__') {
              setView('worlds');
            } else {
              setActiveWorld(val);
              setView('dashboard');
            }
          }
        }, [
          ...state.worlds.map((w) => {
            const count = state.pjs.filter((p) => p.worldId === w.id).length;
            const opt = h('option', { value: w.id }, `${w.name} (${count} PJs)`) as HTMLOptionElement;
            if (w.id === state.activeWorldId) opt.selected = true;
            return opt;
          }),
          h('option', { value: '__manage_worlds__' }, '⚙ Administrar Mundos...')
        ])
      ]),
      // Active PJ Pill (desktop)
      activePj ? h('div', {
        class: 'header-pill header-hide-mobile',
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
      class: 'btn btn-secondary btn-sm header-hide-mobile',
      style: 'display:flex; align-items:center; gap:8px; padding:6px 14px; min-width:200px; color:var(--text-muted); justify-content:space-between;',
      onclick: () => openCommandPalette()
    }, [
      h('span', { style: 'display:flex; align-items:center; gap:6px;' }, [icon('search', 14), document.createTextNode('Buscar en mundo...')]),
      h('kbd', { style: 'font-size:11px; background:var(--surface-sunken); padding:2px 6px; border-radius:4px; border:1px solid var(--border-subtle);' }, ['Ctrl K'])
    ]),

    // Right Controls
    h('div', { style: 'display:flex; align-items:center; gap:8px; flex-shrink:0;' }, [
      fontBtn,
      awakeBtn,
      quickBackupBtn,
      // Import JSON Button
      h('button', {
        class: 'btn btn-secondary btn-sm header-hide-mobile',
        title: 'Importar mundo o novela desde archivo JSON',
        onclick: () => {
          const fileInput = document.createElement('input');
          fileInput.type = 'file';
          fileInput.accept = '.json';
          fileInput.onchange = (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
              try {
                const parsed = JSON.parse(evt.target?.result as string);
                if (parsed.state) {
                  // Project envelope
                  appStore.mutate((s) => {
                    for (const w of parsed.state.worlds || []) {
                      if (!s.worlds.some((x) => x.id === w.id)) s.worlds.unshift(w);
                    }
                    for (const p of parsed.state.pjs || []) {
                      if (!s.pjs.some((x) => x.id === p.id)) s.pjs.push(p);
                    }
                    if (parsed.state.worlds?.[0]) s.activeWorldId = parsed.state.worlds[0].id;
                    s.theme = 'cyberpunk';
                  });
                  toast('Proyecto importado con éxito');
                  setView('dashboard');
                } else if (parsed.id && parsed.name) {
                  // Single world
                  appStore.mutate((s) => {
                    if (!s.worlds.some((x) => x.id === parsed.id)) s.worlds.unshift(parsed);
                    s.activeWorldId = parsed.id;
                  });
                  toast(`Mundo "${parsed.name}" importado con éxito`);
                  setView('dashboard');
                }
              } catch (err) {
                toast('Error al leer el archivo JSON');
              }
            };
            reader.readAsText(file);
          };
          fileInput.click();
        }
      }, [icon('download', 14), document.createTextNode('Importar JSON')]),

      // RPG Mode Toggle
      h('button', {
        class: `btn btn-sm header-hide-mobile ${state.rpgMode ? 'btn-primary' : 'btn-secondary'}`,
        onclick: () => toggleRpgMode()
      }, [icon('sword', 14), document.createTextNode(state.rpgMode ? 'RPG: ON' : 'RPG: OFF')]),

      // Theme Selector
      h('select', {
        class: 'input-select input-sm header-hide-mobile',
        style: 'min-width:110px;',
        'aria-label': 'Tema visual',
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
        class: 'btn btn-secondary btn-sm header-hide-mobile',
        onclick: () => setLocaleState(state.locale === 'es' ? 'en' : 'es')
      }, [state.locale.toUpperCase()])
    ])
  ]);

  // 2. Main Workspace Layout (Sidebar + Body)
  const workspaceBody = h('div', {
    class: 'lf-workspace-body',
  });

  const backdrop = h('div', {
    class: `lf-sidebar-backdrop ${mobileDrawerOpen ? 'open' : ''}`,
    onclick: () => setDrawerOpen(false),
  });

  // Sidebar
  const sidebar = renderSidebar(state, world, characters, () => setDrawerOpen(false));
  if (mobileDrawerOpen) sidebar.classList.add('open');
  workspaceBody.appendChild(backdrop);
  workspaceBody.appendChild(sidebar);

  // Main View Container
  const mainPane = h('main', {
    class: 'lf-main-pane',
  });

  mainPane.appendChild(renderActiveView(state.activeView));
  workspaceBody.appendChild(mainPane);

  // Mobile Bottom Navigation Bar (5 clear thumb-zone actions)
  const bottomNav = h('nav', {
    class: 'lf-bottom-nav',
    'aria-label': 'Navegación principal móvil',
  }, [
    createBottomNavBtn('Inicio', 'home', state.activeView === 'dashboard', () => {
      void triggerHaptic('light');
      setDrawerOpen(false);
      setView('dashboard');
    }),
    createBottomNavBtn(
      'Personajes',
      'users',
      state.activeView === 'pj' || (state.activeView === 'gallery' && state.activeGalleryCat === 'pjs'),
      () => {
        void triggerHaptic('light');
        setDrawerOpen(false);
        setGalleryCategory('pjs');
        setView('gallery');
      }
    ),
    createBottomNavBtn(
      'Escritos',
      'file-text',
      state.activeView === 'doc' || (state.activeView === 'gallery' && state.activeGalleryCat === 'chapters'),
      () => {
        void triggerHaptic('light');
        setDrawerOpen(false);
        setGalleryCategory('chapters');
        setView('gallery');
      }
    ),
    createBottomNavBtn('Mundo', 'globe', state.activeView === 'world', () => {
      void triggerHaptic('light');
      setDrawerOpen(false);
      setView('world');
    }),
    createBottomNavBtn('Menú', 'menu', mobileDrawerOpen, () => {
      void triggerHaptic('light');
      setDrawerOpen(!mobileDrawerOpen);
    }, 'bottom-nav-menu-btn'),
  ]);

  root.appendChild(header);
  root.appendChild(workspaceBody);
  root.appendChild(bottomNav);

  // Global key listener for Ctrl+K (register once)
  if (!keyListenerRegistered) {
    keyListenerRegistered = true;
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openCommandPalette();
      }
    });
  }

  return root;
}

function createBottomNavBtn(
  label: string,
  iconName: string,
  isActive: boolean,
  onClick: () => void,
  extraClass = ''
): HTMLElement {
  return h('button', {
    type: 'button',
    class: `bottom-nav-btn ${isActive ? 'active' : ''} ${extraClass}`.trim(),
    'aria-current': isActive ? 'page' : 'false',
    onclick: onClick,
  }, [
    icon(iconName, 20),
    h('span', {}, [label]),
  ]);
}

function renderSidebar(state: any, world: any, characters: any[], onNavigate: () => void): HTMLElement {
  const sidebarEl = h('aside', {
    class: 'lf-sidebar',
  });

  // Quick Tools Navigation
  const quickNav = h('div', { style: 'padding:12px; display:flex; flex-direction:column; gap:2px; border-bottom:1px solid var(--border-subtle);' }, [
    createNavItem('dashboard', 'Dashboard', 'layout', state.activeView === 'dashboard', onNavigate),
    createNavItem('world', 'Biblia del Mundo', 'globe', state.activeView === 'world', onNavigate),
    createNavItem('graph', 'Grafo & Relaciones', 'network', state.activeView === 'graph', onNavigate),
    createNavItem('timeline', 'Línea Temporal', 'calendar', state.activeView === 'timeline', onNavigate),
    createNavItem('maps', 'Atlas & Mapas', 'map', state.activeView === 'maps', onNavigate),
    createNavItem('contradictions', 'Contradicciones', 'alert-triangle', state.activeView === 'contradictions', onNavigate),
    createNavItem('rpg', 'Mesa TTRPG', 'sword', state.activeView === 'rpg', onNavigate),
    createNavItem('kanban', 'Tablero Kanban', 'layout', state.activeView === 'kanban', onNavigate),
    createNavItem('calendar', 'Calendario', 'calendar', state.activeView === 'calendar', onNavigate),
    createNavItem('player', 'Vista Jugador', 'eye', state.activeView === 'player', onNavigate),
    createNavItem('tom', 'Matriz ToM', 'eye', state.activeView === 'tom', onNavigate),
    createNavItem('export', 'Compilador & VTT', 'download', state.activeView === 'export', onNavigate)
  ]);

  sidebarEl.appendChild(quickNav);

  // Mobile Reading & Backup Utilities inside Drawer
  const mobileTools = h('div', { class: 'lf-drawer-mobile-tools' }, [
    h('button', {
      type: 'button',
      class: `btn btn-sm ${isKeepAwakeEnabled() ? 'btn-primary' : 'btn-secondary'}`,
      onclick: async (e: Event) => {
        const next = await toggleKeepAwake();
        const btn = e.currentTarget as HTMLButtonElement;
        btn.classList.toggle('btn-primary', next);
        btn.classList.toggle('btn-secondary', !next);
        btn.textContent = next ? 'Pantalla activa: ON' : 'Pantalla activa: OFF';
      },
    }, [isKeepAwakeEnabled() ? 'Pantalla activa: ON' : 'Pantalla activa: OFF']),
    h('button', {
      type: 'button',
      class: 'btn btn-secondary btn-sm',
      onclick: () => {
        void exportQuickJsonBackup();
        onNavigate();
      },
    }, [icon('share-2', 14), document.createTextNode('Compartir respaldo JSON')]),
  ]);
  sidebarEl.appendChild(mobileTools);

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
        onNavigate();
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

function createNavItem(viewId: ViewId, title: string, iconName: any, isActive: boolean, onNavigate: () => void): HTMLElement {
  return h('div', {
    class: `nav-item ${isActive ? 'nav-item-active' : ''}`,
    style: `display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:6px; cursor:pointer; font-size:13px; font-weight:${isActive ? '600' : '500'}; background:${isActive ? 'var(--surface-elevated)' : 'transparent'}; color:${isActive ? 'var(--accent-primary, #60a5fa)' : 'var(--text-secondary)'};`,
    onclick: () => {
      setView(viewId);
      onNavigate();
    }
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
