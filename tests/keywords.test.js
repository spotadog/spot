import test from 'node:test';
import assert from 'node:assert/strict';
import { validateKeyword, makeProfile } from '../src/profiles/model.js';

test('individual keyword validation trims, preserves punctuation and rejects invalid edits', () => {
  assert.equal(validateKeyword('  hot   dog  ', ['cat']), 'hot dog');
  assert.equal(validateKeyword('dog, cat'), 'dog, cat');
  for (const value of ['', '  ', '\n']) assert.throws(() => validateKeyword(value), /Enter a keyword/);
  assert.throws(() => validateKeyword('DOG', ['dog']), /already exists/);
  assert.throws(() => validateKeyword('x'.repeat(121)), /under 121/);
  assert.throws(() => validateKeyword(null), /must be text/);
  const full = Array.from({ length: 200 }, (_, i) => `term ${i}`);
  assert.throws(() => validateKeyword('new', full), /200/);
  assert.equal(validateKeyword('updated', full.slice(1)), 'updated');
  assert.equal(full[0], 'term 0');
});

test('existing separate arrays and legacy combined input remain compatible', () => {
  const existing = makeProfile({ name: 'Old', positiveKeywords: ['GPU', 'data center'], negativeKeywords: ['gaming'] });
  const edited = makeProfile({ ...existing, positiveKeywords: [validateKeyword('CUDA', ['data center']), 'data center'] }, existing);
  assert.deepEqual(existing.positiveKeywords, ['GPU', 'data center']);
  assert.deepEqual(edited.positiveKeywords, ['CUDA', 'data center']);
  assert.deepEqual(edited.negativeKeywords, existing.negativeKeywords);
  assert.equal(edited.id, existing.id);
  assert.equal(edited.createdAt, existing.createdAt);
  assert.deepEqual(makeProfile({ name: 'Legacy', positiveKeywords: 'GPU\ndata center' }).positiveKeywords, existing.positiveKeywords);
});
