import { HIGHLIGHT_COLORS, validateColor } from '../highlighting/colors.js';
import { element } from '../ui/client.js';
import { request, report, action } from '../ui/client.js';
import { models, providers } from '../services/models.js';
const $ = selector => document.querySelector(selector);
let state;
let draftProvider;
const drafts = {};
let pauseColorChoices = new Map(HIGHLIGHT_COLORS.map(color => [color.value, color.name]));
let selectedPauseColors = new Set();
function renderPauseColors() {
  $('#auto-pause-colors').replaceChildren(...[...pauseColorChoices].map(([color, name]) => {
    const label = element('label', undefined, { className: 'inline' });
    const input = element('input', undefined, { type: 'checkbox', checked: selectedPauseColors.has(color), ariaLabel: `${name} auto-pause` });
    input.dataset.color = color;
    input.addEventListener('change', () => { if (input.checked) selectedPauseColors.add(color); else selectedPauseColors.delete(color); });
    label.style.borderBottom = `3px solid ${color}`;
    label.append(input, document.createTextNode(`${name} (${color})`));
    return label;
  }));
}
$('#add-auto-pause-color').addEventListener('click', () => {
  const color = validateColor($('#auto-pause-custom').value);
  if (!pauseColorChoices.has(color)) pauseColorChoices.set(color, 'Custom');
  selectedPauseColors.add(color); renderPauseColors();
});
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
  selectedPauseColors = new Set(state.preferences.autoPauseColors);
  pauseColorChoices = new Map(HIGHLIGHT_COLORS.map(color => [color.value, color.name]));
  for (const color of selectedPauseColors) if (!pauseColorChoices.has(color)) pauseColorChoices.set(color, 'Custom');
  renderPauseColors();
  $('#eyeball-level').value = state.preferences.eyeballLevel ?? 50;
  $('#eyeball-level-value').textContent = `${$('#eyeball-level').value}%`;
  const provider = state.preferences.provider;
  $('#active-model').textContent = `Saved selection: ${providers[provider]?.name ?? 'Unsupported provider'} — ${state.preferences.model}.`;
  $('#provider').value = Object.hasOwn(providers, provider) ? provider : 'openai';
  if (!Object.hasOwn(providers, provider)) report('The saved provider is unavailable. Choose and save a supported provider.');
  for (const [id, info] of Object.entries(providers)) $('#provider').querySelector(`[value="${id}"]`).textContent = `${info.name}${state.configuredProviders[id] ? ' — configured' : ' — add API key'}`;
  renderProvider();
}
$('#eyeball-level').addEventListener('input', () => { $('#eyeball-level-value').textContent = `${$('#eyeball-level').value}%`; });
$('#navigation-settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  event.submitter.disabled = true;
  try {
    await request('navigation.settings', { eyeballLevel: Number($('#eyeball-level').value), autoPauseColors: [...selectedPauseColors] });
    report('Scrolling settings saved.');
  } catch (error) { report(error); }
  finally { event.submitter.disabled = false; }
});
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
