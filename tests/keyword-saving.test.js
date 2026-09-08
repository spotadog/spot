import test from 'node:test';
import assert from 'node:assert/strict';
import { changeKeyword, makeProfile } from '../src/profiles/model.js';
import { createStore } from '../src/storage/store.js';

const fixture = () => makeProfile({ name: 'Saved details', positiveKeywords: ['dog', 'cat'], negativeKeywords: ['bad'] });
test('individual mutations preserve details, unrelated rows, regex, color and activity', () => {
  const original = fixture();
  const value = { text: String.raw`\b(dog|cat)\b`, matchingCriteria: { type: 'regex' }, color: '#123abc', active: false };
  const edited = changeKeyword(original, { kind: 'positive', previous: 'dog', value });
  assert.deepEqual(edited.positiveKeywords, [value, 'cat']);
  for (const field of ['id', 'name', 'createdAt', 'enabled', 'negativeKeywords']) {
    assert.deepEqual(edited[field], original[field]);
  }
  assert.deepEqual(original.positiveKeywords, ['dog', 'cat']);
  const added = changeKeyword(edited, { kind: 'negative', previous: null, value: 'new' });
  assert.deepEqual(added.negativeKeywords, ['bad', 'new']);
  assert.deepEqual(changeKeyword(added, { kind: 'negative', previous: 'bad', value: null }).negativeKeywords, ['new']);
});
test('invalid and stale row mutations fail without overwriting another row', () => {
  const p = fixture();
  for (const [mutation, message] of [
    [{ kind: 'positive', previous: 'missing', value: 'new' }, /changed or was removed/],
    [{ kind: 'positive', previous: 'dog', value: 'CAT' }, /already exists/],
    [{ kind: 'positive', previous: 'dog', value: ' ' }, /Enter a keyword/],
    [{ kind: 'other', previous: null, value: 'new' }, /Invalid keyword list/]
  ]) assert.throws(() => changeKeyword(p, mutation), message);
  assert.deepEqual(p.positiveKeywords, ['dog', 'cat']);
});
test('legacy criteria survive single-row mutations without duplication', () => {
  const p = makeProfile({ ...fixture(), criteria: [{ type: 'regex', kind: 'negative', value: 'd.g' }] });
  const updated = changeKeyword(p, { kind: 'positive', previous: 'dog', value: 'puppy' });
  assert.deepEqual(updated.negativeKeywords, ['bad', { text: 'd.g', matchingCriteria: { type: 'regex' } }]);
  assert.deepEqual(updated.rules.criteria, []);
});
test('serialized independent row writes survive recreation and storage failure/retry', async () => {
  let data = {}, fail = false;
  const area = { get: async () => structuredClone(data), set: async value => { if (fail) throw Error('storage failed'); data = structuredClone(value); } };
  const store = createStore(area);
  await store.update(s => ({ ...s, profiles: [fixture()] }));
  const mutate = change => store.update(s => ({ ...s, profiles: [changeKeyword(s.profiles[0], change)] }));
  await Promise.all([
    mutate({ kind: 'positive', previous: 'dog', value: 'puppy' }),
    mutate({ kind: 'negative', previous: 'bad', value: 'worse' })
  ]);
  fail = true;
  await assert.rejects(mutate({ kind: 'positive', previous: 'cat', value: 'kitten' }), /storage failed/);
  assert.deepEqual((await store.read()).profiles[0].positiveKeywords, ['puppy', 'cat']);
  fail = false;
  await mutate({ kind: 'positive', previous: 'cat', value: 'kitten' });
  const saved = (await createStore(area).read()).profiles[0];
  assert.equal(saved.name, 'Saved details');
  assert.deepEqual(saved.positiveKeywords, ['puppy', 'kitten']);
  assert.deepEqual(saved.negativeKeywords, ['worse']);
});

test('storage property ordering does not make an unchanged keyword stale', () => {
  const stored = { color: '#123abc', matchingCriteria: { type: 'betweenLengths', max: 5, min: 2 }, text: 'word' };
  const previous = { text: 'word', matchingCriteria: { min: 2, max: 5, type: 'betweenLengths' }, color: '#123abc' };
  const p = makeProfile({ name: 'Order', positiveKeywords: [stored] });
  assert.deepEqual(changeKeyword(p, { kind: 'positive', previous, value: null }).positiveKeywords, []);
  assert.throws(() => changeKeyword(p, { kind: 'positive', previous: { ...previous, color: '#ffffff' }, value: null }), /changed or was removed/);
});
