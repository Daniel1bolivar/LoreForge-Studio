import type { AppState, ProjectFileEnvelope } from '../types';
import { STORAGE_KEY } from './defaults';

export const HANDLES_DB_NAME = 'worldbuilder_handles_db';
export const HANDLES_STORE = 'handles';
export const HANDLES_KEY = 'project_file';

export const ASSETS_DB_NAME = 'worldbuilder_assets_db';
export const ASSETS_STORE = 'assets';

export const PROJECT_SCHEMA_VERSION = '2.0.0' as const;
export const FILE_WRITE_DEBOUNCE_MS = 350;

export type FileLinkStatus = 'linked' | 'needs-permission' | 'unlinked';

export interface FileLinkResult {
  ok: boolean;
  fileName?: string;
  cancelled?: boolean;
  fallbackUsed?: boolean;
  errorKey?: string;
}

export interface FileOpenResult {
  state?: Partial<AppState>;
  fileName?: string;
  cancelled?: boolean;
  fallbackNeeded?: boolean;
  errorKey?: string;
}

interface FSFileHandleLike {
  name: string;
  queryPermission(desc: { mode: 'read' | 'readwrite' }): Promise<'granted' | 'denied' | 'prompt'>;
  requestPermission(desc: { mode: 'read' | 'readwrite' }): Promise<'granted' | 'denied' | 'prompt'>;
  getFile(): Promise<File>;
  createWritable(): Promise<{
    write(data: string): Promise<void>;
    close(): Promise<void>;
  }>;
}

interface WindowWithFS extends Window {
  showSaveFilePicker?: (opts: unknown) => Promise<FSFileHandleLike>;
  showOpenFilePicker?: (opts: unknown) => Promise<FSFileHandleLike[]>;
}

let cachedFileHandle: FSFileHandleLike | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;

function hasWindow(): boolean {
  return typeof window !== 'undefined';
}

function hasIDB(): boolean {
  return typeof indexedDB !== 'undefined';
}

export function loadFromLocalStorage(): Partial<AppState> | null {
  if (!hasWindow() || typeof window.localStorage === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Partial<AppState>)
      : null;
  } catch {
    return null;
  }
}

export function saveToLocalStorage(state: AppState): boolean {
  if (!hasWindow() || typeof window.localStorage === 'undefined') return true;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

function openDB(name: string, storeName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIDB()) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open error'));
  });
}

export function openHandleDB(): Promise<IDBDatabase> {
  return openDB(HANDLES_DB_NAME, HANDLES_STORE);
}

export async function saveStoredHandle(handle: FSFileHandleLike): Promise<void> {
  if (!hasIDB()) return;
  const db = await openHandleDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(HANDLES_STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
      tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction error'));
      tx.objectStore(HANDLES_STORE).put(handle, HANDLES_KEY);
    });
  } finally {
    db.close();
  }
}

export async function loadStoredHandle(): Promise<FSFileHandleLike | null> {
  if (!hasIDB()) return null;
  let db: IDBDatabase | null = null;
  try {
    db = await openHandleDB();
    const activeDb = db;
    return await new Promise<FSFileHandleLike | null>((resolve) => {
      let result: FSFileHandleLike | null = null;
      const tx = activeDb.transaction(HANDLES_STORE, 'readonly');
      const req = tx.objectStore(HANDLES_STORE).get(HANDLES_KEY);
      req.onsuccess = () => {
        result = (req.result as FSFileHandleLike) || null;
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => resolve(null);
      tx.onerror = () => resolve(null);
    });
  } catch {
    return null;
  } finally {
    db?.close();
  }
}

export async function initProjectFileHandle(
  onStatus?: (status: FileLinkStatus, fileName?: string) => void
): Promise<FSFileHandleLike | null> {
  const handle = await loadStoredHandle();
  if (!handle) {
    onStatus?.('unlinked');
    return null;
  }
  cachedFileHandle = handle;
  try {
    const perm = await handle.queryPermission({ mode: 'readwrite' });
    if (perm === 'granted') {
      onStatus?.('linked', handle.name);
    } else {
      onStatus?.('needs-permission', handle.name);
    }
  } catch {
    onStatus?.('needs-permission', handle.name);
  }
  return handle;
}

export function buildProjectEnvelope(state: AppState): ProjectFileEnvelope {
  return {
    schema_version: PROJECT_SCHEMA_VERSION,
    saved_at: new Date().toISOString(),
    state,
  };
}

function hasExpectedAppStateField(obj: Record<string, unknown>): boolean {
  return (
    'worlds' in obj ||
    'activeWorldId' in obj ||
    'pjs' in obj ||
    'theme' in obj ||
    'activeView' in obj
  );
}

export function parseProjectEnvelope(rawJson: string): Partial<AppState> | null {
  try {
    const parsed = JSON.parse(rawJson) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return null;
    }
    const rec = parsed as Record<string, unknown>;
    if ('state' in rec) {
      const inner = rec.state;
      if (!inner || typeof inner !== 'object' || Array.isArray(inner)) {
        return null;
      }
      const innerRec = inner as Record<string, unknown>;
      return hasExpectedAppStateField(innerRec)
        ? (innerRec as Partial<AppState>)
        : null;
    }
    return hasExpectedAppStateField(rec) ? (rec as Partial<AppState>) : null;
  } catch {
    return null;
  }
}

export async function writeProjectFile(
  state: AppState,
  askPerm: boolean
): Promise<{ ok: boolean; fileName?: string; needsReconnect?: boolean }> {
  if (!cachedFileHandle) {
    return { ok: false };
  }
  try {
    let perm = await cachedFileHandle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted' && askPerm) {
      perm = await cachedFileHandle.requestPermission({ mode: 'readwrite' });
    }
    if (perm !== 'granted') {
      return { ok: false, fileName: cachedFileHandle.name, needsReconnect: true };
    }
    const writable = await cachedFileHandle.createWritable();
    await writable.write(JSON.stringify(buildProjectEnvelope(state), null, 2));
    await writable.close();
    return { ok: true, fileName: cachedFileHandle.name };
  } catch {
    return { ok: false, fileName: cachedFileHandle?.name, needsReconnect: true };
  }
}

export function scheduleProjectFileWrite(
  getState: () => AppState,
  onStatus?: (status: FileLinkStatus, fileName?: string) => void
): void {
  if (!hasWindow() || !cachedFileHandle) return;
  if (writeTimer !== null) clearTimeout(writeTimer);
  writeTimer = setTimeout(async () => {
    const res = await writeProjectFile(getState(), false);
    if (res.ok) {
      onStatus?.('linked', res.fileName);
    } else if (res.needsReconnect) {
      onStatus?.('needs-permission', res.fileName);
    }
  }, FILE_WRITE_DEBOUNCE_MS);
}

export function downloadTextFile(
  filename: string,
  content: string | Blob,
  mime = 'application/json'
): void {
  if (!hasWindow() || typeof document === 'undefined') return;
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function linkOrSaveProjectFile(
  state: AppState,
  filename = 'proyecto.worldbuilder.json'
): Promise<FileLinkResult> {
  if (!hasWindow()) return { ok: false };
  const w = window as WindowWithFS;
  if (typeof w.showSaveFilePicker === 'function') {
    try {
      const handle = await w.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'LoreForge / Worldbuilder Project JSON',
            accept: { 'application/json': ['.worldbuilder.json', '.json'] },
          },
        ],
      });
      cachedFileHandle = handle;
      await saveStoredHandle(handle);
      const res = await writeProjectFile(state, true);
      return { ok: res.ok, fileName: handle.name };
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') {
        return { ok: false, cancelled: true };
      }
    }
  }
  downloadTextFile(
    filename,
    JSON.stringify(buildProjectEnvelope(state), null, 2),
    'application/json'
  );
  return { ok: true, fileName: filename, fallbackUsed: true };
}

export async function openProjectFile(): Promise<FileOpenResult> {
  if (!hasWindow()) return { fallbackNeeded: true };
  const w = window as WindowWithFS;
  if (typeof w.showOpenFilePicker !== 'function') {
    return { fallbackNeeded: true };
  }
  try {
    const [handle] = await w.showOpenFilePicker({
      multiple: false,
      types: [
        {
          description: 'LoreForge / Worldbuilder Project JSON',
          accept: { 'application/json': ['.worldbuilder.json', '.json'] },
        },
      ],
    });
    if (!handle) return { cancelled: true };
    const file = await handle.getFile();
    const raw = await file.text();
    const parsed = parseProjectEnvelope(raw);
    if (!parsed) return { errorKey: 'errors.invalidJson' };
    cachedFileHandle = handle;
    await saveStoredHandle(handle);
    return { state: parsed, fileName: handle.name };
  } catch (err) {
    if ((err as { name?: string })?.name === 'AbortError') {
      return { cancelled: true };
    }
    return { errorKey: 'errors.fileReadError' };
  }
}

export async function saveMapAsset(
  assetId: string,
  dataUrlOrBlob: string | Blob
): Promise<void> {
  if (!hasIDB()) return;
  const db = await openDB(ASSETS_DB_NAME, ASSETS_STORE);
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ASSETS_STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
      tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction error'));
      tx.objectStore(ASSETS_STORE).put(dataUrlOrBlob, assetId);
    });
  } finally {
    db.close();
  }
}

export async function loadMapAsset(
  assetId: string
): Promise<string | Blob | null> {
  if (!hasIDB()) return null;
  let db: IDBDatabase | null = null;
  try {
    db = await openDB(ASSETS_DB_NAME, ASSETS_STORE);
    const activeDb = db;
    return await new Promise<string | Blob | null>((resolve) => {
      let result: string | Blob | null = null;
      const tx = activeDb.transaction(ASSETS_STORE, 'readonly');
      const req = tx.objectStore(ASSETS_STORE).get(assetId);
      req.onsuccess = () => {
        result = (req.result as string | Blob) || null;
      };
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => resolve(null);
      tx.onerror = () => resolve(null);
    });
  } catch {
    return null;
  } finally {
    db?.close();
  }
}

export async function deleteMapAsset(assetId: string): Promise<void> {
  if (!hasIDB()) return;
  let db: IDBDatabase | null = null;
  try {
    db = await openDB(ASSETS_DB_NAME, ASSETS_STORE);
    const activeDb = db;
    await new Promise<void>((resolve) => {
      const tx = activeDb.transaction(ASSETS_STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onabort = () => resolve();
      tx.onerror = () => resolve();
      tx.objectStore(ASSETS_STORE).delete(assetId);
    });
  } catch {
    // ignore cleanup failures
  } finally {
    db?.close();
  }
}
