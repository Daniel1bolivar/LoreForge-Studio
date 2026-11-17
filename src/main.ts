// LoreForge Studio — Application Entry Point
import './styles/tokens.css';
import './styles/layout.css';
import { getState, initStore, restoreMasterGemaBook, subscribe } from './state/store';
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

// Auto-import / repair local novel data from private backup
async function autoLoadLocalGema(): Promise<void> {
  const s = getState();
  const existingWorld = s.worlds.find((w) => w.id === 'world_gema');
  const existingPjCount = s.pjs.filter((p) => p.worldId === 'world_gema').length;
  // If world_gema is missing or was corrupted / characters deleted (< 32), restore it
  if (!existingWorld || existingPjCount < 32) {
    await restoreMasterGemaBook();
  }
}

// Initial mount and auto-load
mountApp();
autoLoadLocalGema();
