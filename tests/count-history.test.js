import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/storage/store.js';
import { countKey } from '../src/matching/counts.js';
import { fingerprint } from '../src/storage/count-history.js';
const key = countKey('p', 'positive', 'GPU');
const page = 'a'.repeat(64), context = 'b'.repeat(64), other = 'c'.repeat(64);
function fixture() {
  const data = {}; let fail = false;
  const area = { async get(key) { return structuredClone({ [key]: data[key] }); }, async set(values) {
    if (fail) throw Error('storage full'); Object.assign(data, structuredClone(values));
  } };
  const store = createStore(area);
  return { data, area, store, fail(value) { fail = value; }, async init() {
    await store.update(s => ({ ...s, preferences: { ...s.preferences, tracking: true }, profiles: [{ id: 'p', enabled: true, positiveKeywords: ['GPU'], negativeKeywords: [] }] }));
  } };
}
test('persisted history merges smaller/duplicate/out-of-order batches and survives store restart', async () => {
  const f = fixture(); await f.init();
  const batch = n => ({ [key]: { [context]: n } });
  assert.deepEqual((await f.store.recordCounts(page, {}))[key], { repeated: 0, unique: 0 });
  await f.store.recordCounts(page, batch(15));
  await Promise.all([f.store.recordCounts(page, batch(18)), f.store.recordCounts(page, batch(12))]);
  assert.deepEqual((await f.store.recordCounts(page, batch(12)))[key], { repeated: 18, unique: 1 });
  const restarted = createStore(f.area);
  assert.deepEqual((await restarted.recordCounts(page, { [key]: { [other]: 3 } }))[key], { repeated: 21, unique: 2 });
  assert.deepEqual((await restarted.recordCounts(page, { [key]: { [other]: 3 } }))[key], { repeated: 21, unique: 2 });
  assert.deepEqual((await restarted.recordCounts(other, {}))[key], { repeated: 0, unique: 0 });
  assert.equal(f.data['spotadog.state'].schemaVersion, 1);
});
test('failed writes retain history, recover on retry, and reject malformed observations', async () => {
  const f = fixture(); await f.init();
  await f.store.recordCounts(page, { [key]: { [context]: 1 } });
  f.fail(true);
  await assert.rejects(f.store.recordCounts(page, { [key]: { [context]: 5 } }), /storage full/);
  f.fail(false);
  assert.equal((await f.store.recordCounts(page, {}))[key].repeated, 1);
  assert.equal((await f.store.recordCounts(page, { [key]: { [context]: 5 } }))[key].repeated, 5);
  await assert.rejects(f.store.recordCounts(page, { [key]: { [context]: -1 } }), /Invalid/);
  await assert.rejects(f.store.recordCounts(page, { [key]: { '__proto__': null, raw: 1 } }), /Invalid/);
});
test('page/context fingerprints are deterministic SHA-256 identifiers', async () => {
  assert.match(await fingerprint('GPU context'), /^[a-f0-9]{64}$/);
  assert.equal(await fingerprint('GPU context'), await fingerprint('GPU context'));
  assert.notEqual(await fingerprint('GPU context'), await fingerprint('GPU context!'));
});
