import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { chromium } from 'playwright';

// Exercise the shared editor in an isolated DOM, with no extension or live website.
const fixtures = [
  ['plain text', 'ordinary keyword', false, 'ordinary keyword'],
  ['literal punctuation', String.raw`a+b [c] (d) "quoted" & <tag> \path`, false],
  ['simple regex', 'dog|cat', true, 'cat'],
  ['backslashes', String.raw`\b\d+\s\w+\b`, true, '42 dogs'],
  ['character classes', '[a-z][A-Z0-9]', true, 'a9'],
  ['groups', '(dog|cat)(?:s)?', true, 'dogs'],
  ['quantifiers and anchors', '^a*b+c?d{1,3}$', true, 'aabbcdd'],
  ['escaped metacharacters', String.raw`\^\$\.\*\+\?\(\)\[\]\{\}\\`, true, '^$.*+?()[]{}\\'],
  ['quotes and markup', `^["']<&>["]$`, true, '"<&>"'],
  ['literal escape sequences', String.raw`\n\r\t\u0061\x62`, true, '\n\r\tab'],
  ['significant whitespace', '  dog  ', true, '  dog  '],
  ['named groups', String.raw`(?<word>dog)\k<word>`, true, 'dogdog']
];

test('keyword editor preserves special characters through edit, save, storage and reopen', async t => {
  const bundle = await build({ stdin: { contents: `
    export { keywordEditor } from './src/ui/keyword-editor.js';
    export { makeProfile } from './src/profiles/model.js';
    export { editableKeywords, keywordText } from './src/profiles/keyword.js';
    export { createStore } from './src/storage/store.js';
    export { findMatches } from './src/matching/matcher.js';
    export { exportProfiles, parseImport } from './src/profiles/transfer.js';
  `, resolveDir: process.cwd() }, bundle: true, write: false, format: 'iife', globalName: 'fixture' });
  const browser = await chromium.launch({ channel: 'chromium', headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('http://localhost/**', route => route.fulfill({ contentType: 'text/html', body: '<div id="status"></div><div id="editor"></div>' }));
  await page.goto('http://localhost/');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  for (const [name, source, regex, sample] of fixtures) await t.test(name, async () => {
    for (const kind of ['positive', 'negative']) {
      const result = await page.evaluate(async ({ source, regex, sample, kind }) => {
        const { keywordEditor, makeProfile, editableKeywords, keywordText, createStore, findMatches, exportProfiles, parseImport } = fixture;
        let data = {};
        const area = { get: async () => structuredClone(data), set: async value => { data = structuredClone(value); } };
        const container = document.querySelector('#editor');
        container.replaceChildren();
        const editor = keywordEditor(container, kind === 'positive' ? 'Positive' : 'Negative');
        editor.setEditable(true);
        const key = `${kind}Keywords`;
        const keyword = regex ? { text: source, matchingCriteria: { type: 'regex' } } : source;
        let profile = makeProfile({ name: 'Regression', [key]: [keyword, 'unrelated'] });
        await createStore(area).update(s => ({ ...s, profiles: [profile] }));
        const snapshots = [];
        const click = text => [...container.querySelector('.keyword-row').querySelectorAll('button')].find(b => b.textContent === text).click();
        for (const replacement of [source, regex ? `(?:${source})` : `${source} edited`]) {
          profile = (await createStore(area).read()).profiles[0];
          editor.load(editableKeywords(profile, kind));
          click('Edit');
          const input = container.querySelector('input[type=text]');
          const opened = input.value;
          input.value = replacement;
          input.dispatchEvent(new Event('input'));
          click('Save keyword');
          profile = makeProfile({ ...profile, [key]: editor.read() }, profile);
          await createStore(area).update(s => ({ ...s, profiles: [profile] }));
          profile = (await createStore(area).read()).profiles[0];
          const imported = parseImport(exportProfiles([profile], 'single', profile.id), 'single')[0];
          editor.load(editableKeywords(imported, kind));
          click('Edit');
          snapshots.push({ opened, saved: keywordText(profile[key][0]), reopened: container.querySelector('input[type=text]').value,
            other: profile[key][1], criterion: profile[key][0]?.matchingCriteria?.type ?? null,
            matches: sample === undefined ? null : findMatches(sample, [profile]).map(hit => sample.slice(hit.start, hit.end)) });
          click('Cancel');
        }
        return snapshots;
      }, { source, regex, sample, kind });
      for (const [index, snapshot] of result.entries()) {
        const expected = index === 0 ? source : regex ? `(?:${source})` : `${source} edited`;
        assert.equal(snapshot.opened, source);
        assert.equal(snapshot.saved, expected);
        assert.equal(snapshot.reopened, expected);
        assert.equal(snapshot.other, 'unrelated');
        assert.equal(snapshot.criterion, regex ? 'regex' : null);
        if (sample !== undefined && (regex || index === 0)) assert.deepEqual(snapshot.matches, [sample]);
      }
    }
    assert.deepEqual(errors, []);
  });
});
