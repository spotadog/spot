import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

test('checkbox changes persist without a second Save, survive AI Save and reopen, including none and custom', async t => {
  const bundle = await build({ entryPoints: ['src/options/index.js'], bundle: true, write: false, format: 'iife' });
  const storage = await build({ stdin: { contents: "export {createStore} from './src/storage/store.js';", resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'fixture' });
  const browser = await chromium.launch({ channel: 'chromium', headless: true }); t.after(() => browser.close());
  const page = await browser.newPage();
  page.setDefaultTimeout(3000);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  const html = (await readFile('src/options/index.html', 'utf8')).replace(/<script.*?<\/script>/g, '');
  await page.setContent(html); await page.addScriptTag({ content: storage.outputFiles[0].text });
  await page.evaluate(() => {
    const data = {};
    window.savedData = data;
    window.store = fixture.createStore({ get: async key => ({ [key]: structuredClone(data[key]) }), set: async values => Object.assign(data, structuredClone(values)) });
    window.chrome = { runtime: { sendMessage: async message => {
      try {
        if (message.type === 'state.get') return { ok: true, data: { ...await store.read(), configuredProviders: {} } };
        if (message.type === 'navigation.settings') {
          if (window.failColors && message.autoPauseColors !== undefined) throw Error('Simulated color save failure');
          await store.saveNavigationSettings(message);
        }
        else if (message.type === 'settings.save') await store.saveSettings(message);
        return { ok: true, data: true };
      } catch (error) { return { ok: false, error: error.message }; }
    } } };
  });
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.getByRole('checkbox', { name: 'Blue auto-pause', exact: true }).uncheck();
  await page.getByText('Auto-pause colors saved.', { exact: true }).waitFor({ timeout: 1500 });
  assert.equal(await page.evaluate(async () => (await store.read()).preferences.autoPauseColors.includes('#8fc9ff')), false);
  await page.getByRole('button', { name: 'Save settings', exact: true }).click();
  await page.getByText('Settings saved.', { exact: true }).waitFor();
  assert.equal(await page.getByRole('checkbox', { name: 'Blue auto-pause', exact: true }).isChecked(), false);
  for (const checkbox of await page.locator('#auto-pause-colors input').all()) await checkbox.uncheck();
  await page.waitForFunction(async () => (await store.read()).preferences.autoPauseColors.length === 0);
  const reopen = async () => { await page.setContent(html); await page.addScriptTag({ content: bundle.outputFiles[0].text }); await page.waitForFunction(() => !document.querySelector('#auto-pause-color-controls').disabled).catch(async error => { throw Error(`${error.message}: ${await page.locator('#status').textContent()} ${errors.join('; ')}`); }); };
  await reopen(); assert.equal(await page.locator('#auto-pause-colors input:checked').count(), 0);
  await page.locator('#auto-pause-custom').fill('#123456');
  await page.getByRole('button', { name: 'Add color', exact: true }).click();
  await page.waitForFunction(async () => JSON.stringify((await store.read()).preferences.autoPauseColors) === '["#123456"]');
  await reopen();
  assert.deepEqual(await page.locator('#auto-pause-colors input:checked').evaluateAll(nodes => nodes.map(n => n.dataset.color)), ['#123456']);
  await page.evaluate(() => { window.failColors = true; });
  await page.getByRole('checkbox', { name: 'Yellow auto-pause', exact: true }).click();
  await page.getByText('Simulated color save failure', { exact: true }).waitFor();
  assert.equal(await page.getByRole('checkbox', { name: 'Yellow auto-pause', exact: true }).isChecked(), false);
  assert.deepEqual(await page.evaluate(async () => (await store.read()).preferences.autoPauseColors), ['#123456']);
  await page.evaluate(() => {
    window.failColors = false;
    for (const [color, checked] of [['#ffe077', true], ['#8fc9ff', true], ['#ffe077', false]]) {
      const input = document.querySelector(`[data-color="${color}"]`); input.checked = checked; input.dispatchEvent(new Event('change'));
    }
  });
  await page.getByText('Auto-pause colors saved.', { exact: true }).waitFor();
  assert.deepEqual(await page.evaluate(async () => (await store.read()).preferences.autoPauseColors), ['#123456', '#8fc9ff']);
  // An old view saving only its eyeball position must not overwrite another view's palette.
  await page.evaluate(() => store.saveNavigationSettings({ autoPauseColors: ['#93dfab'] }));
  await page.getByRole('button', { name: 'Save scrolling settings', exact: true }).click();
  await page.getByText('Scrolling settings saved.', { exact: true }).waitFor();
  await reopen();
  assert.deepEqual(await page.locator('#auto-pause-colors input:checked').evaluateAll(nodes => nodes.map(n => n.dataset.color)), ['#93dfab']);
});
