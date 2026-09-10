import { visiblePopups, popupIdentity } from '../popups/detection.js';

export function wirePopups() {
  // Retain appearance tokens across extension reinjection within this document.
  const appearances = globalThis.__spotadogPopupAppearances ??= new Map();
  let enabled = false, disposed = false, timer, trigger, revision = 0;
  const send = async (type, payload = {}) => {
    const response = await chrome.runtime.sendMessage({ type, ...payload });
    if (!response?.ok) throw Error(response?.error || 'Popup tracking unavailable');
    return response.data;
  };
  async function scan() {
    if (!enabled || disposed || document.visibilityState !== 'visible') return;
    const visible = new Set(visiblePopups(document));
    for (const node of appearances.keys()) if (!visible.has(node)) appearances.delete(node);
    for (const node of visible) {
      const previous = appearances.get(node);
      const source = location.href;
      const activation = previous?.trigger ?? (trigger && Date.now() - trigger.time < 1500 ? trigger : undefined);
      const descriptor = popupIdentity(node, source, activation);
      if (!previous || previous.identity !== descriptor.identity) appearances.set(node, {
        ...descriptor, source, token: Array.from(crypto.getRandomValues(new Uint32Array(4))).join('-'), trigger: activation, acknowledged: false
      });
      const appearance = appearances.get(node);
      if (appearance.acknowledged || appearance.pending) continue;
      appearance.pending = true;
      try {
        const result = await send('popups.record', { identity: appearance.identity, label: appearance.label, token: appearance.token });
        appearance.acknowledged = result?.recorded === true;
      } catch { /* Retry the same token on the next scan; failed writes never inflate counts. */ }
      finally { appearance.pending = false; }
    }
  }
  const observer = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(scan, 150); });
  const click = event => {
    if (!enabled || disposed) return;
    const link = event.target.closest?.('a[href]');
    if (link && /^https?:/.test(link.href) && link.href !== location.href && !link.getAttribute('href').startsWith('#')) trigger = { url: link.href, time: Date.now() };
    else trigger = undefined;
    setTimeout(scan, 0);
  };
  let poll;
  async function configure() {
    const current = ++revision;
    try {
      const settings = await send('popups.settings');
      if (disposed || current !== revision) return;
      enabled = settings.enabled;
      observer.disconnect(); clearInterval(poll); clearTimeout(timer);
      if (enabled) {
        observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
        poll = setInterval(scan, 1000); scan();
      } else { appearances.clear(); trigger = undefined; }
    } catch { enabled = false; observer.disconnect(); clearInterval(poll); }
  }
  const listener = message => { if (message?.type === 'popups.configure') configure(); };
  chrome.runtime.onMessage.addListener(listener);
  document.addEventListener('click', click, true);
  document.addEventListener('visibilitychange', scan);
  configure();
  return { dispose() {
    disposed = true; ++revision; observer.disconnect(); clearInterval(poll); clearTimeout(timer);
    chrome.runtime.onMessage.removeListener(listener);
    document.removeEventListener('click', click, true); document.removeEventListener('visibilitychange', scan);
  } };
}
