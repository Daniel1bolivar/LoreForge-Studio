import type { PJMaster, TimelineEvent, WorldMaster } from '../types';
import { normalize } from '../ui/dom';
import { buildEntityIndex, resolveEntity } from './wikilinks';

export type Severity = 'error' | 'warn' | 'info';

export interface Issue {
  id: string;
  severity: Severity;
  messageKey: string;
  params: Record<string, string | number>;
  target?: { kind: 'pj' | 'event' | 'faction' | 'language' | 'relation' | 'species'; id: string };
}

export function eventEnd(ev: TimelineEvent): number {
  return ev.order + Math.max(0, ev.duration ?? 0);
}

export function findOverlaps(events: TimelineEvent[]): Array<[TimelineEvent, TimelineEvent]> {
  const byTrack = new Map<string, TimelineEvent[]>();
  for (const ev of events) {
    const list = byTrack.get(ev.track) || [];
    list.push(ev);
    byTrack.set(ev.track, list);
  }
  const pairs: Array<[TimelineEvent, TimelineEvent]> = [];
  for (const list of byTrack.values()) {
    const sorted = [...list].sort((a, b) => a.order - b.order);
    for (let i = 0; i < sorted.length; i += 1) {
      for (let j = i + 1; j < sorted.length; j += 1) {
        const a = sorted[i];
        const b = sorted[j];
        const aEnd = eventEnd(a);
        if (b.order > aEnd || (b.order === aEnd && aEnd > a.order)) break;
        if (b.order === a.order || b.order < aEnd) pairs.push([a, b]);
      }
    }
  }
  return pairs;
}

function deathOrderOf(pj: PJMaster, events: TimelineEvent[]): number | null {
  if (typeof pj.death_order === 'number') return pj.death_order;
  if (pj.death_event_id) {
    const ev = events.find((e) => e.id === pj.death_event_id);
    if (ev) return ev.order;
  }
  return null;
}

export function detectContradictions(world: WorldMaster, pjs: PJMaster[]): Issue[] {
  const issues: Issue[] = [];
  const events = world.timeline_events || [];
  const index = buildEntityIndex(world, pjs);

  for (const pj of pjs) {
    if (pj.status !== 'deceased') continue;
    const dOrder = deathOrderOf(pj, events);
    if (dOrder === null) continue;
    for (const ev of events) {
      if (ev.order > dOrder && ev.character_ids?.includes(pj.id || '')) {
        issues.push({
          id: `dead:${pj.id}:${ev.id}`,
          severity: 'error',
          messageKey: 'contra.deadActing',
          params: { name: pj.identity.name, event: ev.title, date: ev.date_label },
          target: { kind: 'event', id: ev.id },
        });
      }
    }
  }

  const pairs = findOverlaps(events);
  for (const [a, b] of pairs) {
    issues.push({
      id: `overlap:${a.id}:${b.id}`,
      severity: 'warn',
      messageKey: 'contra.overlap',
      params: { a: a.title, b: b.title, track: a.track },
      target: { kind: 'event', id: a.id },
    });
  }

  const pjIds = new Set(pjs.map((p) => p.id));
  const locationIds = new Set((world.archive?.locations || []).map((d) => d.id));
  for (const ev of events) {
    if (ev.location_id && !locationIds.has(ev.location_id)) {
      issues.push({
        id: `evloc:${ev.id}`,
        severity: 'warn',
        messageKey: 'contra.eventLocation',
        params: { event: ev.title },
        target: { kind: 'event', id: ev.id },
      });
    }
    for (const cid of ev.character_ids || []) {
      if (!pjIds.has(cid)) {
        issues.push({
          id: `evchar:${ev.id}:${cid}`,
          severity: 'warn',
          messageKey: 'contra.eventCharacter',
          params: { event: ev.title },
          target: { kind: 'event', id: ev.id },
        });
      }
    }
  }

  for (const f of world.factions || []) {
    const fn = normalize(f.name);
    const usedByPj = pjs.some(
      (p) =>
        normalize(p.identity.deity_creed || '').includes(fn) ||
        normalize(p.identity.role_occupation || '').includes(fn)
    );
    const usedInRelations = (world.relations || []).some((r) => normalize(r.faction_tag || '') === fn);
    const usedInTimeline = events.some(
      (e) => normalize(e.faction_id || '') === fn || normalize(e.track) === fn
    );
    if (!usedByPj && !usedInRelations && !usedInTimeline) {
      issues.push({
        id: `faction:${f.name}`,
        severity: 'warn',
        messageKey: 'contra.orphanFaction',
        params: { name: f.name },
        target: { kind: 'faction', id: f.name },
      });
    }
  }

  const registered = world.homebrew?.languages?.registered || [];
  const known = new Set(registered.flatMap((l) => [normalize(l.label), normalize(l.slug)]));
  const usedLangs = new Set<string>();
  for (const pj of pjs) {
    for (const lang of pj.identity.languages || []) {
      usedLangs.add(normalize(lang));
      if (!known.has(normalize(lang))) {
        issues.push({
          id: `pjlang:${pj.id}:${lang}`,
          severity: 'warn',
          messageKey: 'contra.unknownLanguage',
          params: { name: pj.identity.name, language: lang },
          target: { kind: 'pj', id: pj.id || '' },
        });
      }
    }
    const species = world.homebrew?.species || [];
    if (
      pj.identity.species_lineage &&
      species.length &&
      !species.some((s) => normalize(s.label) === normalize(pj.identity.species_lineage))
    ) {
      issues.push({
        id: `pjspecies:${pj.id}`,
        severity: 'warn',
        messageKey: 'contra.unknownSpecies',
        params: { name: pj.identity.name, species: pj.identity.species_lineage },
        target: { kind: 'pj', id: pj.id || '' },
      });
    }
  }
  const unavailable = new Set(world.homebrew?.languages?.unavailable || []);
  for (const lang of registered) {
    if (unavailable.has(lang.slug)) continue;
    if (!usedLangs.has(normalize(lang.label)) && !usedLangs.has(normalize(lang.slug))) {
      issues.push({
        id: `lang:${lang.slug}`,
        severity: 'info',
        messageKey: 'contra.orphanLanguage',
        params: { language: lang.label },
        target: { kind: 'language', id: lang.slug },
      });
    }
  }

  for (const r of world.relations || []) {
    for (const side of [r.from, r.to]) {
      if (side && !resolveEntity(index, side)) {
        issues.push({
          id: `rel:${r.id}:${side}`,
          severity: 'warn',
          messageKey: 'contra.danglingRelation',
          params: { name: side, relation: r.relation },
          target: { kind: 'relation', id: r.id },
        });
      }
    }
  }

  const order: Record<Severity, number> = { error: 0, warn: 1, info: 2 };
  issues.sort((a, b) => order[a.severity] - order[b.severity]);
  return issues;
}
