import { SCOUT_MAX_BYTES } from '../profiles/scout.js';
import { HIGHLIGHT_COLORS, validateColor } from '../highlighting/colors.js';
import { element, request, report, action } from '../ui/client.js';
import { models, providers } from '../services/models.js';
const $ = selector => document.querySelector(selector);
let state;
let draftProvider;
const drafts = {};
let pauseColorChoices = new Map(HIGHLIGHT_COLORS.map(color => [color.value, color.name]));
let selectedPauseColors = new Set(), savedPauseColors = new Set();
let colorsLoaded = false, colorRevision = 0, colorSaveQueue = Promise.resolve();
function savePauseColors() {
  const colors = [...selectedPauseColors], revision = ++colorRevision;
  report('Saving auto-pause colors…');
  // Dispatch immediately so closing this view cannot discard queued edits.
  // The worker serializes writes; process their acknowledgments in edit order.
  const saving = request('navigation.settings', { autoPauseColors: colors }).then(() => null, error => error);
  colorSaveQueue = colorSaveQueue.then(async () => {
    try {
      const error = await saving;
      if (error) throw error;
      savedPauseColors = new Set(colors);
      if (revision === colorRevision) report('Auto-pause colors saved.');
    } catch (error) {
      if (revision === colorRevision) {
        selectedPauseColors = new Set(savedPauseColors); renderPauseColors();
        report(error);
      }
    }
  });
}
function renderPauseColors() {
  $('#auto-pause-colors').replaceChildren(...[...pauseColorChoices].map(([color, name]) => {
    const label = element('label', undefined, { className: 'inline' });
    const input = element('input', undefined, { type: 'checkbox', checked: selectedPauseColors.has(color), ariaLabel: `${name} auto-pause` });
    input.dataset.color = color;
    input.addEventListener('change', () => { if (input.checked) selectedPauseColors.add(color); else selectedPauseColors.delete(color); savePauseColors(); });
    label.style.borderBottom = `3px solid ${color}`;
    label.append(input, document.createTextNode(`${name} (${color})`));
    return label;
  }));
}
$('#add-auto-pause-color').addEventListener('click', () => {
  const color = validateColor($('#auto-pause-custom').value);
  if (!pauseColorChoices.has(color)) pauseColorChoices.set(color, 'Custom');
  selectedPauseColors.add(color); renderPauseColors(); savePauseColors();
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
  // AI/settings refreshes must not replace pending checkbox edits with an older snapshot.
  if (!colorsLoaded) {
    selectedPauseColors = new Set(state.preferences.autoPauseColors);
    savedPauseColors = new Set(selectedPauseColors);
    pauseColorChoices = new Map(HIGHLIGHT_COLORS.map(color => [color.value, color.name]));
    for (const color of selectedPauseColors) if (!pauseColorChoices.has(color)) pauseColorChoices.set(color, 'Custom');
    renderPauseColors(); colorsLoaded = true;
    $('#auto-pause-color-controls').disabled = false;
  }
  $('#eyeball-level').value = state.preferences.eyeballLevel ?? 50;
  $('#eyeball-level-value').textContent = `${$('#eyeball-level').value}%`;
  $('#location-check-enabled').checked = state.locationCheck?.enabled ?? false;
  $('#location-check-location').value = state.locationCheck?.location ?? '';
  $('#scout-summary').textContent = `${state.scoutData?.records.length ?? 0} scout profiles uploaded.`;
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
    await colorSaveQueue;
    await request('navigation.settings', { eyeballLevel: Number($('#eyeball-level').value) });
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
    await colorSaveQueue;
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
$('#location-check-form').addEventListener('submit', async event => {
  event.preventDefault(); event.submitter.disabled = true;
  try {
    const result = await request('scout.settings', { settings: { enabled: $('#location-check-enabled').checked, location: $('#location-check-location').value } });
    report(result.warning || 'Location check saved.');
  } catch (error) { report(error); }
  finally { event.submitter.disabled = false; }
});
$('#scout-file').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  event.target.disabled = true;
  try {
    if (!file.name.toLowerCase().endsWith('.json') || file.size > SCOUT_MAX_BYTES) throw Error('Choose a scout .json file of at most 5 MiB.');
    const result = await request('scout.import', { text: await file.text() });
    $('#scout-summary').textContent = `${result.count} scout profiles uploaded.`;
    report(result.warning || 'Scout profiles uploaded. Location checks updated.');
  } catch (error) { report(error); }
  finally { event.target.value = ''; event.target.disabled = false; }
});
action($('#scout-clear'), async () => {
  const result = await request('scout.import', { text: JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), records: [] }) });
  $('#scout-summary').textContent = '0 scout profiles uploaded.';
  report(result.warning || 'Scout profiles cleared.');
});
refresh().catch(report);
