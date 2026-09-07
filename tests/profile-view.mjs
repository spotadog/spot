import assert from 'node:assert/strict';

export async function checkProfileView(page, id) {
  const fixtures = await page.evaluate(async () => {
    const saved = [];
    for (const profile of [
      { name: 'Searchable profile', positiveKeywords: ['Dog', 'hot dog', { text: 'cat', active: false }], negativeKeywords: ['doghouse'] },
      { name: 'Empty profile', positiveKeywords: [], negativeKeywords: [] }
    ]) saved.push((await chrome.runtime.sendMessage({ type: 'profile.save', profile })).data);
    return saved;
  });
  for (const surface of ['popup', 'sidepanel']) {
    await page.goto(`chrome-extension://${id}/${surface}/index.html`);
    const selector = page.getByLabel('Profile', { exact: true });
    await selector.selectOption(fixtures[0].id);
    assert.deepEqual(await selector.locator('option').allTextContents(), await page.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'state.get' })).data.profiles.map(p => p.name)));
    assert.equal(await page.getByLabel('Profile name').inputValue(), 'Searchable profile');
    assert.equal(await page.getByLabel('Profile name').isEditable(), false);
    assert.equal(await page.getByLabel('Profile enabled').isEnabled(), false);
    assert.equal(await page.locator('#positive').getByRole('button', { name: 'Add Keyword' }).isVisible(), false);
    const search = page.getByRole('searchbox', { name: 'Search keywords' });
    const rows = page.locator('#positive .keyword-row:visible');
    await search.fill('DO');
    assert.deepEqual(await rows.locator('span').allTextContents(), ['Dog', 'hot dog']);
    assert.equal(await page.locator('#negative .keyword-row:visible').count(), 0);
    await page.getByRole('tab', { name: 'Negative Words' }).click();
    assert.equal(await page.locator('#negative .keyword-row:visible').count(), 1);
    assert.equal(await rows.count(), 0);
    await page.getByRole('tab', { name: 'Positive Words' }).click();
    assert.equal(await rows.first().getByRole('checkbox').isChecked(), true);
    assert.equal(await rows.first().getByRole('checkbox').isEnabled(), false);
    assert.equal(await rows.first().getByRole('button', { name: 'Edit', exact: true }).isVisible(), false);
    await page.locator('#edit-profile').click();
    assert.equal(await rows.first().getByRole('checkbox').isChecked(), true);
    await rows.first().getByRole('checkbox').uncheck();
    await rows.first().getByRole('button', { name: 'Edit', exact: true }).click();
    await rows.first().getByRole('textbox', { name: /^(Positive|Negative) keyword$/ }).fill('Dog edited');
    // Pending text survives filtering and an unrelated state broadcast.
    await search.fill('missing');
    assert.equal(await rows.count(), 1);
    await page.evaluate(() => chrome.runtime.sendMessage({ type: 'global.set', enabled: true }));
    assert.equal(await rows.first().getByRole('textbox', { name: /^(Positive|Negative) keyword$/ }).inputValue(), 'Dog edited');
    page.once('dialog', dialog => dialog.dismiss());
    await selector.selectOption(fixtures[1].id);
    assert.equal(await selector.inputValue(), fixtures[0].id);
    assert.equal(await rows.first().getByRole('textbox', { name: /^(Positive|Negative) keyword$/ }).inputValue(), 'Dog edited');
    await search.fill('');
    await rows.first().getByRole('button', { name: 'Save keyword' }).click();
    await page.getByLabel('Profile name').fill('Changed draft');
    page.once('dialog', dialog => dialog.dismiss());
    await page.locator('#cancel-edit').click();
    assert.equal(await page.getByLabel('Profile name').inputValue(), 'Changed draft');
    page.once('dialog', dialog => dialog.accept());
    await selector.selectOption(fixtures[1].id);
    assert.equal(await search.inputValue(), '');
    assert.equal(await page.getByLabel('Profile name').inputValue(), 'Empty profile');
    assert.equal(await page.locator('#positive .keyword-row').count(), 0);
    assert.equal(await page.locator('#positive').getByText('No keywords yet.', { exact: true }).isVisible(), true);
    assert.equal(await page.getByLabel('Profile name').isEditable(), false);
    await selector.selectOption(fixtures[0].id);
    assert.equal(await page.locator('#positive input:checked').count(), 2);
    await search.fill('absent');
    assert.equal(await rows.count(), 0);
    assert.equal(await page.locator('#positive').getByText('No keywords match your search.').isVisible(), true);
    await search.fill('');
    assert.deepEqual(await rows.locator('span').allTextContents(), ['Dog', 'hot dog', 'cat']);
    for (const label of ['Export Profiles', 'Export Profile', 'Import Profiles', 'Import Profile']) {
      assert.equal(await page.locator('#profile-transfers').getByRole('button', { name: label, exact: true }).count(), 1);
    }
    assert.equal(await page.evaluate(() => !!(document.querySelector('#editor').compareDocumentPosition(document.querySelector('#profile-transfers')) & Node.DOCUMENT_POSITION_FOLLOWING)), true);
    await page.setViewportSize({ width: 320, height: 700 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `test-results/profile-view-${surface}.png`, fullPage: true });
    // A new profile remains selected after saving even when other profiles exist.
    await page.getByRole('button', { name: 'New profile', exact: true }).click();
    await page.getByLabel('Profile name').fill(`Created in ${surface}`);
    assert.equal(await search.isVisible(), false);
    await page.locator('#positive').getByRole('button', { name: 'Add Keyword' }).click();
    await rows.first().getByRole('textbox', { name: /^(Positive|Negative) keyword$/ }).fill('new keyword');
    await rows.first().getByRole('button', { name: 'Save keyword' }).click();
    assert.deepEqual(await rows.locator('span').allTextContents(), ['new keyword']);
    await rows.first().getByRole('checkbox').uncheck();
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await page.getByRole('heading', { name: `Created in ${surface}`, exact: true }).waitFor();
    assert.equal(await page.getByLabel('Profile name').isEditable(), false);
    assert.equal(await selector.locator('option:checked').textContent(), `Created in ${surface}`);
    assert.deepEqual(await rows.locator('span').allTextContents(), ['new keyword']);
    assert.equal(await rows.first().getByRole('checkbox').isChecked(), false);
    assert.equal(await rows.first().getByRole('checkbox').isEnabled(), false);
    await rows.first().locator('label.inline').click({ force: true });
    await page.keyboard.press('Space');
    assert.equal(await rows.first().getByRole('checkbox').isChecked(), false);
    await page.locator('#edit-profile').click();
    assert.equal(await rows.first().getByRole('checkbox').isChecked(), false);
    await rows.first().getByRole('checkbox').check();
    await page.getByLabel('Profile name').fill(`Renamed in ${surface}`);
    await rows.first().getByRole('button', { name: 'Edit', exact: true }).click();
    await rows.first().getByRole('textbox', { name: /^(Positive|Negative) keyword$/ }).fill('updated keyword');
    await rows.first().getByRole('button', { name: 'Save keyword' }).click();
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await page.getByRole('heading', { name: `Renamed in ${surface}`, exact: true }).waitFor();
    const savedProfile = await page.evaluate(async () => {
      const state = (await chrome.runtime.sendMessage({ type: 'state.get' })).data;
      return state.profiles.find(profile => profile.id === document.querySelector('#profile-select').value);
    });
    assert.equal(savedProfile.name, `Renamed in ${surface}`);
    assert.deepEqual(savedProfile.positiveKeywords, ['updated keyword']);
  }
}
