// LoreForge Studio — Multi-track Timeline View (Storyteller Suite style)
import { appStore } from '../state/store';
import { t } from '../i18n';
import { h, toast } from '../ui/dom';
import { icon } from '../ui/icons';
import { openModal } from '../ui/widgets';
import type { TimelineEvent } from '../types/modules';

export function renderTimelineView(): HTMLElement {
  const world = appStore.getActiveWorld();
  let events: TimelineEvent[] = world.timeline_events || [];

  // Fallback to archive.events if timeline_events is empty
  if (events.length === 0 && (world.archive?.events || []).length > 0) {
    events = (world.archive?.events || []).map((ev, idx) => ({
      id: ev.id,
      title: ev.title,
      date_label: ev.subtitle || '',
      order: idx + 1,
      track: (ev.tags && ev.tags[0]) || 'Historia',
      summary: ev.summary
    }));
  }

  // Group events into tracks (e.g., Global, Factions, Characters)
  const tracks = Array.from(new Set(events.map((e) => e.track || 'General')));
  if (tracks.length === 0) tracks.push('General');

  const container = h('div', { class: 'timeline-view', style: 'padding:24px 32px; display:flex; flex-direction:column; gap:20px; overflow-y:auto; height:100%; max-width:1400px; margin:0 auto; width:100%;' }, [
    h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, [
      h('div', {}, [
        h('h1', { style: 'font-size:22px; font-weight:800; display:flex; align-items:center; gap:8px;' }, [
          icon('clock', 22),
          document.createTextNode(t('timeline.title') || 'Línea Temporal Multitrack')
        ]),
        h('p', { class: 'text-muted text-sm', style: 'margin-top:4px;' }, [
          'Visualiza eventos en múltiples pistas cronológicas paralelas. Arrastra tarjetas para reorganizar su orden.'
        ])
      ]),
      h('button', {
        class: 'btn btn-primary',
        onclick: () => openNewEventModal()
      }, [icon('plus', 16), document.createTextNode('Nuevo Evento')])
    ])
  ]);

  const board = h('div', { class: 'timeline-tracks-board', style: 'display:flex; flex-direction:column; gap:16px; background:var(--surface-sunken); border-radius:12px; padding:18px; border:1px solid var(--border-subtle); overflow-x:auto;' });

  tracks.forEach((trackName) => {
    const trackEvents = events.filter((e) => (e.track || 'General') === trackName);
    trackEvents.sort((a, b) => (a.order || 0) - (b.order || 0));

    const trackRow = h('div', { class: 'timeline-track', style: 'display:flex; flex-direction:column; gap:8px;' }, [
      h('div', { style: 'font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--accent-primary); display:flex; align-items:center; gap:6px;' }, [
        icon('git-commit', 14),
        document.createTextNode(trackName)
      ]),
      h('div', {
        class: 'timeline-track-lane',
        style: 'display:flex; gap:14px; align-items:center; min-height:86px; padding:10px 14px; border-radius:8px; background:var(--surface-base); border:1px dashed var(--border-subtle); overflow-x:auto;'
      },
        trackEvents.length === 0
          ? [h('div', { class: 'text-muted text-xs' }, ['Sin eventos en esta pista.'])]
          : trackEvents.map((evt) => {
              const card = h('div', {
                class: 'timeline-card',
                draggable: 'true',
                style: 'padding:12px 14px; border-radius:8px; background:var(--surface-elevated); border:1px solid var(--border-subtle); min-width:220px; max-width:280px; cursor:grab; flex-shrink:0; transition:all 0.15s; box-shadow:0 2px 8px rgba(0,0,0,0.2);',
                onclick: () => openEditEventModal(evt)
              }, [
                h('div', { style: 'display:flex; justify-content:space-between; align-items:flex-start; gap:8px;' }, [
                  h('strong', { style: 'font-size:13px; color:var(--text-primary); line-height:1.3;' }, [evt.title]),
                  h('span', { class: 'badge', style: 'font-size:10px; flex-shrink:0;' }, [evt.date_label || `Orden ${evt.order}`])
                ]),
                evt.summary ? h('p', { class: 'text-muted text-xs', style: 'margin-top:6px; line-height:1.45;' }, [evt.summary]) : null
              ]);

              card.addEventListener('dragstart', (e) => {
                card.classList.add('dragging');
                e.dataTransfer?.setData('text/event-id', evt.id);
              });

              card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
              });

              return card;
            })
      )
    ]);

    const lane = trackRow.querySelector('.timeline-track-lane') as HTMLElement;
    if (lane) {
      lane.addEventListener('dragover', (e) => {
        e.preventDefault();
        lane.style.borderColor = 'var(--accent-primary)';
      });

      lane.addEventListener('dragleave', () => {
        lane.style.borderColor = 'var(--border-subtle)';
      });

      lane.addEventListener('drop', (e) => {
        e.preventDefault();
        lane.style.borderColor = 'var(--border-subtle)';
        const evId = e.dataTransfer?.getData('text/event-id');
        if (!evId) return;

        appStore.mutate((s) => {
          const w = s.worlds.find((item) => item.id === world.id);
          if (!w) return;
          if (!w.timeline_events) w.timeline_events = [...events];
          const target = w.timeline_events.find((x) => x.id === evId);
          if (target) {
            target.track = trackName;
          }
        });

        toast(`Evento movido a pista "${trackName}"`);
      });
    }

    board.appendChild(trackRow);
  });

  container.appendChild(board);
  return container;

  function openNewEventModal() {
    let title = '';
    let date = '';
    let track = tracks[0] || 'General';
    let summary = '';

    const content = h('div', { style: 'display:flex; flex-direction:column; gap:12px; padding:16px;' }, [
      h('label', { class: 'field-label' }, ['Título del Evento']),
      h('input', {
        class: 'input-text',
        placeholder: 'Pacto de Paz / Eclipse de Ceniza',
        oninput: (e: any) => { title = e.target.value; }
      }),
      h('label', { class: 'field-label' }, ['Fecha o Era']),
      h('input', {
        class: 'input-text',
        placeholder: 'Año 410 AE / Época Antigua',
        oninput: (e: any) => { date = e.target.value; }
      }),
      h('label', { class: 'field-label' }, ['Pista Cronológica (Track)']),
      h('input', {
        class: 'input-text',
        value: track,
        placeholder: 'General / Reino / Facción',
        oninput: (e: any) => { track = e.target.value; }
      }),
      h('label', { class: 'field-label' }, ['Resumen']),
      h('textarea', {
        class: 'input-textarea',
        rows: 3,
        placeholder: 'Qué ocurrió y qué consecuencias tuvo...',
        oninput: (e: any) => { summary = e.target.value; }
      }),
      h('div', { style: 'display:flex; justify-content:flex-end; gap:8px; margin-top:8px;' }, [
        h('button', {
          class: 'btn btn-primary',
          onclick: () => {
            if (!title.trim()) return;
            const newEvt: TimelineEvent = {
              id: 'evt_' + Date.now(),
              title: title.trim(),
              date_label: date.trim(),
              track: track.trim() || 'General',
              order: events.length + 1,
              summary: summary.trim()
            };
            appStore.mutate((s) => {
              const w = s.worlds.find((item) => item.id === world.id);
              if (w) {
                w.timeline_events = [...(w.timeline_events || events), newEvt];
              }
            });
            toast(`Evento "${newEvt.title}" añadido.`);
            closeModal();
          }
        }, ['Guardar Evento'])
      ])
    ]);

    const closeModal = openModal('Nuevo Evento Cronológico', content);
  }

  function openEditEventModal(evt: TimelineEvent) {
    let title = evt.title;
    let date = evt.date_label;
    let track = evt.track;
    let summary = evt.summary;

    const content = h('div', { style: 'display:flex; flex-direction:column; gap:12px; padding:16px;' }, [
      h('label', { class: 'field-label' }, ['Título']),
      h('input', {
        class: 'input-text',
        value: title,
        oninput: (e: any) => { title = e.target.value; }
      }),
      h('label', { class: 'field-label' }, ['Fecha / Epoca']),
      h('input', {
        class: 'input-text',
        value: date,
        oninput: (e: any) => { date = e.target.value; }
      }),
      h('label', { class: 'field-label' }, ['Pista']),
      h('input', {
        class: 'input-text',
        value: track,
        oninput: (e: any) => { track = e.target.value; }
      }),
      h('label', { class: 'field-label' }, ['Resumen']),
      h('textarea', {
        class: 'input-textarea',
        rows: 3,
        oninput: (e: any) => { summary = e.target.value; }
      }, summary),
      h('div', { style: 'display:flex; justify-content:space-between; margin-top:8px;' }, [
        h('button', {
          class: 'btn btn-danger btn-sm',
          onclick: () => {
            appStore.mutate((s) => {
              const w = s.worlds.find((item) => item.id === world.id);
              if (w) {
                w.timeline_events = (w.timeline_events || events).filter((x) => x.id !== evt.id);
              }
            });
            toast(`Evento "${evt.title}" eliminado.`);
            closeModal();
          }
        }, ['Eliminar']),
        h('button', {
          class: 'btn btn-primary',
          onclick: () => {
            appStore.mutate((s) => {
              const w = s.worlds.find((item) => item.id === world.id);
              if (w) {
                const list = w.timeline_events || events;
                const found = list.find((x) => x.id === evt.id);
                if (found) {
                  found.title = title.trim();
                  found.date_label = date.trim();
                  found.track = track.trim();
                  found.summary = summary.trim();
                }
                w.timeline_events = [...list];
              }
            });
            toast(`Evento actualizado.`);
            closeModal();
          }
        }, ['Guardar Cambios'])
      ])
    ]);

    const closeModal = openModal(evt.title, content);
  }
}
