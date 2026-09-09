import { createVisitStore } from '../storage/store.js';

export function visitService(api = chrome, store = createVisitStore()) {
  const publish = () => api.runtime.sendMessage({ type: 'visits.changed' }).catch(() => {});
  const record = kind => event => store.record(event, kind).then(changed => changed && publish()).catch(() => {
    api.runtime.sendMessage({ type: 'visits.changed', error: 'URL visit could not be saved. Storage may be full; clear URL history to free space.' }).catch(() => {});
  });
  api.webNavigation.onCommitted.addListener(record('committed'));
  api.webNavigation.onHistoryStateUpdated.addListener(record('route'));
  api.webNavigation.onReferenceFragmentUpdated.addListener(record('route'));
  api.tabs.onRemoved.addListener(id => store.forgetTab(id).catch(() => {}));
  return async message => {
    if (message.type === 'visits.get') return store.read();
    if (message.type === 'visits.configure') await store.configure(message);
    else if (message.type === 'visits.clear') await store.clear();
    else throw new Error('Unknown URL tracking action.');
    await publish();
    return store.read();
  };
}
