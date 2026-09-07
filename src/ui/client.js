export async function request(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({ type, ...payload });
  if (!response?.ok) throw new Error(response?.error ?? 'Spot a Dog is unavailable. Reload this extension page.');
  return response.data;
}
export function element(tag, text, attributes = {}) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  Object.assign(node, attributes);
  return node;
}
export function report(error) {
  const status = document.querySelector('#status');
  status.textContent = error instanceof Error ? error.message : error;
  status.classList.toggle('error', error instanceof Error);
}
export function action(button, callback) {
  button.addEventListener('click', async () => {
    button.disabled = true;
    try { await callback(); } catch (error) { report(error); }
    finally { button.disabled = false; }
  });
}
export function subscribe(refresh) {
  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === 'ui.changed') refresh().catch(report);
  });
}
export function wireGlobal(refresh) {
  const toggle = document.querySelector('#global-enabled');
  toggle.addEventListener('change', async () => {
    toggle.disabled = true;
    try { await request('global.set', { enabled: toggle.checked }); await refresh(); }
    catch (error) { report(error); toggle.checked = !toggle.checked; }
    finally { toggle.disabled = false; }
  });
}

// Probe the content script rather than requesting browsing-history permissions.
export function wirePageStatus() {
  let revision = 0;
  const refresh = async () => {
    const current = ++revision;
    let supported = false;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) supported = (await chrome.tabs.sendMessage(tab.id, { type: 'page.status' }))?.supported === true;
    } catch { /* Restricted pages and tabs awaiting reload have no content script. */ }
    if (current !== revision) return;
    document.querySelector('#page-status').textContent = supported
      ? 'This page supports highlighting.'
      : 'Highlighting is unavailable on this page. Use an HTTP/HTTPS webpage; reload it if the extension was just installed or updated. Your scanning switches are unchanged.';
  };
  chrome.tabs.onActivated.addListener(refresh);
  chrome.tabs.onUpdated.addListener(refresh);
  refresh();
}
