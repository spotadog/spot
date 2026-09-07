import assert from 'node:assert/strict';

export async function checkNewProfileKeywords(page, id, worker) {
  for (const surface of ['popup', 'sidepanel']) {
    await page.goto(`chrome-extension://${id}/${surface}/index.html`);
    await page.locator('#profile-select:not([disabled])').waitFor();
    // A search on the previous profile must not carry into creation.
    await page.locator('#keyword-search').fill('no matching keywords');
    await page.locator('#new-profile').click();
    assert.equal(await page.locator('#keyword-search').isVisible(), false);
    assert.equal(await page.locator('#keyword-search').inputValue(), '');
    const name = `Visible draft in ${surface}`;
    await page.locator('#name').fill(name);
    for (const kind of ['positive', 'negative']) {
      await page.locator(`#${kind}-tab`).click();
      const list = page.locator(`#${kind}`);
      const visible = () => list.locator('.keyword-row:visible span').allTextContents();
      async function add(term) {
        await list.getByRole('button', { name: 'Add Keyword', exact: true }).click();
        const row = list.locator('.keyword-row').last();
        await row.getByRole('textbox', { name: /^(Positive|Negative) keyword$/ }).fill(term);
        await row.getByRole('textbox', { name: /^(Positive|Negative) keyword$/ }).press('Enter');
        return row;
      }
      const expected = [];
      for (const term of ['React', 'TypeScript', 'Node.js']) {
        await add(term);
        expected.push(term);
        assert.deepEqual(await visible(), expected);
        assert.equal(await list.getByRole('textbox', { name: /^(Positive|Negative) keyword$/ }).count(), 0);
      }
      for (const [term, error] of [['  react  ', 'already exists'], ['   ', 'Enter a keyword'], ['x'.repeat(121), 'under 121 characters']]) {
        const row = await add(term);
        assert.ok((await row.getByRole('alert').textContent()).includes(error), `Expected validation message: ${error}`);
        assert.deepEqual((await visible()).slice(0, -1), expected);
        await row.getByRole('button', { name: 'Cancel', exact: true }).click();
        assert.deepEqual(await visible(), expected);
      }
      page.once('dialog', dialog => dialog.accept());
      await list.locator('.keyword-row').nth(1).getByRole('button', { name: 'Remove', exact: true }).click();
      assert.deepEqual(await visible(), ['React', 'Node.js']);
      await add('TypeScript');
      assert.deepEqual(await visible(), ['React', 'Node.js', 'TypeScript']);
      // Same-turn additions exercise synchronous draft updates without waits between rows.
      await list.evaluate(container => {
        const button = (root, text) => [...root.querySelectorAll('button')].find(el => el.textContent === text);
        for (const term of ['Fast one', 'Fast two']) {
          button(container, 'Add Keyword').click();
          const row = container.querySelector('.keyword-row:last-child');
          const input = row.querySelector('input[type=text]');
          input.value = term;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          button(row, 'Save keyword').click();
        }
      });
      assert.deepEqual(await visible(), ['React', 'Node.js', 'TypeScript', 'Fast one', 'Fast two']);
    }
    await page.locator('#name').fill(`${name} renamed`);
    await page.locator('#profile-enabled').uncheck();
    await page.evaluate(() => chrome.runtime.sendMessage({ type: 'global.set', enabled: true }));
    const expected = ['React', 'Node.js', 'TypeScript', 'Fast one', 'Fast two'];
    async function checkLists() {
      for (const kind of ['positive', 'negative']) {
        await page.locator(`#${kind}-tab`).click();
        assert.deepEqual(await page.locator(`#${kind} .keyword-row:visible span`).allTextContents(), expected);
      }
    }
    await checkLists();
    await worker.evaluate(() => {
      globalThis.draftOriginalSet = chrome.storage.local.set;
      chrome.storage.local.set = async () => { throw Error('draft save failure'); };
    });
    try {
      await page.getByRole('button', { name: 'Save profile', exact: true }).click();
      await page.locator('#status').filter({ hasText: 'draft save failure' }).waitFor();
      await checkLists();
      assert.equal(await page.locator('#name').inputValue(), `${name} renamed`);
      assert.equal(await page.locator('#name').isEditable(), true);
      assert.equal(await page.evaluate(async name => (await chrome.runtime.sendMessage({ type: 'state.get' })).data.profiles.some(p => p.name === name), `${name} renamed`), false);
    } finally {
      await worker.evaluate(() => { chrome.storage.local.set = globalThis.draftOriginalSet; delete globalThis.draftOriginalSet; });
    }
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await page.getByText('Profile saved.', { exact: true }).waitFor();
    await checkLists();
    const saved = await page.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'state.get' })).data.profiles.find(p => p.id === document.querySelector('#profile-select').value));
    assert.deepEqual(saved.positiveKeywords, expected);
    assert.deepEqual(saved.negativeKeywords, expected);
    assert.equal(saved.enabled, false);
    assert.equal(await page.locator('#keyword-search').isVisible(), true);
    await page.locator('#keyword-search').fill('react');
    assert.deepEqual(await page.locator('#negative .keyword-row:visible span').allTextContents(), ['React']);
  }
}
