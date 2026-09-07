import { request, element, report, action, subscribe, wireGlobal, wirePageStatus } from '../ui/client.js';
async function refresh() {
  const state = await request('state.get');
  document.querySelector('#global-enabled').checked = state.enabled;
  document.querySelector('#summary').textContent = state.enabled ? `${state.profiles.filter(p => p.enabled).length} active profiles` : 'Paused. Your profiles are saved.';
  const list = document.querySelector('#profiles');
  list.replaceChildren();
  if (!state.profiles.length) list.append(element('p', 'Create your first keyword profile in the side panel.', { className: 'empty' }));
  for (const profile of state.profiles) {
    const label = element('label', undefined, { className: 'card inline' });
    const input = element('input', undefined, { type: 'checkbox', checked: profile.enabled });
    input.addEventListener('change', async () => {
      try { await request('profile.toggle', { id: profile.id, enabled: input.checked }); }
      catch (error) { input.checked = !input.checked; report(error); }
    });
    label.append(input, element('span', profile.name));
    list.append(label);
  }
}
// Call open directly in the click gesture; awaiting a message first can lose activation.
action(document.querySelector('#open-panel'), async () => {
  const current = await chrome.windows.getCurrent();
  try { await chrome.sidePanel.open({ windowId: current.id }); }
  catch { throw new Error('Could not open the side panel. Try again from the toolbar or use Chrome’s side panel menu.'); }
  window.close();
});
action(document.querySelector('#settings'), () => chrome.runtime.openOptionsPage());
wireGlobal(refresh);
subscribe(refresh);
refresh().catch(report);

wirePageStatus();
