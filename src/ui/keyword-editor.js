import { keywordText, keywordActive, withKeywordActivity } from '../profiles/keyword.js';
import { MATCH_TYPES } from '../matching/criteria.js';
import { criteriaEditor } from './criteria-editor.js';
import { validateKeyword } from '../profiles/model.js';
import { element, report } from './client.js';

// Each row owns its draft value and activity; storage continues to use individual array items.
export function keywordEditor(container, title, onChange = () => {}) {
  const list = element('div', undefined, { className: 'keyword-rows' });
  const empty = element('p', 'No keywords yet. Choose Add Keyword to start.', { className: 'hint' });
  const add = element('button', 'Add Keyword', { type: 'button' });
  let rows = [], editable = false, query = '';
  function update() {
    for (const item of rows) item.row.hidden = !item.editing && !keywordText(item.value)?.toLowerCase().includes(query);
    empty.hidden = rows.some(item => !item.row.hidden);
    empty.textContent = rows.length ? 'No keywords match your search.' : editable ? 'No keywords yet. Choose Add Keyword to start.' : 'No keywords yet.';
    add.hidden = !editable;
  }
  function append(value = null) {
    const row = element('div', undefined, { className: 'keyword-row' });
    const label = element('label', undefined, { className: 'inline' });
    const selected = element('input', undefined, { type: 'checkbox' });
    const text = element('span');
    const status = element('small', undefined, { className: 'keyword-activity' });
    label.append(selected, text, status);
    const input = element('input', undefined, { type: 'text', ariaLabel: `${title} keyword`, placeholder: 'Enter one word or phrase' });
    const criteriaContainer = element('div');
    const criteria = criteriaEditor(criteriaContainer, onChange);
    criteria.load(value?.matchingCriteria);
    const error = element('p', '', { className: 'keyword-error', role: 'alert' });
    const edit = element('button', 'Edit', { type: 'button' });
    const save = element('button', 'Save keyword', { type: 'button' });
    const cancel = element('button', 'Cancel', { type: 'button' });
    const remove = element('button', 'Remove', { type: 'button', className: 'danger' });
    const actions = element('div', undefined, { className: 'actions' });
    actions.append(edit, save, cancel, remove);
    row.append(label, input, criteriaContainer, error, actions);
    const record = { value, active: keywordActive(value), row, editing: value === null, render };
    rows.push(record);
    function render() {
      text.textContent = keywordText(record.value) ?? 'New keyword';
      const criterion = record.value?.matchingCriteria;
      if (criterion) text.textContent += ` — ${MATCH_TYPES.find(d => d.type === criterion.type)?.label ?? criterion.type}${criterion.value !== undefined ? ` (${criterion.value})` : criterion.min !== undefined ? ` (${criterion.min}–${criterion.max})` : ''}`;
      criteriaContainer.hidden = !record.editing;
      selected.checked = record.active;
      selected.disabled = !editable;
      selected.ariaLabel = `${keywordText(record.value) ?? 'New keyword'} active`;
      label.title = editable ? 'Checked keywords are active. Save profile to apply changes.' : 'Keyword status (read-only). Choose Edit to change activity.';
      status.textContent = `${record.active ? 'Active' : 'Inactive'}${editable ? '' : ' (read-only)'}`;
      input.hidden = save.hidden = cancel.hidden = !record.editing;
      edit.hidden = !editable || record.editing;
      remove.hidden = !editable || record.value === null;
      actions.hidden = !editable;
      error.textContent = '';
    }
    function discard() {
      const index = rows.indexOf(record);
      rows.splice(index, 1);
      row.remove();
      onChange();
      update();
      (rows[Math.min(index, rows.length - 1)]?.row.querySelector('input') ?? add).focus();
    }
    selected.addEventListener('change', () => {
      if (!editable) { selected.checked = record.active; return; }
      record.active = selected.checked;
      if (record.value !== null) record.value = withKeywordActivity(record.value, record.active);
      render();
      onChange();
    });
    input.addEventListener('input', onChange);
    edit.addEventListener('click', () => { record.editing = true; input.value = keywordText(record.value); criteria.load(record.value?.matchingCriteria); render(); input.focus(); row.scrollIntoView({ block: 'nearest' }); });
    save.addEventListener('click', () => {
      try {
        record.value = validateKeyword(withKeywordActivity(criteria.read() ? { text: input.value, matchingCriteria: criteria.read() } : input.value, record.active), rows.filter(item => item !== record && item.value !== null).map(item => item.value));
        record.editing = false;
        render();
        onChange();
        update();
        (row.hidden ? add : edit).focus();
        report('Keyword saved in this draft. Choose Save profile to apply changes.');
      } catch (failure) { error.textContent = failure.message; input.focus(); }
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); save.click(); }
      if (event.key === 'Escape') { event.preventDefault(); cancel.click(); }
    });
    cancel.addEventListener('click', () => {
      if (record.value === null) discard();
      else { record.editing = false; render(); update(); edit.focus(); }
    });
    remove.addEventListener('click', () => { if (confirm(`Remove “${keywordText(record.value)}”? Save profile to apply this change.`)) discard(); });
    list.append(row);
    render();
    update();
    if (value === null) { input.focus(); row.scrollIntoView({ block: 'nearest' }); }
  }
  add.addEventListener('click', () => { if (editable) { append(); onChange(); } });
  container.append(list, empty, add);
  return {
    setEditable(value) { editable = value; rows.forEach(item => item.render()); update(); },
    filter(value) { query = value.toLowerCase(); update(); },
    load(values = []) { rows = []; list.replaceChildren(); values.forEach(append); update(); },
    read() {
      const pending = rows.find(item => item.editing);
      if (pending) {
        pending.row.querySelector('input[type=text]').focus();
        throw new Error(`Save keyword or cancel the open ${title.toLowerCase()} keyword edit before saving the profile.`);
      }
      return rows.map(item => item.value);
    }
  };
}
