import { eyeballLevel, validateEyeballLevel, autoPauseColors, validateAutoPauseColors } from '../navigation/preferences.js';
import { mergeCountHistory, historyTotals, countEntries } from '../matching/counts.js';
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
      return { ...state, preferences: normalizePreferences({ ...DEFAULT_PREFERENCES, ...state.preferences, eyeballLevel: eyeballLevel(state.preferences?.eyeballLevel), autoPauseColors: autoPauseColors(state.preferences?.autoPauseColors) }) };
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
    recordCounts(page, observations) {
      const next = queue.then(async () => {
        if (!/^[a-f0-9]{64}$/.test(page) || !observations || typeof observations !== 'object' || Array.isArray(observations)) throw new Error('Invalid count history.');
        const state = await this.read();
        const entries = countEntries(state.profiles);
        const allowed = new Set(entries.map(entry => entry.key));
        const incoming = {};
        if (state.enabled && state.preferences.tracking) for (const [key, contexts] of Object.entries(observations)) {
          if (!allowed.has(key)) continue;
          if (!contexts || typeof contexts !== 'object' || Array.isArray(contexts)) throw new Error('Invalid count contexts.');
          for (const [context, count] of Object.entries(contexts)) {
            if (!/^[a-f0-9]{64}$/.test(context) || !Number.isSafeInteger(count) || count <= 0) throw new Error('Invalid count observation.');
          }
          incoming[key] = contexts;
        }
        const storageKey = `spotadog.counts.v1.${page}`;
        const previous = (await area.get(storageKey))[storageKey] ?? {};
        const merged = mergeCountHistory(previous, incoming);
        if (JSON.stringify(merged) !== JSON.stringify(previous)) await area.set({ [storageKey]: merged });
        return historyTotals(merged, entries);
      });
      queue = next.catch(() => {});
      return next;
    },
    saveNavigationSettings({ eyeballLevel: level, autoPauseColors: colors }) {
      if (level !== undefined || colors === undefined) validateEyeballLevel(level);
      const selected = colors === undefined ? undefined : validateAutoPauseColors(colors);
      return this.update(state => ({ ...state, preferences: { ...state.preferences, ...(level === undefined ? {} : { eyeballLevel: level }), ...(selected === undefined ? {} : { autoPauseColors: selected }) } }));
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
  return { enabled: state.enabled, eyeballLevel: eyeballLevel(state.preferences?.eyeballLevel), autoPauseColors: autoPauseColors(state.preferences?.autoPauseColors), tracking: state.preferences?.tracking === true, profiles: state.profiles.map(({ id, enabled, positiveKeywords, negativeKeywords, rules }) => ({ id, enabled, positiveKeywords, negativeKeywords, rules })) };
}

// Runtime records belong to a browser session, never storage.local or profile backups.
export function createTabStore(area = chrome.storage.session) {
  const key = id => `spotadog.scroll.v1.${id}`;
  let queue = Promise.resolve();
  const serialize = work => {
    const next = queue.catch(() => {}).then(work); queue = next; return next;
  };
  return {
    read(id) { return serialize(async () => (await area.get(key(id)))[key(id)]); },
    update(id, change) { return serialize(async () => {
      const state = await change((await area.get(key(id)))[key(id)]);
      await area.set({ [key(id)]: state }); return state;
    }); },
    remove(id) { return serialize(() => area.remove(key(id))); },
    prune(ids) { return serialize(async () => {
      const keep = new Set(ids.map(key));
      const stale = Object.keys(await area.get(null)).filter(k => k.startsWith('spotadog.scroll.v1.') && !keep.has(k));
      if (stale.length) await area.remove(stale);
    }); }
  };
}

// URL visits are independent of keyword occurrences and profile backups.
export function createVisitStore(local = chrome.storage.local, session = chrome.storage.session) {
  const settingsKey = 'spotadog.visits.settings.v1';
  const historyKey = 'spotadog.visits.history.v1';
  let queue = Promise.resolve();
  const serialize = work => {
    const next = queue.catch(() => {}).then(work); queue = next; return next;
  };
  const settings = async () => ({ enabled: false, mode: 'session', ...(await local.get(settingsKey))[settingsKey] });
  const areaFor = mode => mode === 'allTime' ? local : session;
  const history = async area => (await area.get(historyKey))[historyKey] ?? { entries: {}, tabs: {} };
  return {
    read() { return serialize(async () => {
      const preferences = await settings();
      const saved = await history(areaFor(preferences.mode));
      return { ...preferences, entries: Object.entries(saved.entries).map(([url, count]) => ({ url, count })) };
    }); },
    configure(patch) { return serialize(async () => {
      if (patch.enabled !== undefined && typeof patch.enabled !== 'boolean') throw new Error('Invalid URL tracking toggle.');
      if (patch.mode !== undefined && !['session', 'allTime'].includes(patch.mode)) throw new Error('Choose a URL tracking mode.');
      const previous = await settings();
      await local.set({ [settingsKey]: { ...previous,
        ...(patch.enabled === undefined ? {} : { enabled: patch.enabled }),
        ...(patch.mode === undefined ? {} : { mode: patch.mode }) } });
    }); },
    record(event, kind) { return serialize(async () => {
      const preferences = await settings();
      if (!preferences.enabled || event.frameId !== 0 || event.tabId < 0 || !/^https?:\/\//.test(event.url ?? '') || (event.documentLifecycle && event.documentLifecycle !== 'active')) return false;
      if (!Number.isFinite(event.timeStamp) || !['committed', 'route'].includes(kind)) return false;
      const area = areaFor(preferences.mode);
      const saved = await history(area);
      const previous = saved.tabs[event.tabId];
      // Same-URL History API state updates are not visits; reloads are.
      if (previous && (event.timeStamp <= previous.timeStamp || (kind === 'route' && event.url === previous.url && event.documentId === previous.documentId))) return false;
      const count = saved.entries[event.url] ?? 0;
      if (!Number.isSafeInteger(count + 1)) throw new Error('URL visit count limit reached. Clear URL history to continue.');
      await area.set({ [historyKey]: {
        entries: { ...saved.entries, [event.url]: count + 1 },
        tabs: { ...saved.tabs, [event.tabId]: { url: event.url, documentId: event.documentId, timeStamp: event.timeStamp } }
      } });
      return true;
    }); },
    forgetTab(id) { return serialize(async () => {
      for (const area of [local, session]) {
        const saved = await history(area);
        if (!Object.hasOwn(saved.tabs, id)) continue;
        delete saved.tabs[id];
        await area.set({ [historyKey]: saved });
      }
    }); },
    clear() { return serialize(async () => {
      await local.remove(historyKey);
      await session.remove(historyKey);
    }); }
  };
}
