import { request, report } from './client.js';
// A generation guard keeps delayed tab A replies out of tab B's controls.
export function tabView(query, read, render) {
  let generation = 0, tabId = null;
  return {
    get tabId() { return tabId; },
    async refresh() {
      const current = ++generation; tabId = null; render(null);
      const tab = await query();
      if (current !== generation) return;
      const state = tab ? await read(tab.id) : null;
      if (current !== generation) return;
      tabId = tab?.id ?? null; render(state);
    },
    dispose() { generation++; tabId = null; }
  };
}
export function wireAutoScroll() {
  const $ = id => document.getElementById(id);
  const toggle = $('auto-scroll'), speed = $('scroll-speed'), pause = $('scroll-pause'), status = $('scroll-status');
  const positivePause = $('scroll-positive-pause'), positiveSlow = $('scroll-positive-slow');
  let state = null, disposed = false;
  const view = tabView(async () => (await chrome.tabs.query({ active: true, currentWindow: true }))[0], async id => {
    const [saved, supported] = await Promise.all([
      request('scroll.get', { tabId: id }),
      chrome.tabs.sendMessage(id, { type: 'page.status' }, { frameId: 0 }).catch(() => null)
    ]);
    return { ...saved, supported: supported?.supported === true };
  }, value => {
    state = value;
    toggle.disabled = !value?.supported;
    toggle.checked = value?.enabled ?? false;
    $('scroll-controls').hidden = !value?.enabled;
    positiveSlow.disabled = positivePause.disabled = speed.disabled = pause.disabled = !value?.supported;
    positiveSlow.checked = value?.slowOnPositive ?? false;
    positivePause.checked = value?.pauseAfterPositive ?? false;
    speed.value = value?.speed ?? 120;
    $('scroll-speed-value').textContent = `${speed.value} px/s`;
    pause.textContent = value?.paused ? 'Resume' : 'Pause';
    status.textContent = !value ? 'Loading tab…' : !value.supported ? 'Auto Scroll is unavailable on this page.' : !value.enabled ? 'Off for this tab.' : value.paused ? `${value.reason || 'Paused'}. Resume from the current position.` : value.pending ? 'Loading next page…' : 'Running on this tab.';
  });
  const refresh = () => { if (!disposed) view.refresh().catch(error => { status.textContent = error.message; }); };
  const change = async payload => {
    const tabId = view.tabId;
    if (tabId === null) return;
    toggle.disabled = positiveSlow.disabled = positivePause.disabled = speed.disabled = pause.disabled = true;
    try { await request(payload.paused === false ? 'scroll.resume' : 'scroll.set', { tabId, ...payload }); }
    catch (error) { report(error); }
    finally { refresh(); }
  };
  toggle.addEventListener('change', () => change({ enabled: toggle.checked }));
  positivePause.addEventListener('change', () => change({ pauseAfterPositive: positivePause.checked }));
  positiveSlow.addEventListener('change', () => change({ slowOnPositive: positiveSlow.checked }));
  speed.addEventListener('input', () => { $('scroll-speed-value').textContent = `${speed.value} px/s`; });
  speed.addEventListener('change', () => change({ speed: Number(speed.value) }));
  pause.addEventListener('click', () => change({ paused: !state.paused }));
  const message = msg => { if (msg.type === 'scroll.ui.changed' && msg.tabId === view.tabId) refresh(); };
  chrome.tabs.onActivated.addListener(refresh);
  chrome.tabs.onUpdated.addListener(refresh);
  chrome.runtime.onMessage.addListener(message);
  window.addEventListener('pagehide', () => {
    disposed = true; view.dispose();
    chrome.tabs.onActivated.removeListener(refresh);
    chrome.tabs.onUpdated.removeListener(refresh);
    chrome.runtime.onMessage.removeListener(message);
  }, { once: true });
  chrome.commands.getAll().then(commands => {
    if (disposed) return;
    const shortcut = commands.find(command => command.name === 'resume-auto-scroll')?.shortcut;
    $('scroll-shortcut').textContent = shortcut ? `Resume shortcut: ${shortcut}. Change it at chrome://extensions/shortcuts.` : 'Assign a Resume shortcut at chrome://extensions/shortcuts.';
  }).catch(() => {});
  refresh();
}
