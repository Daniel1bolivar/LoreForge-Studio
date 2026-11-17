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

export function renderGraphView(): HTMLElement {
  const world = appStore.getActiveWorld();
  const characters = appStore.getCharactersForWorld(world.id);
  const relations = world.relations || [];
  let customGroups = loadCustomGroups(world.id);

  const savedLayout = world.graph_layout || { nodes: {}, zoom: 0.78, panX: 30, panY: 20 };
  let zoom = savedLayout.zoom || 0.78;
  let panX = savedLayout.panX ?? 30;
  let panY = savedLayout.panY ?? 20;
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
      const saved = savedLayout.nodes?.[pjId];
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
    style: 'width:100%; height:100%; cursor:grab; background:radial-gradient(circle at 30% 20%, #141724 0%, #090a0f 100%);',
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

  gRoot.append(gHeaderLegend, gGroups, gLinks, gNodes);
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
    const titleGroup = svgEl('g', { transform: 'translate(36, 36)' });
    const k = svgEl('text', { x: 0, y: 12, fill: '#38bdf8', 'font-size': 11, 'font-weight': 700, 'letter-spacing': '0.18em' });
    k.textContent = `${world.name.toUpperCase()} · NEXUS`;
    const tMain = svgEl('text', { x: 0, y: 46, fill: '#f8fafc', 'font-size': 32, 'font-weight': 800, 'font-family': 'Georgia, serif' });
    tMain.textContent = 'Character Correlation Diagram';
    const subPill = svgEl('rect', { x: 0, y: 58, width: 320, height: 22, rx: 4, fill: '#1e293b', stroke: '#334155' });
    const subText = svgEl('text', { x: 10, y: 73, fill: '#cbd5e1', 'font-size': 11, 'font-weight': 600 });
    subText.textContent = `${characters.length} personajes · ${relations.length} vínculos ortogonales`;
    titleGroup.append(k, tMain, subPill, subText);

    // Top-Left Legend Box
    const leg = svgEl('g', { transform: 'translate(380, 28)' });
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
      // Group tab header
      const tabW = Math.min(box.width - 16, Math.max(120, box.name.length * 8 + 24));
      g.appendChild(svgEl('rect', {
        x: box.x + 12,
        y: box.y - 12,
        width: tabW,
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

      // Label Pill
      const relLabel = rel.relation || 'Vínculo';
      const pillW = Math.max(54, relLabel.length * 6.8 + 16);
      gEdge.appendChild(svgEl('rect', {
        x: labelX - pillW / 2,
        y: labelY - 10,
        width: pillW,
        height: 19,
        rx: 9,
        fill: '#0f172a',
        stroke: style.color,
        'stroke-width': 1,
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
      gEdge.appendChild(lbl);

      gEdge.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditRelationModal(rel);
      });

      gLinks.appendChild(gEdge);
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
          toast(`Origen: "${node.name}". Haz clic en otro personaje para unir.`);
          redraw();
        } else if (connectSourceId === node.id) {
          connectSourceId = null;
          toast('Selección cancelada.');
          redraw();
        } else {
          const src = nodeMap.get(connectSourceId);
          const dst = node;
          connectSourceId = null;
          connectMode = false;
          connectBtn.classList.remove('btn-primary');
          connectBtn.classList.add('btn-secondary');
          redraw();
          if (src && dst) openCreateRelationModal(src, dst);
        }
      });

      // Drag Node
      let dragging = false;
      let hasMoved = false;
      let sClientX = 0;
      let sClientY = 0;
      let origX = node.x;
      let origY = node.y;

      g.addEventListener('mousedown', (e) => {
        if (connectMode || e.button !== 0) return;
        e.stopPropagation();
        dragging = true;
        hasMoved = false;
        sClientX = e.clientX;
        sClientY = e.clientY;
        origX = node.x;
        origY = node.y;

        const onMove = (me: MouseEvent) => {
          if (!dragging) return;
          const dx = (me.clientX - sClientX) / zoom;
          const dy = (me.clientY - sClientY) / zoom;
          if (Math.hypot(dx, dy) > 3) hasMoved = true;
          node.x = origX + dx;
          node.y = origY + dy;
          redraw();
        };
        const onUp = () => {
          if (!dragging) return;
          dragging = false;
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          if (hasMoved) saveLayoutState();
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
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

  // Pan & Zoom
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
    zoom = Math.min(2.5, Math.max(0.25, zoom * factor));
    updateTransform();
    saveLayoutState();
  });

  updateTransform();
  redraw();

  const connectBtn = h('button', {
    class: 'btn btn-secondary btn-sm',
    onclick: () => {
      connectMode = !connectMode;
      connectSourceId = null;
      connectBtn.classList.toggle('btn-primary', connectMode);
      connectBtn.classList.toggle('btn-secondary', !connectMode);
      toast(connectMode ? 'Modo unir activo: clic en 1.er y 2.º personaje' : 'Modo unir desactivado');
      redraw();
    },
  }, [icon('network', 14), document.createTextNode('Unir Nodos')]) as HTMLButtonElement;

  const filterInput = h('input', {
    class: 'input-text',
    style: 'width:165px; padding:4px 8px; font-size:12px;',
    placeholder: 'Filtrar personaje...',
    oninput: (e: any) => {
      filterQuery = e.target.value;
      redraw();
    },
  });

  return h('div', { class: 'graph-view-container', style: 'display:flex; flex-direction:column; width:100%; height:100%; position:relative; overflow:hidden; background:var(--surface-base);' }, [
    h('div', { class: 'graph-toolbar', style: 'position:absolute; top:12px; left:12px; right:12px; z-index:10; display:flex; gap:8px; background:rgba(20, 20, 25, 0.92); backdrop-filter:blur(8px); padding:8px 12px; border-radius:10px; border:1px solid var(--border-subtle); align-items:center; flex-wrap:wrap; box-shadow:0 4px 16px rgba(0,0,0,0.45);' }, [
      h('span', { style: 'font-weight:700; font-size:13px; display:flex; align-items:center; gap:6px;' }, [icon('network', 16), document.createTextNode(t('graph.title') || 'Correlation Diagram')]),
      filterInput,
      connectBtn,
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
      h('div', { style: 'display:flex; gap:4px; margin-left:auto;' }, [
        h('button', { class: 'btn btn-secondary btn-sm', onclick: () => { zoom = Math.min(2.5, zoom * 1.2); updateTransform(); saveLayoutState(); } }, ['+']),
        h('button', { class: 'btn btn-secondary btn-sm', onclick: () => { zoom = Math.max(0.25, zoom / 1.2); updateTransform(); saveLayoutState(); } }, ['-']),
        h('button', { class: 'btn btn-secondary btn-sm', onclick: () => { zoom = 0.78; panX = 30; panY = 20; updateTransform(); saveLayoutState(); } }, ['Reset']),
      ]),
    ]),
    svg,
  ]);
}
