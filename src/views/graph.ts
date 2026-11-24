// LoreForge Studio — Editorial Character Correlation Diagram (Kingdom Hearts Poster Style)
import { appStore, upsertRelation } from '../state/store';
import { t } from '../i18n';
import { h, toast, uid } from '../ui/dom';
import { icon } from '../ui/icons';
import { openModal } from '../ui/widgets';
import { navigateToPj } from '../ui/navigation';
import {
  buildOrthogonalEdgePath,
  computeAutoLayout,
  computeGroupBoxes,
  exportDiagramToPng,
  getRelationVisualStyle,
  hashColor,
  type DiagramGroup,
  type DiagramNode,
} from '../engines/correlationDiagram';

const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {}
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

function loadCustomGroups(worldId: string): DiagramGroup[] {
  try {
    const raw = localStorage.getItem(`lf_graph_groups_${worldId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCustomGroups(worldId: string, groups: DiagramGroup[]): void {
  try {
    localStorage.setItem(`lf_graph_groups_${worldId}`, JSON.stringify(groups));
  } catch {
    // Ignore storage quota errors
  }
}

type GraphTheme = 'limpio' | 'fantasia' | 'detective';
type GraphMode = 'list' | 'canvas';

function loadGraphTheme(): GraphTheme {
  try {
    const val = localStorage.getItem('lf_graph_theme');
    if (val === 'fantasia' || val === 'detective' || val === 'limpio') return val;
  } catch {
    // Ignore storage errors
  }
  return 'limpio';
}

function saveGraphTheme(theme: GraphTheme): void {
  try {
    localStorage.setItem('lf_graph_theme', theme);
  } catch {
    // Ignore storage errors
  }
}

export function renderGraphView(): HTMLElement {
  const world = appStore.getActiveWorld();
  const characters = appStore.getCharactersForWorld(world.id);
  const relations = world.relations || [];
  let customGroups = loadCustomGroups(world.id);
  let graphTheme: GraphTheme = loadGraphTheme();
  let viewMode: GraphMode = window.innerWidth <= 768 ? 'list' : 'canvas';

  const savedLayout = world.graph_layout || { nodes: {}, zoom: 0.72, panX: 30, panY: 75 };
  // Detect legacy circular coordinates (e.g. nodes overlapping the y < 200 header zone)
  const savedCoords = Object.values(savedLayout.nodes || {});
  const hasLegacyOverlap = savedCoords.some((p) => p.y < 195);
  let zoom = hasLegacyOverlap ? 0.72 : (savedLayout.zoom || 0.72);
  let panX = hasLegacyOverlap ? 30 : (savedLayout.panX ?? 30);
  let panY = hasLegacyOverlap ? 75 : (savedLayout.panY ?? 75);
  let isPanning = false;
  let startX = 0;
  let startY = 0;

  let connectMode = false;
  let connectSourceId: string | null = null;
  let hoveredNodeId: string | null = null;
  let filterQuery = '';

  const auto = computeAutoLayout(characters, relations, customGroups);
  const nodeMap = new Map<string, DiagramNode>();

  function buildNodes(): void {
    nodeMap.clear();
    characters.forEach((pj, idx) => {
      const pjId = pj.id || `pj_${idx}`;
      const isPrincipal = auto.principals.has(pjId);
      const saved = !hasLegacyOverlap ? savedLayout.nodes?.[pjId] : undefined;
      const fallback = auto.positions[pjId] || { x: 400 + (idx % 5) * 180, y: 260 + Math.floor(idx / 5) * 190 };
      const customGrp = customGroups.find((g) => g.memberIds.includes(pjId));
      const faction = (pj.identity.deity_creed || '').trim() || 'Independiente';
      const color = customGrp ? customGrp.color : hashColor(faction === 'Independiente' ? '' : faction);

      nodeMap.set(pjId, {
        id: pjId,
        name: pj.identity.name || 'Sin nombre',
        faction,
        role: pj.identity.role_occupation || '',
        status: pj.status || 'alive',
        avatar: pj.avatar,
        isPrincipal,
        width: isPrincipal ? 136 : 110,
        height: isPrincipal ? 154 : 124,
        x: saved && typeof saved.x === 'number' ? saved.x : fallback.x,
        y: saved && typeof saved.y === 'number' ? saved.y : fallback.y,
        color,
        groupId: customGrp?.id,
      });
    });
  }

  buildNodes();

  const svg = svgEl('svg', {
    class: 'graph-canvas',
  });

  // SVG Defs (arrow markers + clip paths)
  const defs = svgEl('defs');
  const makeMarker = (id: string, color: string) => {
    const marker = svgEl('marker', {
      id,
      viewBox: '0 0 10 10',
      refX: 8,
      refY: 5,
      markerWidth: 6,
      markerHeight: 6,
      orient: 'auto-start-reverse',
    });
    marker.appendChild(svgEl('path', { d: 'M 0 1 L 10 5 L 0 9 z', fill: color }));
    return marker;
  };
  defs.appendChild(makeMarker('arrow-amber', '#f59e0b'));
  defs.appendChild(makeMarker('arrow-violet', '#a78bfa'));
  defs.appendChild(makeMarker('arrow-cyan', '#38bdf8'));
  svg.appendChild(defs);

  const gRoot = svgEl('g', { 'data-root': 'true' });
  const gHeaderLegend = svgEl('g');
  const gGroups = svgEl('g');
  const gLinks = svgEl('g');
  const gNodes = svgEl('g');
  const gLabels = svgEl('g');

  gRoot.append(gHeaderLegend, gGroups, gLinks, gNodes, gLabels);
  svg.appendChild(gRoot);

  function updateTransform(): void {
    gRoot.setAttribute('transform', `translate(${panX}, ${panY}) scale(${zoom})`);
  }

  function saveLayoutState(): void {
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
        panY: Math.round(panY),
      };
    });
  }

  function drawHeaderAndLegend(): void {
    gHeaderLegend.innerHTML = '';

    // Editorial Poster Title
    const titleGroup = svgEl('g', { transform: 'translate(40, 26)' });
    const k = svgEl('text', { x: 0, y: 12, fill: '#38bdf8', 'font-size': 11, 'font-weight': 700, 'letter-spacing': '0.18em' });
    k.textContent = `${world.name.toUpperCase()} · NEXUS`;
    const tMain = svgEl('text', { x: 0, y: 46, fill: '#f8fafc', 'font-size': 30, 'font-weight': 800, 'font-family': 'Georgia, serif' });
    tMain.textContent = 'Character Correlation Diagram';
    const subPill = svgEl('rect', { x: 0, y: 58, width: 320, height: 22, rx: 4, fill: '#1e293b', stroke: '#334155' });
    const subText = svgEl('text', { x: 10, y: 73, fill: '#cbd5e1', 'font-size': 11, 'font-weight': 600 });
    subText.textContent = `${characters.length} personajes · ${relations.length} vínculos ortogonales`;
    titleGroup.append(k, tMain, subPill, subText);

    // Top-Left Legend Box (clear spacing to the right of title)
    const leg = svgEl('g', { transform: 'translate(485, 22)' });
    leg.appendChild(svgEl('rect', { x: 0, y: 0, width: 520, height: 74, rx: 8, fill: 'rgba(15, 23, 42, 0.85)', stroke: '#334155' }));

    const items: Array<{ x: number; y: number; color: string; label: string; kind: 'double' | 'solid' | 'dashed' | 'arrow' }> = [
      { x: 18, y: 24, color: '#f472b6', label: 'Vínculo Especial / Alma', kind: 'double' },
      { x: 240, y: 24, color: '#38bdf8', label: 'Alianza / Amistad', kind: 'solid' },
      { x: 18, y: 50, color: '#f59e0b', label: 'Rivalidad / Sospecha', kind: 'dashed' },
      { x: 240, y: 50, color: '#a78bfa', label: 'Jerarquía / Mentor', kind: 'arrow' },
    ];

    for (const item of items) {
      if (item.kind === 'double') {
        leg.appendChild(svgEl('line', { x1: item.x, y1: item.y - 2, x2: item.x + 34, y2: item.y - 2, stroke: item.color, 'stroke-width': 2 }));
        leg.appendChild(svgEl('line', { x1: item.x, y1: item.y + 2, x2: item.x + 34, y2: item.y + 2, stroke: item.color, 'stroke-width': 2 }));
      } else if (item.kind === 'dashed') {
        leg.appendChild(svgEl('line', { x1: item.x, y1: item.y, x2: item.x + 34, y2: item.y, stroke: item.color, 'stroke-width': 2, 'stroke-dasharray': '4 3', 'marker-end': 'url(#arrow-amber)' }));
      } else if (item.kind === 'arrow') {
        leg.appendChild(svgEl('line', { x1: item.x, y1: item.y, x2: item.x + 34, y2: item.y, stroke: item.color, 'stroke-width': 2, 'marker-end': 'url(#arrow-violet)' }));
      } else {
        leg.appendChild(svgEl('line', { x1: item.x, y1: item.y, x2: item.x + 34, y2: item.y, stroke: item.color, 'stroke-width': 2 }));
      }
      const txt = svgEl('text', { x: item.x + 44, y: item.y + 4, fill: '#e2e8f0', 'font-size': 11, 'font-weight': 600 });
      txt.textContent = item.label;
      leg.appendChild(txt);
    }

    gHeaderLegend.append(titleGroup, leg);
  }

  function getActiveFilterSet(): Set<string> | null {
    const focusId = hoveredNodeId || (filterQuery.trim()
      ? Array.from(nodeMap.values()).find((n) => n.name.toLowerCase().includes(filterQuery.trim().toLowerCase()))?.id || null
      : null);
    if (!focusId) return null;

    const connected = new Set<string>([focusId]);
    relations.forEach((r) => {
      const f = nodeMap.get(r.from_id || '') || Array.from(nodeMap.values()).find((n) => n.name === r.from);
      const tNode = nodeMap.get(r.to_id || '') || Array.from(nodeMap.values()).find((n) => n.name === r.to);
      if (!f || !tNode) return;
      if (f.id === focusId) connected.add(tNode.id);
      if (tNode.id === focusId) connected.add(f.id);
    });
    return connected;
  }

  function redraw(): void {
    drawHeaderAndLegend();
    gGroups.innerHTML = '';
    gLinks.innerHTML = '';
    gNodes.innerHTML = '';
    gLabels.innerHTML = '';

    const activeSet = getActiveFilterSet();

    // 1. Group Containers (Kingdom Hearts faction/group boxes)
    const boxes = computeGroupBoxes(Array.from(nodeMap.values()), customGroups);
    boxes.forEach((box) => {
      const g = svgEl('g', { opacity: activeSet ? '0.5' : '1' });
      g.appendChild(svgEl('rect', {
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
        rx: 10,
        fill: box.color,
        'fill-opacity': '0.09',
        stroke: box.color,
        'stroke-opacity': '0.45',
        'stroke-width': 1.5,
      }));
      // Group tab header (uses exact tabWidth so long names never overflow)
      g.appendChild(svgEl('rect', {
        x: box.x + 12,
        y: box.y - 12,
        width: box.tabWidth,
        height: 22,
        rx: 6,
        fill: box.color,
      }));
      const tabTxt = svgEl('text', {
        x: box.x + 22,
        y: box.y + 3,
        fill: '#090a0f',
        'font-size': 11,
        'font-weight': 800,
      });
      tabTxt.textContent = box.name;
      g.appendChild(tabTxt);
      gGroups.appendChild(g);
    });

    // 2. Orthogonal 90-degree Links
    relations.forEach((rel, idx) => {
      const from = nodeMap.get(rel.from_id || '') || Array.from(nodeMap.values()).find((n) => n.name === rel.from);
      const to = nodeMap.get(rel.to_id || '') || Array.from(nodeMap.values()).find((n) => n.name === rel.to);
      if (!from || !to) return;

      const style = getRelationVisualStyle(rel.relation);
      const isHighlighted = !activeSet || (activeSet.has(from.id) && activeSet.has(to.id));
      const opacity = isHighlighted ? '0.95' : '0.12';
      const { pathD, labelX, labelY } = buildOrthogonalEdgePath(from, to, idx);

      const gEdge = svgEl('g', { opacity, style: 'cursor:pointer;' });

      if (style.doubleLine) {
        gEdge.appendChild(svgEl('path', {
          d: pathD,
          fill: 'none',
          stroke: style.color,
          'stroke-width': 6,
          'stroke-opacity': 0.9,
        }));
        gEdge.appendChild(svgEl('path', {
          d: pathD,
          fill: 'none',
          stroke: '#090a0f',
          'stroke-width': 2,
        }));
      } else {
        const attrs: Record<string, string | number> = {
          d: pathD,
          fill: 'none',
          stroke: rel.color || style.color,
          'stroke-width': isHighlighted ? 2.2 : 1.5,
        };
        if (style.dashed) attrs['stroke-dasharray'] = '5 4';
        if (style.arrow) {
          attrs['marker-end'] = style.category === 'rival' ? 'url(#arrow-amber)' : 'url(#arrow-violet)';
        }
        gEdge.appendChild(svgEl('path', attrs));
      }

      gEdge.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditRelationModal(rel);
      });
      gLinks.appendChild(gEdge);

      // Label Pill rendered in gLabels (above nodes so never clipped)
      const relLabel = rel.relation || 'Vínculo';
      const pillW = Math.max(54, relLabel.length * 6.8 + 16);
      const gPill = svgEl('g', { opacity, style: 'cursor:pointer;' });
      gPill.appendChild(svgEl('rect', {
        x: labelX - pillW / 2,
        y: labelY - 10,
        width: pillW,
        height: 19,
        rx: 9,
        fill: '#0f172a',
        stroke: style.color,
        'stroke-width': 1.2,
      }));
      const lbl = svgEl('text', {
        x: labelX,
        y: labelY + 3,
        fill: '#f8fafc',
        'font-size': 10,
        'font-weight': 700,
        'text-anchor': 'middle',
      });
      lbl.textContent = relLabel;
      gPill.appendChild(lbl);
      gPill.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditRelationModal(rel);
      });
      gLabels.appendChild(gPill);
    });

    // 3. Editorial Rectangular Character Cards
    nodeMap.forEach((node) => {
      const isSource = connectSourceId === node.id;
      const isDimmed = activeSet && !activeSet.has(node.id);
      const cardOpacity = isDimmed ? '0.2' : '1';
      const x0 = node.x - node.width / 2;
      const y0 = node.y - node.height / 2;
      const nameBarH = 26;
      const portraitH = node.height - nameBarH;

      const g = svgEl('g', {
        transform: `translate(${x0}, ${y0})`,
        opacity: cardOpacity,
        style: `cursor:${connectMode ? 'crosshair' : 'pointer'};`,
      });

      // Outer Card Frame
      g.appendChild(svgEl('rect', {
        width: node.width,
        height: node.height,
        rx: 7,
        fill: '#141419',
        stroke: isSource ? '#00f0ff' : node.color,
        'stroke-width': isSource ? 3 : node.isPrincipal ? 2.5 : 1.5,
      }));

      // Portrait Area
      if (node.avatar) {
        const clipId = `clip_${node.id.replace(/[^a-zA-Z0-9_]/g, '')}`;
        const cp = svgEl('clipPath', { id: clipId });
        cp.appendChild(svgEl('rect', { x: 2, y: 2, width: node.width - 4, height: portraitH - 2, rx: 5 }));
        g.appendChild(cp);

        const img = svgEl('image', {
          href: node.avatar,
          x: 2,
          y: 2,
          width: node.width - 4,
          height: portraitH - 2,
          preserveAspectRatio: 'xMidYMin slice',
          'clip-path': `url(#${clipId})`,
        });
        g.appendChild(img);
      } else {
        // Editorial Silhouette Portrait Placeholder
        g.appendChild(svgEl('rect', {
          x: 2,
          y: 2,
          width: node.width - 4,
          height: portraitH - 2,
          rx: 5,
          fill: '#1e293b',
        }));
        const initials = node.name
          .split(/\s+/)
          .slice(0, 2)
          .map((w) => w[0]?.toUpperCase() || '')
          .join('');
        const mono = svgEl('text', {
          x: node.width / 2,
          y: portraitH / 2 + 10,
          fill: node.color,
          'font-size': node.isPrincipal ? 30 : 22,
          'font-weight': 800,
          'text-anchor': 'middle',
          opacity: 0.85,
        });
        mono.textContent = initials || '?';
        g.appendChild(mono);
      }

      // Corner Role/Principal Badge
      if (node.isPrincipal || node.faction !== 'Independiente') {
        const bW = node.isPrincipal ? 22 : 18;
        g.appendChild(svgEl('circle', {
          cx: node.width - 14,
          cy: portraitH - 12,
          r: bW / 2,
          fill: '#090a0f',
          stroke: node.isPrincipal ? '#fbbf24' : node.color,
          'stroke-width': 1.5,
        }));
        const bTxt = svgEl('text', {
          x: node.width - 14,
          y: portraitH - 8,
          fill: node.isPrincipal ? '#fbbf24' : node.color,
          'font-size': 10,
          'font-weight': 800,
          'text-anchor': 'middle',
        });
        bTxt.textContent = node.isPrincipal ? '★' : node.faction[0].toUpperCase();
        g.appendChild(bTxt);
      }

      // Bottom Name Bar
      g.appendChild(svgEl('rect', {
        x: 1,
        y: portraitH,
        width: node.width - 2,
        height: nameBarH - 1,
        rx: 5,
        fill: '#0f172a',
      }));
      const nameTxt = svgEl('text', {
        x: node.width / 2,
        y: portraitH + 17,
        fill: '#f8fafc',
        'font-size': node.isPrincipal ? 12 : 11,
        'font-weight': 700,
        'text-anchor': 'middle',
      });
      const maxLen = node.isPrincipal ? 17 : 14;
      nameTxt.textContent = node.name.length > maxLen ? node.name.slice(0, maxLen - 1) + '…' : node.name;
      g.appendChild(nameTxt);

      // Hover Highlight
      g.addEventListener('mouseenter', () => {
        if (hoveredNodeId !== node.id) {
          hoveredNodeId = node.id;
          redraw();
        }
      });
      g.addEventListener('mouseleave', () => {
        if (hoveredNodeId === node.id) {
          hoveredNodeId = null;
          redraw();
        }
      });

      // Click in connect mode
      g.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!connectMode) return;
        if (!connectSourceId) {
          connectSourceId = node.id;
          toast(`Origen: "${node.name}". Toca otro personaje para unir.`);
          updateConnectBanner();
          redraw();
        } else if (connectSourceId === node.id) {
          connectSourceId = null;
          toast('Selección cancelada.');
          updateConnectBanner();
          redraw();
        } else {
          const src = nodeMap.get(connectSourceId);
          const dst = node;
          connectSourceId = null;
          connectMode = false;
          connectBtn.classList.remove('btn-primary');
          connectBtn.classList.add('btn-secondary');
          updateConnectBanner();
          redraw();
          if (src && dst) openCreateRelationModal(src, dst);
        }
      });

      // Drag Node (Pointer Events: works for both mouse and touch)
      let dragging = false;
      let hasMoved = false;
      let sClientX = 0;
      let sClientY = 0;
      let origX = node.x;
      let origY = node.y;

      g.addEventListener('pointerdown', (e) => {
        if (connectMode || e.button > 0) return;
        e.stopPropagation();
        dragging = true;
        hasMoved = false;
        sClientX = e.clientX;
        sClientY = e.clientY;
        origX = node.x;
        origY = node.y;

        const onMove = (me: PointerEvent) => {
          if (!dragging) return;
          const dx = (me.clientX - sClientX) / zoom;
          const dy = (me.clientY - sClientY) / zoom;
          if (Math.hypot(dx, dy) > 4) hasMoved = true;
          node.x = origX + dx;
          node.y = origY + dy;
          redraw();
        };
        const onUp = () => {
          if (!dragging) return;
          dragging = false;
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onUp);
          window.removeEventListener('pointercancel', onUp);
          if (hasMoved) saveLayoutState();
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
      });

      g.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        navigateToPj(node.id);
      });

      gNodes.appendChild(g);
    });
  }

  function openCreateRelationModal(source: DiagramNode, target: DiagramNode): void {
    let relationType = 'Aliado';
    let notes = '';

    const content = h('div', { style: 'display:flex; flex-direction:column; gap:12px; padding:16px;' }, [
      h('p', { class: 'text-sm' }, [
        'Vincular ',
        h('strong', { style: 'color:var(--accent-primary);' }, [source.name]),
        ' con ',
        h('strong', { style: 'color:var(--accent-primary);' }, [target.name]),
      ]),
      h('label', { class: 'field-label' }, ['Categoría / Tipo de Vínculo']),
      h('select', {
        class: 'input-select',
        onchange: (e: any) => { relationType = e.target.value; },
      }, [
        h('option', { value: 'Aliado' }, 'Alianza / Amistad (Línea sólida cian)'),
        h('option', { value: 'Vínculo de Alma' }, 'Vínculo Especial / Alma / Pareja (Doble rosa)'),
        h('option', { value: 'Enemigo' }, 'Enemistad / Rivalidad / Sospecha (Punteada ámbar)'),
        h('option', { value: 'Mentor y Alumno' }, 'Jerarquía / Mentor / Creación (Flecha violeta)'),
        h('option', { value: 'Familia' }, 'Lazo Familiar / Sangre'),
      ]),
      h('label', { class: 'field-label' }, ['Etiqueta personalizada (Opcional)']),
      h('input', {
        class: 'input-text',
        placeholder: 'Ej: Mejores amigos, Pacto secreto, Mismo cuerpo...',
        oninput: (e: any) => { if (e.target.value.trim()) relationType = e.target.value.trim(); },
      }),
      h('label', { class: 'field-label' }, ['Notas']),
      h('textarea', {
        class: 'input-textarea',
        rows: 2,
        oninput: (e: any) => { notes = e.target.value; },
      }),
      h('div', { style: 'display:flex; justify-content:flex-end; gap:8px; margin-top:8px;' }, [
        h('button', {
          class: 'btn btn-primary',
          onclick: () => {
            upsertRelation(world.id, {
              id: uid('rel'),
              from: source.name,
              to: target.name,
              from_id: source.id,
              to_id: target.id,
              relation: relationType,
              notes: notes.trim(),
            });
            toast(`Vínculo "${relationType}" guardado.`);
            closeModal();
          },
        }, ['Guardar Vínculo']),
      ]),
    ]);

    const closeModal = openModal('Nuevo Vínculo Ortogonal', content);
  }

  function openEditRelationModal(rel: (typeof relations)[0]): void {
    let label = rel.relation;
    const content = h('div', { style: 'display:flex; flex-direction:column; gap:12px; padding:16px;' }, [
      h('p', { class: 'text-sm' }, [`${rel.from} ➔ ${rel.to}`]),
      h('label', { class: 'field-label' }, ['Etiqueta de relación']),
      h('input', {
        class: 'input-text',
        value: label,
        oninput: (e: any) => { label = e.target.value; },
      }),
      h('div', { style: 'display:flex; justify-content:space-between; margin-top:8px;' }, [
        h('button', {
          class: 'btn btn-danger btn-sm',
          onclick: () => {
            appStore.mutate((s) => {
              const w = s.worlds.find((item) => item.id === world.id);
              if (w) w.relations = (w.relations || []).filter((r) => r.id !== rel.id);
            });
            toast('Vínculo eliminado.');
            closeModal();
          },
        }, ['Eliminar']),
        h('button', {
          class: 'btn btn-primary',
          onclick: () => {
            upsertRelation(world.id, { ...rel, relation: label.trim() || rel.relation });
            toast('Vínculo actualizado.');
            closeModal();
          },
        }, ['Guardar']),
      ]),
    ]);
    const closeModal = openModal('Editar Vínculo', content);
  }

  function openGroupManagerModal(): void {
    let newName = '';
    let newColor = '#38bdf8';

    const renderBody = (): HTMLElement => {
      const wrap = h('div', { style: 'display:flex; flex-direction:column; gap:14px; padding:16px;' }, [
        h('div', { style: 'display:flex; gap:8px; align-items:center;' }, [
          h('input', {
            class: 'input-text',
            placeholder: 'Nombre del grupo (ej: OrgXIII, Aprendices...)',
            oninput: (e: any) => { newName = e.target.value; },
          }),
          h('input', {
            type: 'color',
            value: newColor,
            style: 'width:44px; height:36px; padding:2px; border-radius:6px; cursor:pointer;',
            onchange: (e: any) => { newColor = e.target.value; },
          }),
          h('button', {
            class: 'btn btn-primary btn-sm',
            onclick: () => {
              if (!newName.trim()) return;
              customGroups.push({ id: uid('grp'), name: newName.trim(), color: newColor, memberIds: [] });
              saveCustomGroups(world.id, customGroups);
              toast(`Grupo "${newName.trim()}" creado.`);
              closeModal();
              openGroupManagerModal();
            },
          }, ['+ Crear']),
        ]),
        customGroups.length === 0
          ? h('p', { class: 'text-muted text-xs' }, ['Los personajes se agrupan automáticamente por su facción. Crea grupos personalizados aquí si lo deseas.'])
          : h('div', { style: 'display:flex; flex-direction:column; gap:10px; max-height:320px; overflow-y:auto;' },
              ...customGroups.map((grp) =>
                h('div', { style: `border:1px solid ${grp.color}; border-radius:8px; padding:10px; background:var(--surface-sunken);` }, [
                  h('div', { style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;' }, [
                    h('strong', { style: `color:${grp.color};` }, [grp.name]),
                    h('button', {
                      class: 'btn btn-danger btn-sm',
                      onclick: () => {
                        customGroups = customGroups.filter((g) => g.id !== grp.id);
                        saveCustomGroups(world.id, customGroups);
                        closeModal();
                        openGroupManagerModal();
                      },
                    }, ['Eliminar']),
                  ]),
                  h('div', { class: 'chip-row' }, ...characters.slice(0, 24).map((p) => {
                    const pId = p.id || '';
                    const active = grp.memberIds.includes(pId);
                    return h('button', {
                      type: 'button',
                      class: `chip${active ? ' active' : ''}`,
                      onclick: () => {
                        if (active) grp.memberIds = grp.memberIds.filter((x) => x !== pId);
                        else grp.memberIds.push(pId);
                        saveCustomGroups(world.id, customGroups);
                        buildNodes();
                        redraw();
                        closeModal();
                        openGroupManagerModal();
                      },
                    }, [p.identity.name]);
                  })),
                ])
              )
            ),
      ]);
      return wrap;
    };

    const closeModal = openModal('Gestión de Grupos & Facciones', renderBody());
  }

  // Pan & Zoom (Pointer Events for touch + mouse)
  svg.addEventListener('pointerdown', (e) => {
    if (connectMode || e.button > 0) return;
    isPanning = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    svg.style.cursor = 'grabbing';
  });

  window.addEventListener('pointermove', (e) => {
    if (!isPanning) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    updateTransform();
  });

  const stopPan = () => {
    if (!isPanning) return;
    isPanning = false;
    svg.style.cursor = 'grab';
    saveLayoutState();
  };
  window.addEventListener('pointerup', stopPan);
  window.addEventListener('pointercancel', stopPan);

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    zoom = Math.min(2.5, Math.max(0.25, zoom * factor));
    updateTransform();
    saveLayoutState();
  }, { passive: false });

  updateTransform();
  redraw();

  function openQuickLinkPickerModal(): void {
    if (characters.length < 2) {
      toast('Necesitas al menos 2 personajes para crear un vínculo.');
      return;
    }
    let srcId = characters[0].id || '';
    let dstId = characters[1].id || '';
    let relLabel = 'Aliado';
    let notes = '';

    const content = h('div', { style: 'display:flex; flex-direction:column; gap:14px; padding:18px;' }, [
      h('div', {}, [
        h('label', { class: 'field-label', for: 'quick-rel-src' }, ['1. Primer personaje']),
        h('select', {
          id: 'quick-rel-src',
          class: 'input-select',
          onchange: (e: any) => { srcId = e.target.value; },
        }, characters.map((p) => h('option', { value: p.id || '' }, [p.identity.name || 'Sin nombre']))),
      ]),
      h('div', {}, [
        h('label', { class: 'field-label', for: 'quick-rel-type' }, ['2. Tipo de relación']),
        h('select', {
          id: 'quick-rel-type',
          class: 'input-select',
          onchange: (e: any) => { relLabel = e.target.value; },
        }, [
          h('option', { value: 'Aliado' }, 'Aliado / Amistad'),
          h('option', { value: 'Vínculo de Alma' }, 'Vínculo Especial / Pareja'),
          h('option', { value: 'Enemigo' }, 'Enemigo / Rival'),
          h('option', { value: 'Mentor y Alumno' }, 'Mentor / Jerarquía'),
          h('option', { value: 'Familia' }, 'Familia / Sangre'),
        ]),
      ]),
      h('div', {}, [
        h('label', { class: 'field-label', for: 'quick-rel-dst' }, ['3. Segundo personaje']),
        h('select', {
          id: 'quick-rel-dst',
          class: 'input-select',
          onchange: (e: any) => { dstId = e.target.value; },
        }, characters.map((p, idx) => {
          const opt = h('option', { value: p.id || '' }, [p.identity.name || 'Sin nombre']) as HTMLOptionElement;
          if (idx === 1) opt.selected = true;
          return opt;
        })),
      ]),
      h('div', {}, [
        h('label', { class: 'field-label', for: 'quick-rel-notes' }, ['Notas (opcional)']),
        h('textarea', {
          id: 'quick-rel-notes',
          class: 'input-textarea',
          rows: 2,
          placeholder: 'Ej: Se conocieron en la capital...',
          oninput: (e: any) => { notes = e.target.value; },
        }),
      ]),
      h('div', { style: 'display:flex; justify-content:flex-end; gap:10px; margin-top:4px;' }, [
        h('button', {
          class: 'btn btn-primary btn-lg-touch',
          onclick: () => {
            if (srcId === dstId) {
              toast('Elige dos personajes distintos.');
              return;
            }
            const src = characters.find((c) => c.id === srcId);
            const dst = characters.find((c) => c.id === dstId);
            if (!src || !dst) return;
            upsertRelation(world.id, {
              id: uid('rel'),
              from: src.identity.name,
              to: dst.identity.name,
              from_id: src.id,
              to_id: dst.id,
              relation: relLabel,
              notes: notes.trim(),
            });
            toast(`Vínculo "${relLabel}" guardado.`);
            closeModal();
          },
        }, ['Guardar Vínculo']),
      ]),
    ]);
    const closeModal = openModal('Nuevo Vínculo entre Personajes', content);
  }

  const root = h('div', {
    class: 'graph-view-container',
    'data-graph-theme': graphTheme,
  });

  const connectBanner = h('div', {
    class: 'graph-connect-banner',
    style: 'display:none;',
  });

  const updateConnectBanner = () => {
    if (!connectMode) {
      connectBanner.style.display = 'none';
      return;
    }
    connectBanner.style.display = 'flex';
    const srcName = connectSourceId ? (nodeMap.get(connectSourceId)?.name || '') : '';
    connectBanner.replaceChildren(
      h('span', {}, [
        connectSourceId
          ? `Paso 2: Toca otro personaje para unir con "${srcName}"`
          : 'Paso 1: Toca el primer personaje'
      ]),
      h('button', {
        class: 'btn btn-secondary btn-sm',
        onclick: () => {
          connectMode = false;
          connectSourceId = null;
          connectBtn.classList.remove('btn-primary');
          connectBtn.classList.add('btn-secondary');
          updateConnectBanner();
          redraw();
        },
      }, ['Cancelar'])
    );
  };

  const connectBtn = h('button', {
    class: 'btn btn-secondary btn-sm',
    onclick: () => {
      connectMode = !connectMode;
      connectSourceId = null;
      connectBtn.classList.toggle('btn-primary', connectMode);
      connectBtn.classList.toggle('btn-secondary', !connectMode);
      updateConnectBanner();
      redraw();
    },
  }, [icon('network', 14), document.createTextNode('Unir Nodos')]) as HTMLButtonElement;

  const filterInput = h('input', {
    class: 'input-text',
    type: 'search',
    style: 'width:180px;',
    placeholder: 'Buscar personaje o vínculo...',
    'aria-label': 'Buscar personaje o vínculo',
    oninput: (e: any) => {
      filterQuery = e.target.value;
      redraw();
      renderListCards();
    },
  });

  const themeSelect = h('select', {
    class: 'input-select input-sm',
    style: 'width:auto; min-width:150px;',
    'aria-label': 'Estilo visual del tablero',
    onchange: (e: any) => {
      graphTheme = e.target.value as GraphTheme;
      saveGraphTheme(graphTheme);
      root.setAttribute('data-graph-theme', graphTheme);
      toast(`Estilo de tablero: ${e.target.options[e.target.selectedIndex].text}`);
    },
  }, [
    h('option', { value: 'limpio' }, ['Estilo: Limpio']),
    h('option', { value: 'fantasia' }, ['Estilo: Fantasía']),
    h('option', { value: 'detective' }, ['Estilo: Tablero Detective']),
  ]);
  (themeSelect as HTMLSelectElement).value = graphTheme;

  const listPanel = h('div', { class: 'graph-list-panel' });
  const listCardsWrap = h('div', { style: 'display:flex; flex-direction:column; gap:12px;' });

  function renderListCards(): void {
    const q = filterQuery.trim().toLowerCase();
    const filtered = relations.filter((r) => {
      if (!q) return true;
      return (
        (r.from || '').toLowerCase().includes(q) ||
        (r.to || '').toLowerCase().includes(q) ||
        (r.relation || '').toLowerCase().includes(q) ||
        (r.notes || '').toLowerCase().includes(q)
      );
    });

    if (filtered.length === 0) {
      listCardsWrap.replaceChildren(
        h('div', { class: 'graph-rel-card', style: 'text-align:center; padding:28px 18px;' }, [
          h('p', { style: 'font-size:16px; font-weight:600; margin-bottom:10px;' }, [
            q ? 'No se encontraron relaciones con ese filtro.' : 'Todavía no hay relaciones creadas en este mundo.'
          ]),
          h('button', {
            class: 'btn btn-primary btn-lg-touch',
            style: 'margin:0 auto;',
            onclick: () => openQuickLinkPickerModal(),
          }, [icon('plus', 18), document.createTextNode('Crear Primera Relación')]),
        ])
      );
      return;
    }

    listCardsWrap.replaceChildren(
      ...filtered.map((rel) =>
        h('div', { class: 'graph-rel-card' }, [
          h('div', { class: 'graph-rel-card-head' }, [
            h('div', { class: 'graph-rel-flow' }, [
              h('span', {}, [rel.from || 'Sin origen']),
              h('span', { class: 'graph-rel-badge' }, [rel.relation || 'Vínculo']),
              h('span', {}, [`→ ${rel.to || 'Sin destino'}`]),
            ]),
            h('div', { style: 'display:flex; gap:8px;' }, [
              h('button', {
                class: 'btn btn-secondary btn-sm',
                onclick: () => openEditRelationModal(rel),
              }, [icon('edit', 14), document.createTextNode('Editar')]),
              h('button', {
                class: 'btn btn-danger btn-sm',
                'aria-label': `Eliminar relación ${rel.from} con ${rel.to}`,
                onclick: () => {
                  appStore.mutate((s) => {
                    const w = s.worlds.find((item) => item.id === world.id);
                    if (w) w.relations = (w.relations || []).filter((r) => r.id !== rel.id);
                  });
                  toast('Vínculo eliminado.');
                },
              }, [icon('trash', 14)]),
            ]),
          ]),
          rel.notes ? h('p', { style: 'color:var(--text-secondary); font-size:14px; line-height:1.5;' }, [rel.notes]) : null,
        ])
      )
    );
  }

  listPanel.append(
    h('div', { class: 'graph-list-controls' }, [
      h('button', {
        class: 'btn btn-primary btn-lg-touch',
        onclick: () => openQuickLinkPickerModal(),
      }, [icon('plus', 18), document.createTextNode('Nuevo Vínculo')]),
      h('button', {
        class: 'btn btn-secondary',
        onclick: () => openGroupManagerModal(),
      }, ['📁 Grupos']),
    ]),
    listCardsWrap
  );
  renderListCards();

  const canvasWrap = h('div', { class: 'graph-canvas-wrap' }, [
    h('div', {
      class: 'graph-toolbar',
      style: 'display:flex; gap:8px; padding:8px 14px; background:var(--surface-sunken); border-bottom:1px solid var(--border-subtle); align-items:center; flex-wrap:wrap;',
    }, [
      connectBtn,
      themeSelect,
      h('button', { class: 'btn btn-secondary btn-sm', onclick: () => openGroupManagerModal() }, ['📁 Grupos']),
      h('button', {
        class: 'btn btn-secondary btn-sm',
        onclick: () => {
          const fresh = computeAutoLayout(characters, relations, customGroups);
          nodeMap.forEach((n) => {
            const p = fresh.positions[n.id];
            if (p) {
              n.x = p.x;
              n.y = p.y;
            }
          });
          saveLayoutState();
          redraw();
          toast('Diagrama auto-organizado por grupos.');
        },
      }, ['✨ Auto-organizar']),
      h('button', {
        class: 'btn btn-primary btn-sm',
        onclick: async () => {
          try {
            const slug = world.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'diagrama';
            await exportDiagramToPng(svg, `${slug}-correlation-diagram.png`);
            toast('Póster PNG de alta resolución exportado.');
          } catch {
            toast('Error al exportar PNG.');
          }
        },
      }, ['🖼️ Exportar PNG']),
    ]),
    connectBanner,
    svg,
    h('div', { class: 'graph-zoom-controls', 'aria-label': 'Controles de zoom del grafo' }, [
      h('button', {
        class: 'btn btn-secondary',
        'aria-label': 'Acercar grafo',
        onclick: () => { zoom = Math.min(2.5, zoom * 1.2); updateTransform(); saveLayoutState(); },
      }, ['+']),
      h('button', {
        class: 'btn btn-secondary',
        'aria-label': 'Alejar grafo',
        onclick: () => { zoom = Math.max(0.25, zoom / 1.2); updateTransform(); saveLayoutState(); },
      }, ['−']),
      h('button', {
        class: 'btn btn-secondary',
        'aria-label': 'Centrar grafo',
        onclick: () => { zoom = 0.78; panX = 30; panY = 20; updateTransform(); saveLayoutState(); },
      }, ['Centrar']),
    ]),
  ]);

  const tabListBtn = h('button', {
    type: 'button',
    class: `graph-mode-tab ${viewMode === 'list' ? 'active' : ''}`,
    onclick: () => syncMode('list'),
  }, [icon('file-text', 16), document.createTextNode('Lista Clara')]);

  const tabCanvasBtn = h('button', {
    type: 'button',
    class: `graph-mode-tab ${viewMode === 'canvas' ? 'active' : ''}`,
    onclick: () => syncMode('canvas'),
  }, [icon('network', 16), document.createTextNode('Lienzo Visual')]);

  function syncMode(next: GraphMode): void {
    viewMode = next;
    tabListBtn.classList.toggle('active', next === 'list');
    tabCanvasBtn.classList.toggle('active', next === 'canvas');
    listPanel.style.display = next === 'list' ? 'flex' : 'none';
    canvasWrap.style.display = next === 'canvas' ? 'flex' : 'none';
  }

  syncMode(viewMode);

  const topBar = h('div', { class: 'graph-top-bar' }, [
    h('div', { style: 'display:flex; align-items:center; gap:10px; flex-wrap:wrap;' }, [
      h('span', { style: 'font-weight:700; font-size:16px; display:flex; align-items:center; gap:6px;' }, [
        icon('network', 18),
        document.createTextNode(t('graph.title') || 'Relaciones y Grafo'),
      ]),
      h('div', { class: 'graph-mode-tabs', role: 'tablist' }, [tabListBtn, tabCanvasBtn]),
    ]),
    filterInput,
  ]);

  root.append(topBar, listPanel, canvasWrap);
  return root;
}
