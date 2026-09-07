import { build } from 'esbuild';
import { cp, mkdir, rm } from 'node:fs/promises';
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await build({ entryPoints: ['src/background/worker.js', 'src/content/index.js', 'src/popup/index.js', 'src/sidepanel/index.js', 'src/options/index.js'], outbase: 'src', outdir: 'dist', bundle: true, target: 'chrome120', format: 'iife' });
await cp('manifest.json', 'dist/manifest.json');
await cp('src/icons', 'dist/icons', { recursive: true, filter: path => !path.endsWith('.svg') });
for (const path of ['sidepanel/index.html', 'options/index.html', 'ui/styles.css', 'content/highlights.css']) {
  await mkdir(`dist/${path.split('/')[0]}`, { recursive: true });
  await cp(`src/${path}`, `dist/${path}`);
}
await mkdir('dist/popup', { recursive: true });
await cp('src/sidepanel/index.html', 'dist/popup/index.html');
console.log('Built Spot a Dog in dist/');
