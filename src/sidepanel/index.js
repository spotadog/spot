import { request, element, report, action, subscribe, wireGlobal, wirePageStatus } from '../ui/client.js';
const $ = selector => document.querySelector(selector);
let state, editingId = null, suggestionProfile = null;
function edit(profile) {
  editingId = profile?.id ?? null;
  $('#editor-title').textContent = profile ? 'Edit profile' : 'New profile';
  $('#name').value = profile?.name ?? '';
  $('#positive').value = (profile?.positiveKeywords ?? []).join('\n');
  $('#negative').value = (profile?.negativeKeywords ?? []).join('\n');
  $('#profile-enabled').checked = profile?.enabled ?? true;
  $('#editor').hidden = false;
  $('#name').focus();
}
async function refresh() {
  state = await request('state.get');
  $('#global-enabled').checked = state.enabled;
  $('#global-note').textContent = state.enabled ? 'Matching enabled profiles on supported web pages.' : 'Paused. Highlights are removed; profiles remain saved.';
  $('#profiles').replaceChildren();
  if (!state.profiles.length) $('#profiles').append(element('p', 'Start with a profile for a topic you care about.', { className: 'empty' }));
  for (const profile of state.profiles) {
    const card = element('article', undefined, { className: 'card' });
    const row = element('div', undefined, { className: 'row' });
    const label = element('label', undefined, { className: 'inline' });
    const toggle = element('input', undefined, { type: 'checkbox', checked: profile.enabled });
    toggle.addEventListener('change', async () => {
      try { await request('profile.toggle', { id: profile.id, enabled: toggle.checked }); }
      catch (error) { toggle.checked = !toggle.checked; report(error); }
    });
    label.append(toggle, element('span', profile.name));
    row.append(label, element('span', profile.enabled ? 'On' : 'Off', { className: 'badge' }));
    const editButton = element('button', 'Edit');
    action(editButton, () => edit(profile));
    const deleteButton = element('button', 'Delete', { className: 'danger' });
    action(deleteButton, async () => {
      if (!confirm(`Delete “${profile.name}” and its keywords?`)) return;
      await request('profile.delete', { id: profile.id });
      if (editingId === profile.id) $('#editor').hidden = true;
      report('Profile deleted.');
    });
    const actions = element('div', undefined, { className: 'actions' });
    actions.append(editButton, deleteButton);
    card.append(row, element('p', `${profile.positiveKeywords.length} positive · ${profile.negativeKeywords.length} negative`, { className: 'hint' }), actions);
    $('#profiles').append(card);
  }
  const selected = $('#ai-profile').value;
  $('#ai-profile').replaceChildren(...state.profiles.map(p => element('option', p.name, { value: p.id })));
  if (state.profiles.some(p => p.id === selected)) $('#ai-profile').value = selected;
  if (suggestionProfile && !state.profiles.some(p => p.id === suggestionProfile)) clearSuggestions();
}
function clearSuggestions() { $('#review').hidden = true; $('#suggestions').replaceChildren(); suggestionProfile = null; }
action($('#new-profile'), () => edit());
action($('#cancel-edit'), () => { $('#editor').hidden = true; });
action($('#settings'), () => chrome.runtime.openOptionsPage());
$('#profile-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.submitter;
  button.disabled = true;
  try {
    await request('profile.save', { profile: { id: editingId, name: $('#name').value, positiveKeywords: $('#positive').value, negativeKeywords: $('#negative').value, enabled: $('#profile-enabled').checked } });
    $('#editor').hidden = true;
    report('Profile saved.');
    await refresh();
  } catch (error) { report(error); }
  finally { button.disabled = false; }
});
$('#ai-profile').addEventListener('change', clearSuggestions);
action($('#suggest'), async () => {
  clearSuggestions();
  const id = $('#ai-profile').value;
  if (!id) throw new Error('Create a profile first.');
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
  if (!$('#editor').hidden && editingId === suggestionProfile) throw new Error('Save or cancel your profile edits before adding suggestions.');
  await request('profile.addKeywords', { id: suggestionProfile, keywords, target: $('#target').value });
  clearSuggestions();
  report('Selected keywords added.');
});
wireGlobal(refresh);
subscribe(refresh);
refresh().catch(report);

wirePageStatus();
