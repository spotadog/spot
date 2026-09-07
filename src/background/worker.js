import { navigationService } from './navigation.js';
import { fingerprintHistory } from '../storage/count-history.js';
import { createStore, scanningState } from '../storage/store.js';
import { makeProfile, mergeKeywords } from '../profiles/model.js';
import { suggestKeywords } from '../services/ai.js';
import { exportProfiles, parseImport, mergeProfiles } from '../profiles/transfer.js';
const store = createStore();
const navigate = navigationService();
async function applyDisplay(sidebar) {
  // Global options intentionally omit tabId so every tab uses the saved mode.
  await chrome.sidePanel.setOptions({ path: 'sidepanel/index.html', enabled: sidebar });
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: sidebar });
  await chrome.action.setPopup({ popup: sidebar ? '' : 'popup/index.html' });
}
const ready = store.init();
let displayQueue = ready.then(async () => applyDisplay((await store.read()).preferences.sidebar));
displayQueue.catch(console.error);
function setDisplay(sidebar) {
  const next = displayQueue.catch(() => {}).then(async () => {
    const previous = (await store.read()).preferences.sidebar;
    try {
      await applyDisplay(sidebar);
      return await store.update(s => ({ ...s, preferences: { ...s.preferences, sidebar } }));
    } catch (error) {
      await applyDisplay(previous).catch(console.error);
      throw error;
    }
  });
  displayQueue = next;
  return next;
}
ready.catch(() => {});
// Read inside the refresh queue so slower mutations cannot broadcast older snapshots.
let refreshQueue = Promise.resolve();
function broadcast() {
  const next = refreshQueue.catch(() => {}).then(async () => {
    const message = { type: 'state.changed', state: scanningState(await store.read()) };
    const tabs = await chrome.tabs.query({});
    const results = await Promise.allSettled(tabs.map(tab => chrome.tabs.sendMessage(tab.id, message)));
    await chrome.runtime.sendMessage({ type: 'ui.changed' }).catch(() => {});
    return results.some(r => r.status === 'fulfilled' && r.value?.ok === false);
  });
  refreshQueue = next;
  return next;
}
ready.then(() => broadcast()).catch(console.error);
chrome.runtime.onInstalled.addListener(() => {
  ready.then(async () => {
    const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
    await Promise.allSettled(tabs.map(async tab => {
      const target = { tabId: tab.id };
      await chrome.scripting.removeCSS({ target, files: ['content/highlights.css'] });
      await chrome.scripting.insertCSS({ target, files: ['content/highlights.css'] });
      await chrome.scripting.executeScript({ target, files: ['content/index.js'] });
    }));
    await broadcast();
  }).catch(console.error);
});
async function handle(message, sender) {
  await ready;
  if (message.type.startsWith('scroll.')) return navigate(message, sender);
  if (message.type === 'counts.record') {
    if (sender.id !== chrome.runtime.id || !sender.tab || sender.frameId !== 0 || !/^https?:\/\//.test(sender.url ?? '')) throw new Error('Invalid count source.');
    if (typeof message.url !== 'string' || !/^https?:\/\//.test(message.url)) throw new Error('Invalid count page.');
    const { page, observations } = await fingerprintHistory(message.url, message.history);
    return store.recordCounts(page, observations);
  }
  if (message.type === 'scan.get') return scanningState(await store.read());
  const trusted = sender.id === chrome.runtime.id && sender.url?.startsWith(chrome.runtime.getURL(''));
  if (!trusted) throw new Error('This action is only available in Spot a Dog.');
  if (message.type === 'profiles.export') return exportProfiles((await store.read()).profiles, message.scope, message.id);
  if (message.type === 'profiles.import') {
    const imported = parseImport(message.text, message.scope);
    if (!imported.length) return { count: 0, warning: '' };
    try { await store.update(s => ({ ...s, profiles: mergeProfiles(s.profiles, imported) })); }
    catch (error) {
      if (error.message.includes('50 profiles')) throw error;
      throw new Error('Profiles could not be saved. Existing profiles are unchanged.');
    }
    let failed = false;
    try { failed = await broadcast(); } catch { failed = true; }
    return { count: imported.length, warning: failed ? 'Profiles saved, but a page could not refresh. Reload affected webpages.' : '' };
  }
  if (message.type === 'state.get') {
    const state = await store.read();
    const configuredProviders = { openai: Boolean(await store.getKey('openai')), anthropic: Boolean(await store.getKey('anthropic')) };
    return { ...state, configuredProviders, hasApiKey: Boolean(configuredProviders[state.preferences.provider]) };
  }
  if (message.type === 'display.set') {
    if (typeof message.sidebar !== 'boolean') throw new Error('Invalid sidebar preference.');
    await setDisplay(message.sidebar);
    await broadcast();
    return true;
  }
  if (message.type === 'settings.save') {
    await store.saveSettings({ provider: message.provider ?? 'openai', model: message.model?.trim(), apiKey: message.apiKey });
    await broadcast();
    return true;
  }
  if (message.type === 'ai.suggest') {
    const { provider, model } = (await store.read()).preferences;
    return suggestKeywords({ provider, model, apiKey: await store.getKey(provider), seeds: message.seeds });
  }
  let savedProfileId;
  await store.update(s => {
    switch (message.type) {
      case 'tracking.set':
        if (typeof message.enabled !== 'boolean') throw new Error('Invalid tracking preference.');
        return { ...s, preferences: { ...s.preferences, tracking: message.enabled } };
      case 'global.set':
        if (typeof message.enabled !== 'boolean') throw new Error('Invalid enabled state.');
        return { ...s, enabled: message.enabled };
      case 'profile.save': {
        const previous = s.profiles.find(p => p.id === message.profile?.id);
        if (message.profile?.id && !previous) throw new Error('This profile was deleted. Create a new profile.');
        if (!previous && s.profiles.length >= 50) throw new Error('You can save up to 50 profiles.');
        const profile = makeProfile(message.profile ?? {}, previous);
        savedProfileId = profile.id;
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
  await broadcast();
  return savedProfileId ? { id: savedProfileId } : true;
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!message?.type || ['state.changed', 'ui.changed', 'scroll.changed', 'scroll.ui.changed'].includes(message.type)) return;
  handle(message, sender).then(data => respond({ ok: true, data }), error => respond({ ok: false, error: error.message || 'Spot a Dog could not complete this action.' }));
  return true;
});
