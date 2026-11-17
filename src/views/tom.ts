// LoreForge Studio — Theory of Mind Matrix View (Secrets, Misunderstandings & Perceptions)
import { appStore } from '../state/store';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';

export function renderTomView(): HTMLElement {
  const world = appStore.getActiveWorld();
  const characters = appStore.getCharactersForWorld(world.id);

  const container = h('div', { class: 'tom-view', style: 'padding:24px; display:flex; flex-direction:column; gap:20px; overflow-y:auto; height:100%;' }, [
    h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, [
      h('div', {}, [
        h('h1', { style: 'font-size:20px; font-weight:700; display:flex; align-items:center; gap:8px;' }, [
          icon('brain', 20),
          document.createTextNode('Matriz de Teoría de la Mente (Theory of Mind)')
        ]),
        h('p', { class: 'text-muted text-sm', style: 'margin-top:4px;' }, [
          'Gestiona asimetrías de información: quién sabe qué, quién sospecha de quién y qué secretos están ocultos entre personajes.'
        ])
      ])
    ])
  ]);

  if (characters.length < 2) {
    container.appendChild(
      h('div', { class: 'panel-card', style: 'padding:24px; text-align:center; background:var(--surface-sunken); border-radius:8px;' }, [
        h('p', { class: 'text-muted' }, ['Se requieren al menos 2 personajes para construir la matriz de percepciones cruzadas.'])
      ])
    );
    return container;
  }

  // Cross table matrix
  const table = h('table', {
    style: 'width:100%; border-collapse:collapse; background:var(--surface-elevated); border-radius:8px; overflow:hidden; border:1px solid var(--border-subtle);'
  });

  const thead = h('thead', {}, [
    h('tr', { style: 'background:var(--surface-sunken);' }, [
      h('th', { style: 'padding:12px; text-align:left; font-size:12px; color:var(--text-muted); border-bottom:1px solid var(--border-subtle);' }, ['Observador \\ Sujeto']),
      ...characters.map((c) => h('th', { style: 'padding:12px; text-align:left; font-size:12px; font-weight:600; color:var(--text-primary); border-bottom:1px solid var(--border-subtle);' }, [c.identity.name]))
    ])
  ]);
  table.appendChild(thead);

  const tbody = h('tbody', {});

  characters.forEach((observer) => {
    const tr = h('tr', { style: 'border-bottom:1px solid var(--border-subtle);' }, [
      h('td', { style: 'padding:12px; font-weight:600; font-size:13px; background:var(--surface-sunken);' }, [observer.identity.name])
    ]);

    characters.forEach((subject) => {
      if ((observer.id && observer.id === subject.id) || observer.identity.name === subject.identity.name) {
        tr.appendChild(h('td', { style: 'padding:12px; background:var(--surface-base); color:var(--text-muted); font-size:12px;' }, ['— Autopercepción —']));
      } else {
        // Find existing relation or perception
        const rel = world.relations?.find((r) =>
          (r.from_id === observer.id || r.from === observer.identity.name) &&
          (r.to_id === subject.id || r.to === subject.identity.name)
        );
        const cell = h('td', { style: 'padding:12px; font-size:12px;' }, [
          rel ? h('span', { class: 'badge', style: 'font-size:11px;' }, [rel.relation]) : h('span', { class: 'text-muted' }, ['Desconocido / Neutral'])
        ]);
        tr.appendChild(cell);
      }
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);

  return container;
}
