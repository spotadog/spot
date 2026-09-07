import test from 'node:test';
import assert from 'node:assert/strict';
import { suggestKeywords, parseAnthropicSuggestions } from '../src/services/anthropic.js';
import { suggestKeywords as dispatch } from '../src/services/ai.js';
import { models, validateSelection } from '../src/services/models.js';
import { suggestionSchema } from '../src/services/suggestion-contract.js';
import { createStore, scanningState } from '../src/storage/store.js';
const envelope = value => ({ type: 'message', stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(value) }] });
const options = { apiKey: 'test-only-placeholder', seeds: ['GPU'], model: 'claude-haiku-4-5-20251001' };
test('every curated Claude model uses Messages native JSON and the shared suggestion contract', async () => {
  for (const model of models.filter(m => m.provider === 'anthropic')) {
    assert.deepEqual(await dispatch({ ...options, provider: 'anthropic', model: model.id }, async (url, init) => {
      assert.equal(url, 'https://api.anthropic.com/v1/messages');
      assert.equal(init.headers['x-api-key'], options.apiKey);
      assert.equal(init.headers.Authorization, undefined);
      assert.equal(init.headers['anthropic-version'], '2023-06-01');
      const body = JSON.parse(init.body);
      assert.equal(body.model, model.id);
      assert.equal(body.max_tokens, 1000);
      assert.equal(body.stream, false);
      assert.ok(body.system.includes(JSON.stringify(suggestionSchema)));
      assert.deepEqual(body.messages, [{ role: 'user', content: '["GPU"]' }]);
      assert.equal(body.output_config.format.schema.properties.suggestions.maxItems, undefined);
      assert.equal(body.output_config.format.schema.additionalProperties, false);
      assert.equal(suggestionSchema.properties.suggestions.maxItems, 30);
      assert.ok(init.signal instanceof AbortSignal);
      return new Response(JSON.stringify(envelope({ suggestions: ['gpu', ' CUDA ', 'cuda'] })));
    }), ['CUDA']);
  }
});
test('Claude rejects malformed, refused, truncated and out-of-contract responses', () => {
  for (const body of [null, {}, { ...envelope({ suggestions: [] }), content: [null] }, envelope(null), envelope({ suggestions: null }), envelope({ suggestions: [], extra: true }), envelope({ suggestions: [1] }), envelope({ suggestions: Array(31).fill('x') }), envelope({ suggestions: ['x'.repeat(121)] }), { ...envelope({ suggestions: [] }), content: [{ type: 'text', text: '```json\n{}\n```' }] }]) assert.throws(() => parseAnthropicSuggestions(body), /invalid/i);
  for (const reason of ['refusal', 'max_tokens', 'tool_use', 'model_context_window_exceeded']) assert.throws(() => parseAnthropicSuggestions({ ...envelope({ suggestions: [] }), stop_reason: reason }), /No suggestions|incomplete/);
  assert.deepEqual(parseAnthropicSuggestions(envelope({ suggestions: [] })), []);
});
test('credentials, model errors and network failures are actionable and never echo provider data', async () => {
  await assert.rejects(suggestKeywords({ ...options, apiKey: '' }), /Anthropic API key/);
  await assert.rejects(suggestKeywords({ ...options, seeds: [] }), /1–20/);
  for (const status of [400, 401, 403, 404, 413, 429, 500, 529]) await assert.rejects(suggestKeywords(options, async () => new Response(options.apiKey, { status })), e => /Anthropic/.test(e.message) && !e.message.includes(options.apiKey));
  await assert.rejects(suggestKeywords(options, async () => { throw Error(options.apiKey); }), /Could not reach Anthropic/);
  await assert.rejects(suggestKeywords(options, async () => new Response('not JSON')), /invalid/);
  assert.throws(() => dispatch({ ...options, provider: 'unknown' }), /provider/);
  assert.throws(() => validateSelection('openai', options.model), /different provider/);
});
test('provider settings migrate legacy custom models, isolate keys and save atomically', async () => {
  let data = { 'spotadog.state': { schemaVersion: 1, profiles: [], preferences: { model: 'my-custom-model', sidebar: true } }, 'spotadog.apiKey': 'old-placeholder' };
  let fail = false;
  const area = { async get() { return structuredClone(data); }, async set(value) { if (fail) throw Error('disk'); Object.assign(data, structuredClone(value)); } };
  const store = createStore(area);
  assert.equal((await store.read()).preferences.providerModels.openai, 'my-custom-model');
  await store.saveSettings({ provider: 'anthropic', model: options.model, apiKey: options.apiKey });
  assert.equal(await store.getKey('openai'), 'old-placeholder');
  assert.equal(await store.getKey('anthropic'), options.apiKey);
  await store.saveSettings({ provider: 'openai', model: 'gpt-4.1' });
  assert.equal((await store.read()).preferences.providerModels.anthropic, options.model);
  assert.equal((await store.read()).preferences.sidebar, true);
  assert.ok(!JSON.stringify(scanningState(await store.read())).includes(options.apiKey));
  const before = structuredClone(data);
  fail = true;
  await assert.rejects(store.saveSettings({ provider: 'anthropic', model: options.model, apiKey: 'replacement-placeholder' }));
  assert.deepEqual(data, before);
  fail = false;
  await store.saveSettings({ provider: 'anthropic', model: options.model, apiKey: '' });
  assert.equal(await store.getKey('anthropic'), '');
  assert.equal(await store.getKey('openai'), 'old-placeholder');
  assert.throws(() => store.saveSettings({ provider: 'anthropic', model: options.model, apiKey: 'bad key' }), /valid API key/);
  assert.throws(() => store.saveSettings({ provider: 'anthropic', model: 'bad model' }), /valid model/);
  assert.equal((await createStore(area).read()).preferences.model, options.model);
});
