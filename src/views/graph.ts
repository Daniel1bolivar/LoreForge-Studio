// LoreForge Studio — Graph View (Obsidian Canvas / Arcweave style)
import { appStore } from '../state/store';
import { t } from '../i18n';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { navigateToPj } from '../ui/navigation';

export function renderGraphView(): HTMLElement {
  const world = appStore.getActiveWorld();
  const characters = appStore.getCharactersForWorld(world.id);
  const relations = world.relations || [];

  let zoom = 1;
  let panX = 40;
  let panY = 40;
  let isPanning = false;
  let startX = 0;
  let startY = 0;

  // Node positions initialized in circle or grid
  const nodeMap = new Map<string, { id: string; name: string; type: string; x: number; y: number; color: string }>();
  
  characters.forEach((pj, idx) => {
    const pjId = pj.id || `pj_${idx}`;
    const angle = (idx / Math.max(1, characters.length)) * 2 * Math.PI;
    const radius = Math.min(350, Math.max(180, characters.length * 30));
    nodeMap.set(pjId, {
      id: pjId,
      name: pj.identity.name,
      type: 'pj',
      x: 500 + radius * Math.cos(angle),
      y: 350 + radius * Math.sin(angle),
      color: '#60a5fa'
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

  function redraw() {
    gLinks.innerHTML = '';
    gNodes.innerHTML = '';

    // Draw relations
    relations.forEach((rel) => {
      const from = nodeMap.get(rel.from_id || rel.from);
      const to = nodeMap.get(rel.to_id || rel.to);
      if (!from || !to) return;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      path.setAttribute('x1', String(from.x));
      path.setAttribute('y1', String(from.y));
      path.setAttribute('x2', String(to.x));
      path.setAttribute('y2', String(to.y));
      path.setAttribute('stroke', rel.color || 'var(--border-subtle, #3f3f46)');
      path.setAttribute('stroke-width', '2');
      gLinks.appendChild(path);

      // Label on link
      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(midX));
      text.setAttribute('y', String(midY - 4));
      text.setAttribute('fill', 'var(--text-muted, #a1a1aa)');
      text.setAttribute('font-size', '11');
      text.setAttribute('text-anchor', 'middle');
      text.textContent = rel.relation;
      gLinks.appendChild(text);
    });

    // Draw Nodes (Obsidian Canvas card style)
    nodeMap.forEach((node) => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${node.x - 70}, ${node.y - 25})`);
      g.style.cursor = 'pointer';

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('width', '140');
      rect.setAttribute('height', '50');
      rect.setAttribute('rx', '8');
      rect.setAttribute('fill', 'var(--surface-sunken, #18181b)');
      rect.setAttribute('stroke', node.color);
      rect.setAttribute('stroke-width', '1.5');

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', '70');
      label.setAttribute('y', '28');
      label.setAttribute('fill', 'var(--text-primary, #fafafa)');
      label.setAttribute('font-size', '12');
      label.setAttribute('font-weight', '600');
      label.setAttribute('text-anchor', 'middle');
      label.textContent = node.name.length > 16 ? node.name.slice(0, 15) + '…' : node.name;

      g.appendChild(rect);
      g.appendChild(label);

      // Drag node
      let dragging = false;
      let offX = 0;
      let offY = 0;

      g.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        dragging = true;
        offX = e.clientX / zoom - node.x;
        offY = e.clientY / zoom - node.y;
      });

      window.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        node.x = e.clientX / zoom - offX;
        node.y = e.clientY / zoom - offY;
        redraw();
      });

      window.addEventListener('mouseup', () => {
        dragging = false;
      });

      g.addEventListener('dblclick', () => {
        navigateToPj(node.id);
      });

      gNodes.appendChild(g);
    });
  }

  // Pan & Zoom listeners
  svg.addEventListener('mousedown', (e) => {
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
    isPanning = false;
    svg.style.cursor = 'grab';
  });

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    zoom = Math.min(2.5, Math.max(0.3, zoom * factor));
    updateTransform();
  });

  updateTransform();
  redraw();

  return h('div', { class: 'graph-view-container', style: 'display:flex; flex-direction:column; width:100%; height:100%; position:relative; overflow:hidden; background:var(--surface-base);' }, [
    h('div', { class: 'graph-toolbar', style: 'position:absolute; top:12px; left:12px; z-index:10; display:flex; gap:8px; background:var(--surface-elevated); padding:6px 10px; border-radius:8px; border:1px solid var(--border-subtle); align-items:center;' }, [
      h('span', { style: 'font-weight:600; font-size:13px; display:flex; align-items:center; gap:6px;' }, [icon('network', 16), document.createTextNode(t('graph.title') || 'Grafo de Relaciones')]),
      h('button', { class: 'btn btn-secondary btn-sm', onclick: () => { zoom = Math.min(2.5, zoom * 1.2); updateTransform(); } }, ['+']),
      h('button', { class: 'btn btn-secondary btn-sm', onclick: () => { zoom = Math.max(0.3, zoom / 1.2); updateTransform(); } }, ['-']),
      h('button', { class: 'btn btn-secondary btn-sm', onclick: () => { zoom = 1; panX = 40; panY = 40; updateTransform(); } }, ['Reset']),
      h('span', { class: 'text-muted text-xs', style: 'margin-left:8px;' }, ['Doble clic: abrir personaje | Arrastra tarjetas'])
    ]),
    svg
  ]);
}
