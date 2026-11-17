import type { PJMaster, WorldMaster } from '../types';
import { ARCHIVE_CATEGORY_KEYS } from '../state/defaults';
import { inlineToHtml, markdownToHtml, stripMarkdown } from './wikilinks';

export interface ChapterRef {
  id: string;
  title: string;
  subtitle?: string;
  body: string;
}

export interface CompileOptions {
  includeTitlePage: boolean;
  includeToc: boolean;
  includeLore: boolean;
  chapterIds: string[];
}

export function getChapters(world: WorldMaster): ChapterRef[] {
  return (world.archive?.chapters || []).map((d) => ({
    id: d.id,
    title: d.title,
    subtitle: d.subtitle,
    body: d.body_markdown?.trim() ? d.body_markdown : d.summary,
  }));
}

function selectChapters(world: WorldMaster, opts: CompileOptions): ChapterRef[] {
  const all = getChapters(world);
  return opts.chapterIds.length ? all.filter((c) => opts.chapterIds.includes(c.id)) : all;
}

function loreAppendix(world: WorldMaster, pjs: PJMaster[]): Array<{ title: string; body: string }> {
  const out: Array<{ title: string; body: string }> = [];
  for (const cat of ARCHIVE_CATEGORY_KEYS) {
    if (cat === 'chapters') continue;
    for (const d of world.archive?.[cat] || []) {
      out.push({ title: d.title, body: d.body_markdown?.trim() ? d.body_markdown : d.summary });
    }
  }
  for (const f of world.factions || []) out.push({ title: f.name, body: f.details });
  for (const pj of pjs) {
    out.push({
      title: pj.identity.name,
      body: [pj.identity.role_occupation, pj.worldbuilding_101.personal_history].filter(Boolean).join('\n\n'),
    });
  }
  return out.filter((e) => e.body);
}

export function compileMarkdown(world: WorldMaster, pjs: PJMaster[], opts: CompileOptions): string {
  const parts: string[] = [];
  if (opts.includeTitlePage) parts.push(`# ${world.name}\n\n*${world.genre_tone}*\n`);
  const chapters = selectChapters(world, opts);
  if (opts.includeToc) {
    parts.push('## Index\n\n' + chapters.map((c, i) => `${i + 1}. ${c.title}`).join('\n') + '\n');
  }
  for (const c of chapters) {
    parts.push(`## ${c.title}\n\n${c.subtitle ? `*${c.subtitle}*\n\n` : ''}${c.body}\n`);
  }
  if (opts.includeLore) {
    parts.push('## Appendix\n');
    for (const e of loreAppendix(world, pjs)) parts.push(`### ${e.title}\n\n${e.body}\n`);
  }
  return parts.join('\n');
}

const PRINT_CSS = `
body{font-family:Georgia,'Times New Roman',serif;line-height:1.65;max-width:42rem;margin:2rem auto;padding:0 1rem;color:#1b1b1b}
h1{font-size:2.2rem;margin:3rem 0 .5rem}h2{font-size:1.5rem;margin:2.5rem 0 .5rem;page-break-before:always}
h2:first-of-type{page-break-before:auto}h3{font-size:1.15rem}blockquote{border-left:3px solid #999;margin:1rem 0;padding-left:1rem;color:#444}
@media print{body{margin:0;max-width:none}}
`;

export function compileHtml(world: WorldMaster, pjs: PJMaster[], opts: CompileOptions, lang: string): string {
  const chapters = selectChapters(world, opts);
  const body: string[] = [];
  if (opts.includeTitlePage) body.push(`<h1>${inlineToHtml(world.name)}</h1><p><em>${inlineToHtml(world.genre_tone)}</em></p>`);
  if (opts.includeToc) {
    body.push('<nav><ol>' + chapters.map((c) => `<li>${inlineToHtml(c.title)}</li>`).join('') + '</ol></nav>');
  }
  for (const c of chapters) {
    body.push(`<h2>${inlineToHtml(c.title)}</h2>${c.subtitle ? `<p><em>${inlineToHtml(c.subtitle)}</em></p>` : ''}${markdownToHtml(c.body)}`);
  }
  if (opts.includeLore) {
    body.push('<h2>Appendix</h2>');
    for (const e of loreAppendix(world, pjs)) body.push(`<h3>${inlineToHtml(e.title)}</h3>${markdownToHtml(e.body)}`);
  }
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${inlineToHtml(world.name)}</title><style>${PRINT_CSS}</style></head><body>${body.join('\n')}</body></html>`;
}

// ---------- Minimal ZIP (store) + EPUB ----------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
}

export function buildZip(entries: ZipEntry[]): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const u16 = (v: number) => new Uint8Array([v & 0xff, (v >>> 8) & 0xff]);
  const u32 = (v: number) => new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]);
  const concat = (...parts: Uint8Array[]): Uint8Array => {
    const len = parts.reduce((s, p) => s + p.length, 0);
    const out = new Uint8Array(len);
    let o = 0;
    for (const p of parts) {
      out.set(p, o);
      o += p.length;
    }
    return out;
  };
  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name);
    const crc = crc32(entry.data);
    const local = concat(
      u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21),
      u32(crc), u32(entry.data.length), u32(entry.data.length),
      u16(nameBytes.length), u16(0), nameBytes, entry.data
    );
    chunks.push(local);
    central.push(
      concat(
        u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21),
        u32(crc), u32(entry.data.length), u32(entry.data.length),
        u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), nameBytes
      )
    );
    offset += local.length;
  }
  const centralBytes = concat(...central);
  const end = concat(
    u32(0x06054b50), u16(0), u16(0), u16(entries.length), u16(entries.length),
    u32(centralBytes.length), u32(offset), u16(0)
  );
  const parts = [...chunks, centralBytes, end].map((p) => p.slice().buffer as ArrayBuffer);
  return new Blob(parts, { type: 'application/epub+zip' });
}

function xmlEsc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function compileEpub(world: WorldMaster, pjs: PJMaster[], opts: CompileOptions, lang: string): Blob {
  const enc = new TextEncoder();
  const chapters: Array<{ title: string; html: string }> = [];
  for (const c of selectChapters(world, opts)) {
    chapters.push({ title: c.title, html: `<h2>${inlineToHtml(c.title)}</h2>${markdownToHtml(c.body)}` });
  }
  if (opts.includeLore) {
    chapters.push({
      title: 'Appendix',
      html: '<h2>Appendix</h2>' + loreAppendix(world, pjs).map((e) => `<h3>${inlineToHtml(e.title)}</h3>${markdownToHtml(e.body)}`).join(''),
    });
  }
  if (!chapters.length) chapters.push({ title: world.name, html: `<h2>${inlineToHtml(world.name)}</h2><p>${inlineToHtml(world.genre_tone)}</p>` });

  const bookId = `urn:uuid:${world.id}`;
  const page = (title: string, inner: string) =>
    `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${lang}"><head><title>${xmlEsc(title)}</title><meta charset="utf-8"/></head><body>${inner}</body></html>`;
  const files: ZipEntry[] = [
    { name: 'mimetype', data: enc.encode('application/epub+zip') },
    {
      name: 'META-INF/container.xml',
      data: enc.encode(
        '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>'
      ),
    },
  ];
  const manifest: string[] = ['<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>'];
  const spine: string[] = [];
  chapters.forEach((c, i) => {
    const id = `ch${i + 1}`;
    files.push({ name: `OEBPS/${id}.xhtml`, data: enc.encode(page(c.title, c.html)) });
    manifest.push(`<item id="${id}" href="${id}.xhtml" media-type="application/xhtml+xml"/>`);
    spine.push(`<itemref idref="${id}"/>`);
  });
  const titleHtml = opts.includeTitlePage
    ? `<h1>${inlineToHtml(world.name)}</h1><p><em>${inlineToHtml(world.genre_tone)}</em></p>`
    : '';
  files.push({
    name: 'OEBPS/nav.xhtml',
    data: enc.encode(
      page(
        world.name,
        `${titleHtml}<nav xmlns:epub="http://www.idpf.org/2007/ops" epub:type="toc"><ol>${chapters
          .map((c, i) => `<li><a href="ch${i + 1}.xhtml">${xmlEsc(stripMarkdown(c.title))}</a></li>`)
          .join('')}</ol></nav>`
      )
    ),
  });
  files.push({
    name: 'OEBPS/content.opf',
    data: enc.encode(
      `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="bookid">${xmlEsc(bookId)}</dc:identifier><dc:title>${xmlEsc(world.name)}</dc:title><dc:language>${lang}</dc:language><meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}</meta></metadata><manifest>${manifest.join('')}</manifest><spine>${spine.join('')}</spine></package>`
    ),
  });
  return buildZip(files);
}
