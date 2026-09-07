import test from 'node:test';
import assert from 'node:assert/strict';
import { countEntries, countUnit, summarizeCounts, countKey } from '../src/matching/counts.js';
import { Scanner } from '../src/content/scanner.js';
const profile = { id: 'p', enabled: true, positiveKeywords: ['GPU', 'data center'], negativeKeywords: ['gaming'] };
const key = (word = 'GPU') => countKey('p', 'positive', word);
const entries = countEntries([profile]);
test('independent keywords count repeated occurrences and deterministic normalized contexts', () => {
  const counts = summarizeCounts(['GPU gpu GPUs', ' GPU   GPU GPUs ', 'GPU!', 'data\ncenter gaming'].map(text => countUnit(text, entries)), entries);
  assert.deepEqual(counts[key()], { repeated: 5, unique: 2 });
  assert.deepEqual(counts[key('data center')], { repeated: 1, unique: 1 });
  assert.deepEqual(counts[countKey('p', 'negative', 'gaming')], { repeated: 1, unique: 1 });
  assert.deepEqual(summarizeCounts([countUnit('', entries), countUnit('éGPU GPUé _GPU absent', entries)], entries)[key()], { repeated: 0, unique: 0 });
});
test('counts reuse criteria and activity without cross-profile or highlight overlap deduplication', () => {
  const keywords = [{ text: 'GP', matchingCriteria: { type: 'startsWith' } }, { text: 'GPU', active: false }, { text: 'GPU', matchingCriteria: { type: 'regex' } }];
  const p = { ...profile, positiveKeywords: keywords, negativeKeywords: ['GPU'] };
  const e = countEntries([p, { ...profile, id: 'off', enabled: false }]);
  const c = summarizeCounts([countUnit('GPU gpu', e)], e);
  assert.equal(c[countKey('p', 'positive', keywords[0])].repeated, 2);
  assert.equal(c[countKey('p', 'positive', keywords[1])].repeated, 0);
  assert.equal(c[countKey('p', 'positive', keywords[2])].repeated, 1);
  assert.equal(c[countKey('p', 'negative', 'GPU')].repeated, 2);
  assert.equal(c[countKey('off', 'positive', 'GPU')].repeated, 0);
});
function fixture() {
  const timers = new Map(), events = new Map();
  let timerId = 0, observer;
  const target = { addEventListener(name, fn) { events.set(name, fn); }, removeEventListener(name) { events.delete(name); } };
  const win = { ...target, navigation: target, location: { href: 'https://example.test/a' },
    NodeFilter: { SHOW_TEXT: 4 }, setTimeout(fn) { timers.set(++timerId, fn); return timerId; }, clearTimeout(id) { timers.delete(id); },
    MutationObserver: class { constructor(fn) { this.fn = fn; observer = this; } observe() { this.connected = true; } disconnect() { this.connected = false; } }
  };
  const nodes = [];
  const doc = { ...target, defaultView: win, documentElement: {}, body: {},
    createTreeWalker() { let i = 0; return { nextNode: () => nodes[i++] }; },
    createRange() { return { selectNodeContents() {}, setStart() {}, setEnd() {}, getClientRects: () => [1] }; }
  };
  const scanner = new Scanner(doc);
  return { scanner, nodes, win, events, timers, observer,
    add(text) { const node = { textContent: text, parentElement: { closest: () => false, checkVisibility: () => true } }; nodes.push(node); return node; },
    mutate() { if (observer.connected) observer.fn(); },
    flush() { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); }
  };
}
const state = { enabled: true, tracking: true, profiles: [profile] };
test('disabled tracking has no count processing or route listeners; enabled counts once', () => {
  const f = fixture(); const node = f.add('GPU');
  f.scanner.update({ ...state, tracking: false });
  assert.equal(f.scanner.snapshot(), null);
  assert.equal(f.scanner.cache.get(node).counts, null);
  assert.equal(f.events.has('navigatesuccess'), false);
  f.scanner.update(state);
  assert.deepEqual(f.scanner.snapshot()[key()], { repeated: 1, unique: 1 });
});
test('batched dynamic additions, repeated observations, edits, visibility and removals replace counts', () => {
  const f = fixture(); const node = f.add('GPU'); f.scanner.update(state);
  const cached = f.scanner.cache.get(node);
  f.add('GPU'); f.mutate(); f.mutate(); f.mutate();
  assert.equal(f.timers.size, 1); f.flush();
  assert.equal(f.scanner.cache.get(node), cached);
  assert.deepEqual(f.scanner.snapshot()[key()], { repeated: 2, unique: 1 });
  node.textContent = 'GPU gpu'; f.mutate(); f.flush();
  assert.deepEqual(f.scanner.snapshot()[key()], { repeated: 3, unique: 2 });
  node.parentElement.checkVisibility = () => false; f.mutate(); f.flush();
  assert.deepEqual(f.scanner.snapshot()[key()], { repeated: 1, unique: 1 });
  f.nodes.splice(0); f.mutate(); f.flush();
  assert.deepEqual(f.scanner.snapshot()[key()], { repeated: 0, unique: 0 });
});
test('route changes invalidate stale counts; disable cancels pending work and cleans up', () => {
  const f = fixture(); f.add('GPU'); f.scanner.update(state);
  f.win.location.href = 'https://example.test/b';
  assert.equal(f.scanner.snapshot(), null);
  f.nodes[0].textContent = 'new page'; f.flush();
  assert.deepEqual(f.scanner.snapshot()[key()], { repeated: 0, unique: 0 });
  f.events.get('navigatesuccess')();
  assert.equal(f.scanner.snapshot(), null); f.flush();
  f.mutate(); f.scanner.update({ ...state, tracking: false });
  assert.equal(f.timers.size, 0);
  assert.equal(f.events.has('navigatesuccess'), false);
  assert.equal(f.scanner.snapshot(), null);
  f.scanner.update({ ...state, enabled: false });
  assert.equal(f.observer.connected, false);
  assert.equal(f.events.size, 0);
  f.mutate(); assert.equal(f.timers.size, 0);
});

test('empty body and profile replacement discard previous page contributions', () => {
  const f = fixture(); f.add('GPU'); f.scanner.update(state);
  f.scanner.doc.body = null; f.mutate(); f.flush();
  assert.deepEqual(f.scanner.snapshot()[key()], { repeated: 0, unique: 0 });
  f.scanner.doc.body = {};
  f.scanner.update({ ...state, profiles: [{ ...profile, positiveKeywords: ['missing'] }] });
  assert.equal(f.scanner.snapshot()[key()], undefined);
  assert.deepEqual(f.scanner.snapshot()[key('missing')], { repeated: 0, unique: 0 });
  f.scanner.update({ ...state, profiles: [] });
  assert.deepEqual(f.scanner.snapshot(), {});
});
