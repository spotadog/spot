import { request, report, action } from '../ui/client.js';
const $ = selector => document.querySelector(selector);
async function refresh() {
  const state = await request('state.get');
  $('#model').value = state.preferences.model;
  $('#key-status').textContent = state.hasApiKey ? 'An API key is saved.' : 'No API key saved. Add one to request suggestions.';
}
$('#settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  event.submitter.disabled = true;
  try {
    await request('settings.save', { model: $('#model').value, ...($('#api-key').value.trim() ? { apiKey: $('#api-key').value.trim() } : {}) });
    $('#api-key').value = '';
    report('Settings saved.');
    await refresh();
  } catch (error) { report(error); }
  finally { event.submitter.disabled = false; }
});
action($('#remove-key'), async () => {
  await request('settings.save', { model: $('#model').value, apiKey: '' });
  $('#api-key').value = '';
  report('API key removed.');
  await refresh();
});
refresh().catch(report);
