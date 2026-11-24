import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import {
  appStore,
  getState,
  setActiveMap,
  setActivePj,
  setActiveWorld,
  setDocSelection,
  setGalleryCategory,
  setView,
} from '../state/store';
import type { ArchiveCategoryKey, ViewId } from '../types';
import { h, toast } from './dom';

export type FontScale = 'normal' | 'large' | 'extra';

export interface NavEntry {
  view: ViewId;
  worldId: string;
  pjId: string;
  docCat: string;
  docId: string;
  mapId: string;
  galleryCat: string;
}

const MAX_HISTORY_ENTRIES = 30;
const DOUBLE_BACK_WINDOW_MS = 2000;
const KEY_FONT_SCALE = 'lf_font_scale';
const KEY_LEGACY_SENIOR = 'lf_a11y_senior';
const KEY_KEEP_AWAKE = 'lf_keep_awake';
const KEY_LAST_MUTATION = 'lf_last_mutation_at';
const KEY_LAST_EXPORT = 'lf_last_export_at';

const navStack: NavEntry[] = [];
const scrollPositions = new Map<string, number>();

let initialized = false;
let isRestoringHistory = false;
let lastBackTapAt = 0;
let dirtyFocusedEl: HTMLInputElement | HTMLTextAreaElement | null = null;
let dirtyInitialValue = '';
let drawerIsOpenFn: (() => boolean) | null = null;
let drawerCloseFn: (() => void) | null = null;
let wakeLockSentinel: { release: () => Promise<void> } | null = null;
let lastKnownDataHash = '';

function safeStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, val: string): void {
  try {
    localStorage.setItem(key, val);
  } catch {
    // Ignore storage quota or private mode restrictions
  }
}

export function entryKey(e: NavEntry): string {
  return [
    e.worldId,
    e.view,
    e.view === 'pj' ? e.pjId : '',
    e.view === 'doc' ? `${e.docCat}:${e.docId}` : '',
    e.view === 'maps' ? e.mapId : '',
    e.view === 'gallery' ? e.galleryCat : '',
  ].join('|');
}

export function snapshotCurrentNav(): NavEntry {
  const s = getState();
  return {
    view: s.activeView,
    worldId: s.activeWorldId,
    pjId: s.activePjId,
    docCat: s.activeDocCat,
    docId: s.activeDocId,
    mapId: s.activeMapId,
    galleryCat: s.activeGalleryCat,
  };
}

function getMainScrollContainer(): HTMLElement | null {
  const mainPane = document.querySelector<HTMLElement>('.lf-main-pane');
  if (!mainPane) return null;
  const firstChild = mainPane.firstElementChild as HTMLElement | null;
  if (firstChild && firstChild.scrollHeight > firstChild.clientHeight + 4) {
    return firstChild;
  }
  return mainPane;
}

export function captureCurrentScroll(): void {
  if (navStack.length === 0) return;
  const top = navStack[navStack.length - 1];
  const scroller = getMainScrollContainer();
  if (!scroller) return;
  scrollPositions.set(entryKey(top), scroller.scrollTop);
}

export function restoreCurrentScroll(): void {
  if (navStack.length === 0) return;
  const top = navStack[navStack.length - 1];
  const saved = scrollPositions.get(entryKey(top));
  if (saved === undefined || saved <= 0) return;
  requestAnimationFrame(() => {
    const scroller = getMainScrollContainer();
    if (scroller) scroller.scrollTop = saved;
  });
}

export function registerDrawerController(isOpen: () => boolean, close: () => void): void {
  drawerIsOpenFn = isOpen;
  drawerCloseFn = close;
}

export function getNavStackLength(): number {
  return navStack.length;
}

export function resetNavStack(): void {
  const current = snapshotCurrentNav();
  navStack.length = 0;
  navStack.push(current);
  try {
    window.history.replaceState({ lfNavKey: entryKey(current), lfDepth: 0 }, '');
  } catch {
    // Ignore history API restrictions
  }
}

export function syncNavStackWithState(): void {
  if (isRestoringHistory) return;
  const current = snapshotCurrentNav();
  const currentKey = entryKey(current);

  if (navStack.length === 0) {
    navStack.push(current);
    try {
      window.history.replaceState({ lfNavKey: currentKey, lfDepth: 0 }, '');
    } catch {
      // Ignore history API restrictions in opaque origins
    }
    return;
  }

  const top = navStack[navStack.length - 1];
  if (entryKey(top) === currentKey) return;

  captureCurrentScroll();
  navStack.push(current);
  if (navStack.length > MAX_HISTORY_ENTRIES) {
    navStack.shift();
  }

  try {
    window.history.pushState({ lfNavKey: currentKey, lfDepth: navStack.length - 1 }, '');
  } catch {
    // Ignore history API restrictions
  }
}

function applyNavEntry(entry: NavEntry): void {
  isRestoringHistory = true;
  try {
    const s = getState();
    if (entry.worldId && entry.worldId !== s.activeWorldId) {
      setActiveWorld(entry.worldId);
    }
    if (entry.view === 'pj' && entry.pjId) {
      setActivePj(entry.pjId);
    } else if (entry.view === 'doc' && entry.docCat && entry.docId) {
      setDocSelection(entry.docCat as ArchiveCategoryKey, entry.docId);
    } else if (entry.view === 'maps' && entry.mapId) {
      setActiveMap(entry.mapId);
    } else if (entry.view === 'gallery' && entry.galleryCat) {
      setGalleryCategory(entry.galleryCat);
    }
    setView(entry.view);
  } finally {
    isRestoringHistory = false;
  }
  restoreCurrentScroll();
}

export function goBackInApp(): boolean {
  if (navStack.length > 1) {
    captureCurrentScroll();
    navStack.pop();
    const prev = navStack[navStack.length - 1];
    applyNavEntry(prev);
    void triggerHaptic('light');
    return true;
  }

  const current = snapshotCurrentNav();
  if (current.view !== 'dashboard') {
    captureCurrentScroll();
    const dashEntry: NavEntry = { ...current, view: 'dashboard' };
    navStack.length = 0;
    navStack.push(dashEntry);
    applyNavEntry(dashEntry);
    void triggerHaptic('light');
    return true;
  }

  return false;
}

export function flushFocusedEditable(): void {
  const active = document.activeElement;
  if (
    active instanceof HTMLInputElement ||
    active instanceof HTMLTextAreaElement ||
    active instanceof HTMLSelectElement
  ) {
    active.dispatchEvent(new Event('change', { bubbles: true }));
    active.blur();
  }
  dirtyFocusedEl = null;
  dirtyInitialValue = '';
}

export function hasUnsavedEditingChanges(): boolean {
  if (!dirtyFocusedEl || !document.contains(dirtyFocusedEl)) {
    dirtyFocusedEl = null;
    return false;
  }
  return dirtyFocusedEl.value !== dirtyInitialValue;
}

function closeConfirmModal(): void {
  document.getElementById('lf-confirm-modal')?.remove();
}

function openConfirmModal(opts: {
  title: string;
  message: string;
  primaryLabel: string;
  secondaryLabel: string;
  cancelLabel?: string;
  onPrimary: () => void;
  onSecondary: () => void;
}): void {
  closeConfirmModal();
  const backdrop = h(
    'div',
    {
      id: 'lf-confirm-modal',
      class: 'lf-confirm-backdrop',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'lf-confirm-title',
    },
    [
      h('div', { class: 'lf-confirm-card' }, [
        h('h3', { id: 'lf-confirm-title', class: 'lf-confirm-title' }, [opts.title]),
        h('p', { class: 'lf-confirm-msg' }, [opts.message]),
        h('div', { class: 'lf-confirm-actions' }, [
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn-primary',
              onclick: () => {
                closeConfirmModal();
                opts.onPrimary();
              },
            },
            [opts.primaryLabel]
          ),
          h(
            'button',
            {
              type: 'button',
              class: 'btn btn-secondary',
              onclick: () => {
                closeConfirmModal();
                opts.onSecondary();
              },
            },
            [opts.secondaryLabel]
          ),
          opts.cancelLabel
            ? h(
                'button',
                {
                  type: 'button',
                  class: 'btn btn-secondary',
                  onclick: () => closeConfirmModal(),
                },
                [opts.cancelLabel]
              )
            : null,
        ]),
      ]),
    ]
  );

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeConfirmModal();
  });

  document.body.appendChild(backdrop);
}

export async function exportQuickJsonBackup(): Promise<void> {
  const s = getState();
  const world = appStore.getActiveWorld();
  const characters = appStore.getCharactersForWorld(world.id);
  const activePj = appStore.getActivePj();
  const envelope = {
    schema_version: '2.0.0',
    saved_at: new Date().toISOString(),
    state: {
      theme: s.theme,
      rpgMode: s.rpgMode,
      explicitMode: s.explicitMode,
      activeWorldId: world.id,
      activePjId: activePj?.id || characters[0]?.id || '',
      worlds: s.worlds,
      pjs: s.pjs,
    },
  };
  const slug =
    world.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'loreforge';
  await shareOrDownloadText(
    JSON.stringify(envelope, null, 2),
    `${slug}-backup.worldbuilder.json`,
    'application/json',
    `Respaldo ${world.name}`
  );
  markBackupExported();
}

export function handleBackNavigation(): boolean {
  // 1. Close confirmation modal if open
  const confirmEl = document.getElementById('lf-confirm-modal');
  if (confirmEl) {
    confirmEl.remove();
    return true;
  }

  // 2. Close Command Palette if open
  const paletteEl = document.getElementById('lf-command-palette');
  if (paletteEl) {
    paletteEl.remove();
    void triggerHaptic('light');
    return true;
  }

  // 3. Close any generic open dialog/modal overlay
  const openModal = document.querySelector<HTMLElement>('.modal-backdrop, .lf-modal-overlay');
  if (openModal) {
    openModal.remove();
    void triggerHaptic('light');
    return true;
  }

  // 4. Close mobile sidebar drawer if open
  if (drawerIsOpenFn?.()) {
    drawerCloseFn?.();
    void triggerHaptic('light');
    return true;
  }

  // 5. Guard uncommitted text edits in focused field
  if (hasUnsavedEditingChanges()) {
    void triggerHaptic('warning');
    openConfirmModal({
      title: 'Cambios pendientes',
      message: 'Tienes texto sin confirmar en el campo actual. ¿Quieres guardarlo antes de volver?',
      primaryLabel: 'Guardar y volver',
      secondaryLabel: 'Descartar cambios',
      cancelLabel: 'Seguir editando',
      onPrimary: () => {
        flushFocusedEditable();
        goBackInApp();
      },
      onSecondary: () => {
        if (dirtyFocusedEl) {
          dirtyFocusedEl.value = dirtyInitialValue;
          dirtyFocusedEl.blur();
        }
        dirtyFocusedEl = null;
        dirtyInitialValue = '';
        goBackInApp();
      },
    });
    return true;
  }

  // 6. Pop internal view/entity history stack
  if (goBackInApp()) {
    return true;
  }

  // 7. On root Dashboard: check pending backup before exiting
  if (hasPendingBackup()) {
    void triggerHaptic('warning');
    openConfirmModal({
      title: 'Respaldo pendiente',
      message: 'Realizaste cambios desde tu último respaldo exportado. ¿Deseas exportar antes de salir?',
      primaryLabel: 'Exportar respaldo ahora',
      secondaryLabel: 'Salir sin respaldar',
      cancelLabel: 'Cancelar',
      onPrimary: () => {
        void exportQuickJsonBackup();
      },
      onSecondary: () => {
        exitAppSafe();
      },
    });
    return true;
  }

  // 8. Double-tap to exit on root Dashboard
  const now = Date.now();
  if (now - lastBackTapAt < DOUBLE_BACK_WINDOW_MS) {
    lastBackTapAt = 0;
    exitAppSafe();
    return false;
  }

  lastBackTapAt = now;
  void triggerHaptic('light');
  toast('Presiona Atrás otra vez para salir');
  return true;
}

function exitAppSafe(): void {
  if (Capacitor.isNativePlatform()) {
    void CapApp.exitApp();
  } else {
    toast('Salida confirmada (en Android cerraría la app)');
  }
}

// --- Haptics ---
export async function triggerHaptic(
  kind: 'light' | 'medium' | 'warning' | 'success' = 'light'
): Promise<void> {
  try {
    if (Capacitor.isNativePlatform()) {
      if (kind === 'light') {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if (kind === 'medium') {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if (kind === 'warning') {
        await Haptics.notification({ type: NotificationType.Warning });
      } else {
        await Haptics.notification({ type: NotificationType.Success });
      }
      return;
    }
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(kind === 'warning' ? [20, 40, 20] : 12);
    }
  } catch {
    // Ignore haptic failures on unsupported hardware
  }
}

// --- Reading Font Scale ---
export function getFontScale(): FontScale {
  const saved = safeStorageGet(KEY_FONT_SCALE);
  if (saved === 'normal' || saved === 'large' || saved === 'extra') return saved;
  if (safeStorageGet(KEY_LEGACY_SENIOR) === '1') return 'extra';
  return 'normal';
}

export function setFontScale(scale: FontScale): void {
  safeStorageSet(KEY_FONT_SCALE, scale);
  safeStorageSet(KEY_LEGACY_SENIOR, scale === 'extra' ? '1' : '0');
  applyFontScaleToDom(scale);
  void triggerHaptic('light');
}

export function cycleFontScale(): FontScale {
  const current = getFontScale();
  const next: FontScale =
    current === 'normal' ? 'large' : current === 'large' ? 'extra' : 'normal';
  setFontScale(next);
  const label =
    next === 'normal'
      ? 'Texto Normal'
      : next === 'large'
        ? 'Texto Grande'
        : 'Texto Extra (+60)';
  toast(`Escala de lectura: ${label}`);
  return next;
}

export function applyFontScaleToDom(scale: FontScale = getFontScale()): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.fontScale = scale;
  const workspace = document.querySelector<HTMLElement>('.lf-workspace');
  if (workspace) {
    workspace.dataset.fontScale = scale;
    if (scale === 'extra') {
      workspace.setAttribute('data-a11y', 'senior');
    } else {
      workspace.removeAttribute('data-a11y');
    }
  }
}

// --- Wake Lock (Keep Screen Awake) ---
export function isKeepAwakeEnabled(): boolean {
  return safeStorageGet(KEY_KEEP_AWAKE) === '1';
}

async function acquireWakeLock(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  const nav = navigator as Navigator & {
    wakeLock?: { request: (type: 'screen') => Promise<{ release: () => Promise<void> }> };
  };
  if (!nav.wakeLock) return false;
  try {
    if (wakeLockSentinel) return true;
    wakeLockSentinel = await nav.wakeLock.request('screen');
    return true;
  } catch {
    return false;
  }
}

async function releaseWakeLock(): Promise<void> {
  if (!wakeLockSentinel) return;
  try {
    await wakeLockSentinel.release();
  } catch {
    // Ignore release errors
  } finally {
    wakeLockSentinel = null;
  }
}

export async function toggleKeepAwake(): Promise<boolean> {
  const next = !isKeepAwakeEnabled();
  safeStorageSet(KEY_KEEP_AWAKE, next ? '1' : '0');
  if (next) {
    const acquired = await acquireWakeLock();
    void triggerHaptic('light');
    toast(
      acquired
        ? 'Pantalla activa activada (no se apagará al leer)'
        : 'Pantalla activa guardada (el navegador no soporta Wake Lock)'
    );
  } else {
    await releaseWakeLock();
    void triggerHaptic('light');
    toast('Pantalla activa desactivada');
  }
  return next;
}

// --- Backup Dirty Tracking ---
function computeDataFingerprint(): string {
  const s = getState();
  return `${s.worlds.length}:${s.pjs.length}:${JSON.stringify(s.worlds).length}:${JSON.stringify(s.pjs).length}`;
}

export function checkAndTrackDataMutation(): void {
  const fp = computeDataFingerprint();
  if (!lastKnownDataHash) {
    lastKnownDataHash = fp;
    return;
  }
  if (fp !== lastKnownDataHash) {
    lastKnownDataHash = fp;
    safeStorageSet(KEY_LAST_MUTATION, String(Date.now()));
  }
}

export function markBackupExported(): void {
  safeStorageSet(KEY_LAST_EXPORT, String(Date.now()));
  document.querySelectorAll('.lf-backup-dot').forEach((el) => el.classList.add('hidden'));
}

export function hasPendingBackup(): boolean {
  const mut = Number(safeStorageGet(KEY_LAST_MUTATION) || '0');
  const exp = Number(safeStorageGet(KEY_LAST_EXPORT) || '0');
  return mut > 0 && mut > exp;
}

// --- Native Share / Export with Web Fallback ---
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function browserDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function shareOrDownloadText(
  content: string,
  filename: string,
  mime: string,
  title = filename
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const writeRes = await Filesystem.writeFile({
        path: filename,
        data: content,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      await Share.share({
        title,
        url: writeRes.uri,
        dialogTitle: `Compartir ${filename}`,
      });
      void triggerHaptic('success');
      return;
    } catch {
      // Fallback to browser download if share was unavailable
    }
  }
  browserDownload(filename, new Blob([content], { type: mime }));
  void triggerHaptic('success');
}

export async function shareOrDownloadBlob(
  blob: Blob,
  filename: string,
  title = filename
): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const base64 = await blobToBase64(blob);
      const writeRes = await Filesystem.writeFile({
        path: filename,
        data: base64,
        directory: Directory.Cache,
      });
      await Share.share({
        title,
        url: writeRes.uri,
        dialogTitle: `Compartir ${filename}`,
      });
      void triggerHaptic('success');
      return;
    } catch {
      // Fallback to browser download
    }
  }
  browserDownload(filename, blob);
  void triggerHaptic('success');
}

// --- Bootstrap ---
export function initMobileRuntime(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  applyFontScaleToDom();
  syncNavStackWithState();
  lastKnownDataHash = computeDataFingerprint();

  if (isKeepAwakeEnabled()) {
    void acquireWakeLock();
  }

  // Track dirty state of focused text fields
  document.addEventListener('focusin', (e) => {
    const target = e.target;
    if (
      target instanceof HTMLInputElement &&
      target.type !== 'checkbox' &&
      target.type !== 'radio' &&
      target.type !== 'file'
    ) {
      dirtyFocusedEl = target;
      dirtyInitialValue = target.value;
    } else if (target instanceof HTMLTextAreaElement) {
      dirtyFocusedEl = target;
      dirtyInitialValue = target.value;
    }
  });

  document.addEventListener('focusout', (e) => {
    if (e.target === dirtyFocusedEl) {
      dirtyFocusedEl = null;
      dirtyInitialValue = '';
    }
  });

  // Sync browser / WebView back button via History API
  window.addEventListener('popstate', () => {
    if (isRestoringHistory) return;
    handleBackNavigation();
  });

  // Re-acquire Wake Lock when returning to foreground
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isKeepAwakeEnabled()) {
      void acquireWakeLock();
    } else if (document.visibilityState === 'hidden') {
      flushFocusedEditable();
    }
  });

  // Native Capacitor Android listeners
  if (Capacitor.isNativePlatform()) {
    void CapApp.addListener('backButton', () => {
      handleBackNavigation();
    });

    void CapApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) {
        flushFocusedEditable();
        void releaseWakeLock();
      } else if (isKeepAwakeEnabled()) {
        void acquireWakeLock();
      }
    });
  }

  // Expose deterministic test hook for Playwright / debugging
  (window as unknown as Record<string, unknown>).__lfMobile = {
    handleBack: handleBackNavigation,
    getStackLength: getNavStackLength,
    hasPendingBackup,
    markBackupExported,
  };
}
