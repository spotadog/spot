import { HIGHLIGHT_COLORS, validateColor } from '../highlighting/colors.js';
export const DEFAULT_EYEBALL_LEVEL = 50;
export function eyeballLevel(value) {
  return Number.isInteger(value) && value >= 10 && value <= 90 ? value : DEFAULT_EYEBALL_LEVEL;
}
export function validateEyeballLevel(value) {
  if (eyeballLevel(value) !== value) throw Error('Choose an eyeball level from 10 to 90 percent.');
  return value;
}

export const DEFAULT_AUTO_PAUSE_COLORS = Object.freeze(HIGHLIGHT_COLORS.map(color => color.value));
export function validateAutoPauseColors(value) {
  if (!Array.isArray(value) || value.length > 200) throw Error('Choose up to 200 auto-pause colors.');
  return [...new Set(value.map(validateColor))];
}
export function autoPauseColors(value) {
  if (value === undefined) return [...DEFAULT_AUTO_PAUSE_COLORS];
  try { return validateAutoPauseColors(value); } catch { return []; }
}
