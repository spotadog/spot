import assert from 'node:assert/strict';
export async function checkAutoScroll(context, panel, origin) {
  const site = await context.newPage();
  await site.route(`${origin}/scroll**`, route => {
    const second = route.request().url().includes('page=2');
    return route.fulfill({ contentType: 'text/html', body: `<!doctype html><main><h1>${second ? 'Second' : 'First'} listing</h1><a id="detail" href="/scroll-detail">Dog detail</a><div style="height:1600px">Dogs</div>${second ? '<nav aria-label="Pagination"><button disabled>Next</button></nav>' : '<nav aria-label="Pagination"><a rel="next" href="/scroll?page=2">Next</a></nav>'}</main>` });
  });
  await site.goto(`${origin}/scroll`);
  const tabId = await panel.evaluate(async url => (await chrome.tabs.query({})).find(t => t.url === url).id, site.url());
  await panel.evaluate(id => chrome.tabs.update(id, { active: true }), tabId);
  // This is an extension page used as a panel: a native Playwright click would
  // activate its tab. Check readiness and dispatch together to avoid clicking a
  // disabled control between tab/status refreshes.
  await panel.waitForFunction(() => {
    const toggle = document.querySelector('#auto-scroll');
    if (toggle.disabled) return false;
    toggle.click(); return true;
  });
  try { await site.waitForFunction(() => scrollY > 50); }
  catch (error) {
    const diagnostic = await panel.evaluate(async tabId => ({
      state: await chrome.runtime.sendMessage({ type: 'scroll.get', tabId }),
      status: document.querySelector('#scroll-status').textContent,
      error: document.querySelector('#status').textContent
    }), tabId);
    throw new Error(`Auto Scroll did not start: ${JSON.stringify(diagnostic)}`, { cause: error });
  }
  await panel.evaluate(() => document.querySelector('#scroll-pause').click());
  await panel.waitForFunction(() => document.querySelector('#scroll-pause').textContent === 'Resume');
  const y = await site.evaluate(() => scrollY);
  await site.waitForTimeout(200); assert.equal(await site.evaluate(() => scrollY), y);
  await panel.evaluate(() => {
    const speed = document.querySelector('#scroll-speed'); speed.value = '600'; speed.dispatchEvent(new Event('change'));
  });
  await panel.waitForFunction(() => document.querySelector('#scroll-speed').value === '600' && !document.querySelector('#scroll-speed').disabled);
  await site.goto(`${origin}/scroll-detail`); await site.goBack();
  await panel.waitForFunction(() => document.querySelector('#scroll-pause').textContent === 'Resume' && !document.querySelector('#scroll-pause').disabled);
  const saved = await panel.evaluate(async tabId => (await chrome.runtime.sendMessage({ type: 'scroll.get', tabId })).data, tabId);
  assert.equal(saved.paused, true); assert.equal(saved.speed, 600);
  await site.evaluate(() => scrollTo(0, 500));
  await panel.evaluate(() => document.querySelector('#scroll-pause').click());
  await site.waitForFunction(() => scrollY > 550);
  await site.waitForURL('**/scroll?page=2');
  await site.waitForFunction(() => scrollY > 50);
  const other = await context.newPage(); await other.goto(`${origin}/other`);
  await other.bringToFront();
  await panel.waitForFunction(() => !document.querySelector('#auto-scroll').checked && !document.querySelector('#auto-scroll').disabled);
  assert.equal((await panel.evaluate(async tabId => (await chrome.runtime.sendMessage({ type: 'scroll.get', tabId })).data, tabId)).enabled, true);
  await site.bringToFront();
  await panel.waitForFunction(() => document.querySelector('#auto-scroll').checked && !document.querySelector('#scroll-pause').disabled);
  await panel.evaluate(() => document.querySelector('#scroll-pause').click());
  await panel.waitForFunction(() => document.querySelector('#scroll-pause').textContent === 'Resume');
  // A worker recreation must read the same tab session record, without resetting pause/speed.
  assert.equal((await panel.evaluate(async id => (await chrome.storage.session.get(`spotadog.scroll.v1.${id}`))[`spotadog.scroll.v1.${id}`], tabId)).paused, true);
  await site.close();
  await panel.waitForFunction(async id => !(await chrome.storage.session.get(`spotadog.scroll.v1.${id}`))[`spotadog.scroll.v1.${id}`], tabId);
  await other.close();
}

export async function checkPositivePause(context, panel, origin) {
  const saved = await panel.evaluate(async () => {
    const response = await chrome.runtime.sendMessage({ type: 'profile.save', profile: { name: 'Autoplay positive fixture', positiveKeywords: [{ text: 'autoplaypositive', color: '#123456' }], negativeKeywords: ['autoplaynegative'] } });
    if (!response.ok) throw Error(response.error);
    await chrome.runtime.sendMessage({ type: 'global.set', enabled: true });
    return response.data.id;
  });
  const settings = await context.newPage();
  await settings.goto(new URL('/options/index.html', panel.url()).href);
  await settings.waitForFunction(() => document.querySelector('#model').options.length > 0);
  assert.equal(await settings.locator('#eyeball-level').inputValue(), '50');
  const configure = async level => {
    await settings.evaluate(level => {
      const slider = document.querySelector('#eyeball-level'); slider.value = String(level); slider.dispatchEvent(new Event('input'));
    }, level);
    await settings.getByRole('button', { name: 'Save scrolling settings', exact: true }).click();
    await settings.getByText('Scrolling settings saved.', { exact: true }).waitFor();
    await settings.reload();
    await settings.waitForFunction(level => document.querySelector('#eyeball-level').value === String(level) && document.querySelector('#model').options.length > 0, level);
  };
  const layouts = [
    '<article id="match" style="height:900px"><div><p style="margin:0">autoplaypositive autoplaynegative</p></div></article><section style="height:1800px">Next content</section>',
    '<section><div id="match" style="height:900px"><div><p style="margin:0">autoplaypositive autoplaynegative</p></div></div><div style="height:1800px">Next post</div></section>',
    '<p id="match" style="height:900px;margin:0">autoplaypositive autoplaynegative</p><section style="height:1800px">Next section</section>'
  ];
  for (const [index, layout] of layouts.entries()) {
    const level = [50, 25, 75][index];
    await configure(level);
    const site = await context.newPage();
    await site.route(`${origin}/positive-scroll`, route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><body style="margin:0"><div style="height:900px">Before matching content</div>${layout}</body>` }));
    await site.goto(`${origin}/positive-scroll`);
    await site.bringToFront();
    const tabId = await panel.evaluate(async url => (await chrome.tabs.query({})).find(t => t.url === url).id, site.url());
    await panel.waitForFunction(() => !document.querySelector('#auto-scroll').disabled);
    await panel.evaluate(() => document.querySelector('#auto-scroll').click());
    await panel.waitForFunction(() => !document.querySelector('#scroll-positive-pause').disabled && document.querySelector('#auto-scroll').checked);
    await panel.evaluate(() => document.querySelector('#scroll-positive-pause').click());
    await panel.waitForFunction(() => document.querySelector('#scroll-positive-pause').checked && !document.querySelector('#scroll-speed').disabled);
    await panel.evaluate(() => { const speed = document.querySelector('#scroll-speed'); speed.value = '600'; speed.dispatchEvent(new Event('change')); });
    await panel.waitForFunction(() => document.querySelector('#scroll-status').textContent.includes('Positive keyword'));
    assert.ok(Math.abs(await site.evaluate(level => document.querySelector('#match').getBoundingClientRect().top - innerHeight * level / 100, level)) <= 1);
    const pausedY = await site.evaluate(() => scrollY);
    await site.waitForTimeout(200); assert.equal(await site.evaluate(() => scrollY), pausedY);
    await panel.evaluate(() => document.querySelector('#scroll-pause').click());
    await site.waitForFunction(y => scrollY > y + 50, pausedY);
    assert.equal((await panel.evaluate(async tabId => (await chrome.runtime.sendMessage({ type: 'scroll.get', tabId })).data, tabId)).paused, false);
    await site.close();
  }
  await configure(50);
  const slowSite = await context.newPage();
  await slowSite.route(`${origin}/slow-scroll`, route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><body style="margin:0"><div style="height:900px">Ordinary content</div><article id="match" style="height:600px">autoplaypositive</article><div style="height:2500px">Ordinary content again</div></body>' }));
  await slowSite.goto(`${origin}/slow-scroll`);
  await slowSite.bringToFront();
  const tabId = await panel.evaluate(async url => (await chrome.tabs.query({})).find(t => t.url === url).id, slowSite.url());
  // Set independent options before starting, then verify their shared UI state.
  const response = await panel.evaluate(async tabId => chrome.runtime.sendMessage({ type: 'scroll.set', tabId, enabled: true, speed: 600, pauseAfterPositive: true, slowOnPositive: true }), tabId);
  assert.equal(response.ok, true);
  await panel.waitForFunction(() => document.querySelector('#scroll-positive-slow').checked && document.querySelector('#scroll-positive-pause').checked);
  await slowSite.waitForFunction(() => document.querySelector('#match').getBoundingClientRect().top < innerHeight / 2 - 30);
  const slowStart = await slowSite.evaluate(() => scrollY);
  await slowSite.waitForTimeout(500);
  const slowDistance = await slowSite.evaluate(y => scrollY - y, slowStart);
  assert.ok(slowDistance > 0 && slowDistance < 150, `Slow distance: ${slowDistance}`);
  await slowSite.waitForFunction(() => document.querySelector('#match').getBoundingClientRect().bottom < innerHeight / 2 - 30);
  const fastStart = await slowSite.evaluate(() => scrollY);
  await slowSite.waitForTimeout(500);
  const fastDistance = await slowSite.evaluate(y => scrollY - y, fastStart);
  assert.ok(fastDistance > slowDistance * 2, `Slow/normal distances: ${slowDistance}/${fastDistance}`);
  assert.equal((await panel.evaluate(async tabId => (await chrome.runtime.sendMessage({ type: 'scroll.get', tabId })).data, tabId)).paused, false);
  await panel.waitForFunction(() => !document.querySelector('#scroll-positive-slow').disabled);
  await panel.evaluate(() => document.querySelector('#scroll-positive-slow').click());
  await panel.waitForFunction(() => !document.querySelector('#scroll-positive-slow').checked && document.querySelector('#scroll-positive-pause').checked);
  await slowSite.close();
  await settings.close();
  await panel.evaluate(async id => chrome.runtime.sendMessage({ type: 'profile.delete', id }), saved);
}
