import {
  getActiveWorld,
  getWorldPJs,
  setActivePj,
  setActiveMap,
  setDocSelection,
  setHomebrewTab,
  setView,
} from '../state/store';
import type { ViewId } from '../types';
import type { Entity } from '../engines/wikilinks';
import { buildEntityIndex } from '../engines/wikilinks';

export function currentIndex(): Entity[] {
  return buildEntityIndex(getActiveWorld(), getWorldPJs());
}

export function goView(view: ViewId): void {
  setView(view);
}

export function openEntity(e: Entity): void {
  switch (e.kind) {
    case 'pj':
      if (e.id) setActivePj(e.id);
      setView('pj');
      break;
    case 'archive':
      if (e.cat && e.id) setDocSelection(e.cat, e.id);
      setView('doc');
      break;
    case 'species':
      setHomebrewTab('species');
      setView('world');
      break;
    case 'map':
      if (e.id) setActiveMap(e.id);
      setView('maps');
      break;
    default:
      setView('world');
  }
}

export function navigateToDoc(cat: string, id: string): void {
  setDocSelection(cat, id);
  setView('doc');
}

export function navigateToPj(id: string): void {
  setActivePj(id);
  setView('pj');
}

