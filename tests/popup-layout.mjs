import assert from 'node:assert/strict';

// Runs in the existing unpacked-extension suite. A tab cannot reproduce Chrome's
// native popup autosizer, but can verify its document geometry and scroll input.
export async function checkPopupLayout(page, id) {
  const originalViewport = page.viewportSize();
  for (const surface of ['popup', 'sidepanel']) {
    await page.goto(`chrome-extension://${id}/${surface}/index.html`);
    await page.locator('#new-profile').waitFor();
    // Exercise short/tall content and subsequent removal without storage changes.
    const original = await page.locator('main').innerHTML();
    for (const width of [320, 420, 680]) {
      await page.setViewportSize({ width, height: 600 });
      let shortWidth;
      for (const count of [1, 80, 1]) {
        await page.locator('main').evaluate((main, count) => {
          main.replaceChildren(...Array.from({ length: count }, (_, i) => {
            const p = document.createElement('p');
            p.textContent = `Keyword ${i}: ${'longword'.repeat(15)}`;
            p.style.overflowWrap = 'anywhere';
            return p;
          }));
          scrollTo(0, 0);
        }, count);
        for (const position of [0, 0.5, 1]) {
          const samples = await page.evaluate(async position => {
            const root = document.scrollingElement;
            scrollTo(0, (root.scrollHeight - innerHeight) * position);
            const samples = [];
            for (let frame = 0; frame < 8; frame++) {
              await new Promise(requestAnimationFrame);
              const body = document.body;
              samples.push({
                width: body.getBoundingClientRect().width,
                fits: root.scrollWidth <= root.clientWidth,
                naturalHeight: body.scrollHeight <= body.clientHeight + 1,
                scrollable: root.scrollHeight > innerHeight,
                scrollY,
                gutter: getComputedStyle(document.documentElement).scrollbarGutter
              });
            }
            return samples;
          }, position);
          for (const sample of samples) {
            assert.equal(sample.fits, true, `${surface}: no horizontal overflow at ${width}`);
            assert.equal(sample.naturalHeight, true, `${surface}: body includes all content`);
            assert.equal(sample.scrollable, count > 1);
            assert.equal(sample.width, samples[0].width, 'stable across rendering frames');
            if (count > 1 && position > 0) assert.ok(sample.scrollY > 0, 'document scrolls');
            if (surface === 'popup') {
              assert.equal(sample.gutter, 'stable');
              shortWidth ??= sample.width;
              assert.equal(sample.width, shortWidth, 'content/scroll changes preserve popup width');
              assert.ok(sample.width <= 420);
            } else {
              assert.equal(sample.gutter, 'auto', 'side panel retains existing scrollbar policy');
              assert.equal(sample.width, width);
            }
          }
        }
      }
    }
    await page.locator('main').evaluate((main, original) => { main.innerHTML = original; }, original);
  }
  await page.setViewportSize(originalViewport);
  await page.reload();
}
