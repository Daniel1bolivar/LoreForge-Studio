// LoreForge Studio — Scenes Kanban Board View
import { appStore } from '../state/store';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { navigateToDoc } from '../ui/navigation';

export function renderKanbanView(): HTMLElement {
  const world = appStore.getActiveWorld();
  const chapters = world.archive?.chapters || [];

  const columns = [
    { id: 'idea', title: 'Ideas / Bocetos', color: '#64748b' },
    { id: 'drafting', title: 'En Redacción', color: '#3b82f6' },
    { id: 'review', title: 'Revisión / Pulido', color: '#f59e0b' },
    { id: 'done', title: 'Completado', color: '#10b981' }
  ];

  const container = h('div', { class: 'kanban-view', style: 'padding:24px; display:flex; flex-direction:column; gap:20px; overflow-y:auto; height:100%;' }, [
    h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, [
      h('div', {}, [
        h('h1', { style: 'font-size:20px; font-weight:700; display:flex; align-items:center; gap:8px;' }, [
          icon('layout', 20),
          document.createTextNode('Tablero Kanban de Escenas & Capítulos')
        ]),
        h('p', { class: 'text-muted text-sm', style: 'margin-top:4px;' }, [
          'Organiza el flujo de escritura de tus capítulos por fases narrativas.'
        ])
      ])
    ])
  ]);

  const board = h('div', { class: 'kanban-board', style: 'display:grid; grid-template-columns:repeat(4, 1fr); gap:16px; flex:1; min-height:400px;' });

  columns.forEach((col, idx) => {
    // Distribute chapters across columns based on status or index
    const colChapters = chapters.filter((_, cIdx) => (cIdx % 4) === idx);

    const colEl = h('div', {
      class: 'kanban-column',
      style: 'background:var(--surface-sunken); border-radius:10px; border:1px solid var(--border-subtle); display:flex; flex-direction:column; padding:12px; gap:12px;'
    }, [
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid ' + col.color + '; padding-bottom:8px;' }, [
        h('strong', { style: 'font-size:13px; color:var(--text-primary);' }, [col.title]),
        h('span', { class: 'badge', style: 'font-size:11px;' }, [String(colChapters.length)])
      ]),
      h('div', { class: 'kanban-cards', style: 'display:flex; flex-direction:column; gap:8px; flex:1; overflow-y:auto;' },
        colChapters.map((ch) => {
          return h('div', {
            class: 'kanban-card',
            style: 'background:var(--surface-elevated); padding:10px 12px; border-radius:6px; border:1px solid var(--border-subtle); cursor:pointer;',
            onclick: () => {
              navigateToDoc('chapters', ch.id);
            }
          }, [
            h('strong', { style: 'font-size:13px; display:block;' }, [ch.title]),
            ch.subtitle ? h('span', { class: 'text-muted text-xs', style: 'display:block; margin-top:2px;' }, [ch.subtitle]) : null
          ]);
        })
      )
    ]);

    board.appendChild(colEl);
  });

  container.appendChild(board);
  return container;
}
