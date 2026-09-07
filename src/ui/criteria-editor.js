import { MATCH_TYPES, validateCriteria } from '../matching/criteria.js';
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
export function criteriaEditor(container) {
  function add(criterion = { type: 'exactWord', kind: 'positive', value: '' }) {
    const row = element('fieldset', undefined, { className: 'criterion' });
    row.append(element('legend', 'Keyword criterion'));
    const labeled = (parent, title, input) => {
      input.id = `criterion-control-${++nextControlId}`;
      const label = element('label', title, { htmlFor: input.id });
      parent.append(label, input);
      return input;
    };
    const type = labeled(row, 'Match type', element('select'));
    type.append(...MATCH_TYPES.map(d => element('option', d.label, { value: d.type })));
    type.value = criterion.type;
    const kind = labeled(row, 'Highlight', element('select'));
    kind.append(element('option', 'Positive (yellow)', { value: 'positive' }), element('option', 'Negative (red)', { value: 'negative' }));
    kind.value = criterion.kind;
    const config = element('div');
    const hint = element('p', undefined, { className: 'hint' });
    const remove = element('button', 'Remove criterion', { type: 'button' });
    remove.addEventListener('click', () => row.remove());
    row.append(config, hint, remove);
    function configure(saved = {}) {
      config.replaceChildren();
      const category = MATCH_TYPES.find(d => d.type === type.value).category;
      hint.textContent = help[category];
      const input = (title, field, numeric = false) => {
        const control = element('input', undefined, { type: numeric ? 'number' : 'text', value: saved[field] ?? '', required: true });
        control.dataset.field = field;
        if (numeric) Object.assign(control, { min: '0', max: '10000', step: '1' });
        else control.maxLength = 120;
        labeled(config, title, control);
      };
      if (category === 'range') { input('Minimum length', 'min', true); input('Maximum length', 'max', true); }
      else if (category !== 'structure') input(category === 'length' ? 'Character length' : category === 'regex' ? 'Regular expression' : 'Keyword or phrase', 'value', category === 'length');
    }
    type.addEventListener('change', () => configure());
    configure(criterion);
    row.readCriterion = () => ({ type: type.value, kind: kind.value, ...Object.fromEntries([...config.querySelectorAll('input')].map(input => [input.dataset.field, input.type === 'number' ? (input.value === '' ? NaN : Number(input.value)) : input.value])) });
    container.append(row);
  }
  return {
    add,
    load(criteria = []) { container.replaceChildren(); criteria.forEach(add); },
    read() { return validateCriteria([...container.children].map(row => row.readCriterion())); }
  };
}
