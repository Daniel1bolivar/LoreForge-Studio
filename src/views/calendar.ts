// LoreForge Studio — Fantasy Calendar View
import { h } from '../ui/dom';
import { icon } from '../ui/icons';

export function renderCalendarView(): HTMLElement {
  const months = [
    'Helada Inicial', 'Viento Despierto', 'Sol Alto', 'Cosecha de Ceniza',
    'Eclipse Sombrío', 'Niebla Eterna', 'Lamentos'
  ];
  const daysInMonth = 28;

  let currentMonthIndex = 0;

  const container = h('div', { class: 'calendar-view', style: 'padding:24px; display:flex; flex-direction:column; gap:20px; overflow-y:auto; height:100%;' }, [
    h('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, [
      h('div', {}, [
        h('h1', { style: 'font-size:20px; font-weight:700; display:flex; align-items:center; gap:8px;' }, [
          icon('calendar', 20),
          document.createTextNode('Calendario Fantástico del Mundo')
        ]),
        h('p', { class: 'text-muted text-sm', style: 'margin-top:4px;' }, [
          'Calcula fases lunares, estaciones de tu mundo ficticio y días de festividad.'
        ])
      ]),
      h('div', { style: 'display:flex; align-items:center; gap:8px;' }, [
        h('button', {
          class: 'btn btn-secondary btn-sm',
          onclick: () => {
            currentMonthIndex = (currentMonthIndex - 1 + months.length) % months.length;
            updateMonth();
          }
        }, ['◀ Mes Anterior']),
        h('span', { id: 'cal-month-title', style: 'font-weight:700; font-size:14px; min-width:140px; text-align:center;' }, [months[currentMonthIndex]]),
        h('button', {
          class: 'btn btn-secondary btn-sm',
          onclick: () => {
            currentMonthIndex = (currentMonthIndex + 1) % months.length;
            updateMonth();
          }
        }, ['Mes Siguiente ▶'])
      ])
    ])
  ]);

  const gridContainer = h('div', {
    class: 'calendar-grid',
    style: 'display:grid; grid-template-columns:repeat(7, 1fr); gap:8px; background:var(--surface-sunken); padding:16px; border-radius:12px; border:1px solid var(--border-subtle);'
  });

  function renderGrid() {
    gridContainer.innerHTML = '';
    // Day names
    const dayNames = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'Descanso'];
    dayNames.forEach((d) => {
      gridContainer.appendChild(
        h('div', { style: 'text-align:center; font-weight:600; font-size:12px; color:var(--text-muted); padding:4px;' }, [d])
      );
    });

    // Days 1..28
    for (let i = 1; i <= daysInMonth; i++) {
      const isFullMoon = i === 14;
      const dayBox = h('div', {
        style: `height:70px; background:var(--surface-elevated); border-radius:6px; border:1px solid var(--border-subtle); padding:6px; display:flex; flex-direction:column; justify-content:space-between;`
      }, [
        h('span', { style: 'font-size:12px; font-weight:600;' }, [String(i)]),
        isFullMoon ? h('span', { class: 'badge', style: 'font-size:9px; background:var(--accent-primary); color:#000;' }, ['Plenilunio']) : null
      ]);
      gridContainer.appendChild(dayBox);
    }
  }

  function updateMonth() {
    const titleEl = container.querySelector('#cal-month-title');
    if (titleEl) titleEl.textContent = months[currentMonthIndex];
    renderGrid();
  }

  renderGrid();
  container.appendChild(gridContainer);
  return container;
}
