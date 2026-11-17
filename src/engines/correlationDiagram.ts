// LoreForge Studio — Character Correlation Diagram Layout, Orthogonal Routing & PNG Export
import type { PJMaster, WorldRelation } from '../types';

export interface DiagramGroup {
  id: string;
  name: string;
  color: string;
  memberIds: string[];
}

export interface DiagramNode {
  id: string;
  name: string;
  faction: string;
  role: string;
  status: string;
  avatar?: string;
  isPrincipal: boolean;
  width: number;
  height: number;
  x: number; // center x
  y: number; // center y
  color: string;
  groupId?: string;
}

export interface GroupBox {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type EdgeCategory = 'special' | 'ally' | 'rival' | 'hierarchy';

export interface EdgeStyle {
  category: EdgeCategory;
  color: string;
  doubleLine: boolean;
  dashed: boolean;
  arrow: boolean;
}

const FACTION_PALETTE = [
  '#38bdf8', // cyan-blue
  '#a78bfa', // violet
  '#34d399', // emerald
  '#fbbf24', // amber
  '#f472b6', // pink
  '#fb7185', // rose
  '#60a5fa', // blue
];

export function hashColor(str: string): string {
  if (!str) return '#52525b';
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return FACTION_PALETTE[Math.abs(h) % FACTION_PALETTE.length];
}

export function getRelationVisualStyle(relationType: string): EdgeStyle {
  const norm = (relationType || '').toLowerCase();
  if (/alma|amor|pareja|especial|vinculo|vínculo|gemelo|twin|nobody|real form/.test(norm)) {
    return { category: 'special', color: '#f472b6', doubleLine: true, dashed: false, arrow: false };
  }
  if (/enemigo|rival|sospecha|traic|odio|hostil|amenaza/.test(norm)) {
    return { category: 'rival', color: '#f59e0b', doubleLine: false, dashed: true, arrow: true };
  }
  if (/mentor|maestro|alumno|subordinado|mando|cread|jerarqu|padre|madre|hijo|lider|líder/.test(norm)) {
    return { category: 'hierarchy', color: '#a78bfa', doubleLine: false, dashed: false, arrow: true };
  }
  return { category: 'ally', color: '#38bdf8', doubleLine: false, dashed: false, arrow: false };
}

/**
 * Orthogonal 90-degree Manhattan path between two rectangular nodes with staggered offset.
 */
export function buildOrthogonalEdgePath(
  from: { x: number; y: number; width: number; height: number },
  to: { x: number; y: number; width: number; height: number },
  edgeIndex: number
): { pathD: string; labelX: number; labelY: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const stagger = ((edgeIndex % 5) - 2) * 16;

  // Choose horizontal-first or vertical-first based on dominant axis
  if (Math.abs(dx) >= Math.abs(dy)) {
    const dirX = dx >= 0 ? 1 : -1;
    const startX = from.x + dirX * (from.width / 2);
    const startY = from.y + Math.max(-from.height * 0.3, Math.min(from.height * 0.3, stagger * 0.6));
    const endX = to.x - dirX * (to.width / 2);
    const endY = to.y + Math.max(-to.height * 0.3, Math.min(to.height * 0.3, -stagger * 0.6));
    const midX = (startX + endX) / 2 + stagger;

    const pathD = `M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`;
    return {
      pathD,
      labelX: midX,
      labelY: (startY + endY) / 2,
    };
  } else {
    const dirY = dy >= 0 ? 1 : -1;
    const startX = from.x + Math.max(-from.width * 0.3, Math.min(from.width * 0.3, stagger * 0.6));
    const startY = from.y + dirY * (from.height / 2);
    const endX = to.x + Math.max(-to.width * 0.3, Math.min(to.width * 0.3, -stagger * 0.6));
    const endY = to.y - dirY * (to.height / 2);
    const midY = (startY + endY) / 2 + stagger;

    const pathD = `M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`;
    return {
      pathD,
      labelX: (startX + endX) / 2,
      labelY: midY,
    };
  }
}

export function computeAutoLayout(
  characters: PJMaster[],
  relations: WorldRelation[],
  customGroups: DiagramGroup[]
): { positions: Record<string, { x: number; y: number }>; principals: Set<string> } {
  // Count connections per character to infer principal hierarchy
  const degree = new Map<string, number>();
  characters.forEach((p, idx) => degree.set(p.id || `pj_${idx}`, 0));
  relations.forEach((r) => {
    const f = r.from_id || r.from;
    const t = r.to_id || r.to;
    if (degree.has(f)) degree.set(f, (degree.get(f) || 0) + 1);
    if (degree.has(t)) degree.set(t, (degree.get(t) || 0) + 1);
  });

  const sortedByDeg = [...degree.entries()].sort((a, b) => b[1] - a[1]);
  const principals = new Set<string>();
  sortedByDeg.slice(0, Math.min(4, Math.ceil(characters.length * 0.15))).forEach(([id, d]) => {
    if (d > 0 || characters.length <= 6) principals.add(id);
  });
  if (principals.size === 0 && characters[0]?.id) {
    principals.add(characters[0].id);
  }

  // Group characters by customGroups first, else by faction
  const buckets = new Map<string, PJMaster[]>();
  const assigned = new Set<string>();

  for (const g of customGroups) {
    const members: PJMaster[] = [];
    for (const mId of g.memberIds) {
      const pj = characters.find((p) => p.id === mId);
      if (pj && !assigned.has(mId)) {
        members.push(pj);
        assigned.add(mId);
      }
    }
    if (members.length) buckets.set(g.name, members);
  }

  for (const pj of characters) {
    const id = pj.id || '';
    if (assigned.has(id)) continue;
    const fac = (pj.identity.deity_creed || '').trim() || 'Independientes';
    if (!buckets.has(fac)) buckets.set(fac, []);
    buckets.get(fac)!.push(pj);
  }

  const positions: Record<string, { x: number; y: number }> = {};
  let cursorX = 80;
  let cursorY = 190; // Leave top space for poster title + legend
  let rowMaxH = 0;
  const maxCanvasWidth = 1480;

  for (const [, members] of buckets.entries()) {
    const cols = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(members.length))));
    const cellW = 165;
    const cellH = 190;
    const boxW = cols * cellW + 40;
    const rows = Math.ceil(members.length / cols);
    const boxH = rows * cellH + 55;

    if (cursorX + boxW > maxCanvasWidth && cursorX > 80) {
      cursorX = 80;
      cursorY += rowMaxH + 70;
      rowMaxH = 0;
    }

    members.forEach((pj, i) => {
      const id = pj.id || '';
      const c = i % cols;
      const r = Math.floor(i / cols);
      positions[id] = {
        x: Math.round(cursorX + 20 + c * cellW + cellW / 2),
        y: Math.round(cursorY + 35 + r * cellH + cellH / 2),
      };
    });

    cursorX += boxW + 60;
    rowMaxH = Math.max(rowMaxH, boxH);
  }

  return { positions, principals };
}

export function computeGroupBoxes(
  nodes: DiagramNode[],
  customGroups: DiagramGroup[]
): GroupBox[] {
  const grouped = new Map<string, { name: string; color: string; members: DiagramNode[] }>();

  for (const g of customGroups) {
    grouped.set(g.id, { name: g.name, color: g.color, members: [] });
  }

  for (const node of nodes) {
    if (node.groupId && grouped.has(node.groupId)) {
      grouped.get(node.groupId)!.members.push(node);
    } else if (node.faction && node.faction !== 'Independiente' && node.faction !== 'Independientes') {
      const key = `fac:${node.faction}`;
      if (!grouped.has(key)) {
        grouped.set(key, { name: node.faction, color: hashColor(node.faction), members: [] });
      }
      grouped.get(key)!.members.push(node);
    }
  }

  const boxes: GroupBox[] = [];
  for (const [id, g] of grouped.entries()) {
    if (g.members.length === 0) continue;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const m of g.members) {
      minX = Math.min(minX, m.x - m.width / 2);
      minY = Math.min(minY, m.y - m.height / 2);
      maxX = Math.max(maxX, m.x + m.width / 2);
      maxY = Math.max(maxY, m.y + m.height / 2);
    }
    boxes.push({
      id,
      name: g.name,
      color: g.color,
      x: minX - 24,
      y: minY - 40,
      width: maxX - minX + 48,
      height: maxY - minY + 64,
    });
  }

  return boxes;
}

/**
 * Exports the SVG correlation diagram to a crisp 2x resolution PNG.
 */
export async function exportDiagramToPng(
  svgEl: SVGSVGElement,
  filename: string
): Promise<void> {
  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  const bbox = svgEl.getBBox();
  const pad = 60;
  const minX = Math.min(0, Math.floor(bbox.x - pad));
  const minY = Math.min(0, Math.floor(bbox.y - pad));
  const width = Math.max(1200, Math.ceil(bbox.width + pad * 2));
  const height = Math.max(760, Math.ceil(bbox.height + pad * 2));

  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('viewBox', `${minX} ${minY} ${width} ${height}`);
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  // Reset root pan/zoom transform on export so full diagram is framed cleanly
  const rootGroup = clone.querySelector('g[data-root="true"]');
  if (rootGroup) rootGroup.setAttribute('transform', 'translate(0,0) scale(1)');

  // Prepend dark editorial background rect
  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('x', String(minX));
  bg.setAttribute('y', String(minY));
  bg.setAttribute('width', String(width));
  bg.setAttribute('height', String(height));
  bg.setAttribute('fill', '#0a0a0c');
  clone.insertBefore(bg, clone.firstChild);

  const serialized = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      canvas.toBlob((pngBlob) => {
        if (!pngBlob) {
          reject(new Error('PNG generation failed'));
          return;
        }
        const dlUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.href = dlUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(dlUrl), 1000);
        resolve();
      }, 'image/png');
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}
