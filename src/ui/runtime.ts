/**
 * Rendering coordination. Every store mutation notifies subscribers; text inputs
 * edit in place inside `quiet()` so focus is never lost while typing.
 */
let quietDepth = 0;
let chromeRefresher: (() => void) | null = null;
let rerender: (() => void) | null = null;

export function quiet<T>(fn: () => T): T {
  quietDepth += 1;
  try {
    return fn();
  } finally {
    quietDepth -= 1;
  }
}

export function isQuiet(): boolean {
  return quietDepth > 0;
}

export function setChromeRefresher(fn: () => void): void {
  chromeRefresher = fn;
}

export function refreshChrome(): void {
  chromeRefresher?.();
}

export function setRerender(fn: () => void): void {
  rerender = fn;
}

export function rerenderMain(): void {
  rerender?.();
}
