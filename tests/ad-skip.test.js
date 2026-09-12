import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { skipLabel } from '../src/ads/skip.js';
import { createStore, scanningState } from '../src/storage/store.js';

test('ad skip labels accept common variants without unrelated skips or countdowns', () => {
  for (const value of ['Skip this ad', ' SKIP\n this   ad ', 'Skip ad', 'Skip ads', 'Skip advert', 'Skip advertisement', 'Skip all ads now', 'Skip commercial »']) assert.equal(skipLabel(value), true);
  for (const value of ['', null, 'Skip', 'Skip intro', 'Skip trial', 'Do not skip this ad', 'Skip this ad in 5']) assert.equal(skipLabel(value), false);
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const bundle = await build({ entryPoints: ['src/ads/skip.js'], bundle: true, write: false, format: 'iife', globalName: 'ads' });
  await page.setContent(`<style>#player {position:relative;width:900px;height:800px} video {position:absolute;width:900px;height:800px;inset:0} #controls {position:relative} button {display:block;margin:4px} #covered {position:absolute;top:0;left:500px} #cover {position:absolute;top:0;left:490px;width:220px;height:80px;background:white;z-index:10}</style>
    <div id="player"><video muted playsinline></video><div id="controls"><button id="good"><span>Skip this ad</span></button><button id="aria" aria-label="Skip this ad">→</button><input id="input" type="button" value="Skip this ad">
    <button id="disabled" disabled>Skip this ad</button><button id="aria-disabled" aria-disabled="true">Skip this ad</button><button id="hidden" hidden>Skip this ad</button>
    <button id="opacity" style="opacity:0">Skip this ad</button><button id="pointer" style="pointer-events:none">Skip this ad</button><button id="covered">Skip this ad</button><div id="cover"></div>
    <button id="offscreen" style="position:absolute;top:2000px">Skip this ad</button><div id="text">Skip this ad</div><button id="wrong">Skip this ad in 5</button>
    <button id="plural">Skip ads</button><button id="advert" title="Skip advertisement">×</button><div id="custom" class="ad-skip-button" style="cursor:pointer">Skip</div><button id="intro">Skip intro</button><button id="generic">Skip</button><button id="countdown" aria-label="Skip ad">Skip in 5 seconds</button>
    <fieldset disabled><button id="fieldset">Skip this ad</button></fieldset><div inert><button id="inert">Skip this ad</button></div></div></div><button id="outside">Skip ads</button>`);
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.evaluate(() => {
    window.clicks = {};
    document.addEventListener('click', event => { const id = event.target.closest('[id]')?.id; clicks[id] = (clicks[id] ?? 0) + 1; });
    window.skipper = new ads.AdSkipper(document);
    skipper.scan();
  });
  assert.deepEqual(await page.evaluate(() => clicks), {});
  await page.evaluate(() => { skipper.configure(true); skipper.scan(); });
  assert.deepEqual(await page.evaluate(() => clicks), {});
  await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 900; canvas.height = 800;
    window.paint = setInterval(() => { const ctx = canvas.getContext('2d'); ctx.fillStyle = 'black'; ctx.fillRect(0, 0, 900, 800); }, 30);
    const video = document.querySelector('video'); video.srcObject = canvas.captureStream(30); await video.play();
  });
  await page.waitForFunction(() => document.querySelector('video').currentTime > 0);
  await page.evaluate(() => { skipper.scan(); skipper.scan(); });
  assert.deepEqual(await page.evaluate(() => clicks), { good: 1, aria: 1, input: 1, plural: 1, advert: 1, custom: 1 });
  await page.evaluate(() => { document.querySelector('#disabled').disabled = false; document.querySelector('#cover').remove(); });
  await page.waitForFunction(() => clicks.disabled === 1 && clicks.covered === 1);
  await page.evaluate(() => { document.querySelector('#good').hidden = true; skipper.scan(); document.querySelector('#good').hidden = false; });
  await page.waitForFunction(() => clicks.good === 2);
  // Persist duplicate protection across reinjection, but cancel old timers/listeners.
  await page.evaluate(() => { const seen = skipper.clicked; skipper.dispose(); window.skipper = new ads.AdSkipper(document, seen); skipper.configure(true); skipper.scan(); });
  assert.equal(await page.evaluate(() => clicks.good), 2);
  // A paused main player cannot be replaced by a playing sidebar thumbnail.
  await page.evaluate(async () => {
    const video = document.querySelector('video'); video.pause();
    const preview = document.createElement('video'); preview.muted = true;
    preview.style.cssText = 'position:fixed;left:1000px;top:20px;width:200px;height:120px';
    preview.srcObject = video.srcObject; document.body.append(preview); await preview.play();
    document.querySelector('#controls').insertAdjacentHTML('afterbegin', '<button id="paused">Skip ad</button>');
    skipper.scan();
  });
  assert.equal(await page.evaluate(() => clicks.paused), undefined);
  await page.evaluate(async () => { await document.querySelector('video').play(); });
  await page.waitForFunction(() => clicks.paused === 1);
  assert.equal(await page.evaluate(() => clicks.good), 2);
  await page.evaluate(() => { document.querySelector('#player').classList.add('ad-showing'); skipper.scan(); });
  assert.equal(await page.evaluate(() => clicks.generic), 1);
  assert.equal(await page.evaluate(() => clicks.intro), undefined);
  await page.evaluate(() => {
    document.querySelector('video').style.visibility = 'hidden';
    document.querySelector('#controls').insertAdjacentHTML('afterbegin', '<button id="invisible-video">Skip ads</button>');
    skipper.scan();
  });
  assert.equal(await page.evaluate(() => clicks['invisible-video']), undefined);
  await page.evaluate(() => { document.querySelector('video').style.visibility = ''; skipper.scan(); });
  assert.equal(await page.evaluate(() => clicks['invisible-video']), 1);
  await page.evaluate(() => { skipper.configure(false); document.querySelector('#controls').insertAdjacentHTML('afterbegin', '<button id="new">Skip this ad</button>'); });
  await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => clicks.new), undefined);
  await page.evaluate(() => { skipper.configure(true); skipper.dispose(); });
  await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => clicks.new), undefined);
});

test('MGP ad-roll controls wait for skippable state and activate via mouseup rather than click', async t => {
  const browser = await chromium.launch({ channel: 'chromium', headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  const bundle = await build({ entryPoints: ['src/ads/skip.js'], bundle: true, write: false, format: 'iife', globalName: 'ads' });
  await page.setContent(`<div class="adRollRunning" style="position:relative;width:800px;height:450px">
    <video muted playsinline style="width:800px;height:450px"></video>
    <div class="adRollContainer" style="position:absolute;inset:0">
      <div class="adRollSkipButton" style="position:absolute;bottom:20px;right:20px;background:white;padding:10px;cursor:pointer"><div class="adRollSkipButtonContent">Skip Ad</div></div>
    </div></div>`);
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 450;
    window.paint = setInterval(() => canvas.getContext('2d').fillRect(0, 0, 800, 450), 30);
    const video = document.querySelector('video'); video.srcObject = canvas.captureStream(30); await video.play();
    window.skips = 0; window.mouseups = 0; window.clickEvents = 0;
    const control = document.querySelector('.adRollSkipButton');
    // MGP's desktop adapter stops click; its action callback runs on mouseup.
    control.addEventListener('click', event => { clickEvents++; event.stopPropagation(); event.preventDefault(); });
    control.addEventListener('mouseup', event => {
      if (event.button !== 0) return;
      event.stopPropagation(); event.preventDefault(); mouseups++;
      if (control.classList.contains('skippable')) skips++;
    });
    window.skipper = new ads.AdSkipper(document);
  });
  await page.waitForFunction(() => document.querySelector('video').currentTime > 0);
  await page.evaluate(() => { skipper.configure(true); skipper.scan(); });
  assert.deepEqual(await page.evaluate(() => ({ skips, mouseups, clickEvents })), { skips: 0, mouseups: 0, clickEvents: 0 });
  await page.evaluate(() => { document.querySelector('.adRollSkipButton').classList.add('skippable'); skipper.scan(); skipper.scan(); });
  assert.deepEqual(await page.evaluate(() => ({ skips, mouseups, clickEvents })), { skips: 1, mouseups: 1, clickEvents: 0 });
  // A reused control must wait through the next countdown before skipping again.
  await page.evaluate(() => { document.querySelector('.adRollSkipButton').classList.remove('skippable'); skipper.scan(); });
  await page.evaluate(() => { document.querySelector('.adRollSkipButton').classList.add('skippable'); skipper.scan(); });
  assert.equal(await page.evaluate(() => skips), 2);
  await page.evaluate(() => { document.querySelector('video').pause(); document.querySelector('.adRollSkipButton').classList.remove('skippable'); skipper.scan(); });
  await page.evaluate(() => { document.querySelector('.adRollSkipButton').classList.add('skippable'); skipper.scan(); });
  assert.equal(await page.evaluate(() => skips), 2);
  await page.evaluate(() => skipper.dispose());
});
