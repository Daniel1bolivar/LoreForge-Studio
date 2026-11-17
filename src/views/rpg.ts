// LoreForge Studio — RPG Combat Runner, Initiative & Dice
import { appStore } from '../state/store';
import { h } from '../ui/dom';
import { icon } from '../ui/icons';
import { rollExpression } from '../engines/dice';

interface Combatant {
  id: string;
  name: string;
  init: number;
  hpCurrent: number;
  hpMax: number;
  ac: number;
  isNpc: boolean;
}

export function renderRpgView(): HTMLElement {
  const world = appStore.getActiveWorld();
  const characters = appStore.getCharactersForWorld(world.id);

  // Default combatants populated from characters
  const combatants: Combatant[] = characters.map((c, idx) => ({
    id: c.id || `pj_${idx}`,
    name: c.identity.name,
    init: Math.floor(Math.random() * 20) + 1 + Math.floor(((c.attributes?.DEX || 10) - 10) / 2),
    hpCurrent: c.rpg_statblock?.hp || 20,
    hpMax: c.rpg_statblock?.max_hp || 20,
    ac: c.rpg_statblock?.ac || 10 + Math.floor(((c.attributes?.DEX || 10) - 10) / 2),
    isNpc: false
  }));

  combatants.sort((a, b) => b.init - a.init);
  let activeTurnIndex = 0;

  const container = h('div', { class: 'rpg-view', style: 'padding:24px; display:flex; flex-direction:column; gap:20px; overflow-y:auto; height:100%;' }, [
    h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, [
      h('div', {}, [
        h('h1', { style: 'font-size:20px; font-weight:700; display:flex; align-items:center; gap:8px;' }, [
          icon('sword', 20),
          document.createTextNode('Mesa TTRPG & Rastreador de Iniciativa')
        ]),
        h('p', { class: 'text-muted text-sm', style: 'margin-top:4px;' }, [
          'Gestiona combates, turnos, dados en vivo y daño en tiempo real para mesa o narrativa.'
        ])
      ]),
      h('div', { style: 'display:flex; gap:8px;' }, [
        h('button', {
          class: 'btn btn-secondary',
          onclick: () => {
            combatants.forEach((c) => {
              c.init = Math.floor(Math.random() * 20) + 1;
            });
            combatants.sort((a, b) => b.init - a.init);
            activeTurnIndex = 0;
            renderCombatTable();
          }
        }, [icon('refresh-cw', 16), document.createTextNode('Tirar Iniciativas')]),
        h('button', {
          class: 'btn btn-primary',
          onclick: () => {
            activeTurnIndex = (activeTurnIndex + 1) % Math.max(1, combatants.length);
            renderCombatTable();
          }
        }, [icon('play', 16), document.createTextNode('Siguiente Turno')])
      ])
    ])
  ]);

  // Dice Roller bar
  const diceBar = h('div', { style: 'display:flex; gap:8px; align-items:center; background:var(--surface-elevated); padding:12px; border-radius:8px; border:1px solid var(--border-subtle);' }, [
    h('strong', { style: 'font-size:13px;' }, ['Lanzador de Dados:']),
    ...(['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100'] as const).map((dice) => {
      return h('button', {
        class: 'btn btn-secondary btn-sm',
        onclick: () => {
          const res = rollExpression(`1${dice}`);
          if (res.ok && res.record) {
            lastDiceResult.textContent = `1${dice} ➔ ${res.record.total} (tirada: ${res.record.rolls?.join(', ') || res.record.total})`;
          }
        }
      }, [dice.toUpperCase()]);
    }),
    h('span', { id: 'rpg-dice-result', class: 'badge badge-primary', style: 'margin-left:auto; font-size:13px;' }, ['Listo'])
  ]);

  container.appendChild(diceBar);
  const lastDiceResult = diceBar.querySelector('#rpg-dice-result') as HTMLElement;

  // Combatant list
  const combatTableContainer = h('div', { class: 'combat-list', style: 'display:flex; flex-direction:column; gap:8px;' });
  container.appendChild(combatTableContainer);

  function renderCombatTable() {
    combatTableContainer.innerHTML = '';

    combatants.forEach((c, idx) => {
      const isCurrentTurn = idx === activeTurnIndex;
      const row = h('div', {
        style: `display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-radius:8px; background:var(--surface-elevated); border:2px solid ${
          isCurrentTurn ? 'var(--accent-primary, #60a5fa)' : 'var(--border-subtle)'
        };`
      }, [
        h('div', { style: 'display:flex; align-items:center; gap:12px;' }, [
          h('div', { style: `width:32px; height:32px; border-radius:50%; background:${isCurrentTurn ? 'var(--accent-primary)' : 'var(--surface-sunken)'}; color:${isCurrentTurn ? '#000' : 'var(--text-primary)'}; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px;` }, [
            String(c.init)
          ]),
          h('div', {}, [
            h('strong', { style: 'font-size:14px; color:var(--text-primary);' }, [c.name]),
            isCurrentTurn ? h('span', { class: 'badge badge-primary', style: 'margin-left:8px; font-size:10px;' }, ['TURNO ACTUAL']) : null
          ])
        ]),
        h('div', { style: 'display:flex; align-items:center; gap:16px;' }, [
          h('div', { style: 'display:flex; align-items:center; gap:6px;' }, [
            h('span', { class: 'text-muted text-xs' }, ['PV:']),
            h('button', {
              class: 'btn btn-secondary btn-sm',
              onclick: () => { c.hpCurrent = Math.max(0, c.hpCurrent - 1); renderCombatTable(); }
            }, ['-']),
            h('span', { style: 'font-weight:600; font-size:13px; min-width:40px; text-align:center;' }, [`${c.hpCurrent}/${c.hpMax}`]),
            h('button', {
              class: 'btn btn-secondary btn-sm',
              onclick: () => { c.hpCurrent = Math.min(c.hpMax, c.hpCurrent + 1); renderCombatTable(); }
            }, ['+'])
          ]),
          h('div', { style: 'display:flex; align-items:center; gap:6px;' }, [
            h('span', { class: 'text-muted text-xs' }, ['CA:']),
            h('span', { style: 'font-weight:600; font-size:13px;' }, [String(c.ac)])
          ])
        ])
      ]);

      combatTableContainer.appendChild(row);
    });
  }

  renderCombatTable();
  return container;
}
