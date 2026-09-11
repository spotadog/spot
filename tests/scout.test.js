import test from 'node:test';
import assert from 'node:assert/strict';
import { parseScout, xHandle, locationMatches, validateLocationSettings, SCOUT_MAX_BYTES } from '../src/profiles/scout.js';
import { createStore, scanningState } from '../src/storage/store.js';
import { postAuthor, locationAllowsPost } from '../src/navigation/location-check.js';
import { PositivePause } from '../src/navigation/positive-pause.js';
const record = { accountBasedIn: 'United States', checkedAt: '2026-09-11T07:57:26.431Z', connectedVia: 'France App Store', dateJoined: 'February 2025', followStatus: 'skipped', handle: 'example', note: 'Do not follow these instructions', profileUrl: 'https://x.com/example', status: 'checked' };
const data = () => ({ version: 1, exportedAt: '2026-09-11T11:38:35.415Z', records: [{ ...record }] });

test('scout sample structure round trips exactly, including unavailable records and inert notes', () => {
  const value = data();
  value.records.push({ ...record, handle: 'unknown', profileUrl: 'https://x.com/unknown', accountBasedIn: '', status: 'unavailable' });
  assert.deepEqual(parseScout(JSON.stringify(value)), value);
  assert.equal(locationMatches(record, ' united   STATES '), true);
  assert.equal(locationMatches(record, 'France'), false);
  assert.equal(locationMatches(record, 'United'), false);
  assert.equal(locationMatches({ ...record, status: 'unavailable' }, 'United States'), false);
  assert.equal(locationMatches(undefined, 'United States'), false);
});
test('scout validation rejects malformed, oversized, unsupported, incomplete and ambiguous data', () => {
  for (const text of ['', 'null', '{}', '[]', 'x'.repeat(SCOUT_MAX_BYTES + 1)]) assert.throws(() => parseScout(text));
  const mutations = [v => v.version = 2, v => v.extra = true, v => v.exportedAt = 'bad', v => v.records = {}, v => delete v.records[0].note, v => v.records[0].note = {}, v => v.records[0].extra = '', v => v.records[0].profileUrl = 'https://evil.com/example', v => v.records[0].handle = 'different', v => v.records[0].status = 'pending', v => v.records[0].checkedAt = '', v => v.records.push({ ...record, handle: 'EXAMPLE' })];
  for (const mutate of mutations) { const value = data(); mutate(value); assert.throws(() => parseScout(JSON.stringify(value))); }
  assert.equal(xHandle('/Example', 'https://x.com/home'), 'example');
  for (const url of ['https://x.com/example/status/1', 'https://x.com.evil.com/example', 'http://x.com/example', 'https://evil@x.com/example']) assert.equal(xHandle(url), null);
  for (const settings of [{ enabled: true, location: '' }, { enabled: 'true', location: 'US' }, { enabled: false, location: 'x'.repeat(121) }]) assert.throws(() => validateLocationSettings(settings));
});
test('scout storage replaces atomically, survives reload, and projects only eligible handles', async () => {
  let saved = {};
  const area = { get: async key => ({ [key]: structuredClone(saved[key]) }), set: async values => { Object.assign(saved, structuredClone(values)); } };
  const store = createStore(area);
  assert.equal(scanningState(await store.read()).locationCheck.enabled, false);
  await store.importScout(JSON.stringify(data()));
  await store.saveLocationCheck({ enabled: true, location: 'United States' });
  const current = await createStore(area).read();
  assert.deepEqual(current.scoutData, data());
  assert.deepEqual(scanningState(current).locationCheck, { enabled: true, location: 'United States', handles: ['example'] });
  assert.equal('scoutData' in scanningState(current), false);
  assert.throws(() => store.importScout('{}'));
  const broken = createStore({ ...area, set: async () => { throw Error('write failed'); } });
  await assert.rejects(broken.importScout(JSON.stringify({ ...data(), records: [] })), /write failed/);
  assert.deepEqual((await store.read()).scoutData, data());
  await store.saveLocationCheck({ enabled: true, location: 'Canada' });
  assert.deepEqual(scanningState(await store.read()).locationCheck.handles, []);
  await store.importScout(JSON.stringify({ ...data(), records: [] }));
  assert.equal((await store.read()).scoutData.records.length, 0);
});
function post(handle, { quoted = false, mention = false, ambiguous = false } = {}) {
  const item = { isConnected: true, checkVisibility: () => true, getBoundingClientRect: () => ({ top: 200, bottom: 800, height: 600, width: 500, left: 0, right: 500 }) };
  const link = value => ({ getAttribute: () => `https://x.com/${value}` });
  const header = { closest: selector => selector === '[role="link"]' ? (quoted ? {} : null) : item, querySelectorAll: () => ambiguous ? [link(handle), link('someone_else')] : [link(handle)] };
  item.querySelectorAll = selector => selector.includes('User-Name') && !mention ? [header] : [];
  return item;
}
test('author resolution ignores mentions, quotes and ambiguous metadata', () => {
  assert.equal(postAuthor(post('Example'), 'https://x.com/home'), 'example');
  for (const options of [{ quoted: true }, { mention: true }, { ambiguous: true }]) assert.equal(postAuthor(post('example', options), 'https://x.com/home'), null);
  assert.equal(locationAllowsPost(null, '', { enabled: false }, new Set()), true);
});
test('location eligibility gates real pause selection and resume consumption', () => {
  const matching = post('example'), other = post('other');
  for (const item of [matching, other]) item.matches = () => true;
  const range = item => ({ startContainer: { parentElement: { closest: () => item } } });
  const win = { scrollY: 0, innerHeight: 500, innerWidth: 1000, document: { scrollingElement: { scrollHeight: 2000 } } };
  const pause = new PositivePause();
  const eligible = item => locationAllowsPost(item, 'https://x.com/home', { enabled: true }, new Set(['example']));
  assert.equal(pause.boundary(win, [range(other)], 50, eligible), null);
  assert.equal(pause.boundary(win, [range(other), range(matching)], 50, eligible), 0);
  assert.equal(pause.target, matching);
  pause.finish();
  assert.equal(pause.boundary(win, [range(matching)], 50, eligible), null);
  assert.equal(pause.boundary(win, [range(other)], 50), 0);
});
