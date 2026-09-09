export const DEFAULT_EYEBALL_LEVEL = 50;
export function eyeballLevel(value) {
  return Number.isInteger(value) && value >= 10 && value <= 90 ? value : DEFAULT_EYEBALL_LEVEL;
}
export function validateEyeballLevel(value) {
  if (eyeballLevel(value) !== value) throw Error('Choose an eyeball level from 10 to 90 percent.');
  return value;
}
