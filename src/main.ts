// LoreForge Studio — Application Entry Point
import './styles/tokens.css';
import './styles/layout.css';
import { initStore, subscribe } from './state/store';

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

// Initial mount
mountApp();
