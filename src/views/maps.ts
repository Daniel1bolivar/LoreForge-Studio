// LoreForge Studio — Nested Interactive Maps View (Inkarnate / Foundry VTT style)
import { appStore } from '../state/store';
import { t } from '../i18n';
import { h, toast } from '../ui/dom';
import { icon } from '../ui/icons';
import { openModal } from '../ui/widgets';
import type { WorldMap, MapPin, MapLevel } from '../types/modules';

export function renderMapsView(): HTMLElement {
  const world = appStore.getActiveWorld();
  const maps: WorldMap[] = world.maps || [];

  let currentMapId = appStore.getState().activeMapId || (maps[0]?.id ?? '');
  let currentMap = maps.find((m) => m.id === currentMapId) || maps[0];

  const container = h('div', { class: 'maps-view-container', style: 'display:flex; flex-direction:column; width:100%; height:100%; position:relative; overflow:hidden;' });

  // Find parent map if this is a submap
  const parentMap = maps.find((m) => (m.pins || []).some((p) => p.child_map_id === currentMap?.id));

  // Toolbar with Breadcrumbs & Submap Navigation
  const toolbar = h('div', { class: 'maps-toolbar', style: 'display:flex; justify-content:space-between; align-items:center; padding:12px 18px; background:var(--surface-elevated); border-bottom:1px solid var(--border-subtle); z-index:10; gap:12px; flex-wrap:wrap;' }, [
    h('div', { style: 'display:flex; align-items:center; gap:12px; flex-wrap:wrap;' }, [
      h('span', { style: 'font-weight:700; font-size:14px; display:flex; align-items:center; gap:6px;' }, [
        icon('map', 18),
        document.createTextNode(t('maps.title') || 'Atlas & Mapas Interactivos')
      ]),
      // Breadcrumbs navigation
      parentMap ? h('div', { style: 'display:flex; align-items:center; gap:6px; font-size:12px; background:var(--surface-sunken); padding:4px 8px; border-radius:6px; border:1px solid var(--border-subtle);' }, [
        h('button', {
          class: 'btn btn-ghost btn-sm',
          style: 'padding:2px 6px;',
          onclick: () => {
            appStore.mutate((s) => { s.activeMapId = parentMap.id; });
          }
        }, [icon('chevron-left', 14), document.createTextNode(parentMap.name)]),
        h('span', { class: 'text-muted' }, ['/']),
        h('strong', { style: 'color:var(--accent-primary);' }, [currentMap.name])
      ]) : null,
      // Map selector dropdown
      h('select', {
        class: 'input-select',
        style: 'min-width:180px;',
        onchange: (e: any) => {
          appStore.mutate((s) => {
            s.activeMapId = e.target.value;
          });
        }
      }, ...maps.map((m) => {
        const opt = h('option', { value: m.id }, m.name + ` (${levelLabel(m.level)})`) as HTMLOptionElement;
        if (m.id === currentMap?.id) opt.selected = true;
        return opt;
      }))
    ]),
    h('div', { style: 'display:flex; align-items:center; gap:8px;' }, [
      h('button', {
        class: 'btn btn-primary btn-sm',
        onclick: () => openNewMapModal()
      }, [icon('plus', 14), document.createTextNode('Nuevo Mapa / Submapa')]),
      h('span', { class: 'text-muted text-xs', style: 'align-self:center; margin-left:4px;' }, [
        'Arrastra chinchetas para mover | Clic para enlazar submapa'
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

  // Map background
  if (currentMap.image_src) {
    const img = h('img', {
      src: currentMap.image_src,
      style: 'width:100%; height:100%; object-fit:cover; pointer-events:none; user-select:none;'
    });
    mapSurface.appendChild(img);
  } else {
    const placeholder = h('div', {
      style: 'width:100%; height:100%; background:linear-gradient(135deg, #141419 0%, #1e1e24 100%); display:flex; flex-direction:column; align-items:center; justify-content:center; border:2px dashed #3f3f46; color:#a1a1aa; font-size:16px; gap:8px; user-select:none;'
    }, [
      h('strong', { style: 'font-size:18px; color:var(--text-primary);' }, [`${currentMap.name} (${levelLabel(currentMap.level)})`]),
      h('span', { class: 'text-sm text-muted' }, ['Haz clic en cualquier punto para fijar un marcador de ciudad, mazmorra o POI.'])
    ]);
    mapSurface.appendChild(placeholder);
  }

  const pins: MapPin[] = currentMap.pins || [];

  // Route & Travel Time Calculator Bar (accessible + tabular-nums)
  let routeFromId = pins[0]?.id || '';
  let routeToId = pins[1]?.id || '';
  const scaleLeagues = currentMap.scale_leagues_per_100pct || 80;

  const routeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  routeSvg.setAttribute('viewBox', '0 0 100 100');
  routeSvg.setAttribute('preserveAspectRatio', 'none');
  routeSvg.style.cssText = 'position:absolute; inset:0; width:100%; height:100%; pointer-events:none; z-index:6;';

  const routeOutput = h('div', {
    style: 'display:flex; flex-wrap:wrap; gap:12px; align-items:center; font-size:12px; font-variant-numeric:tabular-nums; color:var(--text-primary);',
  });

  function updateRouteCalc() {
    const pA = pins.find((p) => p.id === routeFromId);
    const pB = pins.find((p) => p.id === routeToId);
    routeSvg.innerHTML = '';
    routeOutput.innerHTML = '';

    if (!pA || !pB || pA.id === pB.id) {
      routeOutput.appendChild(
        h('span', { class: 'text-muted' }, ['Selecciona dos chinchetas distintas para calcular leguas y jornadas de viaje.'])
      );
      return;
    }

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', String(pA.x_pct));
    line.setAttribute('y1', String(pA.y_pct));
    line.setAttribute('x2', String(pB.x_pct));
    line.setAttribute('y2', String(pB.y_pct));
    line.setAttribute('stroke', '#f59e0b');
    line.setAttribute('stroke-width', '0.5');
    line.setAttribute('stroke-dasharray', '1.4 0.9');
    routeSvg.appendChild(line);

    const pctDist = Math.hypot(pB.x_pct - pA.x_pct, pB.y_pct - pA.y_pct);
    const leagues = Math.max(1, Math.round((pctDist / 100) * (currentMap.scale_leagues_per_100pct || 80)));
    const footDays = (leagues / 5).toFixed(1);
    const horseDays = (leagues / 10).toFixed(1);
    const bargeDays = (leagues / 22).toFixed(1);

    routeOutput.appendChild(h('strong', { style: 'color:var(--accent-primary);' }, [`${leagues} leguas`]));
    routeOutput.appendChild(h('span', {}, [`A pie (barro): ${footDays} d`]));
    routeOutput.appendChild(h('span', {}, [`A caballo: ${horseDays} d`]));
    routeOutput.appendChild(h('span', {}, [`Barcaza: ${bargeDays} d`]));
  }

  if (pins.length >= 2) {
    const fromSel = h(
      'select',
      {
        class: 'input-select',
        style: 'min-height:36px; min-width:150px;',
        onchange: (e: any) => {
          routeFromId = e.target.value;
          updateRouteCalc();
        },
      },
      ...pins.map((p) => {
        const opt = h('option', { value: p.id }, [p.label]) as HTMLOptionElement;
        if (p.id === routeFromId) opt.selected = true;
        return opt;
      })
    );
    const toSel = h(
      'select',
      {
        class: 'input-select',
        style: 'min-height:36px; min-width:150px;',
        onchange: (e: any) => {
          routeToId = e.target.value;
          updateRouteCalc();
        },
      },
      ...pins.map((p) => {
        const opt = h('option', { value: p.id }, [p.label]) as HTMLOptionElement;
        if (p.id === routeToId) opt.selected = true;
        return opt;
      })
    );
    const scaleInput = h('input', {
      type: 'number',
      min: '10',
      max: '5000',
      value: String(scaleLeagues),
      class: 'input-text',
      style: 'width:82px; min-height:36px; font-variant-numeric:tabular-nums;',
      title: 'Leguas equivalentes al ancho completo del mapa',
      onchange: (e: any) => {
        const val = Math.max(10, Number(e.target.value) || 80);
        appStore.mutate((s) => {
          const w = s.worlds.find((item) => item.id === world.id);
          const m = w?.maps?.find((map) => map.id === currentMap.id);
          if (m) m.scale_leagues_per_100pct = val;
        });
        updateRouteCalc();
      },
    });

    const routeBar = h(
      'div',
      {
        style:
          'display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; padding:10px 18px; background:var(--surface-sunken); border-bottom:1px solid var(--border-subtle); z-index:9;',
      },
      [
        h('div', { style: 'display:flex; flex-wrap:wrap; align-items:center; gap:8px;' }, [
          h('strong', { style: 'font-size:12px; color:var(--text-primary);' }, ['Calculadora de Ruta:']),
          fromSel,
          h('span', { class: 'text-muted text-xs' }, ['hacia']),
          toSel,
          h('label', { style: 'display:flex; align-items:center; gap:6px; font-size:12px; color:var(--text-secondary);' }, [
            'Escala (leguas):',
            scaleInput,
          ]),
        ]),
        routeOutput,
      ]
    );
    container.appendChild(routeBar);
    updateRouteCalc();
  }

  mapSurface.appendChild(routeSvg);

  // Render Draggable Pins
  pins.forEach((pin) => {
    let isDraggingPin = false;
    let hasMoved = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let currentXPct = pin.x_pct;
    let currentYPct = pin.y_pct;

    const childMap = maps.find((m) => m.id === pin.child_map_id);

    const pinEl = h('div', {
      class: 'map-pin',
      style: `position:absolute; left:${pin.x_pct}%; top:${pin.y_pct}%; transform:translate(-50%, -100%); cursor:grab; display:flex; flex-direction:column; align-items:center; z-index:10; user-select:none;`,
      title: `${pin.label} (Arrastra para mover)`,
      onmousedown: (e: MouseEvent) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        isDraggingPin = true;
        hasMoved = false;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        pinEl.style.cursor = 'grabbing';

        const onMove = (moveEvt: MouseEvent) => {
          if (!isDraggingPin) return;
          const dx = moveEvt.clientX - dragStartX;
          const dy = moveEvt.clientY - dragStartY;
          if (Math.hypot(dx, dy) > 4) hasMoved = true;

          const rect = mapSurface.getBoundingClientRect();
          const newXPct = Math.min(99, Math.max(1, ((moveEvt.clientX - rect.left) / rect.width) * 100));
          const newYPct = Math.min(99, Math.max(1, ((moveEvt.clientY - rect.top) / rect.height) * 100));

          currentXPct = Math.round(newXPct * 10) / 10;
          currentYPct = Math.round(newYPct * 10) / 10;

          pinEl.style.left = `${currentXPct}%`;
          pinEl.style.top = `${currentYPct}%`;
        };

        const onUp = () => {
          if (!isDraggingPin) return;
          isDraggingPin = false;
          pinEl.style.cursor = 'grab';
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);

          if (hasMoved) {
            appStore.mutate((s) => {
              const w = s.worlds.find((item) => item.id === world.id);
              const m = w?.maps?.find((map) => map.id === currentMap.id);
              const p = m?.pins?.find((item) => item.id === pin.id);
              if (p) {
                p.x_pct = currentXPct;
                p.y_pct = currentYPct;
              }
            });
            toast(`Marcador "${pin.label}" colocado en (${currentXPct}%, ${currentYPct}%)`);
          } else {
            openPinDetailModal(pin);
          }
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      }
    }, [
      h('div', {
        style: `width:28px; height:28px; border-radius:50%; background:${childMap ? 'var(--accent-primary, #00f0ff)' : '#ef4444'}; display:flex; align-items:center; justify-content:center; color:#fff; box-shadow:0 2px 10px rgba(0,0,0,0.6); border:2px solid #fff;`
      }, [
        icon(childMap ? 'map' : 'map-pin', 14)
      ]),
      h('span', {
        style: 'font-size:11px; font-weight:700; background:rgba(10,10,12,0.85); color:#fff; padding:2px 8px; border-radius:4px; margin-top:3px; white-space:nowrap; border:1px solid rgba(255,255,255,0.15); box-shadow:0 2px 6px rgba(0,0,0,0.5);'
      }, [
        pin.label,
        childMap ? ' [Submapa]' : ''
      ])
    ]);

    mapSurface.appendChild(pinEl);
  });

  // Pan & Zoom
  mapViewport.addEventListener('mousedown', (e) => {
    if (e.target !== mapViewport && e.target !== mapSurface && !mapSurface.contains(e.target as Node)) return;
    if (e.button === 0 || e.button === 1 || e.shiftKey) {
      isPanning = true;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
      mapViewport.style.cursor = 'grabbing';
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

  // Click on map canvas to add pin
  mapSurface.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('.map-pin')) return;
    const rect = mapSurface.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    openCreatePinModal(clickX, clickY);
  });

  mapViewport.appendChild(mapSurface);
  container.appendChild(mapViewport);

  return container;

  function levelLabel(lvl?: string): string {
    switch (lvl) {
      case 'dungeon': return 'Mazmorra / Interior';
      case 'city': return 'Ciudad / Asentamiento';
      case 'region': return 'Región / Provincia';
      default: return 'Continente / Mundo';
    }
  }

  function openCreatePinModal(x: number, y: number) {
    let title = '';
    let description = '';
    let linkedChildMapId = '';

    const content = h('div', { style: 'display:flex; flex-direction:column; gap:12px; padding:16px;' }, [
      h('label', { class: 'field-label' }, ['Nombre del Lugar / POI']),
      h('input', {
        class: 'input-text',
        placeholder: 'Ej: Ciudad de Oakhaven / Bóveda Sumergida',
        oninput: (e: any) => { title = e.target.value; }
      }),
      h('label', { class: 'field-label' }, ['Descripción / Notas']),
      h('textarea', {
        class: 'input-textarea',
        rows: 3,
        placeholder: 'Detalles del lugar, misterios o facción que lo controla...',
        oninput: (e: any) => { description = e.target.value; }
      }),
      h('label', { class: 'field-label' }, ['Vincular a Submapa (Opcional)']),
      h('select', {
        class: 'input-select',
        onchange: (e: any) => { linkedChildMapId = e.target.value; }
      }, [
        h('option', { value: '' }, 'Sin submapa vinculado'),
        ...maps.filter((m) => m.id !== currentMap.id).map((m) =>
          h('option', { value: m.id }, `🗺️ ${m.name} (${levelLabel(m.level)})`)
        )
      ]),
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
              child_map_id: linkedChildMapId || undefined,
              kind: 'location'
            };
            appStore.mutate((s) => {
              const w = s.worlds.find((item) => item.id === world.id);
              const m = w?.maps?.find((map) => map.id === currentMap.id);
              if (m) {
                m.pins = [...(m.pins || []), newPin];
              }
            });
            toast(`Marcador "${newPin.label}" creado.`);
            closeModal();
          }
        }, ['Fijar Marcador'])
      ])
    ]);

    const closeModal = openModal('Añadir Marcador de Mapa', content);
  }

  function openPinDetailModal(pin: MapPin) {
    const childMap = maps.find((m) => m.id === pin.child_map_id);

    const content = h('div', { style: 'display:flex; flex-direction:column; gap:14px; padding:16px;' }, [
      h('p', { class: 'text-sm' }, [pin.notes || 'Sin notas adicionales para esta ubicación.']),
      h('div', { class: 'text-muted text-xs' }, [`Coordenadas en lienzo: ${pin.x_pct}%, ${pin.y_pct}%`]),
      childMap ? h('div', {
        style: 'background:var(--surface-sunken); padding:12px; border-radius:8px; border:1px solid var(--accent-primary); display:flex; justify-content:space-between; align-items:center;'
      }, [
        h('div', {}, [
          h('strong', { style: 'display:block; font-size:13px;' }, [`Submapa: ${childMap.name}`]),
          h('span', { class: 'text-muted text-xs' }, [levelLabel(childMap.level)])
        ]),
        h('button', {
          class: 'btn btn-primary btn-sm',
          onclick: () => {
            closeModal();
            appStore.mutate((s) => { s.activeMapId = childMap.id; });
            toast(`Descendiendo al submapa "${childMap.name}"...`);
          }
        }, [icon('map', 14), document.createTextNode('Entrar al Mapa ➔')])
      ]) : null,
      h('div', { style: 'display:flex; justify-content:space-between; align-items:center; margin-top:8px;' }, [
        h('button', {
          class: 'btn btn-danger btn-sm',
          onclick: () => {
            appStore.mutate((s) => {
              const w = s.worlds.find((item) => item.id === world.id);
              const m = w?.maps?.find((map) => map.id === currentMap.id);
              if (m) {
                m.pins = (m.pins || []).filter((p) => p.id !== pin.id);
              }
            });
            toast(`Marcador "${pin.label}" eliminado.`);
            closeModal();
          }
        }, [icon('trash', 14), document.createTextNode('Eliminar Marcador')]),
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
    let level: MapLevel = 'city';
    let imageUrl = '';

    const content = h('div', { style: 'display:flex; flex-direction:column; gap:12px; padding:16px;' }, [
      h('label', { class: 'field-label' }, ['Título del Mapa / Submapa']),
      h('input', {
        class: 'input-text',
        placeholder: 'Ej: Ciudadela de Cristal / Minas de Sal',
        oninput: (e: any) => { title = e.target.value; }
      }),
      h('label', { class: 'field-label' }, ['Nivel de Jerarquía']),
      h('select', {
        class: 'input-select',
        onchange: (e: any) => { level = e.target.value as MapLevel; }
      }, [
        h('option', { value: 'city' }, 'Ciudad / Asentamiento'),
        h('option', { value: 'dungeon' }, 'Mazmorra / Interior'),
        h('option', { value: 'region' }, 'Región / Provincia'),
        h('option', { value: 'continent' }, 'Mundo / Continente')
      ]),
      h('label', { class: 'field-label' }, ['URL de Imagen (Opcional)']),
      h('input', {
        class: 'input-text',
        placeholder: 'https://... o vacío para lienzo oscuro interactivo',
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
            toast(`Mapa "${newMap.name}" creado.`);
            closeModal();
          }
        }, ['Crear Mapa'])
      ])
    ]);

    const closeModal = openModal('Crear Nuevo Mapa / Submapa', content);
  }
}
