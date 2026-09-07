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
  await panel.goto(`chrome-extension://${id}/popup/index.html`);
  await panel.getByRole('button', { name: 'New profile' }).click();
  await panel.getByLabel('Profile name').fill('AI Infrastructure');
  await panel.getByLabel('Positive keywords', { exact: true }).fill('GPU\ninference\ndata center');
  await panel.getByLabel('Negative keywords', { exact: true }).fill('gaming');
  await panel.getByRole('button', { name: 'Save profile' }).click();
  await panel.getByText('Profile saved.', { exact: true }).waitFor();
  assert.equal(await panel.getByLabel('Use sidebar').isChecked(), false);
  await panel.getByLabel('Seed keywords').fill('GPU');
  await panel.getByRole('button', { name: 'Get suggestions' }).click();
  await panel.locator('#status').filter({ hasText: 'AI keyword suggestions require an OpenAI API key' }).waitFor();
  assert.equal(await panel.getByRole('button', { name: 'Configure API key' }).isVisible(), true);
  assert.equal((await panel.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'state.get' })).data)).hasApiKey, false);
  const site = await context.newPage();
  await site.goto(`http://127.0.0.1:${server.address().port}`);
  await waitFor(site, () => CSS.highlights.get('spotadog-matches')?.size === 4);
  assert.deepEqual(await site.evaluate(() => [...CSS.highlights.get('spotadog-matches')].map(r => r.toString())), ['GPU', 'inference', 'data center', 'GPU']);
  assert.deepEqual(await site.evaluate(() => [...CSS.highlights.get('spotadog-negative')].map(r => r.toString())), ['gaming']);
  assert.equal(await site.locator('#positive').innerHTML(), 'GPU inference data center.');
  await site.evaluate(() => { const p = document.createElement('p'); p.id = 'dynamic'; p.textContent = 'CUDA GPU'; document.body.append(p); });
  await waitFor(site, () => CSS.highlights.get('spotadog-matches')?.size === 5);
  await site.evaluate(() => { document.querySelector('#later').hidden = false; });
  await waitFor(site, () => CSS.highlights.get('spotadog-matches')?.size === 6);
  await site.evaluate(() => { document.querySelector('#dynamic').textContent = 'No match'; });
  await waitFor(site, () => CSS.highlights.get('spotadog-matches')?.size === 5);
  await panel.getByLabel('Highlight pages').uncheck();
  await waitFor(site, () => !CSS.highlights.has('spotadog-matches') && !CSS.highlights.has('spotadog-negative'));
  await panel.getByLabel('Highlight pages').check();
  await waitFor(site, () => CSS.highlights.get('spotadog-matches')?.size === 5);
  await panel.getByLabel('AI Infrastructure', { exact: true }).uncheck();
  await waitFor(site, () => !CSS.highlights.has('spotadog-matches') && !CSS.highlights.has('spotadog-negative'));
  await panel.getByLabel('AI Infrastructure', { exact: true }).check();
  await waitFor(site, () => CSS.highlights.get('spotadog-matches')?.size === 5);
  await panel.getByRole('button', { name: 'Edit', exact: true }).click();
  await panel.getByLabel('Positive keywords', { exact: true }).fill('GPU\nCUDA');
  await panel.getByRole('button', { name: 'Save profile' }).click();
  await waitFor(site, () => CSS.highlights.get('spotadog-matches')?.size === 3);
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
  await panel.getByRole('button', { name: 'Dismiss <img src=x onerror=alert(1)>', exact: true }).click();
  assert.equal(await panel.locator('#suggestions input').count(), 1);
  assert.deepEqual((await getState()).profiles[0].positiveKeywords, ['GPU', 'CUDA']);
  await panel.getByLabel('LLM', { exact: true }).check();
  await panel.getByRole('button', { name: 'Add selected' }).click();
  await panel.getByText('Selected keywords added.', { exact: true }).waitFor();
  assert.deepEqual((await getState()).profiles[0].positiveKeywords, ['GPU', 'CUDA', 'LLM']);
  // Approval to the negative list while paused never activates scanning.
  await panel.getByLabel('Highlight pages').uncheck();
  await waitFor(site, () => CSS.highlights.size === 0);
  await panel.getByRole('button', { name: 'Get suggestions' }).click();
  await panel.getByText('Choose the suggestions you want to keep.', { exact: true }).waitFor();
  await panel.getByLabel('LLM', { exact: true }).check();
  await panel.getByLabel('Keyword list', { exact: true }).selectOption('negativeKeywords');
  await panel.getByRole('button', { name: 'Add selected' }).click();
  await panel.getByText('Selected keywords added.', { exact: true }).waitFor();
  assert.deepEqual((await getState()).profiles[0].negativeKeywords, ['gaming', 'LLM']);
  await site.evaluate(() => { document.querySelector('#dynamic').textContent = 'GPU LLM'; });
  await site.waitForTimeout(250);
  assert.equal(await site.evaluate(() => CSS.highlights.size), 0);
  await panel.getByLabel('Highlight pages').check();
  await waitFor(site, () => CSS.highlights.get('spotadog-negative')?.size === 2);
  // Negative-only profiles start scanning; overlapping positives return on disable.
  const secondary = await panel.evaluate(async () => {
    await chrome.runtime.sendMessage({ type: 'profile.save', profile: { name: 'Negative only', positiveKeywords: [], negativeKeywords: ['GPU'] } });
    return (await chrome.runtime.sendMessage({ type: 'state.get' })).data.profiles[1].id;
  });
  await waitFor(site, () => !CSS.highlights.has('spotadog-matches') && CSS.highlights.get('spotadog-negative')?.size === 6);
  await panel.getByLabel('AI Infrastructure', { exact: true }).uncheck();
  await waitFor(site, () => CSS.highlights.get('spotadog-negative')?.size === 4);
  await panel.getByLabel('AI Infrastructure', { exact: true }).check();
  await panel.evaluate(async id => { await chrome.runtime.sendMessage({ type: 'profile.delete', id }); }, secondary);
  await waitFor(site, () => CSS.highlights.get('spotadog-matches')?.size === 4 && CSS.highlights.get('spotadog-negative')?.size === 2);
  // Dismissing the entire review, including selected candidates, never writes.
  await panel.getByRole('button', { name: 'Get suggestions' }).click();
  await panel.getByText('Choose the suggestions you want to keep.', { exact: true }).waitFor();
  await panel.getByLabel('LLM', { exact: true }).check();
  const beforeDismiss = await getState();
  await panel.getByRole('button', { name: 'Dismiss all', exact: true }).click();
  assert.deepEqual(await getState(), beforeDismiss);
  assert.equal(await panel.locator('#review').isVisible(), false);
  // Storage failure leaves the review intact and reports failure without mutation.
  await panel.getByRole('button', { name: 'Get suggestions' }).click();
  await panel.getByText('Choose the suggestions you want to keep.', { exact: true }).waitFor();
  await panel.getByLabel('LLM', { exact: true }).check();
  await worker.evaluate(() => {
    globalThis.originalStorageSet = chrome.storage.local.set;
    chrome.storage.local.set = async () => { throw new Error('Storage unavailable. Try again.'); };
  });
  await panel.getByRole('button', { name: 'Add selected' }).click();
  await panel.getByText('Storage unavailable. Try again.', { exact: true }).waitFor();
  assert.deepEqual(await getState(), beforeDismiss);
  assert.equal(await panel.locator('#review').isVisible(), true);
  await worker.evaluate(() => { chrome.storage.local.set = globalThis.originalStorageSet; delete globalThis.originalStorageSet; });
  await panel.getByRole('button', { name: 'Dismiss all', exact: true }).click();
  // A deleted target cannot receive approvals.

  const rejected = await panel.evaluate(async () => chrome.runtime.sendMessage({ type: 'profile.addKeywords', id: 'deleted', target: 'positiveKeywords', keywords: ['unapproved'] }));
  assert.equal(rejected.ok, false);
  assert.deepEqual(await getState(), beforeDismiss);
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
  await popup.getByLabel('AI Infrastructure', { exact: true }).waitFor();
  await popup.getByLabel('Highlight pages').uncheck();
  await panel.waitForFunction(() => !document.querySelector('#global-enabled').checked);
  await waitFor(site, () => CSS.highlights.size === 0);
  await popup.getByLabel('Highlight pages').check();
  await panel.waitForFunction(() => document.querySelector('#global-enabled').checked);
  await popup.close();
  await waitFor(site, () => CSS.highlights.get('spotadog-negative')?.size === 2);
  await panel.reload();
  await panel.getByLabel('AI Infrastructure', { exact: true }).waitFor();
  assert.equal(await panel.locator('#review').isVisible(), false);
  await mkdir('test-results', { recursive: true });
  await panel.setViewportSize({ width: 380, height: 1000 });
  await panel.getByLabel('Seed keywords').fill('artificial intelligence');
  await panel.getByRole('button', { name: 'Get suggestions' }).click();
  await panel.getByText('Choose the suggestions you want to keep.', { exact: true }).waitFor();
  await panel.screenshot({ path: 'test-results/sidepanel.png', fullPage: true });
  await site.screenshot({ path: 'test-results/highlights.png', fullPage: true });
  await site.bringToFront();
  await panel.getByText('This page supports highlighting.', { exact: true }).waitFor();
  await options.bringToFront();
  await panel.locator('#page-status').filter({ hasText: 'Highlighting is unavailable on this page.' }).waitFor();
  assert.equal((await getState()).enabled, true);
  await options.screenshot({ path: 'test-results/settings.png', fullPage: true });
  // Real Chrome API configuration: global mode applies to current and new tabs.
  const beforeMode = await getState();
  await panel.getByLabel('Use sidebar').check();
  await panel.waitForFunction(async () => (await chrome.runtime.sendMessage({ type: 'state.get' })).data.preferences.sidebar);
  const routing = () => worker.evaluate(async () => ({
    popup: await chrome.action.getPopup({}),
    behavior: await chrome.sidePanel.getPanelBehavior(),
    options: await chrome.sidePanel.getOptions({})
  }));
  await panel.waitForFunction(() => !document.querySelector('#sidebar-mode').disabled);
  assert.equal(await panel.locator('#status').textContent(), 'Sidebar mode saved.');
  assert.equal((await routing()).popup, '');
  assert.equal((await routing()).behavior.openPanelOnActionClick, true);
  assert.equal((await routing()).options.enabled, true);
  const anotherTab = await context.newPage();
  await anotherTab.goto(`chrome-extension://${id}/sidepanel/index.html`);
  await anotherTab.getByLabel('Use sidebar').waitFor();
  await anotherTab.waitForFunction(() => document.querySelector('#sidebar-mode').checked);
  const perTab = await anotherTab.evaluate(async () => {
    const tab = await chrome.tabs.getCurrent();
    return { popup: await chrome.action.getPopup({ tabId: tab.id }), options: await chrome.sidePanel.getOptions({ tabId: tab.id }) };
  });
  assert.equal(perTab.popup, '');
  assert.equal(perTab.options.enabled, true);
  await anotherTab.getByLabel('Use sidebar').uncheck();
  await anotherTab.waitForFunction(async () => !(await chrome.runtime.sendMessage({ type: 'state.get' })).data.preferences.sidebar);
  assert.deepEqual(await getState(), beforeMode);
  assert.equal((await routing()).popup, `chrome-extension://${id}/popup/index.html`);
  assert.equal((await routing()).behavior.openPanelOnActionClick, false);
  assert.equal((await routing()).options.enabled, false);
  // Failure restores browser routing and leaves the saved preference unchanged.
  await worker.evaluate(() => { globalThis.savedSet = chrome.storage.local.set; chrome.storage.local.set = async () => { throw new Error('Display storage failed'); }; });
  const failedMode = await anotherTab.evaluate(() => chrome.runtime.sendMessage({ type: 'display.set', sidebar: true }));
  assert.equal(failedMode.ok, false);
  assert.equal((await routing()).popup, `chrome-extension://${id}/popup/index.html`);
  assert.deepEqual(await getState(), beforeMode);
  await worker.evaluate(() => { chrome.storage.local.set = globalThis.savedSet; });
  const invalidMode = await anotherTab.evaluate(() => chrome.runtime.sendMessage({ type: 'display.set', sidebar: 'true' }));
  assert.equal(invalidMode.ok, false);
  await anotherTab.getByLabel('Use sidebar').check();
  await anotherTab.waitForFunction(async () => (await chrome.runtime.sendMessage({ type: 'state.get' })).data.preferences.sidebar);
  await context.close();
  context = await launch();
  const restored = await context.newPage();
  await restored.goto(`chrome-extension://${id}/sidepanel/index.html`);
  await restored.getByLabel('AI Infrastructure', { exact: true }).waitFor();
  const persisted = await restored.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'state.get' })).data);
  assert.deepEqual(persisted.profiles[0].positiveKeywords, ['GPU', 'CUDA', 'LLM']);
  assert.deepEqual(persisted.profiles[0].negativeKeywords, ['gaming', 'LLM']);
  assert.equal(persisted.hasApiKey, true);
  assert.equal(persisted.enabled, true);
  assert.equal(persisted.preferences.model, 'test-model');
  assert.equal(persisted.preferences.sidebar, true);
  await restored.waitForFunction(async () => (await chrome.action.getPopup({})) === '' && (await chrome.sidePanel.getPanelBehavior()).openPanelOnActionClick);
  await restored.getByLabel('Use sidebar').uncheck();
  await restored.waitForFunction(async () => (await chrome.action.getPopup({})).endsWith('/popup/index.html'));
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
