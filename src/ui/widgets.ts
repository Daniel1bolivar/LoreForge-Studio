import { t } from '../i18n';
import { h, uid } from './dom';
import type { Child } from './dom';
import { icon } from './icons';
import { quiet } from './runtime';

export interface InputOpts {
  value: string;
  onInput: (value: string) => void;
  id?: string;
  placeholder?: string;
  type?: string;
  list?: string;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel?: string;
  class?: string;
}

export function textInput(opts: InputOpts): HTMLInputElement {
  const el = h('input', {
    type: opts.type || 'text',
    id: opts.id,
    placeholder: opts.placeholder,
    list: opts.list,
    min: opts.min,
    max: opts.max,
    step: opts.step,
    'aria-label': opts.ariaLabel,
    class: opts.class,
    value: opts.value,
  });
  el.addEventListener('input', () => quiet(() => opts.onInput(el.value)));
  return el;
}

export function textArea(opts: InputOpts & { rows?: number }): HTMLTextAreaElement {
  const el = h('textarea', {
    id: opts.id,
    placeholder: opts.placeholder,
    rows: opts.rows || 4,
    'aria-label': opts.ariaLabel,
    class: opts.class,
  });
  el.value = opts.value;
  el.addEventListener('input', () => quiet(() => opts.onInput(el.value)));
  return el;
}

export function selectBox(
  options: Array<{ value: string; label: string }>,
  value: string,
  onChange: (value: string) => void,
  attrs: { id?: string; ariaLabel?: string; class?: string } = {}
): HTMLSelectElement {
  const el = h(
    'select',
    { id: attrs.id, 'aria-label': attrs.ariaLabel, class: attrs.class },
    ...options.map((o) => h('option', { value: o.value }, o.label))
  );
  el.value = value;
  el.addEventListener('change', () => onChange(el.value));
  return el;
}

export function field(label: string, control: HTMLElement, cls = ''): HTMLElement {
  const id = control.id || uid('f');
  control.id = id;
  return h('div', { class: `field ${cls}`.trim() }, h('label', { for: id }, label), control);
}

export function btn(
  label: string,
  onClick: (e: MouseEvent) => void,
  opts: { icon?: string; variant?: 'primary' | 'ghost' | 'danger'; ariaLabel?: string; small?: boolean; disabled?: boolean } = {}
): HTMLButtonElement {
  const cls = ['btn'];
  if (opts.variant) cls.push(`btn-${opts.variant}`);
  if (opts.small) cls.push('btn-sm');
  return h(
    'button',
    { type: 'button', class: cls.join(' '), 'aria-label': opts.ariaLabel, disabled: opts.disabled, onClick },
    opts.icon ? icon(opts.icon, 16) : null,
    label ? h('span', null, label) : null
  );
}

export function iconBtn(
  name: string,
  ariaLabel: string,
  onClick: (e: MouseEvent) => void,
  variant?: 'danger' | 'ghost'
): HTMLButtonElement {
  return h(
    'button',
    { type: 'button', class: `icon-btn${variant ? ` icon-btn-${variant}` : ''}`, 'aria-label': ariaLabel, title: ariaLabel, onClick },
    icon(name, 18)
  );
}

export function section(title: string, ...children: Child[]): HTMLElement {
  return h('section', { class: 'panel' }, h('h3', { class: 'panel-title' }, title), ...children);
}

export function pageHeader(title: string, subtitle?: string, ...actions: Child[]): HTMLElement {
  return h(
    'header',
    { class: 'page-header' },
    h('div', null, h('h2', { class: 'page-title' }, title), subtitle ? h('p', { class: 'page-sub' }, subtitle) : null),
    actions.length ? h('div', { class: 'page-actions' }, ...actions) : null
  );
}

export function emptyState(message: string, action?: HTMLElement): HTMLElement {
  return h('div', { class: 'empty' }, h('p', null, message), action || null);
}

export function badge(text: string, tone = ''): HTMLElement {
  return h('span', { class: `badge ${tone}`.trim() }, text);
}

export function openModal(title: string, content: HTMLElement, onClose?: () => void): () => void {
  const previous = document.activeElement as HTMLElement | null;
  const backdrop = h('div', { class: 'modal-backdrop', role: 'presentation' });
  const close = () => {
    backdrop.remove();
    document.removeEventListener('keydown', onKey);
    previous?.focus?.();
    onClose?.();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  const dialog = h(
    'div',
    { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'modal-head' }, h('h3', null, title), iconBtn('x', t('a11y.closeModal'), close)),
    content
  );
  backdrop.addEventListener('mousedown', (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.appendChild(dialog);
  document.body.appendChild(backdrop);
  document.addEventListener('keydown', onKey);
  const first = dialog.querySelector<HTMLElement>('input, textarea, select, button.btn');
  (first || dialog).focus();
  return close;
}

export function confirmDialog(message: string, confirmLabel: string, onConfirm: () => void): void {
  let close: () => void = () => {};
  const body = h(
    'div',
    { class: 'stack' },
    h('p', null, message),
    h(
      'div',
      { class: 'row-end' },
      btn(t('common.cancel'), () => close(), { variant: 'ghost' }),
      btn(confirmLabel, () => {
        close();
        onConfirm();
      }, { variant: 'danger' })
    )
  );
  close = openModal(t('common.confirm'), body);
}

export function promptDialog(
  title: string,
  label: string,
  initial: string,
  onSubmit: (value: string) => void
): void {
  let close: () => void = () => {};
  const input = h('input', { type: 'text', value: initial, 'aria-label': label });
  const submit = () => {
    const v = input.value.trim();
    if (!v) return;
    close();
    onSubmit(v);
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });
  const body = h(
    'div',
    { class: 'stack' },
    h('label', { class: 'field' }, h('span', null, label), input),
    h('div', { class: 'row-end' }, btn(t('common.cancel'), () => close(), { variant: 'ghost' }), btn(t('common.accept'), submit, { variant: 'primary' }))
  );
  close = openModal(title, body);
  input.focus();
  input.select();
}
