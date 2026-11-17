// LoreForge Studio — Contradictions & Coherence View
import { appStore } from '../state/store';
import { t } from '../i18n';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { detectContradictions } from '../engines/contradictions';
import { navigateToDoc, navigateToPj } from '../ui/navigation';

export function renderContradictionsView(): HTMLElement {
  const world = appStore.getActiveWorld();
  const characters = appStore.getCharactersForWorld(world.id);
  const issues = detectContradictions(world, characters);

  const container = h('div', { class: 'contradictions-view', style: 'padding:24px; display:flex; flex-direction:column; gap:20px; overflow-y:auto; height:100%;' }, [
    h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, [
      h('div', {}, [
        h('h1', { style: 'font-size:20px; font-weight:700; display:flex; align-items:center; gap:8px;' }, [
          icon('alert-triangle', 20),
          document.createTextNode('Detector de Contradicciones y Coherencia')
        ]),
        h('p', { class: 'text-muted text-sm', style: 'margin-top:4px;' }, [
          'Auditoría algorítmica pasiva: detecta inconsistencias lógicas, enlaces rotos, cronologías invertidas y paradojas de personajes.'
        ])
      ]),
      h('span', { class: `badge ${issues.length === 0 ? 'badge-primary' : 'badge-warning'}`, style: 'font-size:13px; padding:6px 12px;' }, [
        issues.length === 0 ? 'Mundo 100% Coherente' : `${issues.length} advertencia(s)`
      ])
    ])
  ]);

  if (issues.length === 0) {
    container.appendChild(
      h('div', { style: 'display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px; background:var(--surface-sunken); border-radius:12px; border:1px solid var(--border-subtle); gap:12px;' }, [
        icon('check-circle', 40),
        h('h3', { style: 'font-size:16px; font-weight:600;' }, ['No se detectaron contradicciones ni enlaces rotos']),
        h('p', { class: 'text-muted text-sm' }, ['Todas las relaciones, fechas, wiki-links y reglas internas concuerdan perfectamente.'])
      ])
    );
    return container;
  }

  const list = h('div', { style: 'display:flex; flex-direction:column; gap:12px;' });

  issues.forEach((issue) => {
    const card = h('div', {
      class: 'contradiction-card',
      style: `display:flex; justify-content:space-between; align-items:center; padding:14px 18px; background:var(--surface-elevated); border-radius:8px; border-left:4px solid ${
        issue.severity === 'error' ? 'var(--status-danger, #ef4444)' : 'var(--status-warning, #f59e0b)'
      }; border-top:1px solid var(--border-subtle); border-right:1px solid var(--border-subtle); border-bottom:1px solid var(--border-subtle);`
    }, [
      h('div', { style: 'display:flex; flex-direction:column; gap:4px;' }, [
        h('div', { style: 'display:flex; align-items:center; gap:8px;' }, [
          h('span', { class: 'badge', style: 'font-size:10px; text-transform:uppercase;' }, [issue.severity]),
          h('strong', { style: 'font-size:14px; color:var(--text-primary);' }, [t(issue.messageKey, issue.params as any) || issue.messageKey])
        ])
      ]),
      issue.target ? h('button', {
        class: 'btn btn-secondary btn-sm',
        onclick: () => {
          if (issue.target?.kind === 'pj') {
            navigateToPj(issue.target.id);
          } else if (issue.target?.id) {
            navigateToDoc('chapters', issue.target.id);
          }
        }
      }, [document.createTextNode('Inspeccionar')]) : null
    ]);

    list.appendChild(card);
  });

  container.appendChild(list);
  return container;
}
