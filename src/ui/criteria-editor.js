import { MATCH_TYPES } from '../matching/criteria.js';
import { element } from './client.js';
const help = {
  word: 'Matches whole tokens of letters, numbers and underscores; ignores case. Highlights the entire word.',
  phrase: 'Ignores case; spaces and newlines are interchangeable. Start/end means the text node edge, ignoring outer whitespace. Punctuation counts.',
  length: 'Count Unicode code points in a word, including combining marks. Use a whole number from 0 to 10000.',
  range: 'Minimum and maximum are inclusive. Use whole numbers from 0 to 10000.',
  structure: 'Recognizes this structure automatically. No keyword value is needed.',
  regex: 'JavaScript pattern, without / delimiters. Case-sensitive, Unicode, all matches. Maximum 120 characters. Zero-width matches are ignored. Avoid patterns with nested repetition on large pages.'
};
let nextControlId = 0;
export function criteriaEditor(container, onChange) {
  const id = `keyword-criteria-${++nextControlId}`;
  const type = element('select', undefined, { id, ariaLabel: 'Keyword matching criteria' });
  type.append(element('option', 'Default (literal word or phrase)', { value: '' }), ...MATCH_TYPES.map(d => element('option', d.label, { value: d.type })));
  const config = element('div');
  const hint = element('p', '', { className: 'hint' });
  container.append(element('label', 'Keyword matching criteria (optional)', { htmlFor: id }), type, config, hint);
  function configure(saved = {}) {
    config.replaceChildren();
    const category = MATCH_TYPES.find(d => d.type === type.value)?.category;
    hint.textContent = help[category] ?? 'Uses the existing literal word or phrase matching.';
    if (category === 'structure') hint.textContent += ' Keyword text names this search.';
    const input = (title, field) => {
      const control = element('input', undefined, { type: 'number', min: '0', max: '10000', step: '1', value: saved[field] ?? '', ariaLabel: title });
      control.dataset.field = field;
      const label = element('label', title); label.append(control); config.append(label);
      control.addEventListener('input', onChange);
    };
    if (category === 'range') { input('Minimum length', 'min'); input('Maximum length', 'max'); }
    if (category === 'length') input('Character length', 'value');
  }
  type.addEventListener('change', () => { configure(); onChange(); });
  return {
    load(c) { type.value = c?.type ?? ''; configure(c ?? {}); },
    read() { return type.value ? { type: type.value, ...Object.fromEntries([...config.querySelectorAll('input')].map(i => [i.dataset.field, i.value === '' ? NaN : Number(i.value)])) } : null; }
  };
}
