import { t } from '../i18n';
import {
  deleteArchiveItem,
  getActiveWorld,
  getState,
  setGalleryCat,
  setView,
  updateArchiveItem,
} from '../state/store';
import type { ArchiveCategoryKey, ArchiveDocument } from '../types';
import { pixelBanner } from '../ui/banner';
import { h, toast } from '../ui/dom';
import { attachWikiAutocomplete, richText } from '../ui/rich';
import { refreshChrome } from '../ui/runtime';
import { btn, confirmDialog, field, pageHeader, selectBox, textArea, textInput } from '../ui/widgets';
import { categoryDef } from './gallery';

export function renderDoc(): HTMLElement {
  const s = getState();
  const world = getActiveWorld();
  const catKey = s.activeDocCat as ArchiveCategoryKey;
  const list = world.archive?.[catKey] || [];
  const doc: ArchiveDocument | undefined = list.find((d) => d.id === s.activeDocId) || list[0];
  if (!doc) {
    setGalleryCat(catKey || 'chapters');
    return h('div', { class: 'view' }, h('p', null, t('common.empty')));
  }
  const cat = categoryDef(catKey);
  const patch = (p: Partial<ArchiveDocument>) => {
    updateArchiveItem(world.id, catKey, doc.id, p);
  };

  const preview = h('div', { class: 'preview-pane' });
  const drawPreview = () => preview.replaceChildren(richText(doc.body_markdown || doc.summary));
  drawPreview();

  const bodyInput = textArea({
    value: doc.body_markdown || '',
    rows: 14,
    ariaLabel: t('doc.body'),
    placeholder: t('doc.bodyPlaceholder'),
    onInput: (v) => {
      doc.body_markdown = v;
      patch({ body_markdown: v });
      drawPreview();
    },
  });
  attachWikiAutocomplete(bodyInput);

  const summaryInput = textArea({
    value: doc.summary,
    rows: 3,
    onInput: (v) => {
      doc.summary = v;
      patch({ summary: v });
      drawPreview();
    },
  });
  attachWikiAutocomplete(summaryInput);

  const bannerStyles = ['waves', 'peaks', 'grid', 'constellation'] as const;
  const currentBanner = typeof doc.pixel_banner === 'object' ? doc.pixel_banner?.style || 'waves' : 'waves';
  const bannerHolder = h('div', { class: 'banner-holder' }, pixelBanner(doc.pixel_banner, doc.id, 64));

  return h(
    'div',
    { class: 'view doc' },
    pageHeader(
      doc.title || t('common.untitled'),
      t(cat.labelKey),
      btn(t('doc.back'), () => { setGalleryCat(catKey); setView('gallery'); }, { icon: 'chevron-left', variant: 'ghost' }),
      btn(t('common.delete'), () =>
        confirmDialog(t('doc.confirmDelete'), t('common.delete'), () => {
          deleteArchiveItem(world.id, catKey, doc.id);
          toast(t('toasts.docDeleted'));
          setGalleryCat(catKey);
          setView('gallery');
        }),
        { icon: 'trash', variant: 'danger' })
    ),
    bannerHolder,
    h(
      'div',
      { class: 'form-grid' },
      field(t('common.title'), textInput({
        value: doc.title,
        onInput: (v) => { doc.title = v; patch({ title: v }); refreshChrome(); },
      })),
      field(t('doc.subtitle'), textInput({
        value: doc.subtitle || '',
        onInput: (v) => { doc.subtitle = v; patch({ subtitle: v }); },
      })),
      field(t('doc.tags'), textInput({
        value: (doc.tags || []).join(', '),
        onInput: (v) => {
          const tags = v.split(',').map((x) => x.trim()).filter(Boolean);
          doc.tags = tags;
          patch({ tags });
        },
      })),
      field(t('doc.banner'), selectBox(
        bannerStyles.map((b) => ({ value: b, label: t(`doc.bannerStyles.${b}`) })),
        currentBanner,
        (v) => {
          const next = { seed: doc.id, style: v as (typeof bannerStyles)[number] };
          doc.pixel_banner = next;
          patch({ pixel_banner: next });
          bannerHolder.replaceChildren(pixelBanner(next, doc.id, 64));
        }
      )),
      field(t('doc.summary'), summaryInput, 'span-2')
    ),
    h(
      'div',
      { class: 'editor-split' },
      field(t('doc.body'), bodyInput),
      h('div', { class: 'field' }, h('span', { class: 'field-label' }, t('doc.preview')), preview)
    ),
    h('p', { class: 'muted' }, t('doc.wikiHint'))
  );
}
