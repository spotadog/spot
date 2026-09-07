import { MATCH_TYPES, validateCriterion } from '../matching/criteria.js';
export const keywordText = keyword => typeof keyword === 'string' ? keyword : keyword?.text;
export function keywordCriterion(keyword, kind = 'positive') {
  const c = keyword?.matchingCriteria;
  if (c == null) return null;
  const category = MATCH_TYPES.find(d => d.type === c.type)?.category;
  const fields = category === 'length' ? ['type', 'value'] : category === 'range' ? ['type', 'min', 'max'] : ['type'];
  if (typeof c !== 'object' || Array.isArray(c) || Object.keys(c).some(key => !fields.includes(key))) throw new Error('Choose a supported keyword match type and configuration.');
  return validateCriterion({ ...c, kind, ...(['word', 'phrase', 'regex'].includes(category) ? { value: keyword.text } : {}) });
}
export const keywordKey = keyword => JSON.stringify([keyword?.matchingCriteria?.type === 'regex' ? keywordText(keyword) : keywordText(keyword)?.toLowerCase(), keyword?.matchingCriteria ? Object.entries(keyword.matchingCriteria).sort(([a], [b]) => a.localeCompare(b)) : null]);
// Legacy criteria were independent searches, not defaults for the literal keywords.
// Materialize them as individual rows when editing; saving clears the legacy list.
export function editableKeywords(profile, kind) {
  return [...(profile?.[`${kind}Keywords`] ?? []), ...(profile?.rules?.criteria ?? []).filter(c => c.kind === kind).map(c => {
    const { kind: ignored, value, ...config } = c;
    const category = MATCH_TYPES.find(d => d.type === c.type).category;
    return { text: ['word', 'phrase', 'regex'].includes(category) ? value : MATCH_TYPES.find(d => d.type === c.type).label,
      matchingCriteria: { ...config, ...(category === 'length' ? { value } : {}) } };
  })];
}
