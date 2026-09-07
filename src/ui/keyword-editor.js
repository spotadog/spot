import { validateKeyword } from '../profiles/model.js';
import { element, report } from './client.js';

// Each row owns its value and selection; storage continues to use individual array items.
export function keywordEditor(container, title) {
  const list = element('div', undefined, { className: 'keyword-rows' });
  const empty = element('p', 'No keywords yet. Choose Add Keyword to start.', { className: 'hint' });
  const add = element('button', 'Add Keyword', { type: 'button' });
  let rows = [];
  function update() { empty.hidden = rows.length > 0; }
  function append(value = null) {
    const row = element('div', undefined, { className: 'keyword-row' });
    const label = element('label', undefined, { className: 'inline' });
    const selected = element('input', undefined, { type: 'checkbox' });
    const text = element('span');
    label.append(selected, text);
    const input = element('input', undefined, { type: 'text', ariaLabel: `${title} keyword`, placeholder: 'Enter one word or phrase' });
    const error = element('p', '', { className: 'keyword-error', role: 'alert' });
    const edit = element('button', 'Edit', { type: 'button' });
    const save = element('button', 'Save keyword', { type: 'button' });
    const cancel = element('button', 'Cancel', { type: 'button' });
    const remove = element('button', 'Remove', { type: 'button', className: 'danger' });
    const actions = element('div', undefined, { className: 'actions' });
    actions.append(edit, save, cancel, remove);
    row.append(label, input, error, actions);
    const record = { value, row, editing: value === null };
    rows.push(record);
    function render() {
      text.textContent = record.value ?? 'New keyword';
      selected.ariaLabel = `Select ${record.value ?? 'new keyword'}`;
      row.classList.toggle('selected', selected.checked);
      input.hidden = save.hidden = cancel.hidden = !record.editing;
      edit.hidden = record.editing;
      remove.hidden = record.value === null;
      error.textContent = '';
    }
    function discard() {
      const index = rows.indexOf(record);
      rows.splice(index, 1);
      row.remove();
      update();
      (rows[Math.min(index, rows.length - 1)]?.row.querySelector('input') ?? add).focus();
    }
    selected.addEventListener('change', () => row.classList.toggle('selected', selected.checked));
    edit.addEventListener('click', () => { record.editing = true; input.value = record.value; render(); input.focus(); row.scrollIntoView({ block: 'nearest' }); });
    save.addEventListener('click', () => {
      try {
        record.value = validateKeyword(input.value, rows.filter(item => item !== record && item.value !== null).map(item => item.value));
        record.editing = false;
        render();
        edit.focus();
        report('Keyword saved in this draft. Choose Save profile to apply changes.');
      } catch (failure) { error.textContent = failure.message; input.focus(); }
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); save.click(); }
      if (event.key === 'Escape') { event.preventDefault(); cancel.click(); }
    });
    cancel.addEventListener('click', () => {
      if (record.value === null) discard();
      else { record.editing = false; render(); edit.focus(); }
    });
    remove.addEventListener('click', () => { if (confirm(`Remove “${record.value}”? Save profile to apply this change.`)) discard(); });
    list.append(row);
    render();
    update();
    if (value === null) { input.focus(); row.scrollIntoView({ block: 'nearest' }); }
  }
  add.addEventListener('click', () => append());
  container.append(list, empty, add);
  return {
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
