import type { PixelBannerConfig } from '../types';

const SVG_NS = 'http://www.w3.org/2000/svg';

function hash(seed: string): number {
  let hsh = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hsh ^= seed.charCodeAt(i);
    hsh = Math.imul(hsh, 16777619);
  }
  return hsh >>> 0;
}

function rng(seed: string): () => number {
  let a = hash(seed) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function normalizeBanner(
  value: PixelBannerConfig | string | undefined,
  fallbackSeed: string
): PixelBannerConfig {
  if (!value) return { seed: fallbackSeed, style: 'waves' };
  if (typeof value === 'string') return { seed: value, style: 'waves' };
  return { seed: value.seed || fallbackSeed, style: value.style || 'waves', palette: value.palette };
}

/** Deterministic pixel-block banner drawn with theme tokens. */
export function pixelBanner(
  value: PixelBannerConfig | string | undefined,
  fallbackSeed: string,
  height = 72
): SVGElement {
  const cfg = normalizeBanner(value, fallbackSeed);
  const rand = rng(cfg.seed);
  const cols = 64;
  const rows = Math.max(4, Math.round(height / 12));
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${cols} ${rows}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'pixel-banner');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', cfg.seed);
  svg.style.height = `${height}px`;
  const phase = rand() * Math.PI * 2;
  const style = cfg.style || 'waves';
  for (let x = 0; x < cols; x += 1) {
    let top: number;
    if (style === 'peaks') {
      top = rows - 1 - Math.floor(Math.abs(Math.sin(x / 5 + phase)) * (rows - 1) * (0.5 + rand() * 0.5));
    } else if (style === 'grid') {
      top = (x + Math.floor(rand() * 3)) % 4 === 0 ? 0 : Math.floor(rows / 2) + Math.floor(rand() * 2);
    } else if (style === 'constellation') {
      top = rand() > 0.82 ? Math.floor(rand() * rows) : rows;
    } else {
      top = Math.round((Math.sin(x / 6 + phase) + 1) * 0.5 * (rows - 2) + rand() * 1.2);
    }
    for (let y = Math.max(0, top); y < rows; y += 1) {
      if (style === 'constellation' && y !== top) continue;
      const rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', String(x));
      rect.setAttribute('y', String(y));
      rect.setAttribute('width', '1');
      rect.setAttribute('height', '1');
      const depth = (y - top) / Math.max(1, rows - top);
      rect.setAttribute('fill', 'var(--accent)');
      rect.setAttribute('opacity', String(Math.max(0.12, 0.85 - depth * 0.7 - rand() * 0.15).toFixed(2)));
      svg.appendChild(rect);
    }
  }
  return svg;
}
