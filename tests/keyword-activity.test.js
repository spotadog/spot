import test from 'node:test';
import assert from 'node:assert/strict';
import { keywordEditor } from '../src/ui/keyword-editor.js';
import { makeProfile, validateKeyword, mergeKeywords } from '../src/profiles/model.js';
import { findMatches } from '../src/matching/matcher.js';
import { exportProfiles, parseImport } from '../src/profiles/transfer.js';
import { createStore, scanningState } from '../src/storage/store.js';

// Minimal DOM fixture for the shared editor; native input behavior is covered by the MV3 suite.
class Node {
  constructor(tag) { this.tag = tag; this.children = []; this.listeners = {}; this.dataset = {}; this.value = ''; this.checked = false; this.classList = { toggle() {} }; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  fire(type) { this.listeners[type]?.({ target: this }); }
  click() { if (!this.disabled) this.fire('click'); }
  focus() {}
  scrollIntoView() {}
  querySelectorAll() { return this.children.flatMap(n => [...(n.tag === 'input' ? [n] : []), ...n.querySelectorAll()]); }
}
function fixture(values, editable = false) {
  globalThis.document = { createElement: tag => new Node(tag), querySelector: () => new Node('p') };
  const container = new Node('div');
  let changes = 0;
  const editor = keywordEditor(container, 'Positive', () => changes++);
  editor.load(values); editor.setEditable(editable);
  return { editor, container, row: i => container.children[0].children[i], get changes() { return changes; } };
}
const checkbox = row => row.children[0].children[0];
const button = (row, name) => row.children.at(-1).children.find(n => n.textContent === name);
const toggle = (row, active) => { checkbox(row).checked = active; checkbox(row).fire('change'); };

test('view displays active/inactive and legacy defaults; forged changes cannot mutate read-only state', () => {
  const values = ['legacy', { text: 'on', active: true }, { text: 'off', active: false }];
  const f = fixture(values);
  for (const [i, checked] of [true, true, false].entries()) {
    assert.equal(checkbox(f.row(i)).checked, checked);
    assert.equal(checkbox(f.row(i)).disabled, true);
    toggle(f.row(i), !checked);
    assert.equal(checkbox(f.row(i)).checked, checked);
    assert.match(f.row(i).children[0].children[2].textContent, /read-only/);
  }
  assert.deepEqual(f.editor.read(), values);
  assert.equal(f.changes, 0);
});
test('entering edit preserves states; activity edits remain drafts and cancel restores saved values', () => {
  const values = [{ text: 'off', active: false, matchingCriteria: { type: 'startsWith' } }, 'on'];
  const original = structuredClone(values);
  const f = fixture(values);
  f.editor.setEditable(true);
  assert.equal(checkbox(f.row(0)).checked, false);
  assert.equal(checkbox(f.row(1)).checked, true);
  assert.equal(checkbox(f.row(0)).disabled, false);
  toggle(f.row(0), true); toggle(f.row(1), false);
  assert.equal(f.changes, 2);
  assert.deepEqual(values, original);
  const saved = makeProfile({ name: 'Existing', positiveKeywords: f.editor.read() });
  assert.equal(saved.positiveKeywords[0].active, true);
  assert.deepEqual(saved.positiveKeywords[0].matchingCriteria, { type: 'startsWith' });
  assert.equal(saved.positiveKeywords[1].active, false);
  f.editor.load(values); f.editor.setEditable(false);
  assert.deepEqual(f.editor.read(), original);
  assert.equal(checkbox(f.row(0)).checked, false);
});
test('create allows inactive new keywords and keyword text edits retain activity', () => {
  const f = fixture([], true);
  f.container.children[2].click();
  const row = f.row(0);
  assert.equal(checkbox(row).disabled, false);
  assert.equal(checkbox(row).checked, true);
  toggle(row, false);
  row.children.find(n => n.tag === 'input' && n.type === 'text').value = 'dog';
  button(row, 'Save keyword').click();
  assert.deepEqual(f.editor.read(), [{ text: 'dog', active: false }]);
  button(row, 'Edit').click(); row.children.find(n => n.tag === 'input' && n.type === 'text').value = 'cat'; button(row, 'Save keyword').click();
  assert.deepEqual(makeProfile({ name: 'New', positiveKeywords: f.editor.read() }).positiveKeywords, [{ text: 'cat', active: false }]);
});
test('activity persists through storage and backups, controls both match kinds, and preserves metadata', async () => {
  const p = makeProfile({ name: 'Activity', positiveKeywords: ['dog', { text: 'cat', active: false, matchingCriteria: { type: 'startsWith' } }], negativeKeywords: [{ text: 'bad', active: false }, { text: 'no', active: true }] });
  for (const scope of ['single', 'all']) assert.deepEqual(parseImport(exportProfiles([p], scope, p.id), scope), [p]);
  let data = {};
  const area = { get: async () => structuredClone(data), set: async value => { data = structuredClone(value); } };
  await createStore(area).update(s => ({ ...s, profiles: [p] }));
  const restored = scanningState(await createStore(area).read());
  assert.deepEqual(restored.profiles[0].positiveKeywords, p.positiveKeywords);
  assert.deepEqual(findMatches('dog cat catfish bad no', restored.profiles).map(hit => hit.kind), ['positive', 'negative']);
  const edited = makeProfile({ ...p, positiveKeywords: [{ text: 'dog', active: false }] }, p);
  for (const key of ['id', 'name', 'enabled', 'createdAt', 'rules', 'negativeKeywords']) assert.deepEqual(edited[key], p[key]);
  assert.deepEqual(mergeKeywords(p.positiveKeywords, ['cat', 'new']), [...p.positiveKeywords, 'new']);
  for (const active of [null, 0, 'false']) assert.throws(() => validateKeyword({ text: 'dog', active }), /boolean/);
});
