import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createServer } from 'node:http';
const server = createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.end(`<!doctype html><html><body><h1>Scanning fixture</h1><p id="positive">GPU inference data center.</p><p id="negative">GPU gaming</p><p id="split">data <b>center</b></p><pre>GPU</pre><code>GPU</code><textarea>GPU</textarea><div contenteditable="true">GPU</div><p hidden>GPU</p><div style="display:none"><p>GPU</p></div><p id="later" hidden>GPU</p><script>window.fixture = 'GPU'</script></body></html>`);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const profileDir = await mkdtemp(join(tmpdir(), 'spotadog-test-'));
const errors = [];
let context;
const launch = () => chromium.launchPersistentContext(profileDir, { channel: 'chromium', headless: true, args: [`--disable-extensions-except=${resolve('dist')}`, `--load-extension=${resolve('dist')}`] });
async function waitFor(page, fn) { await page.waitForFunction(fn); }
try {
  context = await launch();
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).host;
  const panel = await context.newPage();
  panel.on('pageerror', e => errors.push(e.message));
  await panel.goto(`chrome-extension://${id}/sidepanel/index.html`);
  await panel.getByRole('button', { name: 'New profile' }).click();
  await panel.getByLabel('Profile name').fill('AI Infrastructure');
  await panel.getByLabel('Positive keywords', { exact: true }).fill('GPU\ninference\ndata center');
  await panel.getByLabel('Negative keywords', { exact: true }).fill('gaming');
  await panel.getByRole('button', { name: 'Save profile' }).click();
  await panel.getByText('Profile saved.', { exact: true }).waitFor();
  const site = await context.newPage();
  await site.goto(`http://127.0.0.1:${server.address().port}`);
  await waitFor(site, () => CSS.highlights.get('spotadog-matches')?.size === 3);
  assert.deepEqual(await site.evaluate(() => [...CSS.highlights.get('spotadog-matches')].map(r => r.toString())), ['GPU', 'inference', 'data center']);
  assert.equal(await site.locator('#positive').innerHTML(), 'GPU inference data center.');
  await site.evaluate(() => { const p = document.createElement('p'); p.id = 'dynamic'; p.textContent = 'CUDA GPU'; document.body.append(p); });
  await waitFor(site, () => CSS.highlights.get('spotadog-matches')?.size === 4);
  await site.evaluate(() => { document.querySelector('#later').hidden = false; });
  await waitFor(site, () => CSS.highlights.get('spotadog-matches')?.size === 5);
  await site.evaluate(() => { document.querySelector('#dynamic').textContent = 'No match'; });
  await waitFor(site, () => CSS.highlights.get('spotadog-matches')?.size === 4);
  await panel.getByLabel('Highlight pages').uncheck();
  await waitFor(site, () => !CSS.highlights.has('spotadog-matches'));
  await panel.getByLabel('Highlight pages').check();
  await waitFor(site, () => CSS.highlights.get('spotadog-matches')?.size === 4);
  await panel.getByLabel('AI Infrastructure', { exact: true }).uncheck();
  await waitFor(site, () => !CSS.highlights.has('spotadog-matches'));
  await panel.getByLabel('AI Infrastructure', { exact: true }).check();
  await waitFor(site, () => CSS.highlights.get('spotadog-matches')?.size === 4);
  await panel.getByRole('button', { name: 'Edit', exact: true }).click();
  await panel.getByLabel('Positive keywords', { exact: true }).fill('GPU\nCUDA');
  await panel.getByRole('button', { name: 'Save profile' }).click();
  await waitFor(site, () => CSS.highlights.get('spotadog-matches')?.size === 2);
  const options = await context.newPage();
  options.on('pageerror', e => errors.push(e.message));
  await options.goto(`chrome-extension://${id}/options/index.html`);
  await options.getByLabel('OpenAI API key', { exact: true }).fill('test-placeholder');
  await options.getByLabel('Model ID').fill('test-model');
  await options.getByRole('button', { name: 'Save settings' }).click();
  await options.getByText('Settings saved.', { exact: true }).waitFor();
  assert.equal(await options.getByLabel('OpenAI API key', { exact: true }).inputValue(), '');
  // Mock only the external network boundary inside the real extension worker.
  await worker.evaluate(() => {
    globalThis.fetch = async () => new Response(JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ suggestions: ['LLM', '<img src=x onerror=alert(1)>'] }) }] }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  await panel.getByLabel('Seed keywords').fill('artificial intelligence');
  await panel.getByRole('button', { name: 'Get suggestions' }).click();
  await panel.getByText('Choose the suggestions you want to keep.', { exact: true }).waitFor();
  const getState = () => panel.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'state.get' })).data);
  assert.deepEqual((await getState()).profiles[0].positiveKeywords, ['GPU', 'CUDA']);
  assert.equal(await panel.locator('#suggestions img').count(), 0);
  await panel.getByLabel('LLM', { exact: true }).check();
  await panel.getByRole('button', { name: 'Add selected' }).click();
  await panel.getByText('Selected keywords added.', { exact: true }).waitFor();
  assert.deepEqual((await getState()).profiles[0].positiveKeywords, ['GPU', 'CUDA', 'LLM']);
  // Verify a real content-script sender cannot read storage or call privileged actions.
  const session = await context.newCDPSession(site);
  const worlds = [];
  session.on('Runtime.executionContextCreated', event => worlds.push(event.context));
  await session.send('Runtime.enable');
  const isolated = worlds.find(world => world.origin === `chrome-extension://${id}` || world.name === 'Spot a Dog');
  assert.ok(isolated, 'Extension content-script world exists');
  const security = await session.send('Runtime.evaluate', {
    contextId: isolated.id, awaitPromise: true, returnByValue: true,
    expression: `(async () => {
      let storageBlocked = false;
      try { await chrome.storage.local.get(null); } catch { storageBlocked = true; }
      const forbidden = await chrome.runtime.sendMessage({ type: 'state.get' });
      const publicState = await chrome.runtime.sendMessage({ type: 'scan.get' });
      return { storageBlocked, forbidden, publicState };
    })()`
  });
  const access = security.result.value;
  assert.equal(access.storageBlocked, true);
  assert.equal(access.forbidden.ok, false);
  assert.equal(access.publicState.ok, true);
  assert.equal(JSON.stringify(access.publicState).includes('test-placeholder'), false);
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${id}/popup/index.html`);
  await popup.getByText('1 active profiles', { exact: true }).waitFor();
  await mkdir('test-results', { recursive: true });
  await panel.setViewportSize({ width: 380, height: 1000 });
  await panel.screenshot({ path: 'test-results/sidepanel.png', fullPage: true });
  await options.screenshot({ path: 'test-results/settings.png', fullPage: true });
  await context.close();
  context = await launch();
  const restored = await context.newPage();
  await restored.goto(`chrome-extension://${id}/sidepanel/index.html`);
  await restored.getByLabel('AI Infrastructure', { exact: true }).waitFor();
  const persisted = await restored.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'state.get' })).data);
  assert.deepEqual(persisted.profiles[0].positiveKeywords, ['GPU', 'CUDA', 'LLM']);
  assert.equal(persisted.hasApiKey, true);
  assert.equal(persisted.enabled, true);
  assert.equal(persisted.preferences.model, 'test-model');
  const restoredOptions = await context.newPage();
  await restoredOptions.goto(`chrome-extension://${id}/options/index.html`);
  await restoredOptions.getByText('An API key is saved.', { exact: true }).waitFor();
  await restoredOptions.getByRole('button', { name: 'Remove API key' }).click();
  await restoredOptions.getByText('API key removed.', { exact: true }).waitFor();
  assert.equal((await restored.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'state.get' })).data)).hasApiKey, false);
  restored.on('dialog', dialog => dialog.accept());
  await restored.getByRole('button', { name: 'Delete', exact: true }).click();
  await restored.getByText('Profile deleted.', { exact: true }).waitFor();
  assert.equal((await restored.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'state.get' })).data)).profiles.length, 0);
  assert.deepEqual(errors, []);
  console.log('Browser checks passed: real MV3 loading, profile CRUD, matching/exclusions, dynamic content, toggles, settings, mocked AI review, safe rendering, popup, and persistence across browser restart.');
} finally {
  await context?.close();
  await new Promise(resolve => server.close(resolve));
  await rm(profileDir, { recursive: true, force: true });
}
