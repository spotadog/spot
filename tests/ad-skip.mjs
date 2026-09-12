import assert from 'node:assert/strict';
export async function checkAdSkip(context, panel, origin) {
  const settings = await context.newPage();
  await settings.goto(new URL('/options/index.html', panel.url()).href);
  await settings.waitForFunction(() => !document.querySelector('#auto-skip-ads').disabled);
  assert.equal(await settings.locator('#auto-skip-ads').isChecked(), false);
  const site = await context.newPage();
  await site.route(`${origin}/skip-ads`, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><button id="skip">Skip this ad</button><script>window.clicks=0;document.addEventListener("click",e=>{if(e.target.matches("button"))window.clicks++})</script>' }));
  await site.goto(`${origin}/skip-ads`);
  await site.waitForTimeout(600);
  assert.equal(await site.evaluate(() => clicks), 0);
  await settings.locator('#auto-skip-ads').check();
  await settings.getByText('Automatic ad skipping saved.', { exact: true }).waitFor();
  await site.bringToFront();
  await site.waitForFunction(() => clicks === 1);
  await site.waitForTimeout(600);
  assert.equal(await site.evaluate(() => clicks), 1);
  await settings.reload();
  await settings.waitForFunction(() => !document.querySelector('#auto-skip-ads').disabled);
  assert.equal(await settings.locator('#auto-skip-ads').isChecked(), true);
  await settings.locator('#auto-skip-ads').uncheck();
  await settings.getByText('Automatic ad skipping saved.', { exact: true }).waitFor();
  await site.bringToFront();
  await site.evaluate(() => document.body.insertAdjacentHTML('beforeend', '<button>Skip this ad</button>'));
  await site.waitForTimeout(700);
  assert.equal(await site.evaluate(() => clicks), 1);
  await site.close(); await settings.close();
}
