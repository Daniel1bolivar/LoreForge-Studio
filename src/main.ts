// LoreForge Studio — Application Entry Point
import './styles/tokens.css';
import './styles/layout.css';
import { appStore, getState, initStore, subscribe } from './state/store';
import { renderAppShell } from './ui/shell';

function mountApp(): void {
  const root = document.getElementById('app');
  if (!root) return;

  const shell = renderAppShell();
  root.replaceChildren(shell);
}

// Initialize persistence & store
initStore();

// Subscribe to state updates for UI reactivity
subscribe(() => {
  mountApp();
});

// Auto-import local novel data if running on dev server and not yet imported
async function autoLoadLocalGema(): Promise<void> {
  const s = getState();
  if (s.worlds.some((w) => w.id === 'world_gema')) return;
  try {
    const res = await fetch('/api/local-gema');
    if (res.ok) {
      const data = await res.json();
      if (data && data.state && Array.isArray(data.state.worlds)) {
        const gWorld = data.state.worlds[0];
        const gPjs = data.state.pjs || [];
        appStore.mutate((state) => {
          if (!state.worlds.some((w) => w.id === gWorld.id)) {
            state.worlds.unshift(gWorld);
          }
          for (const p of gPjs) {
            if (!state.pjs.some((x) => x.id === p.id)) {
              state.pjs.push(p);
            }
          }
          state.activeWorldId = gWorld.id;
          state.activePjId = gPjs[0]?.id || '';
          state.theme = 'cyberpunk';
        });
      }
    }
  } catch (err) {
    // Ignore in static distribution
  }
}

// Initial mount and auto-load
mountApp();
autoLoadLocalGema();
