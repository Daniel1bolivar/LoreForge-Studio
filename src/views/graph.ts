// LoreForge Studio — Graph View (Obsidian Canvas / Arcweave style)
import { appStore, upsertRelation } from '../state/store';
import { t } from '../i18n';
import { h, toast, uid } from '../ui/dom';
import { icon } from '../ui/icons';
import { openModal } from '../ui/widgets';
import { navigateToPj } from '../ui/navigation';

export function renderGraphView(): HTMLElement {
  const world = appStore.getActiveWorld();
  const characters = appStore.getCharactersForWorld(world.id);
  const relations = world.relations || [];

  const savedLayout = world.graph_layout || { nodes: {}, zoom: 0.9, panX: 100, panY: 60 };
  let zoom = savedLayout.zoom || 0.9;
  let panX = savedLayout.panX || 100;
  let panY = savedLayout.panY || 60;
  let isPanning = false;
  let startX = 0;
  let startY = 0;

  let connectMode = false;
  let connectSourceId: string | null = null;

  // Node positions initialized from saved layout or concentric multi-orbit rings
  const nodeMap = new Map<string, { id: string; name: string; type: string; x: number; y: number; color: string }>();

  const total = characters.length;
  characters.forEach((pj, idx) => {
    const pjId = pj.id || `pj_${idx}`;
    const saved = savedLayout.nodes?.[pjId];
    if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
      nodeMap.set(pjId, {
        id: pjId,
        name: pj.identity.name,
        type: 'pj',
        x: saved.x,
        y: saved.y,
        color: '#00f0ff'
      });
      return;
    }

    // Concentric multi-orbit rings to prevent overlap of 32 characters
    let radius = 260;
    let angle = 0;
    if (total <= 6) {
      radius = 220;
      angle = (idx / Math.max(1, total)) * 2 * Math.PI;
    } else if (idx < 6) {
      // Inner ring: 6 nodes
      radius = 240;
      angle = (idx / 6) * 2 * Math.PI;
    } else if (idx < 18) {
      // Middle ring: 12 nodes
      radius = 480;
      angle = ((idx - 6) / 12) * 2 * Math.PI;
    } else {
      // Outer ring: remaining nodes
      radius = 720;
      angle = ((idx - 18) / Math.max(1, total - 18)) * 2 * Math.PI;
    }

    nodeMap.set(pjId, {
      id: pjId,
      name: pj.identity.name,
      type: 'pj',
      x: 750 + radius * Math.cos(angle),
      y: 500 + radius * Math.sin(angle),
      color: '#00f0ff'
    });
  });

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'graph-canvas');
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.style.cursor = 'grab';

  const gLinks = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const gNodes = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const gRoot = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  gRoot.appendChild(gLinks);
  gRoot.appendChild(gNodes);
  svg.appendChild(gRoot);

  function updateTransform() {
    gRoot.setAttribute('transform', `translate(${panX}, ${panY}) scale(${zoom})`);
  }

  function saveLayoutState() {
    appStore.mutate((s) => {
      const w = s.worlds.find((item) => item.id === world.id);
      if (!w) return;
      const nodesData: Record<string, { x: number; y: number }> = {};
      nodeMap.forEach((n) => {
        nodesData[n.id] = { x: Math.round(n.x), y: Math.round(n.y) };
      });
      w.graph_layout = {
        nodes: nodesData,
        zoom: Math.round(zoom * 100) / 100,
        panX: Math.round(panX),
        panY: Math.round(panY)
      };
    });
  }

  function redraw() {
    gLinks.innerHTML = '';
    gNodes.innerHTML = '';

    // Draw relations
    relations.forEach((rel) => {
      const from = nodeMap.get(rel.from_id || '') || Array.from(nodeMap.values()).find((n) => n.name === rel.from);
      const to = nodeMap.get(rel.to_id || '') || Array.from(nodeMap.values()).find((n) => n.name === rel.to);
      if (!from || !to) return;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      path.setAttribute('x1', String(from.x));
      path.setAttribute('y1', String(from.y));
      path.setAttribute('x2', String(to.x));
      path.setAttribute('y2', String(to.y));
      path.setAttribute('stroke', rel.color || 'var(--accent-primary, #00f0ff)');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('stroke-opacity', '0.6');
      gLinks.appendChild(path);

      // Label on link
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(midX));
      text.setAttribute('y', String(midY - 4));
      text.setAttribute('fill', 'var(--text-secondary, #a1a1aa)');
      text.setAttribute('font-size', '11');
      text.setAttribute('font-weight', '600');
      text.setAttribute('text-anchor', 'middle');
      text.textContent = rel.relation;
      gLinks.appendChild(text);
    });

    // Draw Nodes (Obsidian Canvas card style)
    nodeMap.forEach((node) => {
      const isSource = connectSourceId === node.id;
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${node.x - 70}, ${node.y - 25})`);
      g.style.cursor = connectMode ? 'crosshair' : 'pointer';

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', '140');
      rect.setAttribute('height', '50');
      rect.setAttribute('rx', '8');
      rect.setAttribute('fill', isSource ? '#003344' : 'var(--surface-sunken, #141419)');
      rect.setAttribute('stroke', isSource ? '#00f0ff' : 'var(--border-subtle, #272732)');
      rect.setAttribute('stroke-width', isSource ? '3' : '1.5');

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', '70');
      label.setAttribute('y', '28');
      label.setAttribute('fill', 'var(--text-primary, #fafafa)');
      label.setAttribute('font-size', '12');
      label.setAttribute('font-weight', '700');
      label.setAttribute('text-anchor', 'middle');
      label.textContent = node.name.length > 16 ? node.name.slice(0, 15) + '…' : node.name;

      g.appendChild(rect);
      g.appendChild(label);

      // Node click handler
      g.addEventListener('click', (e) => {
        e.stopPropagation();
        if (connectMode) {
          if (!connectSourceId) {
            connectSourceId = node.id;
            toast(`Origen seleccionado: "${node.name}". Haz clic en el segundo personaje para unirlos.`);
            redraw();
          } else if (connectSourceId === node.id) {
            connectSourceId = null;
            toast('Conexión cancelada.');
            redraw();
          } else {
            const sourceNode = nodeMap.get(connectSourceId);
            const targetNode = node;
            connectSourceId = null;
            connectMode = false;
            connectBtn.classList.remove('btn-primary');
            connectBtn.classList.add('btn-secondary');
            redraw();
            if (sourceNode && targetNode) {
              openCreateRelationModal(sourceNode, targetNode);
            }
          }
        }
      });

      // Drag node
      let dragging = false;
      let hasMoved = false;
      let startClientX = 0;
      let startClientY = 0;
      let origNodeX = node.x;
      let origNodeY = node.y;

      g.addEventListener('mousedown', (e) => {
        if (connectMode) return;
        e.stopPropagation();
        dragging = true;
        hasMoved = false;
        startClientX = e.clientX;
        startClientY = e.clientY;
        origNodeX = node.x;
        origNodeY = node.y;
      });

      window.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        const dx = (e.clientX - startClientX) / zoom;
        const dy = (e.clientY - startClientY) / zoom;
        if (Math.hypot(dx, dy) > 3) hasMoved = true;
        node.x = origNodeX + dx;
        node.y = origNodeY + dy;
        redraw();
      });

      window.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        if (hasMoved) {
          saveLayoutState();
        }
      });

      g.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        navigateToPj(node.id);
      });

      gNodes.appendChild(g);
    });
  }

  function openCreateRelationModal(source: { id: string; name: string }, target: { id: string; name: string }) {
    let relationType = 'Aliado';
    let notes = '';

    const content = h('div', { style: 'display:flex; flex-direction:column; gap:12px; padding:16px;' }, [
      h('p', { class: 'text-sm' }, [
        'Vincular ',
        h('strong', { style: 'color:var(--accent-primary);' }, [source.name]),
        ' con ',
        h('strong', { style: 'color:var(--accent-primary);' }, [target.name])
      ]),
      h('label', { class: 'field-label' }, ['Tipo de Vínculo']),
      h('select', {
        class: 'input-select',
        onchange: (e: any) => { relationType = e.target.value; }
      }, [
        h('option', { value: 'Aliado' }, 'Aliado / Compañero'),
        h('option', { value: 'Enemigo' }, 'Enemigo jurado'),
        h('option', { value: 'Rival' }, 'Rivalidad tensa'),
        h('option', { value: 'Mentor' }, 'Mentor / Aprendiz'),
        h('option', { value: 'Familia' }, 'Lazo familiar / Sangre'),
        h('option', { value: 'Amor' }, 'Vínculo romántico / Pasado'),
        h('option', { value: 'Subordinado' }, 'Subordinado / Mando'),
        h('option', { value: 'Deuda' }, 'Deuda de honor / Pacto')
      ]),
      h('label', { class: 'field-label' }, ['Notas del Vínculo (Opcional)']),
      h('textarea', {
        class: 'input-textarea',
        rows: 3,
        placeholder: 'Cómo se conocieron, traición secreta o pacto mutuo...',
        oninput: (e: any) => { notes = e.target.value; }
      }),
      h('div', { style: 'display:flex; justify-content:flex-end; gap:8px; margin-top:8px;' }, [
        h('button', {
          class: 'btn btn-primary',
          onclick: () => {
            upsertRelation(world.id, {
              id: 'rel_' + uid('r'),
              from: source.name,
              to: target.name,
              from_id: source.id,
              to_id: target.id,
              relation: relationType,
              notes: notes.trim()
            });
            toast(`Vínculo "${relationType}" creado entre ${source.name} y ${target.name}`);
            closeModal();
            redraw();
          }
        }, ['Guardar Vínculo'])
      ])
    ]);

    const closeModal = openModal('Crear Vínculo de Relación', content);
  }

  // Pan & Zoom listeners
  svg.addEventListener('mousedown', (e) => {
    if (connectMode) return;
    isPanning = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    svg.style.cursor = 'grabbing';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    updateTransform();
  });

  window.addEventListener('mouseup', () => {
    if (!isPanning) return;
    isPanning = false;
    svg.style.cursor = 'grab';
    saveLayoutState();
  });

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    zoom = Math.min(2.5, Math.max(0.3, zoom * factor));
    updateTransform();
    saveLayoutState();
  });

  updateTransform();
  redraw();

  const connectBtn = h('button', {
    class: 'btn btn-secondary btn-sm',
    style: 'display:flex; align-items:center; gap:6px;',
    title: 'Activa el modo de conexión para unir dos personajes haciendo clic en ellos',
    onclick: () => {
      connectMode = !connectMode;
      connectSourceId = null;
      if (connectMode) {
        connectBtn.classList.remove('btn-secondary');
        connectBtn.classList.add('btn-primary');
        toast('Modo unir activado: haz clic en el primer personaje');
      } else {
        connectBtn.classList.remove('btn-primary');
        connectBtn.classList.add('btn-secondary');
        toast('Modo unir desactivado');
      }
      redraw();
    }
  }, [icon('network', 14), document.createTextNode('Unir Nodos 🔗')]) as HTMLButtonElement;

  return h('div', { class: 'graph-view-container', style: 'display:flex; flex-direction:column; width:100%; height:100%; position:relative; overflow:hidden; background:var(--surface-base);' }, [
    h('div', { class: 'graph-toolbar', style: 'position:absolute; top:12px; left:12px; z-index:10; display:flex; gap:8px; background:var(--surface-elevated); padding:6px 12px; border-radius:8px; border:1px solid var(--border-subtle); align-items:center; box-shadow:0 4px 12px rgba(0,0,0,0.4);' }, [
      h('span', { style: 'font-weight:700; font-size:13px; display:flex; align-items:center; gap:6px;' }, [icon('network', 16), document.createTextNode(t('graph.title') || 'Grafo de Relaciones')]),
      connectBtn,
      h('button', { class: 'btn btn-secondary btn-sm', onclick: () => { zoom = Math.min(2.5, zoom * 1.2); updateTransform(); saveLayoutState(); } }, ['+']),
      h('button', { class: 'btn btn-secondary btn-sm', onclick: () => { zoom = Math.max(0.3, zoom / 1.2); updateTransform(); saveLayoutState(); } }, ['-']),
      h('button', { class: 'btn btn-secondary btn-sm', onclick: () => { zoom = 0.9; panX = 100; panY = 60; updateTransform(); saveLayoutState(); } }, ['Reset']),
      h('span', { class: 'text-muted text-xs', style: 'margin-left:8px;' }, ['Doble clic: abrir | Arrastra para recolocar'])
    ]),
    svg
  ]);
}
