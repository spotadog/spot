import assert from 'node:assert/strict';

export async function checkPopups(context, panel, base) {
  await panel.locator('#visits-enabled').check();
  await panel.getByText('URL tracking saved.', { exact: true }).waitFor();
  const site = await context.newPage();
  await site.goto(`${base}/popup-fixture`);
  const waitCount = (kind, text, count) => panel.waitForFunction(async ({ kind, text, count }) => {
    const result = await chrome.runtime.sendMessage({ type: 'visits.get' });
    return result.data.popups.some(entry => entry.kind === kind && entry.label.includes(text) && entry.count === count);
  }, { kind, text, count });
  await site.evaluate(() => {
    const dialog = document.createElement('div');
    dialog.id = 'popup-test'; dialog.role = 'dialog'; dialog.dataset.itemId = 'popup-item';
    dialog.style.cssText = 'position:fixed;top:20px;left:20px;width:250px;height:160px;background:white;z-index:999';
    dialog.textContent = 'Popup item'; document.body.append(dialog);
  });
  await waitCount('overlay', 'popup-item', 1);
  await site.locator('#popup-test').evaluate(node => node.hidden = true);
  await site.waitForTimeout(250);
  await site.locator('#popup-test').evaluate(node => node.hidden = false);
  await waitCount('overlay', 'popup-item', 2);
  const target = `${base}/opened-popup`;
  for (const count of [1, 2]) {
    const opened = context.waitForEvent('page');
    await site.evaluate(url => { window.open(url, '_blank', 'popup=yes,width=400,height=300'); }, target);
    const popup = await opened;
    await popup.waitForLoadState();
    await waitCount('browser', '/opened-popup', count);
    await popup.close();
  }
  await panel.locator('#visits-details').evaluate(node => node.open = true);
  await panel.locator('#popup-history').getByText(/Website overlay:.*popup-item.*Seen before.*Seen 2 times/).waitFor();
  assert.equal(await panel.locator('#popup-history').getByText(/Browser popup.*opened-popup.*Seen 2 times/).count(), 1);
  await panel.locator('#visits-enabled').uncheck();
  await panel.getByText('URL tracking saved.', { exact: true }).waitFor();
  await site.close();
}
