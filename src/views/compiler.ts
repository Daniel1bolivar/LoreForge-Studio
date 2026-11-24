// LoreForge Studio — Compiler & Bridges Export View
import { appStore } from '../state/store';
import { h, toast } from '../ui/dom';
import { icon } from '../ui/icons';
import { compileMarkdown, compileHtml, compileEpub } from '../engines/compiler';
import { exportPJMaster, exportNexusV3, exportLorebook, exportFoundry } from '../engines/bridges';
import { markBackupExported, shareOrDownloadBlob, shareOrDownloadText } from '../ui/mobile';

export function renderCompilerView(): HTMLElement {
  const world = appStore.getActiveWorld();
  const characters = appStore.getCharactersForWorld(world.id);
  const activePj = appStore.getActivePj();
  const lang = appStore.getState().locale;

  const defaultCompileOpts = {
    includeTitlePage: true,
    includeToc: true,
    includeLore: true,
    chapterIds: []
  };

  const container = h('div', { class: 'compiler-view', style: 'padding:24px; display:flex; flex-direction:column; gap:24px; overflow-y:auto; height:100%; max-width:960px; margin:0 auto;' }, [
    h('div', {}, [
      h('h1', { style: 'font-size:20px; font-weight:700; display:flex; align-items:center; gap:8px;' }, [
        icon('download', 20),
        document.createTextNode('Compilador de Manuscrito & Puentes VTT / IA')
      ]),
      h('p', { class: 'text-muted text-sm', style: 'margin-top:4px;' }, [
        'Exporta tu obra a formatos de lectura (Markdown, HTML listo para imprimir a PDF, EPUB) o formatos interoperables (Foundry VTT, SillyTavern Lorebook, Nexus V3).'
      ])
    ])
  ]);

  // Section 1: Book / Manuscript Compiler
  const bookSection = h('div', { class: 'panel-card', style: 'background:var(--surface-elevated); padding:20px; border-radius:10px; border:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:16px;' }, [
    h('h3', { style: 'font-size:16px; font-weight:600; display:flex; align-items:center; gap:8px;' }, [
      icon('book-open', 18),
      document.createTextNode('1. Compilación de Obra / Novela')
    ]),
    h('p', { class: 'text-sm text-muted' }, [
      `Compila todos los capítulos de "${world.name}" en un único tomo editorial con tipografía calibrada.`
    ]),
    h('div', { style: 'display:flex; gap:12px; flex-wrap:wrap;' }, [
      h('button', {
        class: 'btn btn-primary',
        onclick: () => {
          const exportEnvelope = {
            schema_version: '2.0.0',
            saved_at: new Date().toISOString(),
            state: {
              theme: appStore.getState().theme,
              rpgMode: appStore.getState().rpgMode,
              explicitMode: appStore.getState().explicitMode,
              activeWorldId: world.id,
              activePjId: activePj?.id || characters[0]?.id || '',
              worlds: [world],
              pjs: characters
            }
          };
          const slug = world.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'mundo';
          downloadFile(JSON.stringify(exportEnvelope, null, 2), `${slug}.worldbuilder.json`, 'application/json');
          toast(`Proyecto "${world.name}" exportado con éxito (${characters.length} PJs)`);
        }
      }, [icon('download', 16), document.createTextNode('Exportar Mundo Completo (.json)')]),
      h('button', {
        class: 'btn btn-secondary',
        onclick: () => {
          const res = compileMarkdown(world, characters, defaultCompileOpts);
          downloadFile(res, `${world.name}-manuscrito.md`, 'text/markdown');
          toast('Manuscrito Markdown descargado con éxito');
        }
      }, [icon('file-text', 16), document.createTextNode('Exportar Markdown (.md)')]),
      h('button', {
        class: 'btn btn-secondary',
        onclick: () => {
          const res = compileHtml(world, characters, defaultCompileOpts, lang);
          downloadFile(res, `${world.name}-tomo.html`, 'text/html');
          toast('Tomo HTML descargado (imprime a PDF con Ctrl+P)');
        }
      }, [icon('file', 16), document.createTextNode('Exportar HTML / Imprimir a PDF')]),
      h('button', {
        class: 'btn btn-secondary',
        onclick: () => {
          const blob = compileEpub(world, characters, defaultCompileOpts, lang);
          downloadBlob(blob, `${world.name}-libro.epub`);
          toast('Archivo .epub descargado con éxito');
        }
      }, [icon('download', 16), document.createTextNode('Exportar Libro Digital (.epub)')])
    ])
  ]);

  container.appendChild(bookSection);

  // Section 2: VTT & AI Interoperability
  const bridgeSection = h('div', { class: 'panel-card', style: 'background:var(--surface-elevated); padding:20px; border-radius:10px; border:1px solid var(--border-subtle); display:flex; flex-direction:column; gap:16px;' }, [
    h('h3', { style: 'font-size:16px; font-weight:600; display:flex; align-items:center; gap:8px;' }, [
      icon('share-2', 18),
      document.createTextNode('2. Puentes para VTT, IA y Roleplay (Zero Vendor Lock-in)')
    ]),
    h('p', { class: 'text-sm text-muted' }, [
      'Exporta tus fichas y enciclopedia para usar en plataformas externas.'
    ]),
    h('div', { style: 'display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:12px;' }, [
      // SillyTavern Lorebook
      h('button', {
        class: 'btn btn-secondary',
        style: 'justify-content:center;',
        onclick: () => {
          const doc = exportLorebook(world, characters);
          downloadFile(JSON.stringify(doc, null, 2), `${world.id}-lorebook.json`, 'application/json');
          toast('Lorebook para SillyTavern exportado');
        }
      }, [icon('archive', 16), document.createTextNode('SillyTavern Lorebook')]),
      // Foundry VTT Compendium
      h('button', {
        class: 'btn btn-secondary',
        style: 'justify-content:center;',
        onclick: () => {
          const bundle = exportFoundry(world, characters);
          downloadFile(JSON.stringify(bundle, null, 2), `${world.id}-foundry-actors.json`, 'application/json');
          toast('Compendio de Foundry VTT exportado');
        }
      }, [icon('dices', 16), document.createTextNode('Foundry VTT Actors')]),
      // Nexus V3 Character
      h('button', {
        class: 'btn btn-secondary',
        style: 'justify-content:center;',
        onclick: () => {
          if (!activePj) {
            toast('Selecciona un personaje activo primero');
            return;
          }
          const card = exportNexusV3(activePj, appStore.getState().explicitMode);
          downloadFile(JSON.stringify(card, null, 2), `${activePj.id || 'pj'}-nexus-v3.json`, 'application/json');
          toast(`Ficha Nexus V3 de ${activePj.identity.name} exportada`);
        }
      }, [icon('user', 16), document.createTextNode('Personaje Nexus V3')]),
      // Full PJ Master JSON
      h('button', {
        class: 'btn btn-secondary',
        style: 'justify-content:center;',
        onclick: () => {
          if (!activePj) {
            toast('Selecciona un personaje activo primero');
            return;
          }
          const master = exportPJMaster(activePj, appStore.getState().explicitMode);
          downloadFile(JSON.stringify(master, null, 2), `${activePj.id || 'pj'}-master.json`, 'application/json');
          toast(`Ficha Master JSON exportada`);
        }
      }, [icon('code', 16), document.createTextNode('Ficha Master JSON')])
    ])
  ]);

  container.appendChild(bridgeSection);
  return container;

  function downloadFile(content: string, filename: string, mime: string) {
    markBackupExported();
    void shareOrDownloadText(content, filename, mime, filename);
  }

  function downloadBlob(blob: Blob, filename: string) {
    markBackupExported();
    void shareOrDownloadBlob(blob, filename, filename);
  }
}
