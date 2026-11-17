// LoreForge Studio — World Bible & Homebrew Taxonomy View
import { appStore } from '../state/store';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { field, textArea, textInput, openModal } from '../ui/widgets';
import type { HomebrewTab } from '../types/state';

export function renderWorldView(): HTMLElement {
  const world = appStore.getActiveWorld();
  const state = appStore.getState();
  const activeTab: HomebrewTab = state.activeHomebrewTab || 'species';

  const container = h('div', { class: 'world-view', style: 'padding:24px; display:flex; flex-direction:column; gap:20px; overflow-y:auto; height:100%;' }, [
    h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, [
      h('div', {}, [
        h('h1', { style: 'font-size:20px; font-weight:700; display:flex; align-items:center; gap:8px;' }, [
          icon('globe', 20),
          document.createTextNode(`${world.name} — Biblia & Reglas del Mundo`)
        ]),
        h('p', { class: 'text-muted text-sm', style: 'margin-top:4px;' }, [
          world.genre_tone || 'Configura leyes fundamentales, metafísica, especies, facciones y taxonomía homebrew.'
        ])
      ])
    ])
  ]);

  // World fundamental laws & metaphysics
  const lawsCard = h('div', { class: 'panel-card', style: 'background:var(--surface-elevated); padding:18px; border-radius:10px; border:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:16px;' }, [
    h('h3', { style: 'font-size:15px; font-weight:600; display:flex; align-items:center; gap:8px;' }, [
      icon('book-open', 16),
      document.createTextNode('Leyes Fundamentales & Cosmovisión')
    ]),
    field('Tono / Género', textInput({
      value: world.genre_tone || 'Fantasía Oscura',
      onInput: (val: string) => {
        appStore.mutate((s) => {
          const w = s.worlds.find((x) => x.id === world.id);
          if (w) w.genre_tone = val;
        });
      }
    })),
    field('Reglas Inquebrantables del Mundo (Internal Laws)', textArea({
      value: Array.isArray(world.internal_laws) ? world.internal_laws.join('\n') : (world.internal_laws || ''),
      onInput: (val: string) => {
        appStore.mutate((s) => {
          const w = s.worlds.find((x) => x.id === world.id);
          if (w) w.internal_laws = val.split('\n').filter((l) => l.trim().length > 0);
        });
      },
      rows: 4,
      placeholder: 'Escribe una regla por línea. E.g.: "Los muertos vinculados por sangre no pueden mentir."'
    })),
    field('Metafísica, Magia o Sistemas y Límites', textArea({
      value: world.systems_and_limits || '',
      onInput: (val: string) => {
        appStore.mutate((s) => {
          const w = s.worlds.find((x) => x.id === world.id);
          if (w) w.systems_and_limits = val;
        });
      },
      rows: 3,
      placeholder: 'Descripción del coste o funcionamiento de la energía mística, tecnología o prodigio...'
    }))
  ]);

  container.appendChild(lawsCard);

  // Homebrew Tabs: Species | Languages | Traits
  const homebrewSection = h('div', { class: 'panel-card', style: 'background:var(--surface-elevated); padding:18px; border-radius:10px; border:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:16px;' }, [
    h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, [
      h('h3', { style: 'font-size:15px; font-weight:600; display:flex; align-items:center; gap:8px;' }, [
        icon('layers', 16),
        document.createTextNode('Taxonomía Homebrew del Mundo')
      ]),
      h('div', { style: 'display:flex; gap:6px;' }, [
        createTabBtn('species', 'Especies / Razas', activeTab),
        createTabBtn('languages', 'Idiomas', activeTab),
        createTabBtn('traits', 'Rasgos & Facciones', activeTab)
      ])
    ]),
    renderHomebrewTabContent(activeTab, world)
  ]);

  container.appendChild(homebrewSection);
  return container;

  function createTabBtn(tab: HomebrewTab, label: string, current: HomebrewTab) {
    const isActive = tab === current;
    return h('button', {
      class: `btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`,
      onclick: () => {
        appStore.mutate((s) => {
          s.activeHomebrewTab = tab;
        });
      }
    }, [label]);
  }

  function renderHomebrewTabContent(tab: HomebrewTab, w: typeof world): HTMLElement {
    const tabContainer = h('div', { style: 'display:flex; flex-direction:column; gap:12px;' });

    let items: Array<{ id: string; name: string; desc?: string }> = [];

    if (tab === 'species') {
      items = (w.homebrew?.species || []).map((s) => ({ id: s.slug, name: s.label, desc: s.notes }));
    } else if (tab === 'traits') {
      items = (w.homebrew?.traits || []).map((t) => ({ id: t.slug, name: t.label, desc: t.category }));
    } else if (tab === 'languages') {
      items = (w.homebrew?.languages?.registered || []).map((l) => ({ id: l.slug, name: l.label, desc: l.custom ? 'Personalizado' : 'Estándar' }));
    }

    const header = h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, [
      h('span', { class: 'text-muted text-xs' }, [`${items.length} elemento(s) registrados`]),
      h('button', {
        class: 'btn btn-secondary btn-sm',
        onclick: () => {
          openCreateHomebrewItemModal(tab);
        }
      }, [icon('plus', 14), document.createTextNode('Añadir')])
    ]);

    tabContainer.appendChild(header);

    if (items.length === 0) {
      tabContainer.appendChild(h('p', { class: 'text-muted text-sm' }, ['No hay elementos registrados en esta categoría.']));
      return tabContainer;
    }

    const itemsGrid = h('div', { style: 'display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:12px;' });

    items.forEach((item, idx) => {
      const card = h('div', {
        style: 'background:var(--surface-sunken); padding:12px; border-radius:8px; border:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:4px;'
      }, [
        h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, [
          h('strong', { style: 'font-size:13px; color:var(--text-primary);' }, [item.name]),
          h('button', {
            class: 'btn-icon-subtle',
            style: 'color:var(--status-danger); cursor:pointer; background:none; border:none;',
            onclick: () => {
              appStore.mutate((s) => {
                const targetWorld = s.worlds.find((x) => x.id === world.id);
                if (!targetWorld?.homebrew) return;
                if (tab === 'species') targetWorld.homebrew.species.splice(idx, 1);
                else if (tab === 'traits') targetWorld.homebrew.traits.splice(idx, 1);
                else if (tab === 'languages') targetWorld.homebrew.languages.registered.splice(idx, 1);
              });
            }
          }, [icon('trash-2', 14)])
        ]),
        item.desc ? h('p', { class: 'text-muted text-xs', style: 'line-height:1.4;' }, [item.desc]) : null
      ]);
      itemsGrid.appendChild(card);
    });

    tabContainer.appendChild(itemsGrid);
    return tabContainer;
  }

  function openCreateHomebrewItemModal(tab: HomebrewTab) {
    let name = '';
    let description = '';

    const content = h('div', { style: 'display:flex; flex-direction:column; gap:12px; padding:16px;' }, [
      h('label', { class: 'field-label' }, ['Nombre']),
      h('input', {
        class: 'input-text',
        placeholder: 'E.g. Humano de la Frontera, Lengua Antigua...',
        oninput: (e: any) => { name = e.target.value; }
      }),
      h('label', { class: 'field-label' }, ['Descripción / Notas']),
      h('textarea', {
        class: 'input-textarea',
        rows: 3,
        placeholder: 'Detalles culturales, fisiológicos o mecánicos...',
        oninput: (e: any) => { description = e.target.value; }
      }),
      h('div', { style: 'display:flex; justify-content:flex-end; gap:8px; margin-top:8px;' }, [
        h('button', {
          class: 'btn btn-primary',
          onclick: () => {
            if (!name.trim()) return;
            const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
            appStore.mutate((s) => {
              const targetWorld = s.worlds.find((x) => x.id === world.id);
              if (!targetWorld) return;
              if (tab === 'species') {
                targetWorld.homebrew.species.push({ slug, label: name.trim(), notes: description.trim() });
              } else if (tab === 'traits') {
                targetWorld.homebrew.traits.push({ slug, label: name.trim(), category: description.trim() || 'General' });
              } else if (tab === 'languages') {
                targetWorld.homebrew.languages.registered.push({ slug, label: name.trim(), custom: true });
              }
            });
            closeModal();
          }
        }, ['Guardar'])
      ])
    ]);

    const closeModal = openModal(`Añadir a ${tab === 'species' ? 'Especies' : tab === 'languages' ? 'Idiomas' : 'Rasgos'}`, content);
  }
}
