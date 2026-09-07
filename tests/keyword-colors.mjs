import assert from 'node:assert/strict';

export async function checkKeywordColors(context, page, id, url) {
  const content = await context.newPage();
  await content.goto(url);
  await content.evaluate(() => { document.body.textContent = 'colorpreset colorcustom'; });
  for (const surface of ['popup', 'sidepanel']) {
    await page.goto(`chrome-extension://${id}/${surface}/index.html`);
    await page.getByRole('button', { name: 'New profile', exact: true }).click();
    await page.getByLabel('Profile name').fill(`Colors ${surface}`);
    for (const [term, color] of [['colorpreset', '#8fc9ff'], ['colorcustom', '#123456']]) {
      await page.locator('#positive').getByRole('button', { name: 'Add Keyword', exact: true }).click();
      const row = page.locator('#positive .keyword-row').last();
      await row.getByRole('textbox', { name: 'Positive keyword', exact: true }).fill(term);
      assert.equal(await row.locator('.color-choices button').count(), 6);
      if (term === 'colorpreset') {
        await row.getByRole('button', { name: 'Blue highlight', exact: true }).click();
        assert.equal(await row.getByRole('button', { name: 'Blue highlight', exact: true }).getAttribute('aria-pressed'), 'true');
      } else await row.getByLabel('Custom highlight color', { exact: true }).fill(color);
      await row.getByRole('button', { name: 'Save keyword', exact: true }).click();
    }
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await page.getByText('Profile saved.', { exact: true }).waitFor();
    await content.waitForFunction(() => CSS.highlights.get('spotadog-positive-8fc9ff')?.size === 1 && CSS.highlights.get('spotadog-positive-123456')?.size === 1);
    const profileId = await page.getByLabel('Profile', { exact: true }).inputValue();
    await page.reload();
    await page.getByLabel('Profile', { exact: true }).selectOption(profileId);
    await page.locator('#edit-profile').click();
    const row = page.locator('#positive .keyword-row').last();
    await row.getByRole('button', { name: 'Edit', exact: true }).click();
    assert.equal(await row.getByLabel('Custom highlight color', { exact: true }).inputValue(), '#123456');
    await row.getByLabel('Custom highlight color', { exact: true }).fill('#abcdef');
    await row.getByRole('button', { name: 'Save keyword', exact: true }).click();
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await page.getByText('Profile saved.', { exact: true }).waitFor();
    await content.waitForFunction(() => CSS.highlights.get('spotadog-positive-abcdef')?.size === 1 && !CSS.highlights.has('spotadog-positive-123456'));
    assert.equal(await content.locator('body').textContent(), 'colorpreset colorcustom');
  }
  await content.close();
}
