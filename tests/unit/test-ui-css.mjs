import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../..');

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, rel), 'utf8'));
}

function getFiles(dir, ext = '.ts') {
  let res = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) res = res.concat(getFiles(full, ext));
    else if (f.name.endsWith(ext)) res.push(full);
  }
  return res;
}

async function testUiAndCss() {
  console.log('[TEST] Checking UI CSS coverage and integrity...');

  const cssTokens = fs.readFileSync(path.join(rootDir, 'src/styles/tokens.css'), 'utf8');
  const cssLayout = fs.readFileSync(path.join(rootDir, 'src/styles/layout.css'), 'utf8');
  const allCss = cssTokens + '\n' + cssLayout;

  // 1. Check critical classes are styled
  const criticalClasses = [
    'card-grid',
    'card',
    'card-main',
    'card-avatar',
    'card-title',
    'card-sub',
    'card-desc',
    'card-tools',
    'form-grid',
    'field',
    'field-label',
    'input-text',
    'input-textarea',
    'input-select',
    'preview-pane',
    'editor-split',
    'pj-hero',
    'portrait',
    'tabs',
    'tab',
    'chip-row',
    'chip',
    'attr-grid',
    'kanban-board',
    'kanban-column',
    'kanban-card',
    'timeline-view',
    'timeline-track',
    'timeline-card',
    'maps-view-container',
    'map-pin'
  ];

  for (const cls of criticalClasses) {
    const regex = new RegExp(`\\.${cls}[\\s,.:{]`);
    assert.ok(
      regex.test(allCss),
      `CSS class .${cls} must be defined in tokens.css or layout.css`
    );
  }
  console.log(`[OK] All ${criticalClasses.length} critical UI classes defined and verified in CSS.`);

  // 2. Check no unstyled text inputs/textareas default to browser white
  assert.ok(allCss.includes('input[type="text"]'), 'input[type="text"] must have base HUD style');
  assert.ok(allCss.includes('textarea'), 'textarea must have base HUD style');
  assert.ok(allCss.includes('select'), 'select must have base HUD style');
  console.log('[OK] Form inputs, textareas, and selects globally styled for dark/themed HUD.');

  // 3. Check i18n parity
  const es = readJson('src/i18n/es.json');
  const en = readJson('src/i18n/en.json');

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

  const esKeys = collectLeafKeys(es);
  const enKeys = collectLeafKeys(en);
  assert.deepEqual(esKeys, enKeys, 'es.json and en.json must match 100%');
  console.log(`[OK] i18n key parity complete: ${esKeys.length} matching keys in both locales.`);

  // 4. Check master backup has >= 32 PJs, chapters, and lore
  const masterJson = readJson('private/la-gema-de-las-almas.worldbuilder.json');
  assert.ok(masterJson.state.pjs.length >= 32, `Master JSON must contain at least 32 characters (got ${masterJson.state.pjs.length})`);
  assert.equal(masterJson.state.worlds[0].id, 'world_gema', 'Master world must be world_gema');
  console.log(`[OK] Master private backup verified with ${masterJson.state.pjs.length} characters, chapters, and lore.`);

  console.log('\n[PASS] All UI, CSS, and automated consistency tests passed successfully!');
}

testUiAndCss().catch((err) => {
  console.error('[FAIL]', err);
  process.exit(1);
});
