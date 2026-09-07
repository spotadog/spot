// Curated text + structured JSON models. See README for verification sources.
export const providers = {
  openai: { name: 'OpenAI', defaultModel: 'gpt-4o-mini' },
  anthropic: { name: 'Anthropic', defaultModel: 'claude-haiku-4-5-20251001' }
};
export const models = [
  ['openai', 'gpt-4o-mini', 'GPT-4o Mini'],
  ['openai', 'gpt-4.1-mini', 'GPT-4.1 Mini'],
  ['openai', 'gpt-4.1', 'GPT-4.1'],
  ['anthropic', 'claude-haiku-4-5-20251001', 'Claude Haiku 4.5'],
  ['anthropic', 'claude-sonnet-5', 'Claude Sonnet 5'],
  ['anthropic', 'claude-opus-5', 'Claude Opus 5']
].map(([provider, id, name]) => ({ provider, id, name, features: ['suggestions', 'structuredOutput'] }));
export function validateSelection(provider, model) {
  if (!Object.hasOwn(providers, provider)) throw new Error('Choose a supported AI provider in Settings.');
  if (typeof model !== 'string' || !/^[a-zA-Z0-9._:-]{1,100}$/.test(model)) throw new Error('Choose a valid model in Settings.');
  const known = models.find(item => item.id === model);
  if (known && known.provider !== provider) throw new Error('This model belongs to a different provider. Choose a model in Settings.');
}
export function normalizePreferences(preferences = {}) {
  const provider = preferences.provider ?? 'openai';
  const model = preferences.model ?? providers[provider]?.defaultModel ?? '';
  return { ...preferences, provider, model, providerModels: { ...preferences.providerModels, [provider]: model } };
}
