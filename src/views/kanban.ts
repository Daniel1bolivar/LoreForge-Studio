// LoreForge Studio — Scenes Kanban Board View
import { appStore } from '../state/store';
import { h, toast } from '../ui/dom';
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

  const container = h('div', { class: 'kanban-view', style: 'padding:24px 32px; display:flex; flex-direction:column; gap:20px; overflow-y:auto; height:100%; max-width:1400px; margin:0 auto; width:100%;' }, [
    h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, [
      h('div', {}, [
        h('h1', { style: 'font-size:22px; font-weight:800; display:flex; align-items:center; gap:8px;' }, [
          icon('kanban', 22),
          document.createTextNode('Tablero Kanban de Escenas & Capítulos')
        ]),
        h('p', { class: 'text-muted text-sm', style: 'margin-top:4px;' }, [
          'Arrastra y suelta tus capítulos y escenas entre las columnas para avanzar su estado de producción.'
        ])
      ])
    ])
  ]);

  const board = h('div', { class: 'kanban-board', style: 'display:grid; grid-template-columns:repeat(4, 1fr); gap:16px; flex:1; min-height:450px;' });

  function getColIdForChapter(ch: (typeof chapters)[0], cIdx: number): string {
    const foundTag = (ch.tags || []).find((t) => t.startsWith('kanban:'));
    if (foundTag) {
      const colId = foundTag.replace('kanban:', '');
      if (columns.some((c) => c.id === colId)) return colId;
    }
    // Default fallback by index
    return columns[cIdx % 4].id;
  }

  columns.forEach((col) => {
    const colChapters = chapters.filter((ch, cIdx) => getColIdForChapter(ch, cIdx) === col.id);

    const colEl = h('div', {
      class: 'kanban-column',
      style: 'background:var(--surface-sunken); border-radius:10px; border:1px solid var(--border-subtle); display:flex; flex-direction:column; padding:14px; gap:12px; transition:border-color 0.15s, background 0.15s;'
    }, [
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid ' + col.color + '; padding-bottom:8px;' }, [
        h('strong', { style: 'font-size:13px; font-weight:700; color:var(--text-primary);' }, [col.title]),
        h('span', { class: 'badge', style: 'font-size:11px;' }, [String(colChapters.length)])
      ]),
      h('div', { class: 'kanban-cards', style: 'display:flex; flex-direction:column; gap:10px; flex:1; overflow-y:auto; min-height:200px;' },
        colChapters.map((ch) => {
          const cardEl = h('div', {
            class: 'kanban-card',
            draggable: 'true',
            style: 'background:var(--surface-elevated); padding:12px 14px; border-radius:8px; border:1px solid var(--border-subtle); cursor:grab; box-shadow:0 2px 8px rgba(0,0,0,0.2);',
            onclick: () => {
              if (cardEl.classList.contains('dragging')) return;
              navigateToDoc('chapters', ch.id);
            }
          }, [
            h('strong', { style: 'font-size:13px; display:block; color:var(--text-primary);' }, [ch.title]),
            ch.subtitle ? h('span', { class: 'text-muted text-xs', style: 'display:block; margin-top:4px;' }, [ch.subtitle]) : null,
            h('span', { class: 'text-muted text-xs', style: 'display:inline-block; margin-top:8px; font-size:10px; opacity:0.8;' }, ['⋮⋮ Arrastra para mover'])
          ]);

          cardEl.addEventListener('dragstart', (e) => {
            cardEl.classList.add('dragging');
            e.dataTransfer?.setData('text/chapter-id', ch.id);
          });

          cardEl.addEventListener('dragend', () => {
            cardEl.classList.remove('dragging');
          });

          return cardEl;
        })
      )
    ]);

    colEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      colEl.classList.add('drag-over');
    });

    colEl.addEventListener('dragleave', () => {
      colEl.classList.remove('drag-over');
    });

    colEl.addEventListener('drop', (e) => {
      e.preventDefault();
      colEl.classList.remove('drag-over');
      const chId = e.dataTransfer?.getData('text/chapter-id');
      if (!chId) return;

      const targetCh = chapters.find((c) => c.id === chId);
      if (!targetCh) return;

      appStore.mutate((s) => {
        const w = s.worlds.find((item) => item.id === world.id);
        const list = w?.archive?.chapters;
        const item = list?.find((x) => x.id === chId);
        if (item) {
          const cleanedTags = (item.tags || []).filter((t) => !t.startsWith('kanban:'));
          item.tags = [...cleanedTags, `kanban:${col.id}`];
        }
      });

      toast(`"${targetCh.title}" movido a ${col.title}`);
    });

    board.appendChild(colEl);
  });

  container.appendChild(board);
  return container;
}
