import assert from 'node:assert/strict';

export async function checkIndependentKeywordSaving(page, id) {
  for (const surface of ['popup', 'sidepanel']) {
    const profileId = await page.evaluate(async () => (await chrome.runtime.sendMessage({ type: 'profile.save', profile: {
      name: 'Independent saves', positiveKeywords: ['dog', 'cat'], negativeKeywords: ['bad']
    } })).data.id);
    await page.goto(`chrome-extension://${id}/${surface}/index.html`);
    await page.getByLabel('Profile', { exact: true }).selectOption(profileId);
    const stored = () => page.evaluate(async id => (await chrome.runtime.sendMessage({ type: 'state.get' })).data.profiles.find(p => p.id === id), profileId);
    const row = page.locator('#positive .keyword-row').first();
    const second = page.locator('#positive .keyword-row').nth(1);
    await row.getByRole('button', { name: 'Edit', exact: true }).click();
    await row.getByLabel('Positive keyword', { exact: true }).fill('puppy');
    await row.getByRole('button', { name: 'Save keyword' }).click();
    await page.getByText('Keyword saved.', { exact: true }).waitFor();
    assert.deepEqual((await stored()).positiveKeywords, ['puppy', 'cat']);
    assert.equal(await page.locator('#save-actions').isVisible(), false);
    await page.locator('#edit-profile').click();
    await page.getByLabel('Profile name').fill(''); // Invalid details must not block keyword saving.
    await second.getByRole('button', { name: 'Edit', exact: true }).click();
    await second.getByLabel('Positive keyword', { exact: true }).fill('unfinished cat');
    await row.getByRole('button', { name: 'Edit', exact: true }).click();
    await row.getByLabel('Positive keyword', { exact: true }).fill('hound');
    await row.getByRole('button', { name: 'Save keyword' }).click();
    await row.getByRole('button', { name: 'Save keyword' }).waitFor({ state: 'hidden' });
    assert.equal((await stored()).name, 'Independent saves');
    assert.deepEqual((await stored()).positiveKeywords, ['hound', 'cat']);
    assert.equal(await second.getByLabel('Positive keyword', { exact: true }).inputValue(), 'unfinished cat');
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#cancel-edit').click();
    assert.equal(await second.getByLabel('Positive keyword', { exact: true }).inputValue(), 'unfinished cat');
    await page.locator('#edit-profile').click();
    await page.getByLabel('Profile name').fill('Renamed details');
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await page.getByText('Profile saved.', { exact: true }).waitFor();
    assert.equal((await stored()).name, 'Renamed details');
    assert.deepEqual((await stored()).positiveKeywords, ['hound', 'cat']);
    assert.equal(await second.getByLabel('Positive keyword', { exact: true }).inputValue(), 'unfinished cat');
    await second.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.reload();
    await page.getByLabel('Profile', { exact: true }).selectOption(profileId);
    assert.deepEqual(await page.locator('#positive .keyword-row span').allTextContents(), ['hound', 'cat']);
    await row.getByRole('checkbox').uncheck();
    await page.waitForFunction(() => !document.querySelector('#profile-form').inert);
    assert.equal((await stored()).positiveKeywords[0].active, false);
    page.once('dialog', dialog => dialog.accept());
    await row.getByRole('button', { name: 'Remove' }).click();
    await page.waitForFunction(() => document.querySelectorAll('#positive .keyword-row').length === 1);
    assert.deepEqual((await stored()).positiveKeywords, ['cat']);
  }
}
