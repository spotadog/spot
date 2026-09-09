import { createTabStore } from '../storage/store.js';
import { defaults, transition } from '../navigation/state.js';
export function navigationService(api = chrome, store = createTabStore()) {
  // Chrome clears session storage on browser startup/reload, but retains it on worker wake.
  const ready = api.tabs.query({}).then(tabs => store.prune(tabs.map(t => t.id)));
  api.tabs.onRemoved.addListener(id => { ready.then(() => store.remove(id)).catch(console.error); });
  api.tabs.onCreated.addListener(tab => { ready.then(() => store.remove(tab.id)).catch(console.error); });
  const publish = async (id, state) => {
    await api.tabs.sendMessage(id, { type: 'scroll.changed', state }, { documentId: state.documentId }).catch(() => {});
    await api.runtime.sendMessage({ type: 'scroll.ui.changed', tabId: id }).catch(() => {});
  };
  return async (message, sender) => {
    await ready;
    const trusted = sender.id === api.runtime.id && sender.url?.startsWith(api.runtime.getURL(''));
    const content = sender.id === api.runtime.id && sender.tab && sender.frameId === 0 && /^https?:\/\//.test(sender.url ?? '') && sender.documentId && (!sender.documentLifecycle || sender.documentLifecycle === 'active');
    if (!trusted && !content) throw Error('Invalid scrolling source.');
    const id = trusted ? message.tabId : sender.tab.id;
    if (!Number.isInteger(id)) throw Error('Choose a webpage tab.');
    await api.tabs.get(id); // Closed tabs cannot recreate records through late messages.
    if (message.type === 'scroll.get' && trusted) return (await store.read(id)) ?? defaults();
    let action;
    if (trusted && message.type === 'scroll.set') {
      const status = await api.tabs.sendMessage(id, { type: 'page.status' }, { frameId: 0 }).catch(() => null);
      if (!status?.supported) throw Error('Auto Scroll is unavailable on this page. Reload an HTTP/HTTPS page.');
      action = { type: 'set', enabled: message.enabled, paused: message.paused, speed: message.speed, pauseAfterPositive: message.pauseAfterPositive };
    } else if (content && message.type === 'scroll.hello') {
      action = { type: 'hello', documentId: sender.documentId, url: sender.url, kind: message.kind };
    } else if (content && ['scroll.next', 'scroll.progress', 'scroll.pause'].includes(message.type)) {
      action = { type: message.type.slice(7), documentId: sender.documentId, revision: message.revision, target: message.target, signature: message.signature, url: sender.url, reason: message.reason };
    } else throw Error('Invalid scrolling action.');
    const state = await store.update(id, async old => {
      if (action.type === 'hello') {
        // Sender metadata describes send time. Probe the current frame inside the
        // serialized mutation so a delayed hello cannot reclaim a navigated tab.
        const current = await api.tabs.sendMessage(id, { type: 'page.status' }, { frameId: 0 });
        if (!message.instance || current?.scrollInstance !== message.instance) throw Error('Page changed.');
      }
      return transition(old ?? defaults(), action);
    });
    // Check again after the serialized write to cover tab-close races.
    try { await api.tabs.get(id); } catch { await store.remove(id); throw Error('Tab closed.'); }
    await publish(id, state);
    return state;
  };
}
