export const HIGHLIGHT_COLORS = Object.freeze([
  { name: 'Yellow', value: '#ffe077' },
  { name: 'Red', value: '#ef6666' },
  { name: 'Green', value: '#93dfab' },
  { name: 'Blue', value: '#8fc9ff' },
  { name: 'Purple', value: '#c9a7ef' },
  { name: 'Orange', value: '#ffb877' }
]);
export const defaultColor = kind => kind === 'negative' ? '#ef6666' : '#ffe077';
export function validateColor(value) {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error('Choose a highlight color in #RRGGBB format.');
  return value.toLowerCase();
}
// Resolve legacy or malformed saved data without losing its keyword.
export function keywordColor(keyword, kind = 'positive') {
  try { return validateColor(keyword?.color); } catch { return defaultColor(kind); }
}
export function contrastColor(color) {
  const rgb = validateColor(color).slice(1).match(/../g).map(v => {
    const c = parseInt(v, 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722 > 0.179 ? '#000000' : '#ffffff';
}
