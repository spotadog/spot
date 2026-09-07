import test from 'node:test';
import assert from 'node:assert/strict';
import { makeProfile, initialState } from '../src/profiles/model.js';
import { exportProfiles, parseImport, mergeProfiles, MAX_IMPORT_BYTES } from '../src/profiles/transfer.js';
import { createStore } from '../src/storage/store.js';
const first = makeProfile({ name: 'Dogs', positiveKeywords: ['dog', 'rescue shelter'], negativeKeywords: ['cat'] });
const second = { ...makeProfile({ name: 'Dogs', positiveKeywords: ['puppy'], enabled: false }), rules: { wholeWords: true, negativeScope: 'text-node' } };
for (const scope of ['single', 'all']) test(`${scope} export/import faithfully preserves persisted data`, () => {
  const profiles = scope === 'single' ? [second] : [first, second];
  const text = exportProfiles(profiles, scope, second.id);
  assert.deepEqual(parseImport(text, scope), profiles);
  assert.equal(exportProfiles(profiles, scope, second.id), text);
  assert.deepEqual(mergeProfiles([], parseImport(text, scope)), profiles);
});
test('conflicts replace IDs, allow duplicate names, retain unrelated profiles and enforce capacity', () => {
  const changed = { ...first, positiveKeywords: ['new word'] };
  assert.deepEqual(mergeProfiles([first, second], [changed]), [changed, second]);
  assert.deepEqual(mergeProfiles([first], [second]), [first, second]);
  assert.throws(() => mergeProfiles(Array.from({ length: 50 }, (_, i) => ({ ...first, id: String(i) })), [second]), /50 profiles/);
});
test('empty collection is portable and single export requires an existing profile', () => {
  assert.deepEqual(parseImport(exportProfiles([], 'all'), 'all'), []);
  assert.deepEqual(mergeProfiles([first], []), [first]);
  assert.throws(() => exportProfiles([], 'single', first.id));
});
test('malformed, incompatible and lossy data is rejected', () => {
  const good = JSON.parse(exportProfiles([first], 'all'));
  for (const text of ['', '{', 'null', '[]', 'x'.repeat(MAX_IMPORT_BYTES + 1)]) assert.throws(() => parseImport(text, 'all'));
  const mutations = [d => d.version = 2, d => d.scope = 'single', d => d.extra = true, d => d.profiles.push(d.profiles[0]), d => delete d.profiles[0].name, d => d.profiles[0].extra = true, d => d.profiles[0].positiveKeywords = [' dog '], d => d.profiles[0].negativeKeywords = [1], d => d.profiles[0].enabled = 'yes', d => d.profiles[0].createdAt = 'yesterday', d => d.profiles[0].rules.unknown = true, d => d.profiles[0].rules.negativeScope = 'page'];
  for (const mutate of mutations) { const data = structuredClone(good); mutate(data); assert.throws(() => parseImport(JSON.stringify(data), 'all')); }
  assert.throws(() => parseImport(JSON.stringify(good), 'single'));
  assert.throws(() => parseImport(exportProfiles([first], 'single', first.id), 'all'));
});
test('serialized import persistence is atomic and preserves settings on failure', async () => {
  let saved = { ...initialState(), profiles: [first] }, fail = false;
  const store = createStore({ async get() { return { 'spotadog.state': structuredClone(saved) }; }, async set(value) { if (fail) throw Error('disk'); saved = structuredClone(value['spotadog.state']); } });
  const apply = text => { const imported = parseImport(text, 'all'); return store.update(s => ({ ...s, profiles: mergeProfiles(s.profiles, imported) })); };
  const before = structuredClone(saved);
  assert.throws(() => apply('{}'));
  fail = true;
  await assert.rejects(apply(exportProfiles([second], 'all')));
  assert.deepEqual(saved, before);
  fail = false;
  await apply(exportProfiles([second], 'all'));
  assert.deepEqual((await createStore({ async get() { return { 'spotadog.state': saved }; } }).read()).profiles, [first, second]);
  assert.deepEqual(saved.preferences, before.preferences);
});
test('maximum collection with multibyte terms remains within the upload limit', () => {
  const terms = Array.from({ length: 200 }, (_, i) => String(i).padStart(3, '0') + '犬'.repeat(117));
  const profiles = Array.from({ length: 50 }, (_, i) => ({ ...first, id: String(i), positiveKeywords: terms, negativeKeywords: terms }));
  const text = exportProfiles(profiles, 'all');
  assert.ok(new TextEncoder().encode(text).length <= MAX_IMPORT_BYTES);
  assert.deepEqual(parseImport(text, 'all'), profiles);
});
