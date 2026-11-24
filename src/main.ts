// LoreForge Studio — Application Entry Point
import './styles/tokens.css';
import './styles/layout.css';
import { getState, initStore, restoreMasterGemaBook, subscribe } from './state/store';
import { renderAppShell } from './ui/shell';
import {
  applyFontScaleToDom,
  checkAndTrackDataMutation,
  initMobileRuntime,
  markBackupExported,
  resetNavStack,
  restoreCurrentScroll,
  syncNavStackWithState,
} from './ui/mobile';

function mountApp(): void {
  const root = document.getElementById('app');
  if (!root) return;

  const shell = renderAppShell();
  root.replaceChildren(shell);
  applyFontScaleToDom();
  restoreCurrentScroll();
}

// Initialize persistence & store
initStore();
initMobileRuntime();

// Subscribe to state updates for UI reactivity
subscribe(() => {
  checkAndTrackDataMutation();
  syncNavStackWithState();
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
    resetNavStack();
    markBackupExported();
  }
}

// Initial mount and auto-load
mountApp();
autoLoadLocalGema();
