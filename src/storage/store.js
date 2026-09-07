import { initialState } from '../profiles/model.js';
const STATE = 'spotadog.state';
const SECRET = 'spotadog.apiKey';
// Only the service worker uses this adapter. Content scripts receive a public projection.
export function createStore(area = chrome.storage.local) {
  let queue = Promise.resolve();
  return {
    async init() { await area.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }); },
    async read() {
      const saved = (await area.get(STATE))[STATE];
      if (saved && saved.schemaVersion !== 1) throw new Error('Unsupported storage version. Update Spot a Dog.');
      return saved ?? initialState();
    },
    update(change) {
      const next = queue.then(async () => {
        const state = await this.read();
        const result = await change(state);
        await area.set({ [STATE]: result });
        return result;
      });
      queue = next.catch(() => {});
      return next;
    },
    async getKey() { return (await area.get(SECRET))[SECRET] ?? ''; },
    async setKey(key) {
      if (typeof key !== 'string' || key.length > 512 || /\s/.test(key)) throw new Error('Enter a valid API key without whitespace.');
      if (key) await area.set({ [SECRET]: key });
      else await area.remove(SECRET);
    }
  };
}
export function scanningState(state) {
  return { enabled: state.enabled, profiles: state.profiles.map(({ id, enabled, positiveKeywords, negativeKeywords, rules }) => ({ id, enabled, positiveKeywords, negativeKeywords, rules })) };
}
