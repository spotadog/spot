import test from 'node:test';
import assert from 'node:assert/strict';
import { HIGHLIGHT_COLORS, keywordColor, validateColor, contrastColor } from '../src/highlighting/colors.js';
import { Highlighter } from '../src/highlighting/highlighter.js';
import { makeProfile, validateKeyword } from '../src/profiles/model.js';
import { keywordKey } from '../src/profiles/keyword.js';
import { findMatches, resolveHighlights } from '../src/matching/matcher.js';
import { createStore, scanningState } from '../src/storage/store.js';
import { exportProfiles, parseImport } from '../src/profiles/transfer.js';

test('preset and custom colors persist through recreated storage and both backup scopes', async () => {
  const p = makeProfile({ name: 'Colors', positiveKeywords: [...HIGHLIGHT_COLORS.map(c => ({ text: c.name, color: c.value })), { text: 'custom', color: '#012ABC', active: false, matchingCriteria: { type: 'startsWith' } }], negativeKeywords: [{ text: 'negative', color: '#abcdef' }] });
  let data = {};
  const area = { get: async () => structuredClone(data), set: async value => { data = structuredClone(value); } };
  await createStore(area).update(s => ({ ...s, profiles: [p] }));
  assert.deepEqual((await createStore(area).read()).profiles, [p]);
  assert.equal(scanningState(await createStore(area).read()).profiles[0].negativeKeywords[0].color, '#abcdef');
  for (const scope of ['single', 'all']) assert.deepEqual(parseImport(exportProfiles([p], scope, p.id), scope), [p]);
});
test('legacy strings and records retain group defaults, identity and saved representation', () => {
  for (const keyword of ['dog', { text: 'dog' }, { text: 'dog', matchingCriteria: null }]) {
    assert.equal(keywordColor(keyword), '#ffe077');
    assert.equal(keywordColor(keyword, 'negative'), '#ef6666');
    assert.deepEqual(validateKeyword(keyword), keyword);
    assert.equal(keywordKey(keyword), keywordKey({ ...(typeof keyword === 'string' ? { text: keyword } : keyword), color: '#123456' }));
  }
});
test('color validation rejects unsafe or unsupported values; damaged saved colors fall back safely', () => {
  assert.equal(validateColor('#Ab01FE'), '#ab01fe');
  for (const color of [null, undefined, 0, {}, '#abc', 'red', '#12345678', ' #123456', '#123456; color:red', '#gggggg']) {
    assert.throws(() => validateKeyword({ text: 'dog', color }), /highlight color/);
    assert.equal(keywordColor({ color }), '#ffe077');
    const p = makeProfile({ name: 'Bad', positiveKeywords: ['dog'] });
    p.positiveKeywords = [{ text: 'dog', color }];
    if (color !== undefined) assert.throws(() => parseImport(JSON.stringify({ format: 'spotadog.profiles', version: 1, scope: 'all', profiles: [p] }), 'all'));
  }
  assert.equal(contrastColor('#000000'), '#ffffff');
  assert.equal(contrastColor('#ffffff'), '#000000');
  assert.throws(() => validateKeyword({ text: 'DOG', color: '#123456' }, ['dog']), /already exists/);
});
test('edits propagate colors through matching and negative overlap while retaining unrelated keywords', () => {
  const p = makeProfile({ name: 'Colors', positiveKeywords: [{ text: 'hot dog', color: '#123456' }, 'cat'], negativeKeywords: [{ text: 'dog', color: '#abcdef' }] });
  const hits = resolveHighlights(findMatches('hot dog cat', [p]));
  assert.deepEqual(hits, [{ start: 0, end: 4, kind: 'positive', color: '#123456' }, { start: 4, end: 7, kind: 'negative', color: '#abcdef' }, { start: 8, end: 11, kind: 'positive' }]);
  const edited = makeProfile({ ...p, positiveKeywords: [{ ...p.positiveKeywords[0], color: '#654321' }, p.positiveKeywords[1]] }, p);
  assert.equal(findMatches('hot dog', [edited])[0].color, '#654321');
  assert.equal(p.positiveKeywords[0].color, '#123456');
  assert.deepEqual(edited.negativeKeywords, p.negativeKeywords);
});
test('renderer replaces custom groups and styles, escapes invalid colors and cleans up on stop', () => {
  const styles = [];
  const win = { CSS: { highlights: new Map() }, Highlight: Set, document: {
    createElement: () => ({ textContent: '', remove() { styles.splice(styles.indexOf(this), 1); } }),
    documentElement: { append: node => styles.push(node) }
  } };
  const renderer = new Highlighter(win), range = {};
  renderer.paint([{ kind: 'positive', color: '#123456', range }]);
  assert.equal(win.CSS.highlights.get('spotadog-positive-123456').has(range), true);
  assert.deepEqual(renderer.positiveRanges, [range]);
  assert.match(styles[0].textContent, /color: #ffffff/);
  const original = styles[0];
  renderer.paint([{ kind: 'positive', color: '#123456', range }]);
  assert.equal(styles[0], original);
  renderer.paint([{ kind: 'negative', color: '#abcdef', range }]);
  assert.equal(win.CSS.highlights.has('spotadog-positive-123456'), false);
  assert.deepEqual(renderer.positiveRanges, []);
  assert.match(styles[0].textContent, /spotadog-negative-abcdef/);
  renderer.paint([{ kind: 'positive', color: 'red; } body {', range }]);
  assert.equal(styles.length, 0);
  assert.equal(win.CSS.highlights.has('spotadog-matches'), true);
  renderer.clear();
  assert.equal(win.CSS.highlights.size, 0);
  assert.deepEqual(renderer.positiveRanges, []);
});
