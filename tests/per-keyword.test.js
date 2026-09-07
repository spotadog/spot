import test from 'node:test';
import assert from 'node:assert/strict';
import { makeProfile, validateKeyword, mergeKeywords } from '../src/profiles/model.js';
import { editableKeywords } from '../src/profiles/keyword.js';
import { findMatches } from '../src/matching/matcher.js';
import { exportProfiles, parseImport } from '../src/profiles/transfer.js';
import { createStore, scanningState } from '../src/storage/store.js';
const term = (text, type) => ({ text, matchingCriteria: { type } });
const profile = positiveKeywords => makeProfile({ name: 'Mixed', positiveKeywords });
const words = (text, p) => findMatches(text, [p]).map(hit => text.slice(hit.start, hit.end));
test('individual criteria coexist with legacy/default matching, including negative keywords', () => {
  const p = profile(['invoice', term('urgent', 'startsWith'), term('INV-[0-9]+', 'regex'), term('completed', 'exactWord'), term('dog', 'contains')]);
  p.negativeKeywords = [term('cat', 'endsWith')];
  assert.deepEqual(words('invoices invoice urgently xurgent INV-42 completed uncompleted doghouse bobcat', p), ['invoice', 'urgently', 'INV-42', 'completed', 'doghouse', 'bobcat']);
  assert.deepEqual(words('INV-42', profile([term('^INV-[0-9]+$', 'regex')])), ['INV-42']);
  assert.deepEqual(words('dog doghouse', profile([{ text: 'dog' }, { text: 'cat', matchingCriteria: null }])), ['dog']);
});
test('editing and clearing a criterion changes only that keyword; approval retains existing records', () => {
  const p = profile([term('dog', 'startsWith'), term('cat', 'endsWith')]);
  const replacement = validateKeyword(term('dog', 'contains'), p.positiveKeywords.slice(1));
  const edited = makeProfile({ ...p, positiveKeywords: [replacement, p.positiveKeywords[1]] }, p);
  assert.equal(p.positiveKeywords[0].matchingCriteria.type, 'startsWith');
  assert.deepEqual(edited.positiveKeywords[1], p.positiveKeywords[1]);
  assert.deepEqual(words('bulldog doghouse', edited), ['bulldog', 'doghouse']);
  const cleared = makeProfile({ ...edited, positiveKeywords: [validateKeyword('dog'), edited.positiveKeywords[1]] }, edited);
  assert.deepEqual(words('dog bulldog doghouse', cleared), ['dog']);
  assert.deepEqual(mergeKeywords(p.positiveKeywords, ['DOG', 'new']), [...p.positiveKeywords, 'new']);
  const variants = [term('dog', 'startsWith'), term('dog', 'endsWith')];
  assert.deepEqual(mergeKeywords(variants, ['new']), [...variants, 'new']);
  assert.throws(() => validateKeyword(term('DOG', 'contains'), p.positiveKeywords), /already exists/);
});
test('keyword records round trip through both transfer scopes and storage recreation', async () => {
  const p = profile(['old', term('^INV-[0-9]+$', 'regex'), { text: 'length', matchingCriteria: { type: 'betweenLengths', min: 2, max: 4 } }]);
  for (const scope of ['single', 'all']) assert.deepEqual(parseImport(exportProfiles([p], scope, p.id), scope), [p]);
  let data = {};
  const area = { get: async () => structuredClone(data), set: async value => { data = structuredClone(value); } };
  await createStore(area).update(s => ({ ...s, profiles: [p] }));
  assert.deepEqual(scanningState(await createStore(area).read()).profiles[0].positiveKeywords, p.positiveKeywords);
});
test('unsupported criteria, extra fields and invalid regex fail safely without blocking valid keywords', () => {
  for (const bad of [term('[', 'regex'), term('dog', 'unknown'), { text: 'dog', matchingCriteria: { type: 'startsWith', value: 'cat' } }, { text: 'dog', matchingCriteria: [] }]) {
    assert.throws(() => validateKeyword(bad));
    assert.deepEqual(words('dog cat', { enabled: true, positiveKeywords: [bad, 'cat'], negativeKeywords: [] }), ['cat']);
    const p = profile(['cat']); p.positiveKeywords.push(bad);
    assert.throws(() => exportProfiles([p], 'all'));
  }
  const regex = term('  dog  ', 'regex');
  assert.deepEqual(validateKeyword(regex), regex);
  assert.deepEqual(validateKeyword(term('  dog  ', 'startsWith')), term('dog', 'startsWith'));
});
test('legacy independent criteria become editable keyword records without changing evaluation', () => {
  const p = makeProfile({ name: 'Legacy', positiveKeywords: ['dog'], criteria: [
    { type: 'startsWith', kind: 'positive', value: 'dog' },
    { type: 'betweenLengths', kind: 'negative', min: 4, max: 6 },
    { type: 'number', kind: 'positive' },
    { type: 'exactLength', kind: 'positive', value: 2 },
    { type: 'regex', kind: 'positive', value: 'Cat' },
    { type: 'regex', kind: 'positive', value: 'cat' }
  ] });
  const updated = makeProfile({ ...p, positiveKeywords: editableKeywords(p, 'positive'), negativeKeywords: editableKeywords(p, 'negative'), criteria: [] }, p);
  assert.deepEqual(findMatches('dog doghouse cat Cat 42 longer', [updated]), findMatches('dog doghouse cat Cat 42 longer', [p]));
  assert.deepEqual(editableKeywords(updated, 'positive'), updated.positiveKeywords);
  assert.deepEqual(updated.rules.criteria, []);
});
