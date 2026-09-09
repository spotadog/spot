import { request, element } from './client.js';

export function wireVisits() {
  const $ = selector => document.querySelector(selector);
  const toggle = $('#visits-enabled'), mode = $('#visits-mode'), clear = $('#visits-clear');
  let snapshot, revision = 0, limit = 50, busy = false;
  const status = message => { const node = $('#visits-status'); if (node) node.textContent = message; };
  const controls = () => { toggle.disabled = mode.disabled = clear.disabled = busy || !snapshot; };
  function renderHistory() {
    const query = $('#visits-search').value.toLowerCase();
    const entries = (snapshot?.entries ?? []).filter(entry => entry.url.toLowerCase().includes(query)).sort((a, b) => a.url.localeCompare(b.url));
    $('#visits-history').replaceChildren(...entries.slice(0, limit).map(({ url, count }) => {
      const row = element('p');
      row.append(element('span', url), element('strong', ` — ${count} ${count === 1 ? 'visit' : 'visits'}`));
      return row;
    }));
    if (!entries.length) $('#visits-history').append(element('p', 'No recorded URLs.'));
    $('#visits-more').hidden = entries.length <= limit;
  }
  async function refresh() {
    const current = ++revision;
    try {
      const [latest, tabs] = await Promise.all([request('visits.get'), chrome.tabs.query({ active: true, currentWindow: true })]);
      if (current !== revision || !$('#url-visits')) return;
      snapshot = latest;
      if (!busy) { toggle.checked = latest.enabled; mode.value = latest.mode; }
      controls();
      const url = tabs[0]?.url;
      const count = latest.entries.find(entry => entry.url === url)?.count ?? 0;
      $('#visits-current').textContent = /^https?:\/\//.test(url ?? '')
        ? `Current URL: ${count} recorded ${count === 1 ? 'visit' : 'visits'}${count > 1 ? ' — visited before' : ''}.${latest.enabled ? '' : ' Tracking is off.'}`
        : 'Open an HTTP/HTTPS tab to see its visit count.';
      renderHistory();
    } catch (error) { if (current === revision) status(error.message); }
  }
  async function mutate(type, payload, success) {
    busy = true; controls(); status('Saving…');
    try { await request(type, payload); status(success); }
    catch (error) { status(error.message); }
    finally { busy = false; await refresh(); controls(); }
  }
  toggle.addEventListener('change', () => mutate('visits.configure', { enabled: toggle.checked }, 'URL tracking saved.'));
  mode.addEventListener('change', () => { limit = 50; mutate('visits.configure', { mode: mode.value }, 'URL tracking mode saved.'); });
  clear.addEventListener('click', () => {
    if (confirm('Clear all recorded URL visits in both modes?')) mutate('visits.clear', {}, 'URL visit history cleared.');
  });
  $('#visits-search').addEventListener('input', () => { limit = 50; renderHistory(); });
  $('#visits-more').addEventListener('click', () => { limit += 50; renderHistory(); });
  const changed = message => { if (message?.type === 'visits.changed') { if (message.error) status(message.error); refresh(); } };
  chrome.runtime.onMessage.addListener(changed);
  chrome.tabs.onActivated.addListener(refresh);
  chrome.tabs.onUpdated.addListener(refresh);
  window.addEventListener('pagehide', () => {
    ++revision;
    chrome.runtime.onMessage.removeListener(changed);
    chrome.tabs.onActivated.removeListener(refresh);
    chrome.tabs.onUpdated.removeListener(refresh);
  });
  refresh();
}
