import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { skipLabel } from '../src/ads/skip.js';
import { createStore, scanningState } from '../src/storage/store.js';

test('ad skip label is exact with case and whitespace normalization', () => {
  for (const value of ['Skip this ad', ' SKIP\n this   ad ']) assert.equal(skipLabel(value), true);
  for (const value of ['', null, 'Skip ad', 'Do not skip this ad', 'Skip this ad in 5', 'Skip this advert']) assert.equal(skipLabel(value), false);
});
test('ad skip setting defaults off, validates, persists independently and retains state on failed writes', async () => {
  const data = {};
  const area = { get: async key => ({ [key]: structuredClone(data[key]) }), set: async values => Object.assign(data, structuredClone(values)) };
  const store = createStore(area);
  assert.equal(scanningState(await store.read()).autoSkipAds, false);
  for (const value of [undefined, null, 1, 'true']) assert.throws(() => store.saveAdSkip(value));
  await store.saveAdSkip(true);
  await store.update(state => ({ ...state, enabled: false }));
  assert.equal(scanningState(await createStore(area).read()).autoSkipAds, true);
  const failing = createStore({ ...area, set: async () => { throw Error('failed'); } });
  await assert.rejects(failing.saveAdSkip(false), /failed/);
  assert.equal(scanningState(await store.read()).autoSkipAds, true);
  await store.saveAdSkip(false);
  assert.equal(scanningState(await store.read()).autoSkipAds, false);
});
test('ad skipper checks real visibility/hit targets, detects appearance changes and disposes pending work', async t => {
  const browser = await chromium.launch({ channel: 'chromium', headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  const bundle = await build({ entryPoints: ['src/ads/skip.js'], bundle: true, write: false, format: 'iife', globalName: 'ads' });
  await page.setContent(`<style>button {display:block;margin:4px} #covered {position:absolute;top:0;left:500px} #cover {position:absolute;top:0;left:490px;width:220px;height:80px;background:white;z-index:10}</style>
    <button id="good"><span>Skip this ad</span></button><button id="aria" aria-label="Skip this ad">→</button><input id="input" type="button" value="Skip this ad">
    <button id="disabled" disabled>Skip this ad</button><button id="aria-disabled" aria-disabled="true">Skip this ad</button><button id="hidden" hidden>Skip this ad</button>
    <button id="opacity" style="opacity:0">Skip this ad</button><button id="pointer" style="pointer-events:none">Skip this ad</button><button id="covered">Skip this ad</button><div id="cover"></div>
    <button id="offscreen" style="position:absolute;top:2000px">Skip this ad</button><div id="text">Skip this ad</div><button id="wrong">Skip this ad in 5</button>
    <fieldset disabled><button id="fieldset">Skip this ad</button></fieldset><div inert><button id="inert">Skip this ad</button></div>`);
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.evaluate(() => {
    window.clicks = {};
    document.addEventListener('click', event => { const id = event.target.closest('[id]')?.id; clicks[id] = (clicks[id] ?? 0) + 1; });
    window.skipper = new ads.AdSkipper(document);
    skipper.scan();
  });
  assert.deepEqual(await page.evaluate(() => clicks), {});
  await page.evaluate(() => { skipper.configure(true); skipper.scan(); skipper.scan(); });
  assert.deepEqual(await page.evaluate(() => clicks), { good: 1, aria: 1, input: 1 });
  await page.evaluate(() => { document.querySelector('#disabled').disabled = false; document.querySelector('#cover').remove(); });
  await page.waitForFunction(() => clicks.disabled === 1 && clicks.covered === 1);
  await page.evaluate(() => { document.querySelector('#good').hidden = true; skipper.scan(); document.querySelector('#good').hidden = false; });
  await page.waitForFunction(() => clicks.good === 2);
  // Persist duplicate protection across reinjection, but cancel old timers/listeners.
  await page.evaluate(() => { const seen = skipper.clicked; skipper.dispose(); window.skipper = new ads.AdSkipper(document, seen); skipper.configure(true); skipper.scan(); });
  assert.equal(await page.evaluate(() => clicks.good), 2);
  await page.evaluate(() => { skipper.configure(false); document.body.insertAdjacentHTML('afterbegin', '<button id="new">Skip this ad</button>'); });
  await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => clicks.new), undefined);
  await page.evaluate(() => { skipper.configure(true); skipper.dispose(); });
  await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => clicks.new), undefined);
});
