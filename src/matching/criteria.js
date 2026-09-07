// Shared criterion contract for profile saves, JSON transfer, UI and evaluation.
export const MATCH_TYPES = [
  ['exactWord', 'Exact word', 'word'], ['contains', 'Contains', 'word'],
  ['startsWith', 'Starts with', 'word'], ['endsWith', 'Ends with', 'word'],
  ['exactPhrase', 'Exact phrase', 'phrase'], ['startsWithPhrase', 'Starts with phrase', 'phrase'],
  ['endsWithPhrase', 'Ends with phrase', 'phrase'],
  ['shorterThan', 'Shorter than', 'length'], ['longerThan', 'Longer than', 'length'],
  ['exactLength', 'Exact length', 'length'], ['betweenLengths', 'Between lengths', 'range'],
  ['number', 'Number', 'structure'], ['url', 'URL', 'structure'], ['email', 'Email', 'structure'],
  ['hashtag', 'Hashtag', 'structure'], ['mention', '@ Mention', 'structure'],
  ['regex', 'Regex (Advanced)', 'regex']
].map(([type, label, category]) => ({ type, label, category }));
export function validateCriterion(c) {
  const definition = MATCH_TYPES.find(d => d.type === c?.type);
  if (!definition || !c || typeof c !== 'object' || Array.isArray(c)) throw new Error('Choose a supported keyword match type.');
  if (!['positive', 'negative'].includes(c.kind)) throw new Error('Choose positive or negative for each criterion.');
  const category = definition.category;
  const fields = ['type', 'kind', ...({ word: ['value'], phrase: ['value'], regex: ['value'], length: ['value'], range: ['min', 'max'], structure: [] }[category])];
  if (Object.keys(c).some(k => !fields.includes(k)) || fields.some(k => !Object.hasOwn(c, k))) throw new Error(`${definition.label}: missing or unsupported configuration fields.`);
  if (['word', 'phrase', 'regex'].includes(category)) {
    if (typeof c.value !== 'string' || !c.value.trim() || c.value.length > 120) throw new Error(`${definition.label}: enter 1–120 characters.`);
    if (category === 'word' && !/^[\p{L}\p{N}_][\p{L}\p{M}\p{N}_]*$/u.test(c.value)) throw new Error(`${definition.label}: enter one word using letters, numbers or underscores.`);
    if (category === 'regex') {
      try { new RegExp(c.value, 'gu'); }
      catch (error) { throw new Error(`Invalid regular expression: ${error.message}`); }
    }
  }
  const length = n => Number.isSafeInteger(n) && n >= 0 && n <= 10000;
  if (category === 'length' && !length(c.value)) throw new Error(`${definition.label}: enter a whole number from 0 to 10000.`);
  if (category === 'range' && (!length(c.min) || !length(c.max) || c.min > c.max)) throw new Error('Between lengths: use whole numbers from 0 to 10000 with minimum ≤ maximum.');
  return { ...c };
}
export function validateCriteria(criteria) {
  if (!Array.isArray(criteria) || criteria.length > 200) throw new Error('Use at most 200 matching criteria per profile.');
  return criteria.map(validateCriterion);
}
