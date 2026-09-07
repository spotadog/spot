import { providers } from '../services/models.js';
import { keywordEditor } from '../ui/keyword-editor.js';
import { countKey } from '../matching/counts.js';
import { editableKeywords, keywordKey } from '../profiles/keyword.js';
import { MAX_IMPORT_BYTES, parseImport } from '../profiles/transfer.js';
import { request, element, report, action, subscribe, wireGlobal, wirePageStatus } from '../ui/client.js';
const $ = selector => document.querySelector(selector);
if (location.pathname.startsWith('/popup/')) document.body.classList.add('popup');
const markDirty = () => { dirty = true; };
const positive = keywordEditor($('#positive'), 'Positive', markDirty);
const negative = keywordEditor($('#negative'), 'Negative', markDirty);
let state, editingId = null, suggestionProfile = null;
let editMode = false, dirty = false, saving = false, loadedProfile = null, refreshRevision = 0;
function setEditMode(value) {
  editMode = value;
  $('#name').readOnly = !value;
  $('#profile-enabled').disabled = !value;
  $('#save-actions').hidden = !value;
  $('#edit-profile').hidden = !editingId || value;
  positive.setEditable(value);
  negative.setEditable(value);
  clearCounts();
  $('#edit-help').textContent = value
    ? 'Save each keyword, then choose Save profile to apply changes. Cancel returns to viewing.'
    : 'Checkboxes show keyword activity and are read-only. Choose Edit to make changes.';
}
function view(profile, editable = false) {
  editingId = profile?.id ?? null;
  loadedProfile = JSON.stringify(profile ?? null);
  $('#editor-title').textContent = profile?.name ?? 'New profile';
  $('#name').value = profile?.name ?? '';
  $('#keyword-search').value = '';
  positive.filter(''); negative.filter('');
  positive.load(editableKeywords(profile, 'positive'));
  negative.load(editableKeywords(profile, 'negative'));
  $('#profile-enabled').checked = profile?.enabled ?? true;
  $('#editor').hidden = !profile && !editable;
  $('#delete-profile').hidden = !profile;
  $('#export-single').disabled = !profile;
  if (profile) $('#profile-select option[value=""]')?.remove();
  if (editable && !profile && !$('#profile-select option[value=""]')) $('#profile-select').prepend(element('option', 'New profile (unsaved)', { value: '' }));
  $('#profile-select').value = editingId ?? '';
  setEditMode(editable);
  dirty = false;
  refreshCounts();
}
function canLeave() {
  return !!state && !saving && (!dirty || confirm('Discard unsaved profile changes?'));
}
$('#profile-select').addEventListener('change', () => {
  const id = $('#profile-select').value;
  if (!canLeave()) { $('#profile-select').value = editingId ?? ''; return; }
  view(state.profiles.find(profile => profile.id === id));
  report('');
});
$('#keyword-search').addEventListener('input', event => {
  positive.filter(event.target.value); negative.filter(event.target.value);
});
$('#profile-form').addEventListener('input', event => {
  if (editMode && event.target.matches('#name, #profile-enabled')) markDirty();
});
action($('#edit-profile'), () => { if (!saving) { setEditMode(true); $('#name').focus(); } });
action($('#delete-profile'), async () => {
  if (saving || !editingId || !confirm(`Delete “${$('#name').value}” and its keywords, including unsaved changes?`)) return;
  await request('profile.delete', { id: editingId });
  editMode = dirty = false; editingId = null;
  await refresh();
  report('Profile deleted.');
});
async function refresh() {
  const revision = ++refreshRevision;
  const latest = await request('state.get');
  if (revision !== refreshRevision) return;
  state = latest;
  $('#global-enabled').checked = state.enabled;
  $('#sidebar-mode').checked = state.preferences.sidebar;
  $('#tracking-enabled').checked = state.preferences.tracking === true;
  configureCounts();
  $('#show-sidebar').hidden = !state.preferences.sidebar;
  $('#ai-model').textContent = `${providers[state.preferences.provider]?.name ?? 'Unsupported provider'} — ${state.preferences.model}`;
  if (state.hasApiKey) $('#configure-key').hidden = true;
  $('#global-note').textContent = state.enabled ? 'Matching enabled profiles on supported web pages.' : 'Paused. Highlights are removed; profiles remain saved.';
  const selector = $('#profile-select');
  selector.replaceChildren(...state.profiles.map(p => element('option', p.name, { value: p.id })));
  if (!state.profiles.length) selector.append(element('option', 'No profiles available', { value: '' }));
  if (editMode && !state.profiles.some(p => p.id === editingId)) {
    selector.prepend(element('option', editingId ? 'Deleted profile (unsaved draft)' : 'New profile (unsaved)', { value: editingId ?? '' }));
  }
  selector.disabled = saving || !state.profiles.length;
  $('#profiles-empty').hidden = !!state.profiles.length;
  selector.value = editingId ?? '';
  // Broadcasts must not replace a draft or reset search/selection for unrelated changes.
  if (!editMode && !saving) {
    const profile = state.profiles.find(p => p.id === editingId) ?? state.profiles[0];
    if (JSON.stringify(profile ?? null) !== loadedProfile) view(profile);
  }
  const selected = $('#ai-profile').value;
  $('#ai-profile').replaceChildren(...state.profiles.map(p => element('option', p.name, { value: p.id })));
  if (state.profiles.some(p => p.id === selected)) $('#ai-profile').value = selected;
  if (suggestionProfile && !state.profiles.some(p => p.id === suggestionProfile)) clearSuggestions();
}
let countTimer, countRevision = 0;
function clearCounts() {
  ++countRevision;
  const enabled = state?.preferences.tracking === true && !editMode;
  positive.setCounts(null, enabled); negative.setCounts(null, enabled);
}
async function refreshCounts() {
  const revision = ++countRevision;
  if (!state?.preferences.tracking || !state.enabled || editMode) { clearCounts(); return; }
  const profile = state.profiles.find(p => p.id === editingId);
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = tab?.id ? await chrome.tabs.sendMessage(tab.id, { type: 'counts.get' }) : null;
    if (revision !== countRevision) return;
    for (const [kind, editor] of [['positive', positive], ['negative', negative]]) {
      const values = response?.counts && profile ? Object.fromEntries(editableKeywords(profile, kind).map(keyword => [keywordKey(keyword), response.counts[countKey(profile.id, kind, keyword)]])) : null;
      editor.setCounts(values, true);
    }
  } catch { if (revision === countRevision) clearCounts(); }
}
function configureCounts() {
  clearInterval(countTimer);
  countTimer = null;
  clearCounts();
  if (state.preferences.tracking && state.enabled) countTimer = setInterval(refreshCounts, 500);
  refreshCounts();
}
function pageCountsChanged() { ++countRevision; clearCounts(); refreshCounts(); }
chrome.tabs.onActivated.addListener(pageCountsChanged);
chrome.tabs.onUpdated.addListener(pageCountsChanged);
window.addEventListener('pagehide', () => {
  ++countRevision;
  clearInterval(countTimer);
  chrome.tabs.onActivated.removeListener(pageCountsChanged);
  chrome.tabs.onUpdated.removeListener(pageCountsChanged);
});
$('#tracking-enabled').addEventListener('change', async () => {
  const toggle = $('#tracking-enabled');
  toggle.disabled = true;
  try { await request('tracking.set', { enabled: toggle.checked }); }
  catch (error) { report(error); }
  finally { toggle.disabled = false; await refresh().catch(report); }
});
function clearSuggestions() { $('#review').hidden = true; $('#suggestions').replaceChildren(); suggestionProfile = null; }
let currentWindow;
chrome.windows.getCurrent().then(win => { currentWindow = win.id; }).catch(report);
async function showSidebar() {
  try { await chrome.sidePanel.open({ windowId: currentWindow }); }
  catch { throw new Error('Sidebar preference saved. Click Show sidebar or the extension toolbar icon to open it.'); }
}
action($('#show-sidebar'), showSidebar);
$('#sidebar-mode').addEventListener('change', async () => {
  const toggle = $('#sidebar-mode');
  const sidebar = toggle.checked;
  toggle.disabled = true;
  try {
    await request('display.set', { sidebar });
    report(sidebar ? 'Sidebar mode saved.' : 'Popup mode saved. Use the toolbar icon to open Spot a Dog.');
    if (sidebar) await showSidebar();
  } catch (error) { report(error); }
  finally { toggle.disabled = false; await refresh().catch(report); }
});
action($('#configure-key'), () => chrome.runtime.openOptionsPage());
action($('#new-profile'), () => { if (canLeave()) { view(undefined, true); report(''); $('#name').focus(); } });
action($('#cancel-edit'), () => { if (canLeave()) { view(state.profiles.find(p => p.id === editingId) ?? state.profiles[0]); report(''); $('#edit-profile').focus(); } });
action($('#settings'), () => chrome.runtime.openOptionsPage());
$('#profile-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!editMode || saving) return;
  const button = event.submitter ?? $('#save-actions button[type=submit]');
  saving = true;
  button.disabled = true;
  $('#profile-select').disabled = true;
  try {
    const profile = { id: editingId, name: $('#name').value, positiveKeywords: positive.read(), negativeKeywords: negative.read(), enabled: $('#profile-enabled').checked, criteria: [] };
    $('#profile-form').inert = true;
    report('Saving profile…');
    const saved = await request('profile.save', { profile });
    editingId = saved.id;
    editMode = dirty = false;
    loadedProfile = null;
    saving = false;
    report('Profile saved.');
    await refresh();
    $('#edit-profile').focus();
  } catch (error) { report(error); }
  finally { saving = false; button.disabled = false; $('#profile-form').inert = false; $('#profile-select').disabled = !state.profiles.length; }
});
$('#ai-profile').addEventListener('change', clearSuggestions);
action($('#suggest'), async () => {
  clearSuggestions();
  const id = $('#ai-profile').value;
  if (!id) throw new Error('Create a profile first.');
  const latest = await request('state.get');
  if (!latest.hasApiKey) {
    $('#configure-key').hidden = false;
    throw new Error(`AI keyword suggestions require an ${providers[latest.preferences.provider]?.name ?? 'available provider'} API key. Choose Configure API key. You can still manage profiles and keywords without one.`);
  }
  report('Requesting suggestions…');
  const suggestions = await request('ai.suggest', { seeds: $('#seeds').value });
  if ($('#ai-profile').value !== id || !state.profiles.some(p => p.id === id)) { report('Profile changed. Request suggestions again.'); return; }
  suggestionProfile = id;
  for (const suggestion of suggestions) {
    const label = element('label', undefined, { className: 'inline' });
    label.append(element('input', undefined, { type: 'checkbox', value: suggestion }), element('span', suggestion));
    const row = element('div', undefined, { className: 'row' });
    const dismiss = element('button', 'Dismiss', { ariaLabel: `Dismiss ${suggestion}` });
    action(dismiss, () => {
      row.remove();
      if (!$('#suggestions').children.length) clearSuggestions();
      report('Suggestion dismissed. Saved keywords are unchanged.');
    });
    row.append(label, dismiss);
    $('#suggestions').append(row);
  }
  $('#review').hidden = !suggestions.length;
  report(suggestions.length ? 'Choose the suggestions you want to keep.' : 'No new suggestions returned. Try different seed keywords.');
});
action($('#dismiss-suggestions'), () => { clearSuggestions(); report('Suggestions dismissed. Saved keywords are unchanged.'); });
action($('#add-suggestions'), async () => {
  const keywords = [...$('#suggestions').querySelectorAll('input:checked')].map(input => input.value);
  if (!keywords.length) throw new Error('Select at least one suggestion.');
  if (editMode && editingId === suggestionProfile) throw new Error('Save or cancel your profile edits before adding suggestions.');
  await request('profile.addKeywords', { id: suggestionProfile, keywords, target: $('#target').value });
  clearSuggestions();
  report('Selected keywords added.');
});
wireGlobal(refresh);
subscribe(refresh);
refresh().catch(report);

wirePageStatus();

async function download(scope, id) {
  const text = await request('profiles.export', { scope, id });
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = element('a', undefined, { href: url, download: scope === 'all' ? 'spotadog-profiles.json' : 'spotadog-profile.json' });
  document.body.append(link);
  try { link.click(); report('Profile download started.'); }
  finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
}
let importScope = 'all';
action($('#export-all'), () => download('all'));
action($('#export-single'), () => download('single', editingId));
for (const scope of ['all', 'single']) action($(`#import-${scope}`), () => {
  if (saving) return;
  importScope = scope;
  $('#import-file').value = '';
  $('#import-file').click();
});
$('#import-file').addEventListener('change', async () => {
  const file = $('#import-file').files[0];
  const scope = importScope;
  if (!file) return;
  try {
    if (!/\.json$/i.test(file.name)) throw new Error('Choose a .json profile export.');
    if (file.size > MAX_IMPORT_BYTES) throw new Error('Choose a JSON file no larger than 10 MiB.');
    const text = await file.text();
    const profiles = parseImport(text, scope);
    if (!profiles.length) { report('No profiles to import. Existing profiles are unchanged.'); return; }
    if (!confirm(`Import ${profiles.length} profile(s)? Matching IDs will be replaced, including their words. Other profiles remain. Unsaved edits and suggestion reviews will close.`)) return;
    const result = await request('profiles.import', { scope, text });
    editMode = dirty = false;
    loadedProfile = null;
    clearSuggestions();
    await refresh();
    report(result.warning || `Imported ${result.count} profile(s). Highlights refreshed.`);
  } catch (error) { report(error); }
});
