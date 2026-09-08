import assert from 'node:assert/strict';

export async function checkWordTabs(page, id) {
  const profile = await page.evaluate(async () => {
    const result = await chrome.runtime.sendMessage({ type: 'profile.save', profile: {
    name: 'Word tabs', positiveKeywords: Array.from({ length: 200 }, (_, i) => `positive ${i}`),
    negativeKeywords: [{ text: 'negative', active: false, matchingCriteria: { type: 'contains' } }, ...Array.from({ length: 199 }, (_, i) => `negative ${i}`)]
    } });
    return (await chrome.runtime.sendMessage({ type: 'state.get' })).data.profiles.find(p => p.id === result.data.id);
  });
  for (const surface of ['popup', 'sidepanel']) {
    await page.goto(`chrome-extension://${id}/${surface}/index.html`);
    await page.getByLabel('Profile', { exact: true }).selectOption(profile.id);
    const positive = page.getByRole('tab', { name: 'Positive Words' });
    const negative = page.getByRole('tab', { name: 'Negative Words' });
    const url = page.url();
    async function selected(kind) {
      assert.equal(await page.getByRole('tabpanel').count(), 1);
      assert.equal(await page.locator(`#${kind}-tab`).getAttribute('aria-selected'), 'true');
      assert.equal(await page.locator(`#${kind}-tab`).getAttribute('tabindex'), '0');
      assert.equal(await page.locator(`#${kind} .keyword-row:visible`).count(), 200);
      assert.equal(page.url(), url);
    }
    await selected('positive');
    await negative.click();
    await selected('negative');
    await positive.click();
    await selected('positive');
    for (const [key, kind] of [['ArrowLeft', 'negative'], ['ArrowRight', 'positive'], ['End', 'negative'], ['Home', 'positive']]) {
      await page.keyboard.press(key);
      await selected(kind);
      assert.equal(await page.locator(`#${kind}-tab`).evaluate(el => el === document.activeElement), true);
    }
    await page.keyboard.press('Tab');
    assert.equal(await page.locator('#positive-panel').evaluate(el => el === document.activeElement), true);
    for (const width of [320, 680]) {
      await page.setViewportSize({ width, height: 700 });
      for (const kind of ['positive', 'negative']) {
        await page.locator(`#${kind}-tab`).click();
        const layout = await page.locator(`#${kind} .keyword-rows`).evaluate(list => {
          const containers = [list, list.parentElement, list.parentElement.parentElement];
          return {
            natural: containers.every(el => getComputedStyle(el).maxHeight === 'none' && getComputedStyle(el).overflowY === 'visible' && el.scrollHeight <= el.clientHeight + 1),
            tall: list.clientHeight > innerHeight,
            pageScroll: document.scrollingElement.scrollHeight > innerHeight,
            fits: document.documentElement.scrollWidth <= innerWidth
          };
        });
        assert.deepEqual(layout, { natural: true, tall: true, pageScroll: true, fits: true });
      }
    }
    // Saving details preserves an unfinished keyword edit, even in a hidden tab.
    await page.locator('#edit-profile').click();
    const row = page.locator('#negative .keyword-row').first();
    await row.getByRole('button', { name: 'Edit', exact: true }).click();
    await row.getByRole('textbox', { name: /^(Positive|Negative) keyword$/ }).fill('unsaved negative');
    await positive.click();
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await page.getByText('Profile saved.', { exact: true }).waitFor();
    await selected('positive');
    await negative.click();
    assert.equal(await row.getByRole('textbox', { name: /^(Positive|Negative) keyword$/ }).inputValue(), 'unsaved negative');
    await row.getByRole('button', { name: 'Cancel', exact: true }).click();
    await positive.click();
    await page.locator('#edit-profile').click();
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await page.getByText('Profile saved.', { exact: true }).waitFor();
    const saved = await page.evaluate(async id => (await chrome.runtime.sendMessage({ type: 'state.get' })).data.profiles.find(p => p.id === id), profile.id);
    assert.deepEqual(saved.positiveKeywords, profile.positiveKeywords);
    assert.deepEqual(saved.negativeKeywords, profile.negativeKeywords);
  }
}
