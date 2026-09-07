import { createStore, scanningState } from '../storage/store.js';
import { makeProfile, mergeKeywords } from '../profiles/model.js';
import { suggestKeywords } from '../services/openai.js';
const store = createStore();
const ready = store.init();
ready.catch(() => {});
async function broadcast(state) {
  const message = { type: 'state.changed', state: scanningState(state) };
  const tabs = await chrome.tabs.query({});
  await Promise.allSettled(tabs.map(tab => chrome.tabs.sendMessage(tab.id, message)));
  await chrome.runtime.sendMessage({ type: 'ui.changed' }).catch(() => {});
}
async function handle(message, sender) {
  await ready;
  if (message.type === 'scan.get') return scanningState(await store.read());
  const trusted = sender.id === chrome.runtime.id && sender.url?.startsWith(chrome.runtime.getURL(''));
  if (!trusted) throw new Error('This action is only available in Spot a Dog.');
  if (message.type === 'state.get') return { ...await store.read(), hasApiKey: Boolean(await store.getKey()) };
  if (message.type === 'settings.save') {
    const model = message.model?.trim();
    if (!model || !/^[a-zA-Z0-9._:-]{1,100}$/.test(model)) throw new Error('Enter a valid model ID.');
    if (message.apiKey !== undefined) await store.setKey(message.apiKey.trim());
    const state = await store.update(s => ({ ...s, preferences: { ...s.preferences, model } }));
    await broadcast(state);
    return true;
  }
  if (message.type === 'ai.suggest') return suggestKeywords({ apiKey: await store.getKey(), seeds: message.seeds, model: (await store.read()).preferences.model });
  const state = await store.update(s => {
    switch (message.type) {
      case 'global.set':
        if (typeof message.enabled !== 'boolean') throw new Error('Invalid enabled state.');
        return { ...s, enabled: message.enabled };
      case 'profile.save': {
        const previous = s.profiles.find(p => p.id === message.profile?.id);
        if (message.profile?.id && !previous) throw new Error('This profile was deleted. Create a new profile.');
        if (!previous && s.profiles.length >= 50) throw new Error('You can save up to 50 profiles.');
        const profile = makeProfile(message.profile ?? {}, previous);
        return { ...s, profiles: previous ? s.profiles.map(p => p.id === profile.id ? profile : p) : [...s.profiles, profile] };
      }
      case 'profile.toggle':
      case 'profile.delete':
      case 'profile.addKeywords': {
        const profile = s.profiles.find(p => p.id === message.id);
        if (!profile) throw new Error('Profile no longer exists.');
        if (message.type === 'profile.delete') return { ...s, profiles: s.profiles.filter(p => p.id !== message.id) };
        let updated;
        if (message.type === 'profile.toggle') {
          if (typeof message.enabled !== 'boolean') throw new Error('Invalid enabled state.');
          updated = makeProfile({ ...profile, enabled: message.enabled }, profile);
        } else {
          if (!['positiveKeywords', 'negativeKeywords'].includes(message.target)) throw new Error('Invalid keyword list.');
          updated = makeProfile({ ...profile, [message.target]: mergeKeywords(profile[message.target], message.keywords) }, profile);
        }
        return { ...s, profiles: s.profiles.map(p => p.id === updated.id ? updated : p) };
      }
      default: throw new Error('Unknown Spot a Dog action.');
    }
  });
  await broadcast(state);
  return true;
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!message?.type || ['state.changed', 'ui.changed'].includes(message.type)) return;
  handle(message, sender).then(data => respond({ ok: true, data }), error => respond({ ok: false, error: error.message || 'Spot a Dog could not complete this action.' }));
  return true;
});
