import { chromium } from 'playwright';
import { readFile } from 'node:fs/promises';

// The SVG is editable source; Chrome's manifest references the committed PNGs.
const svg = await readFile('src/icons/icon.svg', 'utf8');
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const size of [16, 20, 24, 32, 40, 48, 64, 128, 256]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
    await page.screenshot({ path: `src/icons/icon-${size}.png`, omitBackground: true });
  }
} finally {
  await browser.close();
}
