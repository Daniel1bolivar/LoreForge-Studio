import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { createServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relPath), 'utf8'));
}

function collectLeafKeys(obj, prefix = '') {
  const keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys.push(...collectLeafKeys(v, next));
    } else {
      keys.push(next);
    }
  }
  return keys.sort();
}

async function main() {
  const worldSchema = readJson('schemas/world-master.schema.json');
  const pjSchema = readJson('schemas/pj-master.schema.json');

  assert.equal(
    worldSchema.$schema,
    'https://json-schema.org/draft/2020-12/schema',
    'world-master.schema.json must preserve Draft 2020-12'
  );
  assert.equal(
    pjSchema.$schema,
    'https://json-schema.org/draft/2020-12/schema',
    'pj-master.schema.json must preserve Draft 2020-12'
  );

  // (a) Compile schemas with Ajv 2020-12
  const ajv = new Ajv2020({ allErrors: true, allowUnionTypes: true });
  const validateWorld = ajv.compile(worldSchema);
  const validatePJ = ajv.compile(pjSchema);
  console.log('[OK] Compiled world-master.schema.json and pj-master.schema.json');

  const assertWorldValid = (world, label) => {
    const ok = validateWorld(world);
    if (!ok) {
      throw new Error(
        `World validation failed (${label}): ${ajv.errorsText(validateWorld.errors)}`
      );
    }
  };

  const assertPjValid = (pj, label) => {
    const ok = validatePJ(pj);
    if (!ok) {
      throw new Error(
        `PJ validation failed (${label}): ${ajv.errorsText(validatePJ.errors)}`
      );
    }
  };

  // (b) Validate extracted private archive if present
  const privatePath = path.join(
    rootDir,
    'private/la-gema-de-las-almas.worldbuilder.json'
  );
  if (fs.existsSync(privatePath)) {
    const privateEnv = JSON.parse(fs.readFileSync(privatePath, 'utf8'));
    const privateState = privateEnv.state || privateEnv;
    assert.equal(
      privateState.worlds.length,
      1,
      'private archive must contain exactly 1 world'
    );
    assert.equal(
      privateState.pjs.length,
      32,
      'private archive must contain exactly 32 PJs'
    );
    assertWorldValid(privateState.worlds[0], 'private:world_0');
    for (const pj of privateState.pjs) {
      assertPjValid(pj, `private:${pj.identity?.name || pj.id}`);
    }
    console.log(
      '[OK] Validated private/la-gema-de-las-almas.worldbuilder.json (1 world, 32 PJs)'
    );
  } else {
    console.log('[SKIP] private/la-gema-de-las-almas.worldbuilder.json not present');
  }

  // (c) Validate Public Demo World (demoSeed.ts) & defaults.ts via Vite SSR loader
  const viteServer = await createServer({
    root: rootDir,
    logLevel: 'silent',
    server: { middlewareMode: true },
    appType: 'custom',
  });

  try {
    const demoMod = await viteServer.ssrLoadModule('/src/state/demoSeed.ts');
    const demoState = demoMod.buildDemoSeedData();
    assert.equal(demoState.worlds.length, 1, 'demoSeed must have 1 world');
    assert.ok(
      demoState.pjs.length >= 4,
      `demoSeed must have >= 4 PJs (got ${demoState.pjs.length})`
    );
    const demoWorld = demoState.worlds[0];
    assert.equal(demoWorld.id, 'world_oakhaven');
    for (const [modKey, modVal] of Object.entries(demoWorld.modules || {})) {
      assert.equal(
        modVal,
        false,
        `demoWorld.modules.${modKey} must default to false`
      );
    }
    assertWorldValid(demoWorld, 'demoSeed:world_oakhaven');
    for (const pj of demoState.pjs) {
      assertPjValid(pj, `demoSeed:${pj.identity?.name || pj.id}`);
    }
    console.log(
      `[OK] Validated demoSeed (${demoWorld.id}, ${demoState.pjs.length} PJs, all 8 modules OFF)`
    );

    // (d) Validate makeWorld() + makePJ() defaults & invariants
    const defaultsMod = await viteServer.ssrLoadModule('/src/state/defaults.ts');
    const defaultWorld = defaultsMod.makeWorld('Neutral Sample World');
    const defaultPj = defaultsMod.makePJ(defaultWorld.id, 'Neutral Sample PJ');
    assertWorldValid(defaultWorld, 'defaults:makeWorld');
    assertPjValid(defaultPj, 'defaults:makePJ');
    for (const [modKey, modVal] of Object.entries(
      defaultsMod.makeDefaultWorldModules()
    )) {
      assert.equal(modVal, false, `makeDefaultWorldModules().${modKey} must be false`);
    }
    assert.equal(defaultsMod.slugify('Dracónico Antiguo'), 'draconico-antiguo');
    assert.equal(defaultsMod.isValidSlug('common'), false);
    console.log('[OK] Validated defaults (makeWorld, makePJ, modules OFF, slugify)');

    // Also verify store.ts isIntimateActive dual-lock invariant
    const storeMod = await viteServer.ssrLoadModule('/src/state/store.ts');
    assert.equal(
      storeMod.isIntimateActive(
        { ...demoState, explicitMode: true },
        demoWorld
      ),
      false,
      'isIntimateActive must be false when world.modules.intimateModule is false'
    );
    assert.equal(
      storeMod.isIntimateActive(
        { ...demoState, explicitMode: true },
        { ...demoWorld, modules: { ...demoWorld.modules, intimateModule: true } }
      ),
      true,
      'isIntimateActive must be true only when both module and explicitMode are true'
    );
    console.log('[OK] Verified isIntimateActive dual-lock invariant');

    // Verify M1 remediation invariants:
    // 1. Cross-world explicitMode & activeMapId sync
    storeMod.resetToDemoSeed();
    const w1Id = storeMod.getState().activeWorldId;
    storeMod.toggleWorldModule(w1Id, 'intimateModule', true);
    storeMod.setExplicitMode(true);
    assert.equal(storeMod.getState().explicitMode, true);

    const w2Res = storeMod.createWorld('Second World', {
      maps: [
        {
          id: 'map_w2_1',
          name: 'W2 Map',
          level: 'continent',
          image_src: '',
          pins: [],
        },
      ],
    });
    assert.equal(w2Res.ok, true);
    assert.equal(
      storeMod.getState().explicitMode,
      false,
      'createWorld to intimateModule=false world must reset explicitMode'
    );
    assert.equal(
      storeMod.getState().activeMapId,
      'map_w2_1',
      'createWorld must sync activeMapId to new world first map'
    );

    const pjW2Res = storeMod.createPj('W2 Hero', w2Res.data.id);
    assert.equal(pjW2Res.ok, true);
    storeMod.setActiveWorld(w1Id);
    storeMod.setExplicitMode(true);
    assert.equal(storeMod.getState().explicitMode, true);

    storeMod.setActivePj(pjW2Res.data.id);
    assert.equal(
      storeMod.getState().explicitMode,
      false,
      'setActivePj across worlds must reset explicitMode when target world lacks intimateModule'
    );
    assert.equal(storeMod.getState().activeMapId, 'map_w2_1');

    // Switch back to w1, enable explicit, then delete w1 -> falls back to w2 (intimateModule=false)
    storeMod.setActiveWorld(w1Id);
    storeMod.setExplicitMode(true);
    assert.equal(storeMod.getState().explicitMode, true);
    const delRes = storeMod.deleteWorld(w1Id);
    assert.equal(delRes.ok, true);
    assert.equal(
      storeMod.getState().explicitMode,
      false,
      'deleteWorld falling back to intimateModule=false world must reset explicitMode'
    );
    assert.equal(storeMod.getState().activeMapId, 'map_w2_1');

    // normalizeState via replaceProjectState must also clamp explicitMode and sync activeMapId
    storeMod.replaceProjectState({
      activeWorldId: w2Res.data.id,
      activeMapId: 'nonexistent_map',
      explicitMode: true,
      worlds: [w2Res.data],
      pjs: [pjW2Res.data],
    });
    assert.equal(storeMod.getState().explicitMode, false);
    assert.equal(storeMod.getState().activeMapId, 'map_w2_1');

    // 2. Homebrew __proto__ guard & language mutator validation
    storeMod.resetToDemoSeed();
    const demoWId = storeMod.getState().activeWorldId;
    for (const fn of [
      () => storeMod.addHomebrewLanguage(demoWId, '__proto__'),
      () => storeMod.addHomebrewSpecies(demoWId, '__proto__'),
      () => storeMod.addHomebrewTrait(demoWId, '__proto__'),
    ]) {
      const r = fn();
      assert.equal(r.ok, false);
      assert.equal(r.errorKey, 'errors.reservedSlug');
      assert.equal(r.errorParams?.slug, '__proto__');
    }

    const missingMove = storeMod.moveLanguageRarity(demoWId, 'nonexistent-slug', 'rare');
    assert.equal(missingMove.ok, false);
    assert.equal(missingMove.errorKey, 'errors.notFound');

    const missingCommon = storeMod.setCommonLanguage(demoWId, 'nonexistent-slug');
    assert.equal(missingCommon.ok, false);
    assert.equal(missingCommon.errorKey, 'errors.notFound');

    assert.equal(storeMod.addHomebrewLanguage(demoWId, 'Valirio Antiguo', 'rare').ok, true);
    assert.equal(storeMod.setCommonLanguage(demoWId, 'valirio-antiguo').ok, true);
    const updatedWorld = storeMod.getActiveWorld();
    assert.equal(updatedWorld.homebrew.languages.commonLanguage, 'valirio-antiguo');
    assert.equal(updatedWorld.homebrew.languages.rare.includes('valirio-antiguo'), false);
    const buckets = defaultsMod.getLanguageBuckets(updatedWorld.homebrew.languages);
    assert.ok(
      buckets.common.some((l) => l.slug === 'valirio-antiguo'),
      'setCommonLanguage must move registered slug into common bucket'
    );

    // 3. parseProjectEnvelope adversarial rejection
    const persistMod = await viteServer.ssrLoadModule('/src/state/persistence.ts');
    assert.equal(persistMod.parseProjectEnvelope('[1,2,3]'), null);
    assert.equal(
      persistMod.parseProjectEnvelope('{"schema_version":"2.0.0","state":[1,2,3]}'),
      null
    );
    assert.equal(
      persistMod.parseProjectEnvelope('{"schema_version":"2.0.0","state":null}'),
      null
    );
    assert.equal(
      persistMod.parseProjectEnvelope('{"schema_version":"2.0.0","state":{}}'),
      null
    );
    assert.equal(persistMod.parseProjectEnvelope('{}'), null);
    assert.equal(
      persistMod.parseProjectEnvelope('{"schema_version":"2.0.0","state":{"activeWorldId":"w1"}}')
        ?.activeWorldId,
      'w1'
    );
    assert.equal(
      persistMod.parseProjectEnvelope('{"activeWorldId":"w_old"}')?.activeWorldId,
      'w_old'
    );

    // 4. ensurePJDefaults & ensureWorldDefaults null/undefined/prototype hardening
    const pollutedInput = JSON.parse(
      '{"__proto__":{"polluted":true},"identity":null,"psychology":null,"attributes":null,"worldbuilding_101":null}'
    );
    const safePj = defaultsMod.ensurePJDefaults(pollutedInput, 'w1');
    assert.equal(Object.prototype.hasOwnProperty.call(safePj, 'polluted'), false);
    assert.equal(({}).polluted, undefined);
    assert.ok(safePj.identity && typeof safePj.identity.name === 'string');
    assert.ok(safePj.psychology && typeof safePj.psychology.social_mask === 'string');
    assert.ok(safePj.attributes && typeof safePj.attributes.STR === 'number');
    assert.ok(safePj.worldbuilding_101 && Array.isArray(safePj.worldbuilding_101.anchor_props));

    const safeWorld = defaultsMod.ensureWorldDefaults({
      id: 'w_nulls',
      archive: { chapters: null, custom_extra: null },
      modules: { diceRoller: undefined, intimateModule: null },
      homebrew: null,
      internal_laws: null,
      factions: null,
      lore_entries: null,
      relations: null,
      timeline_events: null,
      maps: null,
      scenes_kanban: null,
      folder_notes: null,
      audit: null,
    });
    assert.ok(Array.isArray(safeWorld.archive.chapters));
    assert.equal('custom_extra' in safeWorld.archive, false);
    assert.equal(safeWorld.modules.diceRoller, false);
    assert.equal(safeWorld.modules.intimateModule, false);
    assert.ok(Array.isArray(safeWorld.homebrew.languages.registered));
    assert.ok(Array.isArray(safeWorld.internal_laws));
    assert.ok(safeWorld.folder_notes && !Array.isArray(safeWorld.folder_notes));
    assert.ok(safeWorld.audit && !Array.isArray(safeWorld.audit));
    assertWorldValid(safeWorld, 'defaults:nullHardenedWorld');
    assertPjValid(safePj, 'defaults:nullHardenedPJ');

    console.log('[OK] Verified M1 remediation invariants (sync, guards, envelopes, defaults)');
  } finally {
    await viteServer.close();
  }

  // (e) Validate minimal legacy World & legacy PJ fixtures (without optional LoreForge fields)
  const legacyWorld = {
    id: 'world_legacy_min',
    name: 'Legacy Minimal World',
    genre_tone: 'Low fantasy',
    internal_laws: ['Magic has a price'],
    factions: [{ name: 'Watchers', type: 'Guild', details: 'Border guards' }],
    homebrew: {
      languages: {
        commonLanguage: 'common',
        registered: [{ slug: 'common', label: 'Common' }],
        uncommon: [],
        rare: [],
        secret: [],
        unavailable: [],
      },
      species: [{ slug: 'human', label: 'Human', notes: 'Standard' }],
      traits: [{ slug: 'martial', label: 'Martial', category: 'Combat' }],
    },
  };
  const legacyPj = {
    schema_version: '1.0.0',
    mode: 'sfw',
    identity: {
      name: 'Legacy Hero',
      role_occupation: 'Scout',
      species_lineage: 'Human',
      homeland: 'Borderlands',
    },
    attributes: { STR: 5, DEX: 7, CON: 5, INT: 5, WIS: 6, CHA: 4 },
    worldbuilding_101: {
      core_motivation: 'Survive the winter',
      everyday_life: 'Patrols the ridge',
      off_screen_life: 'Carves wooden tokens',
      personal_history: 'Born in the northern keep',
    },
    psychology: {
      social_mask: 'Quiet tracker',
    },
  };
  assertWorldValid(legacyWorld, 'legacy:minimalWorld');
  assertPjValid(legacyPj, 'legacy:minimalPJ');
  console.log('[OK] Validated backwards-compatible minimal legacy fixtures');

  // (f) Validate i18n parity (es.json & en.json) including errors.notFound
  const esDict = readJson('src/i18n/es.json');
  const enDict = readJson('src/i18n/en.json');
  const esKeys = collectLeafKeys(esDict);
  const enKeys = collectLeafKeys(enDict);
  assert.deepEqual(esKeys, enKeys, 'es.json and en.json must have identical leaf keys');
  assert.ok(
    esKeys.includes('errors.notFound') && enKeys.includes('errors.notFound'),
    'errors.notFound must exist in both es.json and en.json'
  );
  console.log(`[OK] Verified ES/EN i18n parity (${esKeys.length} keys)`);
}

main().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});
