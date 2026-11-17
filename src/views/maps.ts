// LoreForge Studio — Nested Interactive Maps View (Inkarnate / Foundry VTT style)
import { appStore } from '../state/store';
import { t } from '../i18n';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { openModal } from '../ui/widgets';
import { navigateToDoc } from '../ui/navigation';
import type { WorldMap, MapPin, MapLevel } from '../types/modules';

export function renderMapsView(): HTMLElement {
  const world = appStore.getActiveWorld();
  const maps: WorldMap[] = world.maps || [];

  let currentMapId = appStore.getState().activeMapId || (maps[0]?.id ?? '');
  let currentMap = maps.find((m) => m.id === currentMapId) || maps[0];

  const container = h('div', { class: 'maps-view-container', style: 'display:flex; flex-direction:column; width:100%; height:100%; position:relative; overflow:hidden;' });

  // Toolbar
  const toolbar = h('div', { class: 'maps-toolbar', style: 'display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:var(--surface-elevated); border-bottom:1px solid var(--border-subtle); z-index:10;' }, [
    h('div', { style: 'display:flex; align-items:center; gap:12px;' }, [
      h('span', { style: 'font-weight:700; font-size:14px; display:flex; align-items:center; gap:6px;' }, [
        icon('map', 18),
        document.createTextNode(t('maps.title') || 'Atlas & Mapas Interactivos')
      ]),
      // Map selector dropdown
      h('select', {
        class: 'input-select',
        style: 'min-width:160px;',
        onchange: (e: any) => {
          appStore.mutate((s) => {
            s.activeMapId = e.target.value;
          });
        }
      }, ...maps.map((m) => {
        const opt = h('option', { value: m.id }, m.name + ` (${m.level || 'continente'})`) as HTMLOptionElement;
        if (m.id === currentMap?.id) opt.selected = true;
        return opt;
      }))
    ]),
    h('div', { style: 'display:flex; gap:8px;' }, [
      h('button', {
        class: 'btn btn-secondary btn-sm',
        onclick: () => {
          openNewMapModal();
        }
      }, [icon('plus', 14), document.createTextNode('Nuevo Mapa')]),
      h('span', { class: 'text-muted text-xs', style: 'align-self:center; margin-left:8px;' }, [
        'Haz clic en el mapa para colocar un marcador'
      ])
    ])
  ]);

  container.appendChild(toolbar);

  if (!currentMap) {
    container.appendChild(
      h('div', { style: 'display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; gap:16px;' }, [
        h('p', { class: 'text-muted' }, ['No hay mapas creados para este mundo todavía.']),
        h('button', { class: 'btn btn-primary', onclick: () => openNewMapModal() }, ['Crear Primer Mapa'])
      ])
    );
    return container;
  }

  // Interactive Canvas / Image Layer
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let startX = 0;
  let startY = 0;

  const mapViewport = h('div', {
    class: 'map-viewport',
    style: 'flex:1; position:relative; overflow:hidden; background:#09090b; cursor:crosshair;'
  });

  const mapSurface = h('div', {
    class: 'map-surface',
    style: 'position:absolute; transform-origin:0 0; width:1200px; height:800px;'
  });

  function updateTransform() {
    mapSurface.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  }

  // Map background: image or procedural grid
  if (currentMap.image_src) {
    const img = h('img', {
      src: currentMap.image_src,
      style: 'width:100%; height:100%; object-fit:cover; pointer-events:none; user-select:none;'
    });
    mapSurface.appendChild(img);
  } else {
    const placeholder = h('div', {
      style: 'width:100%; height:100%; background:linear-gradient(135deg, #18181b 0%, #27272a 100%); display:flex; align-items:center; justify-content:center; border:2px dashed #3f3f46; color:#71717a; font-size:16px;'
    }, `Lienzo de Mapa: ${currentMap.name} (Haz clic para colocar chinchetas)`);
    mapSurface.appendChild(placeholder);
  }

  // Render Pins
  const pins: MapPin[] = currentMap.pins || [];
  pins.forEach((pin) => {
    const pinEl = h('div', {
      class: 'map-pin',
      style: `position:absolute; left:${pin.x_pct}%; top:${pin.y_pct}%; transform:translate(-50%, -100%); cursor:pointer; display:flex; flex-direction:column; align-items:center; z-index:5;`,
      title: pin.label,
      onclick: (e: MouseEvent) => {
        e.stopPropagation();
        if (pin.linked_location_id) {
          navigateToDoc('locations', pin.linked_location_id);
        } else {
          openPinDetailModal(pin);
        }
      }
    }, [
      h('div', { style: 'width:26px; height:26px; border-radius:50%; background:#ef4444; display:flex; align-items:center; justify-content:center; color:#fff; box-shadow:0 2px 8px rgba(0,0,0,0.5); border:2px solid #fff;' }, [
        icon('map-pin', 14)
      ]),
      h('span', { style: 'font-size:11px; font-weight:600; background:rgba(0,0,0,0.75); color:#fff; padding:2px 6px; border-radius:4px; margin-top:2px; white-space:nowrap;' }, [
        pin.label
      ])
    ]);
    mapSurface.appendChild(pinEl);
  });

  // Pan & Zoom
  mapViewport.addEventListener('mousedown', (e) => {
    if (e.target !== mapViewport && e.target !== mapSurface && !mapSurface.contains(e.target as Node)) return;
    if (e.button === 1 || e.shiftKey) {
      isPanning = true;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
      mapViewport.style.cursor = 'grabbing';
      return;
    }
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    updateTransform();
  });

  window.addEventListener('mouseup', () => {
    isPanning = false;
    mapViewport.style.cursor = 'crosshair';
  });

  mapViewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.85;
    zoom = Math.min(3, Math.max(0.4, zoom * factor));
    updateTransform();
  });

  // Click on map to add pin
  mapSurface.addEventListener('click', (e) => {
    const rect = mapSurface.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    openCreatePinModal(clickX, clickY);
  });

  mapViewport.appendChild(mapSurface);
  container.appendChild(mapViewport);

  return container;

  function openCreatePinModal(x: number, y: number) {
    let title = '';
    let description = '';

    const content = h('div', { style: 'display:flex; flex-direction:column; gap:12px; padding:16px;' }, [
      h('label', { class: 'field-label' }, ['Nombre del Lugar / POI']),
      h('input', {
        class: 'input-text',
        placeholder: 'Castillo de Viento Alto / Mina Prohibida',
        oninput: (e: any) => { title = e.target.value; }
      }),
      h('label', { class: 'field-label' }, ['Descripción / Notas']),
      h('textarea', {
        class: 'input-textarea',
        rows: 3,
        placeholder: 'Detalles del lugar para el explorador...',
        oninput: (e: any) => { description = e.target.value; }
      }),
      h('div', { style: 'display:flex; justify-content:flex-end; gap:8px; margin-top:8px;' }, [
        h('button', {
          class: 'btn btn-primary',
          onclick: () => {
            if (!title.trim()) return;
            const newPin: MapPin = {
              id: 'pin_' + Date.now(),
              label: title.trim(),
              notes: description.trim(),
              x_pct: Math.round(x * 10) / 10,
              y_pct: Math.round(y * 10) / 10,
              kind: 'location'
            };
            appStore.mutate((s) => {
              const w = s.worlds.find((item) => item.id === world.id);
              const m = w?.maps?.find((map) => map.id === currentMap.id);
              if (m) {
                m.pins = [...(m.pins || []), newPin];
              }
            });
            closeModal();
          }
        }, ['Fijar Marcador'])
      ])
    ]);

    const closeModal = openModal('Añadir Marcador de Mapa', content);
  }

  function openPinDetailModal(pin: MapPin) {
    const content = h('div', { style: 'display:flex; flex-direction:column; gap:12px; padding:16px;' }, [
      h('p', { class: 'text-sm' }, [pin.notes || 'Sin notas adicionales.']),
      h('div', { class: 'text-muted text-xs' }, [`Coordenadas: ${pin.x_pct}%, ${pin.y_pct}%`]),
      h('div', { style: 'display:flex; justify-content:flex-end; margin-top:8px;' }, [
        h('button', {
          class: 'btn btn-secondary',
          onclick: () => closeModal()
        }, ['Cerrar'])
      ])
    ]);

    const closeModal = openModal(pin.label, content);
  }

  function openNewMapModal() {
    let title = '';
    let level: MapLevel = 'continent';
    let imageUrl = '';

    const content = h('div', { style: 'display:flex; flex-direction:column; gap:12px; padding:16px;' }, [
      h('label', { class: 'field-label' }, ['Título del Mapa']),
      h('input', {
        class: 'input-text',
        placeholder: 'Valle de las Sombras',
        oninput: (e: any) => { title = e.target.value; }
      }),
      h('label', { class: 'field-label' }, ['Nivel de Jerarquía']),
      h('select', {
        class: 'input-select',
        onchange: (e: any) => { level = e.target.value as MapLevel; }
      }, [
        h('option', { value: 'continent' }, 'Mundo / Continente'),
        h('option', { value: 'region' }, 'Región / Provincia'),
        h('option', { value: 'city' }, 'Ciudad / Asentamiento'),
        h('option', { value: 'dungeon' }, 'Mazmorra / Interior')
      ]),
      h('label', { class: 'field-label' }, ['URL de Imagen (Opcional)']),
      h('input', {
        class: 'input-text',
        placeholder: 'https://... o deja vacío para lienzo procedimental',
        oninput: (e: any) => { imageUrl = e.target.value; }
      }),
      h('div', { style: 'display:flex; justify-content:flex-end; gap:8px; margin-top:8px;' }, [
        h('button', {
          class: 'btn btn-primary',
          onclick: () => {
            if (!title.trim()) return;
            const newMap: WorldMap = {
              id: 'map_' + Date.now(),
              name: title.trim(),
              level,
              image_src: imageUrl.trim() || '',
              pins: []
            };
            appStore.mutate((s) => {
              const w = s.worlds.find((item) => item.id === world.id);
              if (w) {
                w.maps = [...(w.maps || []), newMap];
                s.activeMapId = newMap.id;
              }
            });
            closeModal();
          }
        }, ['Crear Mapa'])
      ])
    ]);

    const closeModal = openModal('Crear Nuevo Mapa / Nivel', content);
  }
}
