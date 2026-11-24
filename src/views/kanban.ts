// LoreForge Studio — Scenes Kanban Board View with Emotional Pulse (2:1 Lumina Rule)
import { appStore } from '../state/store';
import { h, toast } from '../ui/dom';
import { icon } from '../ui/icons';
import { navigateToDoc } from '../ui/navigation';
import { openModal, field, selectBox, textInput } from '../ui/widgets';
import type { ArchiveDocument, ChapterMilestone, ChapterTone } from '../types/world';

const TONE_META: Record<ChapterTone, { label: string; bg: string; color: string; border: string }> = {
  dark: { label: 'Oscuro', bg: 'rgba(185, 28, 28, 0.14)', color: 'var(--status-danger)', border: 'rgba(185, 28, 28, 0.35)' },
  lumina: { label: 'Lumina', bg: 'rgba(16, 185, 129, 0.14)', color: 'var(--status-success)', border: 'rgba(16, 185, 129, 0.35)' },
  mixed: { label: 'Mixto', bg: 'rgba(245, 158, 11, 0.14)', color: 'var(--status-warning)', border: 'rgba(245, 158, 11, 0.35)' },
};

const MILESTONE_LABELS: Record<ChapterMilestone, string> = {
  start: 'Inicio',
  midpoint: 'Punto Medio',
  climax: 'Clímax',
  ending: 'Final',
};

export function renderKanbanView(): HTMLElement {
  const world = appStore.getActiveWorld();
  const chapters: ArchiveDocument[] = world.archive?.chapters || [];

  const columns = [
    { id: 'idea', title: 'Ideas / Bocetos', color: '#64748b' },
    { id: 'drafting', title: 'En Redacción', color: '#3b82f6' },
    { id: 'review', title: 'Revisión / Pulido', color: '#f59e0b' },
    { id: 'done', title: 'Completado', color: '#10b981' },
  ];

  // Detect streaks of >2 consecutive dark chapters (2:1 Lumina rule)
  let currentDarkStreak = 0;
  let maxDarkStreak = 0;
  const darkCount = chapters.filter((c) => c.tone === 'dark').length;
  const luminaCount = chapters.filter((c) => c.tone === 'lumina' || c.tone === 'mixed').length;
  for (const ch of chapters) {
    if (ch.tone === 'dark') {
      currentDarkStreak += 1;
      if (currentDarkStreak > maxDarkStreak) maxDarkStreak = currentDarkStreak;
    } else if (ch.tone === 'lumina' || ch.tone === 'mixed') {
      currentDarkStreak = 0;
    }
  }

  const pulseStatus =
    maxDarkStreak > 2
      ? {
          text: `Alerta de fatiga: ${maxDarkStreak} capítulos oscuros seguidos sin respiro de Lumina (Regla 2 a 1).`,
          color: 'var(--status-warning)',
          border: 'var(--status-warning)',
        }
      : {
          text: `Ritmo equilibrado: ${luminaCount} capítulos con Lumina/Mixto frente a ${darkCount} oscuros (máx. racha oscura: ${maxDarkStreak}).`,
          color: 'var(--status-success)',
          border: 'var(--border-subtle)',
        };

  const pulseBar = h(
    'div',
    {
      class: 'panel-card',
      style: `background:var(--surface-elevated); padding:14px 16px; border-radius:10px; border:1px solid ${pulseStatus.border}; display:flex; flex-direction:column; gap:10px;`,
    },
    [
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;' }, [
        h('strong', { style: 'font-size:13px; color:var(--text-primary);' }, [
          'Pulso Emocional & Regla 2 a 1 (Oscuridad vs. Lumina)',
        ]),
        h(
          'span',
          {
            style: `font-size:12px; font-weight:600; color:${pulseStatus.color}; font-variant-numeric:tabular-nums;`,
          },
          [pulseStatus.text]
        ),
      ]),
      chapters.length > 0
        ? h(
            'div',
            {
              style: 'display:flex; flex-wrap:wrap; gap:6px; align-items:center;',
            },
            chapters.map((ch, idx) => {
              const tone: ChapterTone = ch.tone || 'mixed';
              const meta = TONE_META[tone];
              return h(
                'button',
                {
                  type: 'button',
                  title: `${ch.title} — ${meta.label}${ch.milestone ? ` (${MILESTONE_LABELS[ch.milestone]})` : ''}`,
                  style: `min-height:30px; padding:2px 8px; border-radius:6px; border:1px solid ${meta.border}; background:${meta.bg}; color:${meta.color}; font-size:11px; font-weight:600; font-variant-numeric:tabular-nums; cursor:pointer;`,
                  onclick: () => openChapterMetaModal(ch),
                },
                [`C${idx + 1} · ${meta.label}${ch.milestone ? ` [${MILESTONE_LABELS[ch.milestone]}]` : ''}`]
              );
            })
          )
        : h('p', { class: 'text-muted text-xs' }, ['Crea capítulos en el archivo para medir el pulso emocional.']),
    ]
  );

  const container = h(
    'div',
    {
      class: 'kanban-view',
      style:
        'padding:24px 32px; display:flex; flex-direction:column; gap:20px; overflow-y:auto; height:100%; max-width:1440px; margin:0 auto; width:100%;',
    },
    [
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;' }, [
        h('div', {}, [
          h('h1', { style: 'font-size:22px; font-weight:800; display:flex; align-items:center; gap:8px;' }, [
            icon('kanban', 22),
            document.createTextNode('Tablero Kanban de Escenas & Capítulos'),
          ]),
          h('p', { class: 'text-muted text-sm', style: 'margin-top:4px;' }, [
            'Arrastra tus capítulos entre columnas y calibra su tono (Oscuro/Lumina), hito de arco y progreso de reliquia.',
          ]),
        ]),
      ]),
      pulseBar,
    ]
  );

  const board = h('div', {
    class: 'kanban-board',
    style: 'display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:16px; flex:1; min-height:450px;',
  });

  function getColIdForChapter(ch: ArchiveDocument, cIdx: number): string {
    const foundTag = (ch.tags || []).find((t) => t.startsWith('kanban:'));
    if (foundTag) {
      const colId = foundTag.replace('kanban:', '');
      if (columns.some((c) => c.id === colId)) return colId;
    }
    return columns[cIdx % 4].id;
  }

  columns.forEach((col) => {
    const colChapters = chapters.filter((ch, cIdx) => getColIdForChapter(ch, cIdx) === col.id);

    const colEl = h(
      'div',
      {
        class: 'kanban-column',
        style:
          'background:var(--surface-sunken); border-radius:10px; border:1px solid var(--border-subtle); display:flex; flex-direction:column; padding:14px; gap:12px; transition:border-color 0.15s, background 0.15s;',
      },
      [
        h(
          'div',
          {
            style:
              'display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid ' +
              col.color +
              '; padding-bottom:8px;',
          },
          [
            h('strong', { style: 'font-size:13px; font-weight:700; color:var(--text-primary);' }, [col.title]),
            h('span', { class: 'badge', style: 'font-size:11px; font-variant-numeric:tabular-nums;' }, [
              String(colChapters.length),
            ]),
          ]
        ),
        h(
          'div',
          {
            class: 'kanban-cards',
            style: 'display:flex; flex-direction:column; gap:10px; flex:1; overflow-y:auto; min-height:200px;',
          },
          colChapters.map((ch) => {
            const toneMeta = ch.tone ? TONE_META[ch.tone] : null;
            const badgesRow = h('div', { style: 'display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;' }, [
              toneMeta
                ? h(
                    'span',
                    {
                      style: `font-size:11px; font-weight:600; padding:2px 7px; border-radius:5px; background:${toneMeta.bg}; color:${toneMeta.color}; border:1px solid ${toneMeta.border};`,
                    },
                    [toneMeta.label]
                  )
                : null,
              ch.milestone
                ? h(
                    'span',
                    {
                      style:
                        'font-size:11px; font-weight:600; padding:2px 7px; border-radius:5px; background:var(--surface-sunken); color:var(--text-primary); border:1px solid var(--border-strong);',
                    },
                    [MILESTONE_LABELS[ch.milestone]]
                  )
                : null,
              ch.tracker_badge
                ? h(
                    'span',
                    {
                      style:
                        'font-size:11px; font-variant-numeric:tabular-nums; padding:2px 7px; border-radius:5px; background:var(--surface-sunken); color:var(--text-secondary); border:1px solid var(--border-subtle);',
                    },
                    [ch.tracker_badge]
                  )
                : null,
            ]);

            const cardEl = h(
              'div',
              {
                class: 'kanban-card',
                draggable: 'true',
                style:
                  'background:var(--surface-elevated); padding:12px 14px; border-radius:8px; border:1px solid var(--border-subtle); cursor:grab;',
                onclick: () => {
                  if (cardEl.classList.contains('dragging')) return;
                  navigateToDoc('chapters', ch.id);
                },
              },
              [
                h('strong', { style: 'font-size:13px; display:block; color:var(--text-primary);' }, [ch.title]),
                ch.subtitle
                  ? h('span', { class: 'text-muted text-xs', style: 'display:block; margin-top:4px;' }, [ch.subtitle])
                  : null,
                badgesRow,
                h(
                  'div',
                  {
                    style:
                      'display:flex; justify-content:space-between; align-items:center; margin-top:10px; gap:8px;',
                  },
                  [
                    h('span', { class: 'text-muted text-xs', style: 'font-size:11px;' }, ['Arrastra para mover']),
                    h(
                      'button',
                      {
                        type: 'button',
                        class: 'btn btn-ghost btn-sm',
                        style: 'min-height:32px; padding:4px 8px; font-size:11px;',
                        onclick: (e: MouseEvent) => {
                          e.stopPropagation();
                          openChapterMetaModal(ch);
                        },
                      },
                      ['Ritmo / Hito']
                    ),
                  ]
                ),
              ]
            );

            cardEl.addEventListener('dragstart', (e) => {
              cardEl.classList.add('dragging');
              e.dataTransfer?.setData('text/chapter-id', ch.id);
            });

            cardEl.addEventListener('dragend', () => {
              cardEl.classList.remove('dragging');
            });

            return cardEl;
          })
        ),
      ]
    );

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

  function openChapterMetaModal(ch: ArchiveDocument) {
    let tone: ChapterTone = ch.tone || 'mixed';
    let milestone: string = ch.milestone || '';
    let trackerBadge = ch.tracker_badge || '';

    const content = h('div', { style: 'display:flex; flex-direction:column; gap:14px; padding:16px;' }, [
      field(
        'Tono Emocional (Regla 2 a 1)',
        selectBox(
          [
            { value: 'dark', label: 'Oscuro (tensión, pérdida, conflicto)' },
            { value: 'lumina', label: 'Lumina (alivio, humor, calor humano)' },
            { value: 'mixed', label: 'Mixto (contraste humano + conflicto)' },
          ],
          tone,
          (v: string) => {
            tone = v as ChapterTone;
          }
        )
      ),
      field(
        'Hito del Arco de 4 Pilares',
        selectBox(
          [
            { value: '', label: 'Ninguno (desarrollo)' },
            { value: 'start', label: 'Punto Inicial' },
            { value: 'midpoint', label: 'Punto Intermedio' },
            { value: 'climax', label: 'Clímax' },
            { value: 'ending', label: 'Punto Final' },
          ],
          milestone,
          (v: string) => {
            milestone = v;
          }
        )
      ),
      field(
        'Marcador de Reliquia / Recurso (ej. Anillo 2/6 Amarillo)',
        textInput({
          value: trackerBadge,
          placeholder: 'Ej. Anillo 4/6 Verde bilis',
          onInput: (v: string) => {
            trackerBadge = v;
          },
        })
      ),
      h('div', { style: 'display:flex; justify-content:flex-end; gap:8px; margin-top:6px;' }, [
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn-primary',
            onclick: () => {
              appStore.mutate((s) => {
                const w = s.worlds.find((item) => item.id === world.id);
                const item = w?.archive?.chapters?.find((x) => x.id === ch.id);
                if (!item) return;
                item.tone = tone;
                if (milestone) item.milestone = milestone as ChapterMilestone;
                else delete item.milestone;
                if (trackerBadge.trim()) item.tracker_badge = trackerBadge.trim();
                else delete item.tracker_badge;
              });
              closeModal();
              toast(`Ritmo actualizado para "${ch.title}"`);
            },
          },
          ['Guardar cambios']
        ),
      ]),
    ]);

    const closeModal = openModal(`Ritmo y Hito — ${ch.title}`, content);
  }
}
