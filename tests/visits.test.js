import test from 'node:test';
import assert from 'node:assert/strict';
import { createVisitStore } from '../src/storage/store.js';
import { visitService } from '../src/background/visits.js';
function area() {
  const data = {}; let fail = false;
  return { data, fail(value) { fail = value; }, async get(key) { return structuredClone({ [key]: data[key] }); },
    async set(values) { if (fail) throw Error('storage full'); Object.assign(data, structuredClone(values)); },
    async remove(key) { delete data[key]; } };
}
const visit = (timeStamp, url = 'https://example.test/', tabId = 1) => ({ frameId: 0, tabId, timeStamp, url, documentId: `doc-${tabId}`, documentLifecycle: 'active' });
const count = async store => (await store.read()).entries[0]?.count ?? 0;
test('URL tracking defaults off, ignores disabled visits and preserves history when disabled', async () => {
  const local = area(), session = area(), store = createVisitStore(local, session);
  assert.deepEqual(await store.read(), { enabled: false, mode: 'session', entries: [] });
  await store.record(visit(1), 'committed');
  assert.deepEqual(session.data, {});
  await store.configure({ enabled: true });
  await store.record(visit(2), 'committed');
  await store.configure({ enabled: false });
  await store.record(visit(3), 'committed');
  assert.equal(await count(store), 1);
  await store.configure({ enabled: true });
  await store.record(visit(4), 'committed');
  assert.equal(await count(store), 2);
});
test('session history survives worker restart, browser restart clears session only, modes remain separate', async () => {
  const local = area(), session = area(), store = createVisitStore(local, session);
  await store.configure({ enabled: true });
  await store.record(visit(1), 'committed');
  assert.equal(await count(createVisitStore(local, session)), 1);
  assert.equal(await count(createVisitStore(local, area())), 0);
  await store.configure({ mode: 'allTime' });
  assert.equal(await count(store), 0);
  await store.record(visit(2), 'committed');
  await store.record(visit(3), 'committed');
  assert.equal(await count(createVisitStore(local, area())), 2);
  await store.configure({ mode: 'session' });
  assert.equal(await count(store), 1);
  await store.clear();
  assert.equal(await count(store), 0);
  await store.configure({ mode: 'allTime' });
  assert.equal(await count(store), 0);
  assert.equal((await store.read()).enabled, true);
});
test('concurrent tabs and reloads increment; duplicate, stale, subframe and non-web events do not', async () => {
  const store = createVisitStore(area(), area());
  await store.configure({ enabled: true });
  await Promise.all(Array.from({ length: 12 }, (_, i) => store.record(visit(i + 1, undefined, i), 'committed')));
  assert.equal(await count(store), 12);
  await store.record(visit(15), 'committed');
  await store.record(visit(15), 'committed');
  await store.record(visit(14), 'committed');
  await store.record(visit(16), 'route');
  await store.record({ ...visit(17), frameId: 1 }, 'committed');
  await store.record(visit(18, 'chrome://settings/'), 'committed');
  await store.record({ ...visit(19), documentLifecycle: 'prerender' }, 'committed');
  assert.equal(await count(store), 13);
  await store.record(visit(20, 'https://example.test/?q=1#next'), 'route');
  await store.record(visit(21), 'route');
  assert.equal(await count(store), 14);
  assert.equal((await store.read()).entries.length, 2);
});
test('clear and disable are serialized with visits; failed writes retain counts and permit retry', async () => {
  const local = area(), session = area(), store = createVisitStore(local, session);
  await store.configure({ enabled: true });
  await store.record(visit(1), 'committed');
  session.fail(true);
  await assert.rejects(store.record(visit(2), 'committed'), /storage full/);
  assert.equal(await count(store), 1);
  session.fail(false);
  await store.record(visit(2), 'committed');
  assert.equal(await count(store), 2);
  await Promise.all([store.record(visit(3), 'committed'), store.clear(), store.configure({ enabled: false }), store.record(visit(4), 'committed')]);
  assert.equal(await count(store), 0);
  for (const patch of [{ enabled: 'yes' }, { mode: 'forever' }]) await assert.rejects(store.configure(patch), /Invalid|Choose/);
  assert.equal((await store.read()).enabled, false);
});
test('tab cleanup preserves counts; adapter does not touch profiles, keyword counts or scroll storage', async () => {
  const local = area(), session = area(), store = createVisitStore(local, session);
  local.data['spotadog.state'] = { profiles: ['keep'] };
  session.data['spotadog.scroll.v1.1'] = { enabled: true };
  await store.configure({ enabled: true });
  await store.record(visit(1), 'committed');
  await store.forgetTab(1);
  assert.equal(await count(store), 1);
  assert.deepEqual(session.data['spotadog.visits.history.v1'].tabs, {});
  await store.clear();
  assert.deepEqual(local.data['spotadog.state'], { profiles: ['keep'] });
  assert.deepEqual(session.data['spotadog.scroll.v1.1'], { enabled: true });
});
function event() { const listeners = []; return { addListener(fn) { listeners.push(fn); }, async emit(value) { await Promise.all(listeners.map(fn => fn(value))); } }; }
test('navigation service registers committed and route events and publishes saved changes', async () => {
  const store = createVisitStore(area(), area()), messages = [];
  const api = { webNavigation: { onCommitted: event(), onHistoryStateUpdated: event(), onReferenceFragmentUpdated: event() }, tabs: { onRemoved: event() }, runtime: { async sendMessage(message) { messages.push(message); } } };
  const handle = visitService(api, store);
  await handle({ type: 'visits.configure', enabled: true });
  await api.webNavigation.onCommitted.emit(visit(1));
  await api.webNavigation.onHistoryStateUpdated.emit(visit(2, 'https://example.test/route'));
  await api.webNavigation.onReferenceFragmentUpdated.emit(visit(3, 'https://example.test/route#hash'));
  assert.equal((await handle({ type: 'visits.get' })).entries.length, 3);
  assert.equal(messages.length, 4);
  await handle({ type: 'visits.clear' });
  assert.deepEqual((await handle({ type: 'visits.get' })).entries, []);
});
