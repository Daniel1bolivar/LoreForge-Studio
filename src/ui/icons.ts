const SVG_NS = 'http://www.w3.org/2000/svg';

/** Uniform 24x24 stroke icons (stroke-width 1.5). Values are SVG path markup. */
const PATHS: Record<string, string> = {
  'file-text': '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
  'book-open': '<path d="M3 5.5C5 4.5 8 4.5 12 6.5c4-2 7-2 9-1V19c-2-1-5-1-9 1-4-2-7-2-9-1z"/><path d="M12 6.5V20"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>',
  users: '<circle cx="9" cy="8.5" r="3"/><path d="M3 19c0-3 2.7-5 6-5s6 2 6 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M17 14c2.4 0 4 1.5 4 4"/>',
  'map-pin': '<path d="M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0C5.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/>',
  map: '<path d="M3 6.5l6-2.5 6 2.5 6-2.5v13.5l-6 2.5-6-2.5-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  landmark: '<path d="M3 9.5L12 4l9 5.5"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
  flame: '<path d="M12 21c3.5 0 6-2.4 6-5.8 0-3.2-2.4-4.6-3.2-7.2-2.2 1.2-3 3-3 4.6-1.4-.8-2-2.2-2-3.6C7.600 10.200 6 12.400 6 15.200 6 18.600 8.500 21 12 21z"/>',
  sparkles: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.200L5 10l5.200-1.800z"/><path d="M19 16l.8 2.200L22 19l-2.200.8L19 22l-.8-2.200L16 19l2.200-.8z"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.500M12 18.500V21M3 12h2.500M18.500 12H21M5.600 5.600l1.800 1.800M16.600 16.600l1.800 1.800M5.600 18.400l1.800-1.800M16.600 7.400l1.800-1.800"/>',
  feather: '<path d="M20 4c-6 0-11 4-11 10v2l-4 4"/><path d="M9 16h4c4 0 7-3 7-8V4"/><path d="M9 12h6"/>',
  sword: '<path d="M14.500 4.500L20 4l-.5 5.500L9 20l-5-5z"/><path d="M6.500 12.500l5 5M4 20l3-3"/>',
  'message-square': '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.500h8M8 12.500h5"/>',
  coins: '<ellipse cx="9" cy="7" rx="5" ry="2.500"/><path d="M4 7v5c0 1.400 2.200 2.500 5 2.500s5-1.100 5-2.500V7"/><path d="M14 11c3 0 6 1 6 2.500V17c0 1.400-2.200 2.500-5 2.500-1.400 0-2.600-.3-3.500-.7"/>',
  scroll: '<path d="M8 4h11v13a3 3 0 0 1-3 3H6a3 3 0 0 0 3-3V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2h3"/><path d="M12 9h4M12 13h4"/>',
  'git-branch': '<circle cx="6" cy="5.500" r="2"/><circle cx="6" cy="18.500" r="2"/><circle cx="18" cy="9" r="2"/><path d="M6 7.500v9M18 11c0 3-3 4-6 4H8.500"/>',
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
  network: '<circle cx="12" cy="5" r="2.200"/><circle cx="5" cy="18" r="2.200"/><circle cx="19" cy="18" r="2.200"/><path d="M12 7.200v4M12 11.200l-6 5M12 11.200l6 5"/>',
  clock: '<circle cx="12" cy="12" r="8.500"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.500M12 17.500v.5"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1"/><circle cx="15" cy="15" r="1"/><circle cx="12" cy="12" r="1"/>',
  kanban: '<rect x="3.500" y="4" width="17" height="16" rx="2"/><path d="M9 4v16M15 4v16"/><path d="M6 8h.01M12 8h.01M18 8h.01"/>',
  eye: '<path d="M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12z"/><circle cx="12" cy="12" r="2.800"/>',
  brain: '<path d="M9 4.500a3 3 0 0 0-3 3 3 3 0 0 0-2 2.800 3 3 0 0 0 1.500 2.600A3 3 0 0 0 7 17.500a3 3 0 0 0 5 1.500V5.500A2.500 2.500 0 0 0 9 4.500z"/><path d="M15 4.500a3 3 0 0 1 3 3 3 3 0 0 1 2 2.800 3 3 0 0 1-1.500 2.600A3 3 0 0 1 17 17.500a3 3 0 0 1-5 1.500"/>',
  search: '<circle cx="11" cy="11" r="6.500"/><path d="M16 16l4.500 4.500"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
  'folder-open': '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H7l-3 9z"/><path d="M4 18l3-8h15l-3 8z"/>',
  download: '<path d="M12 4v11M7.500 11L12 15.500 16.500 11M5 20h14"/>',
  upload: '<path d="M12 16V5M7.500 9L12 4.500 16.500 9M5 20h14"/>',
  'chevron-right': '<path d="M9 5l7 7-7 7"/>',
  'chevron-down': '<path d="M5 9l7 7 7-7"/>',
  'chevron-left': '<path d="M15 5l-7 7 7 7"/>',
  'arrow-up': '<path d="M12 19V5M6 11l6-6 6 6"/>',
  'arrow-down': '<path d="M12 5v14M6 13l6 6 6-6"/>',
  globe: '<circle cx="12" cy="12" r="8.500"/><path d="M3.500 12h17M12 3.500c2.500 2.500 3.500 5.500 3.500 8.500S14.500 18 12 20.500M12 3.500C9.500 6 8.500 9 8.500 12s1 6 3.500 8.500"/>',
  trash: '<path d="M4 7h16M10 7V4.500h4V7M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>',
  sliders: '<path d="M5 6h9M18 6h1M5 12h3M12 12h7M5 18h11M20 18h-1"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  layers: '<path d="M12 4l9 5-9 5-9-5z"/><path d="M3 14l9 5 9-5"/>',
  grip: '<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01"/>',
  book: '<path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z"/><path d="M5 18a2 2 0 0 1 2-2h12"/>',
  play: '<path d="M7 5l12 7-12 7z"/>',
  'external-link': '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  shield: '<path d="M12 3l7 3v6c0 4.500-3 7.500-7 9-4-1.500-7-4.500-7-9V6z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.500 0l3-3a4 4 0 0 0-5.600-5.600l-1 1"/><path d="M14 10a4 4 0 0 0-5.500 0l-3 3a4 4 0 0 0 5.600 5.600l1-1"/>',
  check: '<path d="M5 12.500l4.500 4.500L19 7.500"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.500 6.500l4 4"/>',
  image: '<rect x="3.500" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.500"/><path d="M4 17l5-4.500 4 3.500 3-2.500 4.500 3.500"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".6"/>',
  swords: '<path d="M5 5l9 9M5 5h4M5 5v4"/><path d="M19 5l-9 9M19 5h-4M19 5v4"/><path d="M12 17l-3 3M12 17l3 3"/>',
  share: '<circle cx="6" cy="12" r="2.500"/><circle cx="18" cy="6" r="2.500"/><circle cx="18" cy="18" r="2.500"/><path d="M8.200 10.800l7.600-3.600M8.200 13.200l7.600 3.600"/>',
};

export function icon(name: string, size = 18): SVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.classList.add('icon');
  svg.innerHTML = PATHS[name] ?? PATHS['file-text'];
  return svg;
}

export function hasIcon(name: string): boolean {
  return name in PATHS;
}
