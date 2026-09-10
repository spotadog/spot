import test from 'node:test';
import assert from 'node:assert/strict';
import { createVisitStore } from '../src/storage/store.js';
import { visitService } from '../src/background/visits.js';
import { build } from 'esbuild';
import { chromium } from 'playwright';
function area() {
  const data = {}; let fail = false;
  return { data, fail: value => { fail = value; }, async get(key) { return structuredClone({ [key]: data[key] }); },
    async set(values) { if (fail) throw Error('full'); Object.assign(data, structuredClone(values)); }, async remove(key) { delete data[key]; } };
}
const popup = (token, identity = 'https://site.test/item/1') => ({ token, identity, label: identity, source: 'https://site.test/', kind: 'overlay' });
test('popup history deduplicates deliveries, counts reopenings, separates identities/kinds and preserves URL counts', async () => {
  const local = area(), session = area(), store = createVisitStore(local, session);
  assert.equal((await store.recordPopup(popup('off'))).recorded, false);
  await store.configure({ enabled: true });
  await Promise.all([store.recordPopup(popup('one')), store.recordPopup(popup('one')), store.recordPopup(popup('two'))]);
  assert.equal((await store.read()).popups[0].count, 2);
  await store.record({ frameId: 0, tabId: 1, timeStamp: 1, url: 'https://site.test/' }, 'committed');
  await store.recordPopup(popup('three', 'https://site.test/item/2'));
  await store.recordPopup({ ...popup('four'), kind: 'browser' });
  const saved = await store.read();
  assert.equal(saved.entries[0].count, 1);
  assert.equal(saved.popups.length, 3);
  assert.equal(saved.popups[0].count, 2);
  assert.equal((await createVisitStore(local, session).read()).popups[0].count, 2);
  assert.deepEqual((await createVisitStore(local, area()).read()).popups, []);
  await store.configure({ mode: 'allTime' });
  assert.deepEqual((await store.read()).popups, []);
  await store.recordPopup(popup('all'));
  assert.equal((await createVisitStore(local, area()).read()).popups[0].count, 1);
  await store.configure({ enabled: false });
  await store.recordPopup(popup('disabled'));
  assert.equal((await store.read()).popups[0].count, 1);
  await store.clear();
  assert.deepEqual((await store.read()).popups, []);
  await store.configure({ mode: 'session' });
  assert.deepEqual((await store.read()).popups, []);
});
test('failed popup saves retry idempotently and reject malformed observations', async () => {
  const local = area(), session = area(), store = createVisitStore(local, session);
  await store.configure({ enabled: true });
  await store.recordPopup(popup('first'));
  session.fail(true);
  await assert.rejects(store.recordPopup(popup('second')), /full/);
  session.fail(false);
  assert.equal((await store.read()).popups[0].count, 1);
  await store.recordPopup(popup('second'));
  assert.equal((await store.read()).popups[0].count, 2);
  await assert.rejects(store.recordPopup({ ...popup('bad'), identity: 123 }), /Invalid/);
});
function event() { let listener; return { addListener(fn) { listener = fn; }, emit: value => listener(value) }; }
test('browser popup windows/opener tabs are detected, normal tabs ignored, content reads stay scoped', async () => {
  const store = createVisitStore(area(), area());
  await store.configure({ enabled: true });
  const api = { runtime: { id: 'ext', async sendMessage() {} }, webNavigation: { onCommitted: event(), onHistoryStateUpdated: event(), onReferenceFragmentUpdated: event() },
    tabs: { onRemoved: event(), async query() { return []; }, async get(id) { return { windowId: id, ...(id === 2 ? { openerTabId: 10 } : {}) }; } },
    windows: { async get(id) { return { type: id === 1 ? 'popup' : 'normal' }; } } };
  const handle = visitService(api, store);
  for (const tabId of [1, 2, 3]) await api.webNavigation.onCommitted.emit({ tabId, url: 'https://site.test/item', timeStamp: tabId, frameId: 0 });
  assert.equal((await store.read()).popups[0].count, 2);
  await api.webNavigation.onCommitted.emit({ tabId: 1, url: 'https://site.test/item', timeStamp: 1, frameId: 0 });
  assert.equal((await store.read()).popups[0].count, 2);
  const sender = { id: 'ext', tab: { id: 1 }, frameId: 0, documentId: 'doc', url: 'https://site.test/' };
  await handle({ type: 'popups.record', ...popup('content') }, sender);
  assert.equal((await store.read()).popups.length, 2);
  assert.deepEqual(await handle({ type: 'popups.settings' }, sender), { enabled: true, mode: 'session' });
  await assert.rejects(handle({ type: 'popups.record', ...popup('bad') }, { ...sender, frameId: 1 }), /Invalid popup source/);
  await assert.rejects(handle({ type: 'popups.settings' }, { ...sender, id: 'other' }), /Invalid popup source/);
});
test('DOM detection distinguishes visible dialogs/overlays and chooses stable item or activating URL identities', async t => {
  const browser = await chromium.launch({ channel: 'chromium', headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  const bundle = await build({ entryPoints: ['src/popups/detection.js'], bundle: true, write: false, format: 'iife', globalName: 'fixture' });
  await page.setContent(`<div class="overlay" style="position:fixed;inset:0;z-index:5"><div id="dialog" role="dialog" style="width:200px;height:100px">Hello</div></div>
    <div id="hidden" role="dialog" hidden>Hidden</div><dialog id="closed">Closed</dialog>
    <div class="popup" id="static" style="height:100px">Ordinary layout</div>
    <div class="popup" id="fake" style="position:fixed;top:200px;width:200px;height:80px;z-index:2">Fake popup</div>`);
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  assert.deepEqual(await page.evaluate(() => fixture.visiblePopups(document).map(node => node.id)), ['dialog', 'fake']);
  await page.locator('#dialog').evaluate(node => node.parentElement.setAttribute('role', 'dialog'));
  assert.deepEqual(await page.evaluate(() => fixture.visiblePopups(document).map(node => node.id)), ['dialog', 'fake'], 'nested semantic wrappers count once');
  assert.equal(await page.evaluate(() => fixture.popupIdentity(document.querySelector('#dialog'), 'https://site.test/', { url: 'https://site.test/item/42' }).identity), 'https://site.test/item/42');
  await page.locator('#dialog').evaluate(node => node.dataset.itemId = '43');
  assert.match(await page.evaluate(() => fixture.popupIdentity(document.querySelector('#dialog'), 'https://site.test/', { url: 'https://site.test/item/42' }).identity), /item:43$/);
});
test('overlay observer counts appearances once, handles reopen/reused items, disabled tracking and disposal', async t => {
  const browser = await chromium.launch({ channel: 'chromium', headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  const bundle = await build({ entryPoints: ['src/content/popups.js'], bundle: true, write: false, format: 'iife', globalName: 'fixture' });
  await page.setContent('<div id="modal" role="dialog" data-item-id="one" hidden style="width:200px;height:100px">Item</div>');
  await page.evaluate(() => {
    window.enabled = true; window.records = []; window.listeners = new Set();
    window.chrome = { runtime: { onMessage: { addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn) }, async sendMessage(message) {
      if (message.type === 'popups.settings') return { ok: true, data: { enabled } };
      records.push(message); return { ok: true, data: { recorded: true } };
    } } };
  });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.evaluate(() => { window.observer = fixture.wirePopups(); });
  await page.locator('#modal').evaluate(node => node.hidden = false);
  await page.waitForFunction(() => records.length === 1);
  await page.locator('#modal').evaluate(node => node.textContent = 'Updated content');
  // Let the observer process a genuine content mutation without another appearance.
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => records.length), 1);
  await page.locator('#modal').evaluate(node => node.hidden = true);
  await page.waitForFunction(() => __spotadogPopupAppearances.size === 0);
  await page.locator('#modal').evaluate(node => node.hidden = false);
  await page.waitForFunction(() => records.length === 2);
  await page.locator('#modal').evaluate(node => node.dataset.itemId = 'two');
  await page.waitForFunction(() => records.length === 3);
  await page.evaluate(() => { observer.dispose(); observer = fixture.wirePopups(); });
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => records.length), 3, 'reinjection retains acknowledgement');
  await page.evaluate(() => { enabled = false; for (const listener of listeners) listener({ type: 'popups.configure' }); });
  await page.waitForFunction(() => __spotadogPopupAppearances.size === 0);
  await page.locator('#modal').evaluate(node => node.dataset.itemId = 'three');
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => records.length), 3);
  await page.evaluate(() => observer.dispose());
  assert.equal(await page.evaluate(() => listeners.size), 0);
});
