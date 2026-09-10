import { createVisitStore } from '../storage/store.js';

export function visitService(api = chrome, store = createVisitStore()) {
  const publish = () => api.runtime.sendMessage({ type: 'visits.changed' }).catch(() => {});
  const record = kind => async event => {
    try {
      let changed = await store.record(event, kind);
      if (kind === 'committed' && event.frameId === 0 && /^https?:\/\//.test(event.url) && (!event.documentLifecycle || event.documentLifecycle === 'active') && (await store.popupSettings()).enabled) {
        const tab = await api.tabs.get(event.tabId);
        const popupWindow = tab.windowId !== undefined && (await api.windows.get(tab.windowId)).type === 'popup';
        if (popupWindow || tab.openerTabId !== undefined) {
          const result = await store.recordPopup({ kind: 'browser', identity: event.url, label: event.url, source: event.url,
            token: `browser:${event.tabId}:${event.documentId ?? event.timeStamp}:${event.timeStamp}` });
          changed ||= result.recorded;
        }
      }
      if (changed) await publish();
    } catch {
      api.runtime.sendMessage({ type: 'visits.changed', error: 'Visit or popup could not be saved. Storage may be full; clear URL history to free space.' }).catch(() => {});
    }
  };
  api.webNavigation.onCommitted.addListener(record('committed'));
  api.webNavigation.onHistoryStateUpdated.addListener(record('route'));
  api.webNavigation.onReferenceFragmentUpdated.addListener(record('route'));
  api.tabs.onRemoved.addListener(id => store.forgetTab(id).catch(() => {}));
  return async (message, sender) => {
    if (message.type === 'popups.settings' || message.type === 'popups.record') {
      if (sender?.id !== api.runtime.id || sender.frameId !== 0 || !sender.tab || !/^https?:\/\//.test(sender.url ?? '')) throw new Error('Invalid popup source.');
      if (message.type === 'popups.settings') return store.popupSettings();
      if (typeof message.token !== 'string' || message.token.length > 128 || !message.token) throw new Error('Invalid popup token.');
      try {
        const result = await store.recordPopup({ kind: 'overlay', identity: message.identity, label: message.label,
          source: sender.url, token: `${sender.tab.id}:${sender.documentId}:${message.token}` });
        if (result.recorded) await publish();
        return result;
      } catch (error) {
        await api.runtime.sendMessage({ type: 'visits.changed', error: 'Popup could not be saved. Storage may be full; clear URL history to free space.' }).catch(() => {});
        throw error;
      }
    }
    if (message.type === 'visits.get') return store.read();
    if (message.type === 'visits.configure') await store.configure(message);
    else if (message.type === 'visits.clear') await store.clear();
    else throw new Error('Unknown URL tracking action.');
    // Only configuration changes wake overlay detectors; visit notifications are UI-only.
    const tabs = await api.tabs.query({});
    await Promise.allSettled(tabs.map(tab => api.tabs.sendMessage(tab.id, { type: 'popups.configure' })));
    await publish();
    return store.read();
  };
}
