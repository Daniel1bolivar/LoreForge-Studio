// LoreForge Studio — Multi-track Timeline View (Storyteller Suite style)
import { appStore } from '../state/store';
import { t } from '../i18n';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { openModal } from '../ui/widgets';
import type { TimelineEvent } from '../types/modules';

export function renderTimelineView(): HTMLElement {
  const world = appStore.getActiveWorld();
  const events: TimelineEvent[] = world.timeline_events || [];

  // Group events into tracks (e.g., Global, Factions, Characters)
  const tracks = Array.from(new Set(events.map((e) => e.track || 'General')));
  if (tracks.length === 0) tracks.push('General');

  const container = h('div', { class: 'timeline-view', style: 'padding:24px; display:flex; flex-direction:column; gap:20px; overflow-y:auto; height:100%;' }, [
    h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, [
      h('div', {}, [
        h('h1', { style: 'font-size:20px; font-weight:700; display:flex; align-items:center; gap:8px;' }, [
          icon('clock', 20),
          document.createTextNode(t('timeline.title') || 'Línea Temporal Multitrack')
        ]),
        h('p', { class: 'text-muted text-sm', style: 'margin-top:4px;' }, [
          'Visualiza eventos en múltiples pistas paralelas sin solapamientos ciegos.'
        ])
      ]),
      h('button', {
        class: 'btn btn-primary',
        onclick: () => {
          openNewEventModal();
        }
      }, [icon('plus', 16), document.createTextNode('Nuevo Evento')])
    ])
  ]);

  const board = h('div', { class: 'timeline-tracks-board', style: 'display:flex; flex-direction:column; gap:16px; background:var(--surface-sunken); border-radius:12px; padding:16px; border:1px solid var(--border-subtle); overflow-x:auto;' });

  tracks.forEach((trackName) => {
    const trackEvents = events.filter((e) => (e.track || 'General') === trackName);
    trackEvents.sort((a, b) => (a.order || 0) - (b.order || 0));

    const trackRow = h('div', { class: 'timeline-track', style: 'display:flex; flex-direction:column; gap:8px;' }, [
      h('div', { style: 'font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-muted);' }, [
        trackName
      ]),
      h('div', { style: 'display:flex; gap:12px; align-items:center; min-height:80px; padding:8px; border-radius:8px; background:var(--surface-base); border:1px dashed var(--border-subtle); overflow-x:auto;' },
        trackEvents.length === 0
          ? [h('div', { class: 'text-muted text-xs' }, ['Sin eventos en esta pista.'])]
          : trackEvents.map((evt) => {
              const card = h('div', {
                class: 'timeline-card',
                style: 'padding:10px 14px; border-radius:8px; background:var(--surface-elevated); border:1px solid var(--accent-primary); min-width:200px; max-width:260px; cursor:pointer; flex-shrink:0;'
              }, [
                h('div', { style: 'display:flex; justify-content:space-between; align-items:flex-start;' }, [
                  h('strong', { style: 'font-size:13px; color:var(--text-primary);' }, [evt.title]),
                  h('span', { class: 'badge', style: 'font-size:10px;' }, [evt.date_label || `Orden ${evt.order}`])
                ]),
                evt.summary ? h('p', { class: 'text-muted text-xs', style: 'margin-top:6px; line-height:1.4;' }, [evt.summary]) : null
              ]);
              return card;
            })
      )
    ]);

    board.appendChild(trackRow);
  });

  container.appendChild(board);
  return container;

  function openNewEventModal() {
    let title = '';
    let track = tracks[0] || 'General';
    let date = '';
    let description = '';

    const content = h('div', { style: 'display:flex; flex-direction:column; gap:12px; padding:16px;' }, [
      h('label', { class: 'field-label' }, ['Título']),
      h('input', {
        class: 'input-text',
        placeholder: 'Batalla de los Vientos',
        oninput: (e: any) => { title = e.target.value; }
      }),
      h('label', { class: 'field-label' }, ['Pista (Track)']),
      h('input', {
        class: 'input-text',
        placeholder: 'General / Reino del Norte / Facciones',
        value: track,
        oninput: (e: any) => { track = e.target.value; }
      }),
      h('label', { class: 'field-label' }, ['Fecha / Época / Año']),
      h('input', {
        class: 'input-text',
        placeholder: 'Año 412 Segunda Era',
        oninput: (e: any) => { date = e.target.value; }
      }),
      h('label', { class: 'field-label' }, ['Descripción / Resumen']),
      h('textarea', {
        class: 'input-textarea',
        rows: 3,
        placeholder: 'Resumen conciso del acontecimiento...',
        oninput: (e: any) => { description = e.target.value; }
      }),
      h('div', { style: 'display:flex; justify-content:flex-end; gap:8px; margin-top:8px;' }, [
        h('button', {
          class: 'btn btn-primary',
          onclick: () => {
            if (!title.trim()) return;
            const newEvents: TimelineEvent[] = [...(world.timeline_events || []), {
              id: 'evt_' + Date.now(),
              title: title.trim(),
              track: track.trim() || 'General',
              date_label: date.trim() || 'TBD',
              summary: description.trim(),
              order: (world.timeline_events?.length || 0) + 1
            }];
            appStore.mutate((s) => {
              const w = s.worlds.find((x) => x.id === world.id);
              if (w) w.timeline_events = newEvents;
            });
            closeModal();
          }
        }, ['Guardar Evento'])
      ])
    ]);

    const closeModal = openModal('Crear Evento en Línea Temporal', content);
  }
}
