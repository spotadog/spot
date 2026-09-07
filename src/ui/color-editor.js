import { HIGHLIGHT_COLORS, keywordColor, validateColor } from '../highlighting/colors.js';
import { element } from './client.js';

export function colorEditor(container, kind, onChange = () => {}) {
  const group = element('fieldset', undefined, { className: 'keyword-colors' });
  group.append(element('legend', 'Highlight color'));
  const choices = element('div', undefined, { className: 'color-choices' });
  const buttons = HIGHLIGHT_COLORS.map(({ name, value }) => {
    const button = element('button', name, { type: 'button', ariaLabel: `${name} highlight` });
    button.style.borderBottomColor = value;
    button.addEventListener('click', () => select(value));
    choices.append(button);
    return button;
  });
  const label = element('label', 'Custom color', { className: 'color-custom' });
  const custom = element('input', undefined, { type: 'color', ariaLabel: 'Custom highlight color' });
  const status = element('small', '', { ariaLive: 'polite' });
  label.append(custom);
  group.append(choices, label, status);
  container.append(group);
  let stored, current;
  function render() {
    buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(HIGHLIGHT_COLORS[index].value === current)));
    custom.value = current;
    status.textContent = `Selected: ${HIGHLIGHT_COLORS.find(c => c.value === current)?.name ?? 'Custom'} (${current})`;
  }
  function select(value) { stored = current = validateColor(value); render(); onChange(); }
  custom.addEventListener('input', () => select(custom.value));
  custom.addEventListener('change', () => select(custom.value));
  return {
    load(keyword) { current = keywordColor(keyword, kind); stored = keyword?.color === undefined ? undefined : current; render(); },
    read() { return stored; }
  };
}
