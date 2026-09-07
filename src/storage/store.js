import { initialState, DEFAULT_PREFERENCES } from '../profiles/model.js';
import { normalizePreferences, validateSelection } from '../services/models.js';
const STATE = 'spotadog.state';
function validateKey(key) {
  if (typeof key !== 'string' || key.length > 512 || /\s/.test(key)) throw new Error('Enter a valid API key without whitespace.');
}
const secrets = { openai: 'spotadog.apiKey', anthropic: 'spotadog.anthropicApiKey' };
function secret(provider) {
  if (!Object.hasOwn(secrets, provider)) throw new Error('Choose a supported AI provider in Settings.');
  return secrets[provider];
}
// Only the service worker uses this adapter. Content scripts receive a public projection.
export function createStore(area = chrome.storage.local) {
  let queue = Promise.resolve();
  return {
    async init() { await area.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }); },
    async read() {
      const saved = (await area.get(STATE))[STATE];
      if (saved && saved.schemaVersion !== 1) throw new Error('Unsupported storage version. Update Spot a Dog.');
      const state = saved ?? initialState();
      return { ...state, preferences: normalizePreferences({ ...DEFAULT_PREFERENCES, ...state.preferences }) };
    },
    update(change, credentials = {}) {
      const next = queue.then(async () => {
        const state = await this.read();
        const result = await change(state);
        await area.set({ [STATE]: result, ...credentials });
        return result;
      });
      queue = next.catch(() => {});
      return next;
    },
    saveSettings({ provider = 'openai', model, apiKey }) {
      validateSelection(provider, model);
      if (apiKey !== undefined) validateKey(apiKey);
      return this.update(state => {
        return { ...state, preferences: { ...state.preferences, provider, model,
          providerModels: { ...state.preferences.providerModels, [provider]: model } } };
      }, apiKey === undefined ? {} : { [secret(provider)]: apiKey });
    },
    async getKey(provider = 'openai') { const key = secret(provider); return (await area.get(key))[key] ?? ''; },
    async setKey(key, provider = 'openai') {
      const SECRET = secret(provider);
      validateKey(key);
      if (key) await area.set({ [SECRET]: key });
      else await area.remove(SECRET);
    }
  };
}
export function scanningState(state) {
  return { enabled: state.enabled, tracking: state.preferences?.tracking === true, profiles: state.profiles.map(({ id, enabled, positiveKeywords, negativeKeywords, rules }) => ({ id, enabled, positiveKeywords, negativeKeywords, rules })) };
}
