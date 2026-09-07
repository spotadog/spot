import test from 'node:test';
import assert from 'node:assert/strict';
import { MATCH_TYPES, validateCriterion, validateCriteria } from '../src/matching/criteria.js';
import { criterionOccurrences, findMatches, resolveHighlights } from '../src/matching/matcher.js';
import { makeProfile } from '../src/profiles/model.js';
import { exportProfiles, parseImport } from '../src/profiles/transfer.js';
import { createStore, scanningState } from '../src/storage/store.js';
const criterion = (type, config = {}) => ({ type, kind: 'positive', ...config });
const hits = (type, text, config) => criterionOccurrences(text, criterion(type, config)).map(h => text.slice(h.start, h.end));
const cases = [
  ['exactWord', { value: 'dog' }, '(DOG), doghouse bulldog dog_dog dog', ['DOG', 'dog'], 'doggy'],
  ['contains', { value: 'dog' }, '(DOG), doghouse bulldog cat', ['DOG', 'doghouse', 'bulldog'], 'do g'],
  ['startsWith', { value: 'dog' }, 'DOG doghouse bulldog', ['DOG', 'doghouse'], 'underdog'],
  ['endsWith', { value: 'dog' }, 'DOG doghouse bulldog', ['DOG', 'bulldog'], 'doggy'],
  ['exactPhrase', { value: 'hot dog' }, '(HOT  \n dog), hot doghouse', ['HOT  \n dog'], 'hotdog'],
  ['startsWithPhrase', { value: 'hot dog' }, ' \nHOT   dog walks', ['HOT   dog'], 'a hot dog'],
  ['endsWithPhrase', { value: 'hot dog' }, 'a HOT \n dog \n', ['HOT \n dog'], 'hot dog!'],
  ['shorterThan', { value: 5 }, 'a DOG four fives longer', ['a', 'DOG', 'four'], 'fives longer'],
  ['longerThan', { value: 5 }, 'a DOG fives longer', ['longer'], 'a fives'],
  ['exactLength', { value: 5 }, 'four FIVES longer', ['FIVES'], 'four longer'],
  ['betweenLengths', { min: 4, max: 5 }, 'a FOUR fives longer', ['FOUR', 'fives'], 'a longer'],
  ['number', {}, '(123), -42 +3.5 .25 6e-2 x12 12x', ['123', '-42', '+3.5', '.25', '6e-2'], 'abc123 42dogs 1.2.3'],
  ['url', {}, '(https://Example.com/dog), example.org/path www.example.net?q=dog', ['https://Example.com/dog', 'example.org/path', 'www.example.net?q=dog'], 'name@example.com ftp://example.com bad_domain.com example'],
  ['email', {}, '(Name+tag@Example.com), x@y.org', ['Name+tag@Example.com', 'x@y.org'], 'a..b@example.com a@-bad.com name@example a@b.c'],
  ['hashtag', {}, '(#DOG), #犬 #café x#dog', ['#DOG', '#犬', '#café'], '# x#dog ##dog'],
  ['mention', {}, '(@SpotADog), @犬 @café name@example.com', ['@SpotADog', '@犬', '@café'], '@ x@dog @@dog'],
  ['regex', { value: '\\b(dog|cat)s?\\b' }, 'dogs cat DOG doghouse', ['dogs', 'cat'], 'DOG catsup']
];
for (const [type, config, text, expected, negative] of cases) test(`${type}: distinct positive, negative and empty semantics`, () => {
  assert.deepEqual(hits(type, text, config), expected);
  assert.deepEqual(hits(type, negative, config), []);
  assert.deepEqual(hits(type, '', config), []);
});
test('all selectable types have semantic test coverage', () => {
  assert.deepEqual(MATCH_TYPES.map(d => d.type), cases.map(c => c[0]));
});
test('Unicode tokens, combining marks, astral offsets and lengths', () => {
  assert.deepEqual(hits('exactWord', '😀 CAFÉ café cafe\u0301 cafés', { value: 'café' }), ['CAFÉ', 'café']);
  assert.deepEqual(hits('exactWord', 'cafe\u0301', { value: 'cafe' }), []);
  assert.deepEqual(hits('exactLength', '𐐀𐐁 犬猫 cafe\u0301', { value: 2 }), ['𐐀𐐁', '犬猫']);
  assert.deepEqual(hits('exactLength', 'cafe\u0301', { value: 5 }), ['cafe\u0301']);
  assert.deepEqual(hits('startsWith', 'École préécole', { value: 'é' }), ['École']);
  assert.deepEqual(hits('endsWith', 'préÉ École', { value: 'é' }), ['préÉ']);
  assert.deepEqual(hits('contains', 'préÉcole', { value: 'é' }), ['préÉcole']);
  assert.deepEqual(criterionOccurrences('😀 DOG', criterion('exactWord', { value: 'dog' })), [{ start: 3, end: 6 }]);
});
test('phrases retain punctuation, boundaries, flexible whitespace and edge semantics', () => {
  assert.deepEqual(hits('exactPhrase', 'a.b Axb a.bx', { value: 'a.b' }), ['a.b']);
  assert.deepEqual(hits('exactPhrase', 'hot dog hot\ndog hot doghouse', { value: ' hot   dog ' }), ['hot dog', 'hot\ndog']);
  assert.deepEqual(hits('startsWithPhrase', '(hot dog)', { value: 'hot dog' }), []);
  assert.deepEqual(hits('endsWithPhrase', 'a a a', { value: 'a a' }), ['a a']);
  assert.deepEqual(criterionOccurrences('a a a', criterion('endsWithPhrase', { value: 'a a' })), [{ start: 2, end: 5 }]);
  assert.deepEqual(hits('endsWithPhrase', 'hot dog.', { value: 'hot dog.' }), ['hot dog.']);
  assert.deepEqual(hits('exactPhrase', 'cafe\u0301 dog', { value: 'cafe' }), []);
});
test('structural boundaries and practical URL/email validation', () => {
  assert.deepEqual(hits('url', 'http://localhost:8080/a https://127.0.0.1/a https://例え.テスト/a (example.com/a(b)).', {}), ['http://localhost:8080/a', 'https://127.0.0.1/a', 'https://例え.テスト/a', 'example.com/a(b)']);
  assert.deepEqual(hits('url', 'https://example.com:99999/a https:// bad-.com', {}), []);
  assert.deepEqual(hits('email', 'a.@example.com .a@example.com a@example-.com a@exam_ple.com 𐐀name@example.com a@example.com.123', {}), []);
  assert.deepEqual(hits('hashtag', '#cafe\u0301!', {}), ['#cafe\u0301']);
  assert.deepEqual(hits('mention', '@a_b.', {}), ['@a_b']);
  assert.deepEqual(hits('number', '(42). 0 -0.5 x42 42x １２', {}), ['42', '0', '-0.5']);
});
test('validation rejects malformed criteria before save/import; evaluation fails closed', () => {
  const invalid = [null, {}, { type: 'unknown', kind: 'positive' }, criterion('number', { value: '123' }),
    { type: 'number', kind: 'other' }, criterion('regex', { value: '[' }), criterion('regex', { value: ' ' }),
    criterion('exactWord', { value: 'two words' }), criterion('exactWord', { value: '' }), criterion('contains', { value: '.' }),
    criterion('exactPhrase', { value: '\n  ' }), criterion('exactPhrase', { value: 'x'.repeat(121) }),
    ...[-1, 1.5, '5', null, NaN, Infinity, 10001].map(value => criterion('exactLength', { value })),
    criterion('betweenLengths', { min: 5, max: 4 }), criterion('betweenLengths', { min: 0 }),
    criterion('betweenLengths', { min: -1, max: 4 }), criterion('betweenLengths', { min: 0, max: 1.5 })];
  for (const c of invalid) {
    assert.throws(() => validateCriterion(c));
    assert.throws(() => makeProfile({ name: 'Invalid', criteria: [c] }));
    assert.deepEqual(criterionOccurrences('a dog 123', c), []);
    const p = makeProfile({ name: 'Test' });
    p.rules.criteria = [c];
    assert.throws(() => parseImport(JSON.stringify({ format: 'spotadog.profiles', version: 1, scope: 'single', profiles: [p] }), 'single'));
  }
  assert.throws(() => validateCriteria({}));
  assert.throws(() => validateCriteria(Array(201).fill(criterion('number'))));
  assert.deepEqual(hits('betweenLengths', 'a ab abc', { min: 1, max: 2 }), ['a', 'ab']);
  assert.deepEqual(hits('exactLength', 'a', { value: 0 }), []);
  assert.deepEqual(hits('longerThan', 'a', { value: 0 }), ['a']);
});
test('regex source is preserved, Unicode and case remain explicit, zero-width is ignored', () => {
  const c = criterion('regex', { value: ' dog |\\p{L}+' });
  assert.equal(validateCriterion(c).value, c.value);
  assert.deepEqual(hits('regex', 'DOG dog 犬', { value: 'dog|犬' }), ['dog', '犬']);
  assert.deepEqual(hits('regex', '😀dog', { value: '(?:)' }), []);
  assert.deepEqual(hits('regex', 'dog', { value: '(?=d)|dog' }), []);
  assert.deepEqual(hits('regex', 'dog dog', { value: 'dog' }), ['dog', 'dog']);
});
test('criteria survive transfer, store recreation, projection and legacy editor mutations', async () => {
  const original = makeProfile({ name: 'Mixed', positiveKeywords: ['GPU', 'C++'], criteria: cases.map(([type, config]) => criterion(type, config)) });
  original.rules.negativeScope = 'text-node';
  const copy = parseImport(exportProfiles([original], 'single', original.id), 'single')[0];
  assert.deepEqual(copy, original);
  assert.deepEqual(parseImport(exportProfiles([original], 'all'), 'all'), [original]);
  const values = {};
  const area = { async get(k) { return structuredClone({ [k]: values[k] }); }, async set(v) { Object.assign(values, structuredClone(v)); } };
  await createStore(area).update(s => ({ ...s, profiles: [copy] }));
  const state = await createStore(area).read();
  assert.deepEqual(scanningState(state).profiles[0].rules, original.rules);
  assert.deepEqual(makeProfile({ ...copy, enabled: false }, copy).rules, original.rules);
  assert.deepEqual(makeProfile({ name: 'Edit', positiveKeywords: ['new'] }, copy).rules, original.rules);
  assert.deepEqual(makeProfile({ name: 'Edit', criteria: [] }, copy).rules.criteria, []);
  const legacy = makeProfile({ name: 'Old', positiveKeywords: ['dog', 'hot dog', 'C++'] });
  legacy.rules.wholeWords = false; // Historically ignored; never reinterpret it.
  assert.deepEqual(findMatches('doghouse DOG hot\n dog C++', [legacy]).map(h => ['doghouse DOG hot\n dog C++'.slice(h.start, h.end), h.kind]), [['DOG', 'positive'], ['hot\n dog', 'positive'], ['dog', 'positive'], ['C++', 'positive']]);
});
test('criteria use existing independent kinds, deduplication, disabled state and red precedence', () => {
  const p = makeProfile({ name: 'Criteria only', criteria: [criterion('contains', { value: 'dog' }), { type: 'regex', kind: 'negative', value: 'dog' }] });
  assert.deepEqual(resolveHighlights(findMatches('bulldog', [p, p])), [{ start: 0, end: 4, kind: 'positive' }, { start: 4, end: 7, kind: 'negative' }]);
  assert.deepEqual(findMatches('bulldog', [{ ...p, enabled: false }]), []);
});
