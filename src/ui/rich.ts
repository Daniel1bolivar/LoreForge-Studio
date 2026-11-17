import { t } from '../i18n';
import { parseBlocks, parseInline, resolveEntity, searchEntities } from '../engines/wikilinks';
import type { Entity, InlineSeg } from '../engines/wikilinks';
import { h } from './dom';
import { currentIndex, openEntity } from './navigation';
import { quiet } from './runtime';

function renderInlineNodes(segs: InlineSeg[], index: Entity[]): Node[] {
  return segs.map((s) => {
    if (s.type === 'bold') return h('strong', null, s.text);
    if (s.type === 'italic') return h('em', null, s.text);
    if (s.type === 'code') return h('code', null, s.text);
    if (s.type === 'link') {
      const entity = resolveEntity(index, s.target || s.text);
      const el = h(
        'button',
        {
          type: 'button',
          class: entity ? 'wikilink' : 'wikilink wikilink-missing',
          'data-target': s.target || s.text,
          title: entity ? '' : t('wiki.missing'),
        },
        s.text
      );
      el.addEventListener('click', () => {
        if (entity) openEntity(entity);
      });
      return el;
    }
    return document.createTextNode(s.text);
  });
}

export function richText(src: string): HTMLElement {
  const index = currentIndex();
  const root = h('div', { class: 'rich' });
  for (const block of parseBlocks(src)) {
    if (block.type === 'ul') {
      root.appendChild(
        h('ul', null, ...block.lines.map((l) => h('li', null, ...renderInlineNodes(parseInline(l), index))))
      );
    } else {
      const tag = block.type === 'quote' ? 'blockquote' : block.type;
      root.appendChild(h(tag, null, ...renderInlineNodes(parseInline(block.lines[0]), index)));
    }
  }
  if (!root.firstChild) root.appendChild(h('p', { class: 'muted' }, t('common.empty')));
  return root;
}

/** Autocomplete popup after typing [[ in a textarea or input. */
export function attachWikiAutocomplete(el: HTMLTextAreaElement | HTMLInputElement): void {
  let popup: HTMLElement | null = null;
  let items: Entity[] = [];
  let active = 0;
  let start = -1;

  const close = () => {
    popup?.remove();
    popup = null;
    items = [];
    start = -1;
  };

  const choose = (entity: Entity) => {
    const pos = el.selectionStart ?? el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(pos);
    const insert = `[[${entity.name}]]`;
    quiet(() => {
      el.value = before + insert + after;
      const caret = before.length + insert.length;
      el.setSelectionRange(caret, caret);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    close();
    el.focus();
  };

  const draw = () => {
    if (!popup) {
      popup = h('ul', { class: 'wiki-popup', role: 'listbox' });
      document.body.appendChild(popup);
    }
    const rect = el.getBoundingClientRect();
    popup.style.left = `${Math.round(rect.left)}px`;
    popup.style.top = `${Math.round(rect.bottom + 4)}px`;
    popup.style.minWidth = `${Math.min(rect.width, 360)}px`;
    popup.replaceChildren(
      ...items.map((it, i) => {
        const li = h(
          'li',
          { role: 'option', 'aria-selected': i === active ? 'true' : 'false', class: i === active ? 'active' : '' },
          h('span', null, it.name),
          h('small', null, t(`wiki.kind.${it.kind}`))
        );
        li.addEventListener('mousedown', (e) => {
          e.preventDefault();
          choose(it);
        });
        return li;
      })
    );
  };

  el.addEventListener('input', () => {
    const pos = el.selectionStart ?? el.value.length;
    const upto = el.value.slice(0, pos);
    const open = upto.lastIndexOf('[[');
    const closed = upto.lastIndexOf(']]');
    if (open === -1 || closed > open || /\n/.test(upto.slice(open))) {
      close();
      return;
    }
    start = open;
    items = searchEntities(currentIndex(), upto.slice(open + 2), 7);
    active = 0;
    if (!items.length) {
      close();
      return;
    }
    draw();
  });

  el.addEventListener('keydown', (e) => {
    const ev = e as KeyboardEvent;
    if (!popup) return;
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      active = (active + 1) % items.length;
      draw();
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      active = (active - 1 + items.length) % items.length;
      draw();
    } else if (ev.key === 'Enter' || ev.key === 'Tab') {
      ev.preventDefault();
      choose(items[active]);
    } else if (ev.key === 'Escape') {
      close();
    }
  });
  el.addEventListener('blur', () => window.setTimeout(close, 120));
}

/** Hover preview for .wikilink buttons via event delegation. */
export function installHoverPreview(): void {
  let tip: HTMLElement | null = null;
  const hide = () => {
    tip?.remove();
    tip = null;
  };
  const show = (target: HTMLElement) => {
    const entity = resolveEntity(currentIndex(), target.dataset.target || '');
    if (!entity) return;
    hide();
    const rect = target.getBoundingClientRect();
    tip = h(
      'div',
      { class: 'hover-card', role: 'tooltip' },
      h('strong', null, entity.name),
      h('small', null, t(`wiki.kind.${entity.kind}`)),
      h('p', null, entity.summary ? entity.summary.slice(0, 220) : t('common.empty'))
    );
    document.body.appendChild(tip);
    const left = Math.min(rect.left, window.innerWidth - 300);
    tip.style.left = `${Math.max(8, Math.round(left))}px`;
    tip.style.top = `${Math.round(rect.bottom + 6)}px`;
  };
  document.addEventListener('mouseover', (e) => {
    const el = (e.target as HTMLElement).closest?.('.wikilink') as HTMLElement | null;
    if (el) show(el);
  });
  document.addEventListener('mouseout', (e) => {
    if ((e.target as HTMLElement).closest?.('.wikilink')) hide();
  });
  document.addEventListener('focusin', (e) => {
    const el = (e.target as HTMLElement).closest?.('.wikilink') as HTMLElement | null;
    if (el) show(el);
  });
  document.addEventListener('focusout', hide);
}
