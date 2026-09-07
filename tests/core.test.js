import test from 'node:test';
import assert from 'node:assert/strict';
import { makeProfile, normalizeKeywords } from '../src/profiles/model.js';
import { findMatches } from '../src/matching/matcher.js';
import { createStore, scanningState } from '../src/storage/store.js';
import { suggestKeywords, parseSuggestions } from '../src/services/openai.js';
const profile = (positiveKeywords, negativeKeywords = []) => makeProfile({ name: 'Test', positiveKeywords, negativeKeywords });
test('profiles normalize lists, retain identity/timestamps/rules, validate input', () => {
  const first = profile([' GPU ', 'gpu', 'data   center']);
  assert.deepEqual(first.positiveKeywords, ['GPU', 'data center']);
  const edited = makeProfile({ ...first, name: 'Edited', enabled: false }, first);
  assert.equal(edited.id, first.id);
  assert.equal(edited.createdAt, first.createdAt);
  assert.deepEqual(edited.rules, first.rules);
  assert.equal(edited.enabled, false);
  assert.throws(() => profile(['x'.repeat(121)]));
  assert.throws(() => makeProfile({ name: ' ' }));
  assert.throws(() => normalizeKeywords([{}]));
});
test('literal matching supports case, phrases, repeated occurrences and boundaries', () => {
  const text = 'GPU gpu GPUs data\n center C++ a.b CUDA';
  const hits = findMatches(text, [profile(['gpu', 'data center', 'C++', 'a.b'])]);
  assert.deepEqual(hits.map(h => text.slice(h.start, h.end)), ['GPU', 'gpu', 'data\n center', 'C++', 'a.b']);
  assert.equal(findMatches('éGPU GPUé _GPU', [profile(['GPU'])]).length, 0);
});
test('negative terms suppress only their own profile and disabled profiles do not match', () => {
  const a = profile(['GPU'], ['gaming']);
  const b = profile(['GPU']);
  assert.equal(findMatches('Gaming GPU', [a]).length, 0);
  assert.equal(findMatches('Gaming GPU', [a, b]).length, 1);
  assert.equal(findMatches('GPU', [{ ...b, enabled: false }]).length, 0);
  assert.equal(findMatches('GPU gamingish', [a]).length, 1);
});
test('overlapping phrases remain valid and duplicate ranges are removed', () => {
  const text = 'large language model';
  const hits = findMatches(text, [profile(['large language model', 'language model']), profile(['language model'])]);
  assert.equal(hits.length, 2);
});
function memoryArea() {
  const values = {};
  return { access: null, async setAccessLevel(value) { this.access = value; }, async get(key) { return structuredClone({ [key]: values[key] }); }, async set(data) { Object.assign(values, structuredClone(data)); }, async remove(key) { delete values[key]; } };
}
test('storage serializes concurrent writes, persists on recreation, and isolates credentials', async () => {
  const area = memoryArea(), store = createStore(area);
  await store.init();
  assert.equal(area.access.accessLevel, 'TRUSTED_CONTEXTS');
  await Promise.all([store.update(s => ({ ...s, profiles: [profile(['GPU'])] })), store.update(s => ({ ...s, enabled: false }))]);
  await store.setKey('test-placeholder');
  const saved = await createStore(area).read();
  assert.equal(saved.enabled, false);
  assert.equal(saved.profiles.length, 1);
  assert.equal(JSON.stringify(scanningState(saved)).includes('test-placeholder'), false);
  assert.equal('preferences' in scanningState(saved), false);
  await assert.rejects(store.update(() => { throw new Error('failure'); }));
  await store.update(s => ({ ...s, enabled: true }));
  assert.equal((await store.read()).enabled, true);
  await store.setKey('');
  assert.equal(await store.getKey(), '');
});
const responseBody = suggestions => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ suggestions }) }] }] });
test('AI uses structured output, sends seeds only, validates and deduplicates suggestions', async () => {
  const result = await suggestKeywords({ apiKey: 'test-placeholder', seeds: ['AI'], model: 'gpt-4o-mini' }, async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(init.body);
    assert.equal(body.store, false);
    assert.equal(body.input, '["AI"]');
    assert.equal(body.text.format.type, 'json_schema');
    return { ok: true, json: async () => responseBody(['AI', 'LLM', 'llm', 'machine learning']) };
  });
  assert.deepEqual(result, ['LLM', 'machine learning']);
  assert.throws(() => parseSuggestions(responseBody([{}])));
  assert.throws(() => parseSuggestions({ status: 'incomplete' }));
  assert.throws(() => parseSuggestions({ status: 'completed', output: [{ content: [{ type: 'refusal' }] }] }));
});
test('AI presents actionable failures without echoing keys or raw API errors', async () => {
  for (const status of [401, 403, 429, 500]) {
    await assert.rejects(suggestKeywords({ apiKey: 'test-placeholder', seeds: ['AI'], model: 'x' }, async () => ({ ok: false, status })), error => !error.message.includes('test-placeholder'));
  }
  await assert.rejects(suggestKeywords({ apiKey: '', seeds: ['AI'] }), /API key/);
  await assert.rejects(suggestKeywords({ apiKey: 'x', seeds: [] }), /seed keywords/);
  await assert.rejects(suggestKeywords({ apiKey: 'x', seeds: ['AI'] }, async () => { throw new Error('network'); }), /timed out/);
});
