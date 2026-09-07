import { checkProfileView } from './profile-view.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, readFile } from 'node:fs/promises';
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
async function addKeyword(page, kind, value) {
  const list = page.locator(`#${kind}`);
  await list.getByRole('button', { name: 'Add Keyword', exact: true }).click();
  const row = list.locator('.keyword-row').last();
  await row.getByRole('textbox').fill(value);
  await row.getByRole('button', { name: 'Save keyword', exact: true }).click();
}
async function clearKeywords(page, kind) {
  const remove = page.locator(`#${kind}`).getByRole('button', { name: 'Remove', exact: true });
  while (await remove.count()) {
    page.once('dialog', dialog => dialog.accept());
    await remove.first().click();
  }
}
try {
  context = await launch();
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  const id = new URL(worker.url()).host;
  const panel = await context.newPage();
  panel.on('pageerror', e => errors.push(e.message));
  await panel.goto(`chrome-extension://${id}/popup/index.html`);
  await panel.getByText('No profiles yet. Choose New profile to start.', { exact: true }).waitFor();
  assert.equal(await panel.locator('#profile-select').isEnabled(), false);
  assert.equal(await panel.locator('#editor').isVisible(), false);
  await panel.getByRole('button', { name: 'New profile' }).click();
  await panel.getByLabel('Profile name').fill('AI Infrastructure');
  for (const term of ['GPU', 'inference', 'data center']) await addKeyword(panel, 'positive', term);
  await addKeyword(panel, 'negative', 'gaming');
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
  // Optional live counts use the active page and never require a UI refresh.
  assert.equal(await panel.getByLabel('Track keyword occurrences').isChecked(), false);
  await panel.getByLabel('Track keyword occurrences').check();
  await site.bringToFront();
  const gpuCount = panel.locator('#positive .keyword-row').first().locator('.keyword-count');
  await gpuCount.filter({ hasText: 'Unique in context: 2 · Repeated: 2' }).waitFor();
  await site.evaluate(() => {
    const p = document.createElement('p'); p.id = 'count-fixture';
    p.textContent = 'GPU inference data center.'; document.body.append(p);
  });
  await gpuCount.filter({ hasText: 'Unique in context: 2 · Repeated: 3' }).waitFor();
  await site.evaluate(() => {
    document.querySelector('#count-fixture').textContent = 'GPU gpu';
    history.pushState({}, '', '/count-route');
  });
  await gpuCount.filter({ hasText: 'Unique in context: 3 · Repeated: 4' }).waitFor();
  const otherSite = await context.newPage();
  await otherSite.goto(`http://127.0.0.1:${server.address().port}/other`);
  await otherSite.bringToFront();
  await gpuCount.filter({ hasText: 'Unique in context: 2 · Repeated: 2' }).waitFor();
  await otherSite.close();
  await site.bringToFront();
  await gpuCount.filter({ hasText: 'Unique in context: 3 · Repeated: 4' }).waitFor();
  await site.evaluate(() => document.querySelector('#count-fixture').remove());
  await gpuCount.filter({ hasText: 'Unique in context: 2 · Repeated: 2' }).waitFor();
  await panel.getByLabel('Track keyword occurrences').uncheck();
  await gpuCount.waitFor({ state: 'hidden' });
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
  await panel.locator('#edit-profile').click();
  await panel.getByLabel('Profile enabled', { exact: true }).uncheck();
  await panel.getByRole('button', { name: 'Save profile' }).click();
  await panel.getByText('Profile saved.', { exact: true }).waitFor();
  await waitFor(site, () => !CSS.highlights.has('spotadog-matches') && !CSS.highlights.has('spotadog-negative'));
  await panel.locator('#edit-profile').click();
  await panel.getByLabel('Profile enabled', { exact: true }).check();
  await panel.getByRole('button', { name: 'Save profile' }).click();
  await panel.getByText('Profile saved.', { exact: true }).waitFor();
  await waitFor(site, () => CSS.highlights.get('spotadog-matches')?.size === 5);
  await panel.getByRole('button', { name: 'Edit', exact: true }).click();
  await clearKeywords(panel, 'positive');
  for (const term of ['GPU', 'CUDA']) await addKeyword(panel, 'positive', term);
  await panel.getByRole('button', { name: 'Save profile' }).click();
  await waitFor(site, () => CSS.highlights.get('spotadog-matches')?.size === 3);
  const options = await context.newPage();
  options.on('pageerror', e => errors.push(e.message));
  await options.goto(`chrome-extension://${id}/options/index.html`);
  await options.getByLabel('OpenAI API key', { exact: true }).fill('test-placeholder');
  await options.getByLabel('Model', { exact: true }).selectOption('custom');
  await options.getByLabel('Custom model ID').fill('test-model');
  await options.getByRole('button', { name: 'Save settings' }).click();
  await options.getByText('Settings saved.', { exact: true }).waitFor();
  assert.equal(await options.getByLabel('OpenAI API key', { exact: true }).inputValue(), '');
  // Curated models need no manual registration; switching preserves each provider's model/key.
  assert.equal(await options.locator('#model option').count(), 4);
  await options.getByLabel('Model', { exact: true }).selectOption('gpt-4.1-mini');
  await options.getByRole('button', { name: 'Save settings' }).click();
  await options.waitForFunction(() => document.querySelector('#active-model').textContent.includes('gpt-4.1-mini'));
  await options.reload();
  await options.waitForFunction(() => document.querySelector('#model').value === 'gpt-4.1-mini');
  await options.getByLabel('Provider', { exact: true }).selectOption('anthropic');
  assert.equal(await options.locator('#model option').count(), 4);
  assert.ok((await options.locator('#model').textContent()).includes('Claude Sonnet 5'));
  await options.getByLabel('Anthropic API key', { exact: true }).fill('anthropic-test-placeholder');
  await options.getByLabel('Model', { exact: true }).selectOption('claude-sonnet-5');
  await options.getByRole('button', { name: 'Save settings' }).click();
  await options.waitForFunction(() => document.querySelector('#active-model').textContent.includes('claude-sonnet-5'));
  await panel.locator('#ai-model').filter({ hasText: 'Anthropic — claude-sonnet-5' }).waitFor();
  assert.equal(await options.getByLabel('Anthropic API key', { exact: true }).inputValue(), '');
  await options.reload();
  await options.waitForFunction(() => document.querySelector('#model').value === 'claude-sonnet-5');
  await worker.evaluate(() => {
    globalThis.fetch = async (url, init) => {
      const body = JSON.parse(init.body);
      if (url !== 'https://api.anthropic.com/v1/messages' || body.model !== 'claude-sonnet-5' || init.headers['x-api-key'] !== 'anthropic-test-placeholder') throw Error('Wrong provider request');
      return new Response(JSON.stringify({ type: 'message', stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ suggestions: ['CUDA', 'gaming', '<img src=x>'] }) }] }));
    };
  });
  for (const [target, keyword] of [['positiveKeywords', 'CUDA'], ['negativeKeywords', 'gaming']]) {
    await panel.getByLabel('Seed keywords').fill('AI');
    await panel.getByRole('button', { name: 'Get suggestions' }).click();
    await panel.getByText('Choose the suggestions you want to keep.', { exact: true }).waitFor();
    assert.equal(await panel.locator('#suggestions img').count(), 0);
    await panel.getByLabel('Keyword list', { exact: true }).selectOption(target);
    await panel.getByLabel(keyword, { exact: true }).check();
    await panel.getByRole('button', { name: 'Add selected' }).click();
    await panel.getByText('Selected keywords added.', { exact: true }).waitFor();
  }
  await mkdir('test-results', { recursive: true });
  await options.screenshot({ path: 'test-results/anthropic-settings.png', fullPage: true });
  await options.getByRole('button', { name: 'Remove API key' }).click();
  await options.getByText('No API key saved. Add one to request suggestions.', { exact: true }).waitFor();
  await panel.getByRole('button', { name: 'Get suggestions' }).click();
  await panel.locator('#status').filter({ hasText: 'require an Anthropic API key' }).waitFor();
  await options.getByLabel('Provider', { exact: true }).selectOption('openai');
  assert.equal(await options.locator('#model').inputValue(), 'gpt-4.1-mini');
  await options.getByText('An API key is saved.', { exact: true }).waitFor();
  await options.getByLabel('Model', { exact: true }).selectOption('custom');
  await options.getByLabel('Custom model ID').fill('test-model');
  await options.getByRole('button', { name: 'Save settings' }).click();
  await options.waitForFunction(() => document.querySelector('#active-model').textContent.includes('test-model'));
  await panel.locator('#ai-model').filter({ hasText: 'OpenAI — test-model' }).waitFor();
  // Mock only the external network boundary inside the real extension worker.
  await worker.evaluate(() => {
    globalThis.fetch = async () => new Response(JSON.stringify({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ suggestions: ['LLM', '<img src=x onerror=alert(1)>'] }) }] }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  await panel.getByLabel('Seed keywords').fill('artificial intelligence');
  await panel.getByRole('button', { name: 'Get suggestions' }).click();
  await panel.getByText('Choose the suggestions you want to keep.', { exact: true }).waitFor();
  await panel.getByLabel('Keyword list', { exact: true }).selectOption('positiveKeywords');
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
  await panel.locator('#edit-profile').click();
  await panel.getByLabel('Profile enabled', { exact: true }).uncheck();
  await panel.getByRole('button', { name: 'Save profile' }).click();
  await panel.getByText('Profile saved.', { exact: true }).waitFor();
  await waitFor(site, () => CSS.highlights.get('spotadog-negative')?.size === 4);
  await panel.locator('#edit-profile').click();
  await panel.getByLabel('Profile enabled', { exact: true }).check();
  await panel.getByRole('button', { name: 'Save profile' }).click();
  await panel.getByText('Profile saved.', { exact: true }).waitFor();
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
  await popup.getByRole('heading', { name: 'AI Infrastructure', exact: true }).waitFor();
  await popup.getByLabel('Highlight pages').uncheck();
  await panel.waitForFunction(() => !document.querySelector('#global-enabled').checked);
  await waitFor(site, () => CSS.highlights.size === 0);
  await popup.getByLabel('Highlight pages').check();
  await panel.waitForFunction(() => document.querySelector('#global-enabled').checked);
  await popup.close();
  await waitFor(site, () => CSS.highlights.get('spotadog-negative')?.size === 2);
  await panel.reload();
  await panel.getByRole('heading', { name: 'AI Infrastructure', exact: true }).waitFor();
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
  await restored.getByRole('heading', { name: 'AI Infrastructure', exact: true }).waitFor();
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
  // Real downloads/uploads and scanning refresh share the production worker/storage path.
  restored.on('dialog', dialog => dialog.accept());
  const backupPromise = restored.waitForEvent('download');
  await restored.getByRole('button', { name: 'Export Profiles', exact: true }).click();
  const backup = await backupPromise;
  const allText = await readFile(await backup.path(), 'utf8');
  const onePromise = restored.waitForEvent('download');
  await restored.getByRole('button', { name: 'Export Profile', exact: true }).click();
  const oneText = await readFile(await (await onePromise).path(), 'utf8');
  const one = JSON.parse(oneText);
  assert.deepEqual(one.profiles, JSON.parse(allText).profiles);
  const importPage = await context.newPage();
  await importPage.goto(`http://127.0.0.1:${server.address().port}`);
  await waitFor(importPage, () => CSS.highlights.get('spotadog-matches')?.size === 2);
  const upload = async (scope, text, name = 'profiles.json') => {
    const chooser = restored.waitForEvent('filechooser');
    await restored.getByRole('button', { name: scope === 'single' ? 'Import Profile' : 'Import Profiles', exact: true }).click();
    await (await chooser).setFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) });
  };
  one.profiles[0].positiveKeywords = ['inference'];
  one.profiles[0].negativeKeywords = ['data center'];
  await upload('single', JSON.stringify(one));
  await restored.getByText('Imported 1 profile(s). Highlights refreshed.', { exact: true }).waitFor();
  await waitFor(importPage, () => [...CSS.highlights.get('spotadog-matches')].map(r => r.toString()).join() === 'inference');
  assert.deepEqual(await importPage.evaluate(() => [...CSS.highlights.get('spotadog-negative')].map(r => r.toString())), ['data center']);
  await upload('all', oneText);
  await restored.locator('#status').filter({ hasText: 'matching single-profile' }).waitFor();
  await upload('single', '{}', 'bad.txt');
  await restored.locator('#status').filter({ hasText: 'Choose a .json' }).waitFor();
  await upload('single', '{');
  await restored.locator('#status').filter({ hasText: 'not valid JSON' }).waitFor();
  assert.deepEqual(await importPage.evaluate(() => [...CSS.highlights.get('spotadog-matches')].map(r => r.toString())), ['inference']);
  const activeWorker = context.serviceWorkers()[0];
  await activeWorker.evaluate(() => { globalThis.originalSet = chrome.storage.local.set; chrome.storage.local.set = async () => { throw Error('simulated failure'); }; });
  await upload('all', allText);
  await restored.locator('#status').filter({ hasText: 'could not be saved' }).waitFor();
  assert.deepEqual(await importPage.evaluate(() => [...CSS.highlights.get('spotadog-matches')].map(r => r.toString())), ['inference']);
  await activeWorker.evaluate(() => { chrome.storage.local.set = globalThis.originalSet; });
  await upload('all', allText);
  await restored.getByText('Imported 1 profile(s). Highlights refreshed.', { exact: true }).waitFor();
  await waitFor(importPage, () => CSS.highlights.get('spotadog-matches')?.size === 2);
  // A renderer failure reports saved state honestly and clears stale highlights.
  const failPainting = fail => activeWorker.evaluate(async fail => {
    const [tab] = await chrome.tabs.query({ url: 'http://127.0.0.1/*' });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, args: [fail], func: fail => {
      if (fail) { globalThis.savedHighlight = Highlight; globalThis.Highlight = class { constructor() { throw Error('simulated paint failure'); } }; }
      else globalThis.Highlight = globalThis.savedHighlight;
    } });
  }, fail);
  await failPainting(true);
  await upload('single', JSON.stringify(one));
  await restored.locator('#status').filter({ hasText: 'Profiles saved, but a page could not refresh' }).waitFor();
  assert.equal(await importPage.evaluate(() => CSS.highlights.has('spotadog-matches') || CSS.highlights.has('spotadog-negative')), false);
  assert.deepEqual((await restored.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'state.get' })).data)).profiles, one.profiles);
  await failPainting(false);
  await upload('all', allText);
  await restored.getByText('Imported 1 profile(s). Highlights refreshed.', { exact: true }).waitFor();
  await waitFor(importPage, () => CSS.highlights.get('spotadog-matches')?.size === 2);
  // Reinitialize while reading current storage, twice; old ranges must never survive.
  await activeWorker.evaluate(async one => {
    const saved = (await chrome.storage.local.get('spotadog.state'))['spotadog.state'];
    await chrome.storage.local.set({ 'spotadog.state': { ...saved, profiles: one.profiles } });
    const [tab] = await chrome.tabs.query({ url: 'http://127.0.0.1/*' });
    for (let i = 0; i < 2; i++) await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content/index.js'] });
  }, one);
  await waitFor(importPage, () => [...CSS.highlights.get('spotadog-matches')].map(r => r.toString()).join() === 'inference');
  await upload('all', allText);
  await restored.getByText('Imported 1 profile(s). Highlights refreshed.', { exact: true }).waitFor();
  await waitFor(importPage, () => CSS.highlights.get('spotadog-matches')?.size === 2);
  await restored.screenshot({ path: 'test-results/profile-transfer.png', fullPage: true });
  await restored.getByRole('button', { name: 'Delete', exact: true }).click();
  await restored.getByText('Profile deleted.', { exact: true }).waitFor();
  assert.equal((await restored.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'state.get' })).data)).profiles.length, 0);
  // Match the README setup: command-line loading alone does not enable Developer mode.
  const extensionsPage = await context.newPage();
  await extensionsPage.goto('chrome://extensions');
  await extensionsPage.evaluate(() => chrome.developerPrivate.updateProfileConfiguration({ inDeveloperMode: true }));
  // Actual unpacked extension reload invokes onInstalled and refreshes an already-open page.
  for (const term of ['inference', 'GPU']) {
    const current = context.serviceWorkers()[0];
    await current.evaluate(async ({ profile, term }) => {
      const saved = (await chrome.storage.local.get('spotadog.state'))['spotadog.state'];
      await chrome.storage.local.set({ 'spotadog.state': { ...saved, profiles: [{ ...profile, positiveKeywords: [term], negativeKeywords: [] }] } });
    }, { profile: one.profiles[0], term });
    const restarted = context.waitForEvent('serviceworker');
    await current.evaluate(() => { setTimeout(() => chrome.runtime.reload(), 100); });
    await restarted;
    await importPage.waitForFunction(term => {
      const words = [...(CSS.highlights.get('spotadog-matches') ?? [])].map(r => r.toString());
      return words.length === (term === 'GPU' ? 2 : 1) && words.every(word => word === term) && !CSS.highlights.has('spotadog-negative');
    }, term);
  }
  // The reload lifecycle checks above use a deliberately reinjected page. Start the
  // independent criterion matrix with a fresh document and content-script context.
  await importPage.reload();
  // Exercise every selectable type through the shared editor and real page scanner.
  const criteriaPanel = await context.newPage();
  criteriaPanel.on('pageerror', e => errors.push(e.message));
  await criteriaPanel.goto(`chrome-extension://${id}/popup/index.html`);
  const samples = [
    ['exactWord', 'dog', 'dog doghouse', ['dog']],
    ['contains', 'dog', 'doghouse bulldog cat', ['doghouse', 'bulldog']],
    ['startsWith', 'dog', 'doghouse bulldog', ['doghouse']],
    ['endsWith', 'dog', 'doghouse bulldog', ['bulldog']],
    ['exactPhrase', 'hot dog', 'hot  dog hot doghouse', ['hot  dog']],
    ['startsWithPhrase', 'hot dog', 'hot dog walks', ['hot dog']],
    ['endsWithPhrase', 'hot dog', 'a hot dog', ['hot dog']],
    ['shorterThan', '5', 'dog fives longer', ['dog']],
    ['longerThan', '5', 'dog fives longer', ['longer']],
    ['exactLength', '5', 'dog fives longer', ['fives']],
    ['betweenLengths', [3, 5], 'a dog fives longer', ['dog', 'fives']],
    ['number', null, '(123) x42 -3.5', ['123', '-3.5']],
    ['url', null, '(example.com/a) https://example.org', ['example.com/a', 'https://example.org']],
    ['email', null, '(name@example.com) broken@host', ['name@example.com']],
    ['hashtag', null, '(#犬) dog', ['#犬']],
    ['mention', null, '(@spotadog) name@example.com', ['@spotadog']],
    ['regex', '\\b(dog|cat)s?\\b', 'dogs cat DOG', ['dogs', 'cat']]
  ];
  for (const [type, value, text, expected] of samples) {
    await criteriaPanel.getByRole('button', { name: 'Edit', exact: true }).click();
    await clearKeywords(criteriaPanel, 'positive');
    await clearKeywords(criteriaPanel, 'negative');
    await criteriaPanel.locator('#positive').getByRole('button', { name: 'Add Keyword', exact: true }).click();
    assert.equal(await criteriaPanel.getByLabel('Keyword matching criteria', { exact: true }).locator('option').count(), 18);
    await criteriaPanel.getByLabel('Keyword matching criteria', { exact: true }).selectOption(type);
    await criteriaPanel.getByLabel('Positive keyword', { exact: true }).fill(typeof value === 'string' ? value : type);
    if (Array.isArray(value)) {
      await criteriaPanel.getByLabel('Minimum length').fill(String(value[0]));
      await criteriaPanel.getByLabel('Maximum length').fill(String(value[1]));
    } else if (['shorterThan', 'longerThan', 'exactLength'].includes(type)) await criteriaPanel.getByLabel('Character length').fill(value);
    await criteriaPanel.getByRole('button', { name: 'Save keyword', exact: true }).click();
    await importPage.evaluate(text => { document.body.replaceChildren(Object.assign(document.createElement('p'), { textContent: text })); }, text);
    await criteriaPanel.getByRole('button', { name: 'Save profile' }).click();
    await criteriaPanel.getByText('Profile saved.', { exact: true }).waitFor();
    try {
      await importPage.waitForFunction(expected => JSON.stringify([...(CSS.highlights.get('spotadog-matches') ?? [])].map(r => r.toString())) === JSON.stringify(expected), expected);
    } catch (error) {
      const actual = await importPage.evaluate(() => [...(CSS.highlights.get('spotadog-matches') ?? [])].map(r => r.toString()));
      const saved = await criteriaPanel.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'state.get' })).data.profiles);
      const ui = await criteriaPanel.locator('#positive').innerHTML();
      console.error(JSON.stringify({ saved, ui }));
      throw new Error(`Criterion ${type}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`, { cause: error });
    }
  }
  await criteriaPanel.getByRole('button', { name: 'Edit', exact: true }).click();
  await criteriaPanel.locator('#positive').getByRole('button', { name: 'Edit', exact: true }).click();
  assert.equal(await criteriaPanel.getByLabel('Keyword matching criteria', { exact: true }).inputValue(), 'regex');
  await criteriaPanel.getByLabel('Positive keyword', { exact: true }).fill('[');
  await criteriaPanel.getByRole('button', { name: 'Save keyword', exact: true }).click();
  await criteriaPanel.locator('.keyword-error').filter({ hasText: 'Invalid regular expression' }).waitFor();
  await criteriaPanel.getByLabel('Keyword matching criteria', { exact: true }).selectOption('betweenLengths');
  await criteriaPanel.getByLabel('Minimum length').fill('5');
  await criteriaPanel.getByLabel('Maximum length').fill('3');
  await criteriaPanel.getByRole('button', { name: 'Save keyword', exact: true }).click();
  await criteriaPanel.locator('.keyword-error').filter({ hasText: 'minimum ≤ maximum' }).waitFor();
  await criteriaPanel.getByLabel('Maximum length').fill('10');
  await criteriaPanel.getByRole('button', { name: 'Save keyword', exact: true }).click();
  await criteriaPanel.getByRole('button', { name: 'Save profile' }).click();
  await criteriaPanel.getByText('Profile saved.', { exact: true }).waitFor();
  const roundTrip = await criteriaPanel.evaluate(async () => {
    const exported = await chrome.runtime.sendMessage({ type: 'profiles.export', scope: 'all' });
    const imported = await chrome.runtime.sendMessage({ type: 'profiles.import', scope: 'all', text: exported.data });
    return { exported: JSON.parse(exported.data), imported };
  });
  assert.deepEqual(roundTrip.exported.profiles[0].positiveKeywords, [{ text: '[', matchingCriteria: { type: 'betweenLengths', min: 5, max: 10 } }]);
  assert.equal(roundTrip.imported.ok, true);
  await criteriaPanel.goto(`chrome-extension://${id}/sidepanel/index.html`);
  await criteriaPanel.getByRole('button', { name: 'Edit', exact: true }).click();
  await criteriaPanel.locator('#positive').getByRole('button', { name: 'Edit', exact: true }).click();
  assert.equal(await criteriaPanel.getByLabel('Keyword matching criteria', { exact: true }).inputValue(), 'betweenLengths');
  assert.equal(await criteriaPanel.getByLabel('Minimum length').inputValue(), '5');
  await clearKeywords(criteriaPanel, 'positive');
  await criteriaPanel.getByRole('button', { name: 'Save profile' }).click();
  await criteriaPanel.getByText('Profile saved.', { exact: true }).waitFor();
  await waitFor(importPage, () => CSS.highlights.size === 0);
  // Mixed criteria remain attached to their own rows across edit, cancel and clearing.
  await criteriaPanel.getByRole('button', { name: 'Edit', exact: true }).click();
  await addKeyword(criteriaPanel, 'positive', 'invoice');
  await criteriaPanel.locator('#positive').getByRole('button', { name: 'Add Keyword', exact: true }).click();
  await criteriaPanel.getByLabel('Positive keyword', { exact: true }).last().fill('urgent');
  await criteriaPanel.getByLabel('Keyword matching criteria', { exact: true }).last().selectOption('startsWith');
  await criteriaPanel.getByRole('button', { name: 'Save keyword', exact: true }).click();
  await criteriaPanel.getByRole('button', { name: 'Save profile' }).click();
  await criteriaPanel.getByText('Profile saved.', { exact: true }).waitFor();
  await criteriaPanel.reload();
  await criteriaPanel.getByRole('button', { name: 'Edit', exact: true }).click();
  const urgentRow = criteriaPanel.locator('#positive .keyword-row').filter({ hasText: 'urgent' });
  await urgentRow.getByRole('button', { name: 'Edit', exact: true }).click();
  assert.equal(await urgentRow.getByLabel('Keyword matching criteria', { exact: true }).inputValue(), 'startsWith');
  await urgentRow.getByLabel('Keyword matching criteria', { exact: true }).selectOption('contains');
  await urgentRow.getByRole('button', { name: 'Cancel', exact: true }).click();
  await urgentRow.getByRole('button', { name: 'Edit', exact: true }).click();
  assert.equal(await urgentRow.getByLabel('Keyword matching criteria', { exact: true }).inputValue(), 'startsWith');
  await urgentRow.getByLabel('Keyword matching criteria', { exact: true }).selectOption('');
  await urgentRow.getByRole('button', { name: 'Save keyword', exact: true }).click();
  await criteriaPanel.getByRole('button', { name: 'Save profile' }).click();
  await criteriaPanel.getByText('Profile saved.', { exact: true }).waitFor();
  assert.deepEqual(await criteriaPanel.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'state.get' })).data.profiles[0].positiveKeywords), ['invoice', 'urgent']);
  await criteriaPanel.getByRole('button', { name: 'Edit', exact: true }).click();
  await clearKeywords(criteriaPanel, 'positive');
  await criteriaPanel.getByRole('button', { name: 'Save profile' }).click();
  await criteriaPanel.getByText('Profile saved.', { exact: true }).waitFor();
  // Individual keyword workflow in both shared interfaces, including persisted old arrays.
  for (const surface of ['popup', 'sidepanel']) {
    await criteriaPanel.goto(`chrome-extension://${id}/${surface}/index.html`);
    await criteriaPanel.locator('#profiles').getByRole('button', { name: 'Edit', exact: true }).click();
    const positive = criteriaPanel.locator('#positive');
    assert.equal(await positive.locator('.keyword-row').count(), 0);
    assert.equal(await positive.getByText('No keywords yet. Choose Add Keyword to start.').isVisible(), true);
    await addKeyword(criteriaPanel, 'positive', '  dog  ');
    await addKeyword(criteriaPanel, 'positive', 'hot dog');
    const first = positive.locator('.keyword-row').first();
    const second = positive.locator('.keyword-row').nth(1);
    await first.getByRole('checkbox').check();
    assert.equal(await second.getByRole('checkbox').isChecked(), true);
    await first.getByRole('button', { name: 'Edit', exact: true }).click();
    for (const [value, message] of [[' ', 'Enter a keyword or phrase.'], ['HOT DOG', 'already exists'], ['x'.repeat(121), 'under 121']]) {
      await first.getByRole('textbox').fill(value);
      await first.getByRole('button', { name: 'Save keyword' }).click();
      assert.match(await first.getByRole('alert').textContent(), new RegExp(message));
      assert.equal(await second.locator('span').textContent(), 'hot dog');
    }
    await first.getByRole('textbox').fill('cat');
    await criteriaPanel.getByRole('button', { name: 'Save profile' }).click();
    await criteriaPanel.locator('#status').filter({ hasText: 'Save keyword or cancel' }).waitFor();
    await first.getByRole('button', { name: 'Save keyword' }).click();
    assert.equal(await first.getByRole('checkbox').isChecked(), true);
    await addKeyword(criteriaPanel, 'negative', 'cat'); // Duplicates across colors remain allowed.
    await positive.getByRole('button', { name: 'Add Keyword', exact: true }).click();
    await positive.locator('.keyword-row').last().getByRole('button', { name: 'Cancel', exact: true }).click();
    await criteriaPanel.screenshot({ path: `test-results/individual-keywords-${surface}.png`, fullPage: true });
    await criteriaPanel.getByRole('button', { name: 'Save profile' }).click();
    await criteriaPanel.getByText('Profile saved.', { exact: true }).waitFor();
    const stored = await criteriaPanel.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'state.get' })).data.profiles[0]);
    assert.deepEqual(stored.positiveKeywords, ['cat', 'hot dog']);
    assert.deepEqual(stored.negativeKeywords, ['cat']);
    await criteriaPanel.reload();
    await criteriaPanel.locator('#profiles').getByRole('button', { name: 'Edit', exact: true }).click();
    assert.deepEqual(await positive.locator('.keyword-row span').allTextContents(), ['cat', 'hot dog']);
    criteriaPanel.once('dialog', dialog => dialog.dismiss());
    await positive.locator('.keyword-row').first().getByRole('button', { name: 'Remove' }).click();
    assert.equal(await positive.locator('.keyword-row').count(), 2);
    criteriaPanel.once('dialog', dialog => dialog.accept());
    await positive.locator('.keyword-row').first().getByRole('button', { name: 'Remove' }).click();
    assert.deepEqual(await positive.locator('.keyword-row span').allTextContents(), ['hot dog']);
    await criteriaPanel.getByRole('button', { name: 'Save profile' }).click();
    await criteriaPanel.getByText('Profile saved.', { exact: true }).waitFor();
    assert.deepEqual(await criteriaPanel.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'state.get' })).data.profiles[0].positiveKeywords), ['hot dog']);
    await criteriaPanel.locator('#profiles').getByRole('button', { name: 'Edit', exact: true }).click();
    await clearKeywords(criteriaPanel, 'positive');
    await clearKeywords(criteriaPanel, 'negative');
    await criteriaPanel.getByRole('button', { name: 'Save profile' }).click();
    await criteriaPanel.getByText('Profile saved.', { exact: true }).waitFor();
    assert.equal(await criteriaPanel.locator('#profile-form textarea').count(), 0);
  }
  // A full pre-existing array renders individually, retains order, and supports edits at capacity.
  const many = Array.from({ length: 200 }, (_, i) => `keyword ${i}`);
  await criteriaPanel.evaluate(async words => {
    const profile = (await chrome.runtime.sendMessage({ type: 'state.get' })).data.profiles[0];
    await chrome.runtime.sendMessage({ type: 'profile.save', profile: { ...profile, positiveKeywords: words } });
  }, many);
  await criteriaPanel.reload();
  await criteriaPanel.setViewportSize({ width: 320, height: 700 });
  await criteriaPanel.locator('#profiles').getByRole('button', { name: 'Edit', exact: true }).click();
  const manyList = criteriaPanel.locator('#positive');
  assert.deepEqual(await manyList.locator('.keyword-row span').allTextContents(), many);
  await addKeyword(criteriaPanel, 'positive', 'one too many');
  await manyList.getByRole('alert').filter({ hasText: '200' }).waitFor();
  await manyList.locator('.keyword-row').last().getByRole('button', { name: 'Cancel', exact: true }).click();
  const last = manyList.locator('.keyword-row').last();
  await last.getByRole('button', { name: 'Edit', exact: true }).click();
  await last.getByRole('textbox').fill('replacement');
  await criteriaPanel.screenshot({ path: 'test-results/individual-keywords-many.png', fullPage: true });
  assert.equal(await criteriaPanel.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await last.getByRole('textbox').press('Enter');
  const keywordWorker = context.serviceWorkers()[0];
  await keywordWorker.evaluate(() => { globalThis.keywordOriginalSet = chrome.storage.local.set; chrome.storage.local.set = async () => { throw Error('simulated failure'); }; });
  await criteriaPanel.getByRole('button', { name: 'Save profile' }).click();
  await criteriaPanel.locator('#status').filter({ hasText: 'simulated failure' }).waitFor();
  assert.equal(await last.locator('span').textContent(), 'replacement');
  assert.deepEqual(await criteriaPanel.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'state.get' })).data.profiles[0].positiveKeywords), many);
  await keywordWorker.evaluate(() => { chrome.storage.local.set = globalThis.keywordOriginalSet; });
  await criteriaPanel.getByRole('button', { name: 'Save profile' }).click();
  await criteriaPanel.getByText('Profile saved.', { exact: true }).waitFor();
  assert.deepEqual(await criteriaPanel.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'state.get' })).data.profiles[0].positiveKeywords), [...many.slice(0, -1), 'replacement']);
  await checkProfileView(criteriaPanel, id);
  assert.deepEqual(errors, []);
  console.log('Browser checks passed: real MV3 loading, profile CRUD, matching/exclusions, dynamic content, toggles, settings, mocked AI review, safe rendering, popup, persistence across browser restart, profile transfers/failures, and repeated extension reloads.');
} finally {
  await context?.close();
  await new Promise(resolve => server.close(resolve));
  await rm(profileDir, { recursive: true, force: true });
}
