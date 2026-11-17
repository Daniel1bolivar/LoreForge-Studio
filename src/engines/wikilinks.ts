import type { ArchiveCategoryKey, PJMaster, WorldMaster } from '../types';
import { ARCHIVE_CATEGORY_KEYS } from '../state/defaults';
import { normalize } from '../ui/dom';

export type EntityKind = 'pj' | 'archive' | 'faction' | 'lore' | 'species' | 'map';

export interface Entity {
  name: string;
  kind: EntityKind;
  cat?: string;
  id?: string;
  summary: string;
  aliases: string[];
}

export function buildEntityIndex(world: WorldMaster, pjs: PJMaster[]): Entity[] {
  const out: Entity[] = [];
  for (const pj of pjs) {
    const aliases: string[] = [];
    if (pj.identity.internal_alias) aliases.push(pj.identity.internal_alias);
    out.push({
      name: pj.identity.name,
      kind: 'pj',
      id: pj.id,
      summary: [pj.identity.role_occupation, pj.worldbuilding_101?.core_motivation].filter(Boolean).join(' - '),
      aliases,
    });
  }
  for (const cat of ARCHIVE_CATEGORY_KEYS) {
    for (const doc of world.archive?.[cat as ArchiveCategoryKey] || []) {
      out.push({
        name: doc.title,
        kind: 'archive',
        cat,
        id: doc.id,
        summary: doc.summary || '',
        aliases: [],
      });
    }
  }
  for (const f of world.factions || []) {
    out.push({ name: f.name, kind: 'faction', summary: f.details || f.type, aliases: [] });
  }
  for (const l of world.lore_entries || []) {
    out.push({ name: l.term, kind: 'lore', summary: l.content, aliases: l.keys.split(',').map((k) => k.trim()).filter(Boolean) });
  }
  for (const s of world.homebrew?.species || []) {
    out.push({ name: s.label, kind: 'species', summary: s.notes, aliases: [] });
  }
  for (const m of world.maps || []) {
    out.push({ name: m.name, kind: 'map', id: m.id, summary: m.description || '', aliases: [] });
  }
  return out.filter((e) => e.name);
}

export function resolveEntity(index: Entity[], name: string): Entity | null {
  const target = normalize(name);
  if (!target) return null;
  return (
    index.find((e) => normalize(e.name) === target) ||
    index.find((e) => e.aliases.some((a) => normalize(a) === target)) ||
    null
  );
}

export function searchEntities(index: Entity[], query: string, limit = 8): Entity[] {
  const q = normalize(query);
  if (!q) return index.slice(0, limit);
  const scored: Array<[number, Entity]> = [];
  for (const e of index) {
    const n = normalize(e.name);
    let score = -1;
    if (n === q) score = 0;
    else if (n.startsWith(q)) score = 1;
    else if (n.includes(q)) score = 2;
    else if (e.aliases.some((a) => normalize(a).includes(q))) score = 3;
    if (score >= 0) scored.push([score, e]);
  }
  scored.sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name));
  return scored.slice(0, limit).map((s) => s[1]);
}

// ---------- Markdown-lite ----------

export interface InlineSeg {
  type: 'text' | 'bold' | 'italic' | 'code' | 'link';
  text: string;
  target?: string;
}

const INLINE_RE = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`/g;

export function parseInline(text: string): InlineSeg[] {
  const segs: InlineSeg[] = [];
  let last = 0;
  INLINE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) segs.push({ type: 'text', text: text.slice(last, m.index) });
    if (m[1] !== undefined) segs.push({ type: 'link', text: (m[2] || m[1]).trim(), target: m[1].trim() });
    else if (m[3] !== undefined) segs.push({ type: 'bold', text: m[3] });
    else if (m[4] !== undefined) segs.push({ type: 'italic', text: m[4] });
    else if (m[5] !== undefined) segs.push({ type: 'code', text: m[5] });
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({ type: 'text', text: text.slice(last) });
  return segs;
}

export interface Block {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'quote';
  lines: string[];
}

export function parseBlocks(src: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: 'p', lines: [para.join(' ')] });
    para = [];
  };
  for (const raw of src.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd();
    const hm = /^(#{1,3})\s+(.*)$/.exec(line);
    if (!line.trim()) {
      flush();
    } else if (hm) {
      flush();
      blocks.push({ type: (['h1', 'h2', 'h3'] as const)[hm[1].length - 1], lines: [hm[2]] });
    } else if (/^[-*]\s+/.test(line)) {
      flush();
      const item = line.replace(/^[-*]\s+/, '');
      const prev = blocks[blocks.length - 1];
      if (prev && prev.type === 'ul') prev.lines.push(item);
      else blocks.push({ type: 'ul', lines: [item] });
    } else if (/^>\s?/.test(line)) {
      flush();
      blocks.push({ type: 'quote', lines: [line.replace(/^>\s?/, '')] });
    } else {
      para.push(line.trim());
    }
  }
  flush();
  return blocks;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function inlineToHtml(text: string): string {
  return parseInline(text)
    .map((s) => {
      const t = esc(s.text);
      if (s.type === 'bold') return `<strong>${t}</strong>`;
      if (s.type === 'italic') return `<em>${t}</em>`;
      if (s.type === 'code') return `<code>${t}</code>`;
      return t;
    })
    .join('');
}

export function markdownToHtml(src: string): string {
  return parseBlocks(src)
    .map((b) => {
      if (b.type === 'ul') return `<ul>${b.lines.map((l) => `<li>${inlineToHtml(l)}</li>`).join('')}</ul>`;
      const tag = b.type === 'quote' ? 'blockquote' : b.type;
      return `<${tag}>${inlineToHtml(b.lines[0])}</${tag}>`;
    })
    .join('\n');
}

export function stripMarkdown(src: string): string {
  return parseBlocks(src)
    .map((b) => b.lines.map((l) => parseInline(l).map((s) => s.text).join('')).join('\n'))
    .join('\n');
}

export function countWords(text: string): number {
  const words = text.trim().match(/\S+/g);
  return words ? words.length : 0;
}
