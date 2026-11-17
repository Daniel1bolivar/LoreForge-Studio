import { t } from '../i18n';
import {
  addArchiveItem,
  addHomebrewLanguage,
  addHomebrewSpecies,
  createPj,
  getActiveWorld,
  getState,
  getWorldPJs,
  setActivePj,
  setDocSelection,
  setFolderNote,
  setGalleryCat,
  setHomebrewTab,
  setView,
  updateWorld,
  upsertRelation,
} from '../state/store';
import type { ArchiveCategoryKey, FolderNoteEntry, TreeCategoryDef } from '../types';
import { TREE_CATEGORIES } from '../state/defaults';
import { pixelBanner } from '../ui/banner';
import { h, normalize, toast, uid } from '../ui/dom';
import { icon } from '../ui/icons';
import { attachWikiAutocomplete, richText } from '../ui/rich';
import { badge, btn, emptyState, iconBtn, pageHeader, promptDialog, textArea } from '../ui/widgets';

interface Card {
  id: string;
  title: string;
  badge: string;
  sub: string;
  desc: string;
  avatar?: string;
  active?: boolean;
  draggable?: boolean;
}

export function categoryDef(key: string): TreeCategoryDef {
  return TREE_CATEGORIES.find((c) => c.key === key) || TREE_CATEGORIES[2];
}

export function categoryCards(cat: TreeCategoryDef): Card[] {
  const world = getActiveWorld();
  const s = getState();
  switch (cat.kind) {
    case 'pjs':
      return getWorldPJs().map((p) => ({
        id: p.id || '',
        title: p.identity.name || t('common.untitled'),
        badge: p.identity.species_lineage || '',
        sub: p.identity.role_occupation || '',
        desc: p.worldbuilding_101.core_motivation || p.worldbuilding_101.personal_history || '',
        avatar: p.avatar,
        active: p.id === s.activePjId,
      }));
    case 'lore':
      return (world.lore_entries || []).map((l, i) => ({ id: String(i), title: l.term, badge: t('wiki.kind.lore'), sub: l.keys, desc: l.content }));
    case 'factions':
      return (world.factions || []).map((f, i) => ({ id: String(i), title: f.name, badge: f.type, sub: '', desc: f.details }));
    case 'species':
      return (world.homebrew.species || []).map((sp, i) => ({ id: String(i), title: sp.label, badge: sp.slug, sub: '', desc: sp.notes }));
    case 'languages': {
      const langs = world.homebrew.languages;
      return langs.registered.map((l, i) => {
        const rarity = langs.unavailable.includes(l.slug)
          ? 'unavailable'
          : langs.secret.includes(l.slug)
            ? 'secret'
            : langs.rare.includes(l.slug)
              ? 'rare'
              : langs.uncommon.includes(l.slug)
                ? 'uncommon'
                : 'common';
        return {
          id: String(i),
          title: l.label,
          badge: t(`world.homebrew.buckets.${rarity}`),
          sub: langs.commonLanguage === l.slug ? t('world.homebrew.commonSelect') : l.slug,
          desc: '',
        };
      });
    }
    case 'relations':
      return (world.relations || []).map((r) => ({ id: r.id, title: `${r.from} / ${r.to}`, badge: r.relation, sub: r.faction_tag || '', desc: r.notes || '' }));
    default:
      return (world.archive?.[cat.key as ArchiveCategoryKey] || []).map((d) => ({
        id: d.id,
        title: d.title,
        badge: d.subtitle || '',
        sub: (d.tags || []).join(', '),
        desc: d.summary,
        draggable: true,
      }));
  }
}

export function openCard(cat: TreeCategoryDef, id: string): void {
  switch (cat.kind) {
    case 'pjs':
      setActivePj(id);
      setView('pj');
      break;
    case 'archive':
      setDocSelection(cat.key, id);
      setView('doc');
      break;
    case 'relations':
      setView('relations');
      break;
    case 'species':
    case 'languages':
      setHomebrewTab(cat.kind);
      setView('world');
      break;
    default:
      setView('world');
  }
}

export function addToCategory(cat: TreeCategoryDef): void {
  const world = getActiveWorld();
  switch (cat.kind) {
    case 'pjs':
      promptDialog(t('gallery.newCharacter'), t('common.name'), '', (name) => {
        const res = createPj(name);
        if (res.ok) {
          toast(t('toasts.pjCreated', { name }));
          setView('pj');
        }
      });
      break;
    case 'archive':
      promptDialog(t('gallery.newEntry'), t('common.title'), '', (title) => {
        const res = addArchiveItem(world.id, cat.key as ArchiveCategoryKey, { title, summary: '', tags: [] });
        if (res.ok && res.data) {
          setDocSelection(cat.key, res.data.id);
          setView('doc');
        }
      });
      break;
    case 'lore':
      promptDialog(t('gallery.newEntry'), t('common.title'), '', (term) => {
        updateWorld(world.id, (w) => {
          if (!w.lore_entries) w.lore_entries = [];
          w.lore_entries.push({ term, keys: term.toLowerCase(), content: '' });
        });
        setView('world');
      });
      break;
    case 'factions':
      promptDialog(t('gallery.newEntry'), t('common.name'), '', (name) => {
        updateWorld(world.id, (w) => {
          w.factions.push({ id: uid('fac'), name, type: '', details: '' });
        });
        setView('world');
      });
      break;
    case 'species':
      promptDialog(t('gallery.newEntry'), t('common.name'), '', (label) => {
        const res = addHomebrewSpecies(world.id, label);
        if (res.ok) toast(t('toasts.speciesAdded', { label }));
        else if (res.errorKey) toast(t(res.errorKey, res.errorParams));
      });
      break;
    case 'languages':
      promptDialog(t('gallery.newEntry'), t('common.name'), '', (label) => {
        const res = addHomebrewLanguage(world.id, label);
        if (res.ok) toast(t('toasts.langAdded', { label }));
        else if (res.errorKey) toast(t(res.errorKey, res.errorParams));
      });
      break;
    case 'relations':
      upsertRelation(world.id, { id: uid('rel'), from: '', relation: '', to: '' });
      setView('relations');
      break;
  }
}

function moveArchive(catKey: ArchiveCategoryKey, from: number, to: number): void {
  const world = getActiveWorld();
  if (from === to || to < 0) return;
  updateWorld(world.id, (w) => {
    const list = w.archive?.[catKey];
    if (!list || to >= list.length) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
  });
}

function folderNoteEntry(key: string): FolderNoteEntry {
  const raw = getActiveWorld().folder_notes?.[key];
  if (!raw) return { body_markdown: '' };
  return typeof raw === 'string' ? { body_markdown: raw } : raw;
}

function folderNotePanel(cat: TreeCategoryDef): HTMLElement {
  const world = getActiveWorld();
  const note = folderNoteEntry(cat.key);
  const view = h('div', { class: 'folder-note-view' });
  const draw = () => {
    view.replaceChildren(richText(note.body_markdown));
  };
  draw();
  const wrap = h('details', { class: 'folder-note', open: Boolean(note.body_markdown) });
  const editor = textArea({
    value: note.body_markdown,
    rows: 4,
    ariaLabel: t('gallery.folderNote'),
    placeholder: t('gallery.folderNotePlaceholder'),
    onInput: (v) => {
      note.body_markdown = v;
      setFolderNote(world.id, cat.key, { ...note, body_markdown: v });
      draw();
    },
  });
  attachWikiAutocomplete(editor);
  wrap.append(h('summary', null, icon('book-open', 16), h('span', null, t('gallery.folderNote'))), editor, view);
  return wrap;
}

export function renderGallery(): HTMLElement {
  const s = getState();
  const cat = categoryDef(s.activeGalleryCat);
  const world = getActiveWorld();
  const filterInput = h('input', {
    type: 'search',
    placeholder: t('gallery.filter'),
    'aria-label': t('gallery.filter'),
    value: '',
  });
  const grid = h('div', { class: 'card-grid', role: 'list' });
  const count = h('span', { class: 'muted' });

  const draw = () => {
    const q = normalize(filterInput.value);
    const all = categoryCards(cat);
    const cards = q ? all.filter((c) => normalize(`${c.title} ${c.badge} ${c.desc} ${c.sub}`).includes(q)) : all;
    count.textContent = t('gallery.count', { shown: cards.length, total: all.length });
    if (!cards.length) {
      grid.replaceChildren(
        emptyState(t('gallery.empty'), btn(t('gallery.create'), () => addToCategory(cat), { icon: 'plus', variant: 'primary' }))
      );
      return;
    }
    grid.replaceChildren(
      ...cards.map((c) => {
        const idx = all.findIndex((x) => x.id === c.id);
        const body = h(
          'button',
          { type: 'button', class: 'card-main', onClick: () => openCard(cat, c.id) },
          c.avatar
            ? h('img', { class: 'card-avatar', src: c.avatar, alt: '' })
            : pixelBanner(undefined, `${world.id}:${cat.key}:${c.title}`, 56),
          h('span', { class: 'card-title' }, c.title),
          c.badge ? badge(c.badge) : null,
          c.sub ? h('span', { class: 'card-sub' }, c.sub) : null,
          h('span', { class: 'card-desc' }, c.desc || t('gallery.noDescription'))
        );
        const card = h('div', { class: `card${c.active ? ' active' : ''}`, role: 'listitem' }, body);
        if (c.draggable && !q) {
          card.setAttribute('draggable', 'true');
          card.addEventListener('dragstart', (e) => {
            e.dataTransfer?.setData('text/plain', String(idx));
            card.classList.add('dragging');
          });
          card.addEventListener('dragend', () => card.classList.remove('dragging'));
          card.addEventListener('dragover', (e) => {
            e.preventDefault();
            card.classList.add('drop-target');
          });
          card.addEventListener('dragleave', () => card.classList.remove('drop-target'));
          card.addEventListener('drop', (e) => {
            e.preventDefault();
            card.classList.remove('drop-target');
            const from = Number(e.dataTransfer?.getData('text/plain'));
            if (!Number.isNaN(from)) moveArchive(cat.key as ArchiveCategoryKey, from, idx);
          });
          card.append(
            h(
              'div',
              { class: 'card-tools' },
              icon('grip', 16),
              iconBtn('arrow-up', t('gallery.moveEarlier'), () => moveArchive(cat.key as ArchiveCategoryKey, idx, idx - 1)),
              iconBtn('arrow-down', t('gallery.moveLater'), () => moveArchive(cat.key as ArchiveCategoryKey, idx, idx + 1))
            )
          );
        }
        return card;
      })
    );
  };
  filterInput.addEventListener('input', draw);
  draw();

  return h(
    'div',
    { class: 'view gallery' },
    pageHeader(
      t(cat.labelKey),
      undefined,
      filterInput,
      btn(t('gallery.create'), () => addToCategory(cat), { icon: 'plus', variant: 'primary' })
    ),
    folderNotePanel(cat),
    count,
    grid,
    h(
      'nav',
      { class: 'chip-row', 'aria-label': t('gallery.switchCategory') },
      ...TREE_CATEGORIES.map((c) =>
        h(
          'button',
          { type: 'button', class: `chip${c.key === cat.key ? ' active' : ''}`, onClick: () => setGalleryCat(c.key), 'aria-pressed': c.key === cat.key ? 'true' : 'false' },
          icon(c.iconKey, 14),
          h('span', null, t(c.labelKey))
        )
      )
    )
  );
}
