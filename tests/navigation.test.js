import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, transition } from '../src/navigation/state.js';
import { createTabStore } from '../src/storage/store.js';
import { navigationService } from '../src/background/navigation.js';
import { AutoNavigator } from '../src/navigation/controller.js';
import { nextPage } from '../src/navigation/pagination.js';
import { tabView } from '../src/ui/auto-scroll.js';
const flush = () => new Promise(resolve => setImmediate(resolve));
const hello = (s, documentId = 'list', url = 'https://site.test/list', kind = 'navigate') => transition(s, { type: 'hello', documentId, url, kind });
const command = (s, type, fields = {}) => transition(s, { type, documentId: s.documentId, revision: s.revision, ...fields });
function area() {
  const data = {};
  return { data, async get(key) { return structuredClone(key === null ? data : { [key]: data[key] }); }, async set(values) { Object.assign(data, structuredClone(values)); }, async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) delete data[key]; } };
}
function event() { const listeners = new Set(); return { listeners, addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn), emit: (...args) => { for (const fn of listeners) fn(...args); } }; }
test('enable, pause, speed, resume, disable and invalid controls', () => {
  let s = hello(defaults());
  s = command(s, 'set', { enabled: true }); assert.equal(s.paused, false);
  s = command(s, 'set', { paused: true, speed: 350 }); assert.equal(s.paused, true);
  s = command(s, 'set', { paused: false }); assert.equal(s.speed, 350);
  s = command(s, 'set', { enabled: false }); assert.equal(s.enabled, false); assert.equal(s.pending, null);
  for (const speed of [0, 601, NaN, '120']) assert.throws(() => command(s, 'set', { speed }));
});
test('automatic continuation differs from detail, history and reload; pause wins pending navigation', () => {
  let s = command(hello(defaults()), 'set', { enabled: true });
  s = command(s, 'next', { target: 'https://site.test/list?page=2' });
  assert.equal(command(s, 'next', { target: 'https://site.test/list?page=2' }), s);
  const continued = hello(s, 'page2', 'https://site.test/list?page=2');
  assert.equal(continued.paused, false); assert.equal(continued.pending, null);
  assert.equal(hello(s, 'detail', 'https://site.test/dog').paused, true);
  assert.equal(hello(s, 'page2', 'https://site.test/list?page=2', 'history').paused, true);
  assert.equal(hello(s, 'page2', 'https://site.test/list?page=2', 'reload').paused, true);
  s = command(s, 'set', { paused: true });
  s = hello(s, 'detail', 'https://site.test/dog'); s = hello(s, 'list', 'https://site.test/list', 'history');
  assert.equal(s.paused, true); assert.equal(command(s, 'set', { paused: false }).paused, false);
  assert.equal(command(continued, 'next', { target: 'https://site.test/list' }).paused, true);
});
test('stale documents and next revisions cannot act; cancellation cannot be rejected by a pending next race', () => {
  let s = command(hello(defaults()), 'set', { enabled: true }); const old = s;
  s = command(s, 'next', { target: 'https://site.test/2' });
  assert.equal(transition(s, { type: 'progress', revision: old.revision, documentId: 'list' }), s);
  assert.equal(transition(s, { type: 'pause', revision: s.revision, documentId: 'old' }), s);
  assert.equal(transition(s, { type: 'pause', revision: old.revision, documentId: 'list' }).paused, true);
  const expired = transition(s, { type: 'hello', documentId: 'new', url: 'https://site.test/2' }, s.pending.expires + 1);
  assert.equal(expired.paused, true);
});
test('session adapter isolates tabs, survives worker recreation, prunes orphans, clears closed/reused tabs and fresh sessions', async () => {
  const a = area(), store = createTabStore(a);
  await store.update(1, () => command(defaults(), 'set', { enabled: true }));
  await store.update(3, () => command(defaults(), 'set', { enabled: true, paused: true, speed: 300 }));
  assert.equal(await store.read(2), undefined); assert.equal((await store.read(1)).paused, false);
  assert.equal((await createTabStore(a).read(3)).paused, true);
  await store.prune([1]); assert.equal(await store.read(3), undefined);
  await store.remove(1); assert.equal(await store.read(1), undefined);
  assert.equal(await createTabStore(area()).read(1), undefined);
});
test('worker authenticates top frames, scopes publications and cleans tab close/create events', async () => {
  const store = createTabStore(area()), tabs = new Set([1, 2]); const published = [];
  const api = { tabs: { onRemoved: event(), onCreated: event(), query: async () => [...tabs].map(id => ({ id })), get: async id => { if (!tabs.has(id)) throw Error('closed'); return { id }; }, sendMessage: async (id, msg) => { published.push([id, msg]); return { supported: true, scrollInstance: 'one' }; } }, runtime: { id: 'extension', getURL: () => 'chrome-extension://extension/', sendMessage: async () => {} } };
  const handle = navigationService(api, store);
  const ui = { id: 'extension', url: 'chrome-extension://extension/popup/index.html' };
  const content = { id: 'extension', tab: { id: 1 }, frameId: 0, documentId: 'one', url: 'https://site.test/' };
  await handle({ type: 'scroll.hello', instance: 'one' }, content);
  await handle({ type: 'scroll.set', tabId: 1, enabled: true, pauseAfterPositive: true }, ui);
  await assert.rejects(handle({ type: 'scroll.hello', instance: 'old' }, { ...content, documentId: 'old' }), /Page changed/);
  assert.equal((await store.read(1)).documentId, 'one');
  assert.equal((await store.read(1)).pauseAfterPositive, true);
  assert.equal((await handle({ type: 'scroll.get', tabId: 2 }, ui)).pauseAfterPositive, false);
  assert.equal((await handle({ type: 'scroll.get', tabId: 2 }, ui)).enabled, false);
  assert.ok(published.every(([id]) => id === 1));
  await assert.rejects(handle({ type: 'scroll.set', tabId: 2, enabled: true }, content));
  await assert.rejects(handle({ type: 'scroll.hello' }, { ...content, frameId: 1 }));
  tabs.delete(1); api.tabs.onRemoved.emit(1); await flush(); assert.equal(await store.read(1), undefined);
  await assert.rejects(handle({ type: 'scroll.hello', instance: 'one' }, content));
  await store.update(2, () => ({ enabled: true })); api.tabs.onCreated.emit({ id: 2 }); await flush();
  assert.equal(await store.read(2), undefined);
});
test('active-tab UI drops delayed replies and displays independent running/paused/off states', async () => {
  let tab = 1, resolveFirst; const seen = [];
  const view = tabView(async () => ({ id: tab }), id => id === 1 ? new Promise(r => { resolveFirst = r; }) : Promise.resolve({ enabled: id === 3, paused: id === 3, speed: id * 100 }), s => seen.push(s));
  const first = view.refresh(); await flush(); tab = 3; await view.refresh();
  resolveFirst({ enabled: true, paused: false }); await first;
  assert.equal(view.tabId, 3); assert.equal(seen.at(-1).paused, true);
  tab = 2; await view.refresh(); assert.equal(seen.at(-1).enabled, false);
  view.dispose(); assert.equal(view.tabId, null);
});
function fixture() {
  let time = 0, id = 0; const frames = new Map(), listeners = new Map(); const observers = [];
  const doc = { location: { href: 'https://site.test/list' }, scrollingElement: { scrollHeight: 2000 }, body: { textContent: 'first page' }, querySelector: () => null,
    addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type) };
  const win = { crypto: globalThis.crypto, document: doc, scrollY: 0, innerHeight: 500, performance: { now: () => time, getEntriesByType: () => [] },
    addEventListener: (type, fn) => listeners.set(type, fn), removeEventListener: type => listeners.delete(type),
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; }, cancelAnimationFrame: id => frames.delete(id),
    scrollBy: ({ top }) => { win.scrollY = Math.max(0, Math.min(doc.scrollingElement.scrollHeight - win.innerHeight, win.scrollY + top)); }, scrollTo: ({ top }) => { win.scrollY = top; },
    MutationObserver: class { constructor(fn) { this.fn = fn; observers.push(this); } observe() { this.active = true; } disconnect() { this.active = false; } }
  };
  let state = defaults(), calls = [], next = null, deferNext;
  const send = async (type, payload) => {
    calls.push(type);
    if (type === 'scroll.next' && deferNext) await deferNext;
    state = type === 'scroll.hello' ? hello(state, 'list', doc.location.href, payload.kind) : transition(state, { ...payload, type: type.slice(7), documentId: 'list' });
    return state;
  };
  const controller = new AutoNavigator(win, send, () => next);
  return { controller, win, doc, frames, listeners, observers, calls,
    async set(fields) { state = command(state, 'set', fields); controller.apply(state); await flush(); },
    async step(ms = 500) { time += ms; const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn(time)); await flush(); assert.ok(frames.size <= 1); },
    next(value) { next = value; }, defer(promise) { deferNext = promise; }
  };
}
test('one loop, adjustable speed, pause cleanup and resume from restored/manual position', async () => {
  const f = fixture(); await flush(); await f.set({ enabled: true });
  await f.step(100); assert.equal(f.win.scrollY, 12);
  await f.set({ speed: 300 }); await f.step(100); assert.equal(f.win.scrollY, 42);
  await f.set({ paused: true }); assert.equal(f.frames.size, 0); assert.ok(f.observers.every(o => !o.active));
  f.win.scrollY = 800; await f.set({ paused: false }); await f.step(100); assert.equal(f.win.scrollY, 830);
  await f.set({ enabled: false }); assert.equal(f.frames.size, 0);
  f.controller.dispose(); assert.equal(f.listeners.size, 0);
});
test('below-fold pagination waits for consumption; duplicate click blocked; canceled navigation times out', async () => {
  const f = fixture(); await flush(); let clicks = 0;
  f.next({ target: 'https://site.test/2', node: { click() { clicks++; } } });
  await f.set({ enabled: true, speed: 600 });
  for (let i = 0; i < 10; i++) await f.step(); assert.equal(clicks, 0);
  f.win.scrollY = 1500;
  for (let i = 0; i < 12; i++) await f.step(); assert.equal(clicks, 1);
  for (let i = 0; i < 10; i++) await f.step(); assert.equal(clicks, 1);
  f.controller.state.pending.expires = Date.now() - 1; await f.step();
  assert.equal(f.controller.state.paused, true); assert.equal(f.frames.size, 0);
});
test('infinite content growth resets end grace; empty/end content pauses safely', async () => {
  const f = fixture(); await flush(); await f.set({ enabled: true }); f.win.scrollY = 1500;
  for (let i = 0; i < 10; i++) await f.step();
  f.doc.scrollingElement.scrollHeight = 3000; f.observers.at(-1).fn(); await f.step();
  assert.equal(f.controller.state.paused, false); assert.ok(f.win.scrollY > 1500);
  f.win.scrollY = 2500;
  for (let i = 0; i < 28; i++) await f.step();
  assert.equal(f.controller.state.paused, true); assert.equal(f.calls.includes('scroll.next'), false);
});
test('disable while next authorization is pending prevents the click and leaves no resources', async () => {
  const f = fixture(); await flush(); await f.set({ enabled: true });
  let resolve, clicks = 0; f.defer(new Promise(r => { resolve = r; }));
  const next = { target: 'https://site.test/2', node: { click() { clicks++; } } }; f.next(next);
  const pending = f.controller.advance(next); await f.set({ enabled: false }); resolve(); await pending;
  assert.equal(clicks, 0); assert.equal(f.frames.size, 0); assert.ok(f.observers.every(o => !o.active));
});
test('AJAX replacement continues once; history restoration remains paused', async () => {
  const f = fixture(); await flush(); await f.set({ enabled: true }); f.win.scrollY = 1500;
  const next = { target: null, node: { click() { f.doc.body.textContent = 'second page'; } } }; f.next(next);
  await f.controller.advance(next); for (let i = 0; i < 4; i++) await f.step();
  assert.equal(f.controller.state.pending, null); assert.ok(f.win.scrollY < 100);
  await f.set({ paused: true }); f.win.scrollY = 800;
  f.listeners.get('pagehide')(); f.listeners.get('pageshow')({ persisted: true }); await flush();
  assert.equal(f.controller.state.paused, true); assert.equal(f.win.scrollY, 800); assert.equal(f.frames.size, 0);
});
function pageNode({ label = 'Next', pagination = false, rel = '', href = '/2', top = 100, disabled = false, hidden = false, target = '' } = {}) {
  return { textContent: label, rel, disabled, target,
    getAttribute: name => name === 'href' ? href : null, hasAttribute: name => name === 'href' && href !== null,
    closest: selector => selector.includes('pagination') ? pagination : hidden,
    matches: () => disabled, checkVisibility: () => !hidden,
    getBoundingClientRect: () => ({ top, bottom: top + 20, width: 100, height: 20 }) };
}
test('pagination recognizes semantics/regions, waits for visibility and rejects unrelated/invalid controls', () => {
  const doc = { location: { href: 'https://site.test/list' }, defaultView: { innerHeight: 500, getComputedStyle: () => ({ visibility: 'visible', display: 'block', pointerEvents: 'auto' }) } };
  for (const opts of [{}, { pagination: true, disabled: true }, { pagination: true, hidden: true }, { rel: 'next', top: 700 }, { rel: 'next', href: '#x' }, { rel: 'next', href: 'javascript:alert(1)' }, { rel: 'next', href: 'https://other.test/2' }, { rel: 'next', target: '_blank' }]) {
    doc.querySelectorAll = () => [pageNode(opts)]; assert.equal(nextPage(doc), null);
  }
  for (const opts of [{ pagination: true }, { rel: 'next' }, { label: 'Next page', href: null }]) {
    const node = pageNode(opts); doc.querySelectorAll = () => [node]; assert.equal(nextPage(doc).node, node);
  }
  const node = pageNode({ rel: 'next', top: 700 }); doc.querySelectorAll = () => [node]; assert.equal(nextPage(doc), null);
  node.getBoundingClientRect = () => ({ top: 400, bottom: 420, width: 100, height: 20 }); assert.equal(nextPage(doc).node, node);
});
test('in-flight running broadcasts cannot restart movement while a local pause is awaiting acknowledgment', async () => {
  const f = fixture(); await flush(); await f.set({ enabled: true });
  const send = f.controller.send; let resolve;
  f.controller.send = async (type, payload) => { if (type === 'scroll.pause') await new Promise(r => { resolve = r; }); return send(type, payload); };
  const pending = f.controller.pause('Navigation paused');
  f.controller.apply({ ...f.controller.state, paused: false });
  assert.equal(f.frames.size, 0);
  resolve(); await pending; assert.equal(f.frames.size, 0); assert.equal(f.controller.state.paused, true);
});
test('slow speeds retain fractional movement instead of rounding every frame', async () => {
  const f = fixture(); await flush(); await f.set({ enabled: true, speed: 30 });
  for (let i = 0; i < 100; i++) await f.step(10);
  assert.ok(Math.abs(f.win.scrollY - 30) <= 1);
});
test('pagination above a long footer is revealed and revalidated only after consuming the document', async () => {
  const f = fixture(); await flush(); let visible = false, clicks = 0;
  const candidate = { target: 'https://site.test/2', node: { scrollIntoView() { visible = true; }, click() { clicks++; } } };
  f.controller.findNext = (_doc, options) => visible || options?.includeOffscreen ? candidate : null;
  await f.set({ enabled: true });
  for (let i = 0; i < 10; i++) await f.step(); assert.equal(visible, false);
  f.win.scrollY = 1500;
  for (let i = 0; i < 12; i++) await f.step();
  assert.equal(visible, true); assert.equal(clicks, 1);
});

function positiveFixture(f, { start = 100, end = 700, next = 800 } = {}) {
  const sibling = { matches: () => true, checkVisibility: () => true, getBoundingClientRect: () => ({ top: next - f.win.scrollY, height: 300 }) };
  const block = { isConnected: true, parentElement: f.doc.body, nextElementSibling: sibling,
    getBoundingClientRect: () => ({ bottom: end - f.win.scrollY }) };
  const range = { startContainer: { parentElement: { closest: () => block } },
    getClientRects: () => [{ top: start - f.win.scrollY, bottom: start + 20 - f.win.scrollY, left: 10, right: 100, width: 90, height: 20 }] };
  f.win.innerWidth = 1000;
  f.controller.positiveRanges = () => [range];
  return { block, range };
}
test('positive pause toggle defaults off, validates and preserves tab state through navigation', () => {
  assert.equal(defaults().pauseAfterPositive, false);
  const s = command(hello(defaults()), 'set', { enabled: true, pauseAfterPositive: true });
  assert.equal(hello(s, 'detail', 'https://site.test/detail').pauseAfterPositive, true);
  assert.equal(command(s, 'set', { paused: true }).pauseAfterPositive, true);
  for (const value of [null, 1, 'true']) assert.throws(() => command(s, 'set', { pauseAfterPositive: value }));
});
test('highlight encounter finishes current content, clamps at next boundary, pauses once and resumes', async () => {
  const f = fixture(); await flush(); positiveFixture(f);
  await f.set({ enabled: true, pauseAfterPositive: true, speed: 600 });
  await f.step(100); assert.equal(f.controller.state.paused, false);
  for (let i = 0; i < 20 && !f.controller.state.paused; i++) await f.step(100);
  assert.equal(f.win.scrollY, 800); assert.equal(f.controller.state.paused, true);
  assert.match(f.controller.state.reason, /Positive keyword/);
  assert.equal(f.frames.size, 0); assert.equal(f.calls.includes('scroll.next'), false);
  await f.set({ paused: false }); await f.step(100);
  assert.equal(f.win.scrollY, 860); assert.equal(f.controller.state.paused, false);
});
test('disabled option, offscreen positives and absent positive highlights do not trigger pauses', async () => {
  for (const mode of ['disabled', 'offscreen', 'negative']) {
    const f = fixture(); await flush(); positiveFixture(f, { start: mode === 'offscreen' ? 1900 : 100 });
    if (mode === 'negative') f.controller.positiveRanges = () => [];
    await f.set({ enabled: true, pauseAfterPositive: mode !== 'disabled', speed: 600 });
    for (let i = 0; i < 16; i++) await f.step(100);
    assert.equal(f.controller.state.paused, false); assert.equal(f.win.scrollY, 960);
    f.controller.dispose();
  }
});
test('turning the option off cancels an armed pause; detached content is discarded', async () => {
  for (const mode of ['off', 'detached']) {
    const f = fixture(); await flush(); const { block } = positiveFixture(f);
    await f.set({ enabled: true, pauseAfterPositive: true, speed: 600 }); await f.step(100);
    if (mode === 'off') await f.set({ pauseAfterPositive: false }); else block.isConnected = false;
    for (let i = 0; i < 16; i++) await f.step(100);
    assert.equal(f.controller.state.paused, false);
    f.controller.dispose();
  }
});
test('final positive content pauses at reachable document end before pagination', async () => {
  const f = fixture(); await flush(); const { block } = positiveFixture(f, { end: 2000 });
  block.nextElementSibling = null;
  await f.set({ enabled: true, pauseAfterPositive: true, speed: 600 });
  f.win.scrollY = 1480; // Encounter was already armed while reading the block.
  f.controller.positivePause.target = block;
  await f.step(100);
  assert.equal(f.win.scrollY, 1500); assert.equal(f.controller.state.paused, true);
  assert.equal(f.calls.includes('scroll.next'), false);
});

test('armed boundary follows growing content and newly appended sections', async () => {
  const f = fixture(); await flush(); const { block } = positiveFixture(f);
  await f.set({ enabled: true, pauseAfterPositive: true, speed: 600 }); await f.step(100);
  block.getBoundingClientRect = () => ({ bottom: 1000 - f.win.scrollY });
  block.nextElementSibling.getBoundingClientRect = () => ({ top: 1100 - f.win.scrollY, height: 500 });
  for (let i = 0; i < 20 && !f.controller.state.paused; i++) await f.step(100);
  assert.equal(f.win.scrollY, 1100); assert.equal(f.controller.state.paused, true);
});
