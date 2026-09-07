import { request, report, action } from '../ui/client.js';
import { models, providers } from '../services/models.js';
const $ = selector => document.querySelector(selector);
let state;
let draftProvider;
const drafts = {};
function remember() {
  if (draftProvider) drafts[draftProvider] = $('#model').value === 'custom' ? $('#custom-model').value : $('#model').value;
}
function showCustom() {
  const custom = $('#model').value === 'custom';
  $('#custom-fields').hidden = !custom;
  $('#custom-model').required = custom;
}
function renderProvider() {
  const provider = $('#provider').value;
  draftProvider = provider;
  $('#api-key').value = '';
  $('#key-label').textContent = `${providers[provider].name} API key`;
  $('#key-status').textContent = state.configuredProviders[provider] ? 'An API key is saved.' : 'No API key saved. Add one to request suggestions.';
  const selected = drafts[provider] ?? state.preferences.providerModels[provider] ?? providers[provider].defaultModel;
  const choices = models.filter(model => model.provider === provider);
  $('#model').replaceChildren(...choices.map(model => new Option(`${providers[provider].name} — ${model.name}`, model.id)), new Option('Custom model…', 'custom'));
  $('#model').value = choices.some(model => model.id === selected) ? selected : 'custom';
  $('#custom-model').value = selected;
  showCustom();
}
async function refresh() {
  state = await request('state.get');
  const provider = state.preferences.provider;
  $('#active-model').textContent = `Saved selection: ${providers[provider]?.name ?? 'Unsupported provider'} — ${state.preferences.model}.`;
  $('#provider').value = Object.hasOwn(providers, provider) ? provider : 'openai';
  if (!Object.hasOwn(providers, provider)) report('The saved provider is unavailable. Choose and save a supported provider.');
  for (const [id, info] of Object.entries(providers)) $('#provider').querySelector(`[value="${id}"]`).textContent = `${info.name}${state.configuredProviders[id] ? ' — configured' : ' — add API key'}`;
  renderProvider();
}
$('#provider').addEventListener('change', () => { remember(); renderProvider(); });
$('#model').addEventListener('change', showCustom);
$('#settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  event.submitter.disabled = true;
  try {
    remember();
    await request('settings.save', { provider: $('#provider').value, model: drafts[draftProvider], ...($('#api-key').value.trim() ? { apiKey: $('#api-key').value.trim() } : {}) });
    $('#api-key').value = '';
    report('Settings saved.');
    await refresh();
  } catch (error) { report(error); }
  finally { event.submitter.disabled = false; }
});
action($('#remove-key'), async () => {
  remember();
  await request('settings.save', { provider: $('#provider').value, model: drafts[draftProvider], apiKey: '' });
  $('#api-key').value = '';
  report('API key removed.');
  await refresh();
});
refresh().catch(report);
