import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestKeywords, parseSuggestions } from '../src/services/openai.js';
import { suggestionSchema } from '../src/services/suggestion-contract.js';

const envelope = text => ({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }] });
const data = value => envelope(JSON.stringify(value));
const options = { apiKey: 'test-placeholder', seeds: ['AI'], model: 'gpt-4o-mini' };

test('each request supplies the authoritative contract in instructions and strict format', async () => {
  for (const model of ['gpt-4o-mini', 'configured-model']) {
    const result = await suggestKeywords({ ...options, model }, async (_url, init) => {
      const request = JSON.parse(init.body);
      assert.equal(request.model, model);
      assert.deepEqual(request.text.format, { type: 'json_schema', name: 'keyword_suggestions', strict: true, schema: suggestionSchema });
      assert.deepEqual(JSON.parse(request.instructions.split('\n')[1]), suggestionSchema);
      assert.deepEqual(Object.keys(request.text.format.schema.properties), ['suggestions']);
      assert.deepEqual(request.text.format.schema.required, ['suggestions']);
      assert.equal(request.text.format.schema.additionalProperties, false);
      assert.equal(request.text.format.schema.properties.suggestions.type, 'array');
      assert.equal(request.text.format.schema.properties.suggestions.items.type, 'string');
      return { ok: true, json: async () => data({ suggestions: ['AI', ' LLM ', 'llm', 'data\ncenter'] }) };
    });
    assert.deepEqual(result, ['LLM', 'data center']);
  }
});

test('contract accepts nested string arrays, empty candidates and existing domain boundaries', () => {
  assert.deepEqual(parseSuggestions(data({ suggestions: [] })), []);
  assert.deepEqual(parseSuggestions(data({ suggestions: ['x'.repeat(120)] })), ['x'.repeat(120)]);
  const candidates = Array.from({ length: 30 }, (_, i) => `term ${i}`);
  assert.deepEqual(parseSuggestions(data({ suggestions: candidates })), candidates);
  const body = data({ suggestions: ['LLM'] });
  body.output.unshift({ type: 'reasoning', summary: [] });
  assert.deepEqual(parseSuggestions(body), ['LLM']);
});

test('contract rejects missing, null, extra, wrongly typed and oversized data', () => {
  for (const value of [null, [], 'prose', 1, {}, { Suggestions: [] },
    { suggestions: null }, { suggestions: 'LLM' }, { suggestions: [], extra: true },
    ...[null, {}, [], 1, true].map(item => ({ suggestions: [item] })),
    { suggestions: Array(31).fill('LLM') }, { suggestions: ['x'.repeat(121)] }]) {
    assert.throws(() => parseSuggestions(data(value)), /API returned invalid suggestions/);
  }
});

test('malformed envelopes and JSON produce controlled errors without prose extraction', async () => {
  for (const body of [null, undefined, [], {}, { status: 'completed' },
    { status: 'completed', output: {} }, { status: 'completed', output: [null] },
    { status: 'completed', output: [{ type: 'message' }] },
    ...[null, {}, [null], [{ type: 'output_text', text: {} }]].map(content => ({ status: 'completed', output: [{ content }] })),
    envelope(''), envelope('{'), envelope('```json\n{"suggestions":[]}\n```'),
    envelope('Here is your JSON: {"suggestions":[]}')]) {
    assert.throws(() => parseSuggestions(body), error => error instanceof Error && !(error instanceof TypeError) && /response|incomplete/.test(error.message));
  }
  const multiple = data({ suggestions: [] });
  multiple.output.push(...multiple.output);
  assert.throws(() => parseSuggestions(multiple), /invalid suggestion response/);
  await assert.rejects(suggestKeywords(options, async () => ({ ok: true, json: async () => { throw new SyntaxError('sensitive raw body'); } })), { message: 'The API returned an invalid suggestion response.' });
});
