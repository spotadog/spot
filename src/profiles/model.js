import { validateColor, HIGHLIGHT_COLORS } from '../highlighting/colors.js';
import { keywordText, keywordCriterion, keywordKey, editableKeywords } from './keyword.js';
import { validateCriteria } from '../matching/criteria.js';
export const DEFAULT_PREFERENCES = { model: 'gpt-4o-mini', sidebar: false, tracking: false, eyeballLevel: 50, autoPauseColors: HIGHLIGHT_COLORS.map(color => color.value) };
export function normalizeKeywords(value) {
  const items = typeof value === 'string' ? value.split(/\r?\n/) : value;
  if (!Array.isArray(items) || items.length > 200) throw new Error('Use at most 200 keywords per list.');
  const seen = new Set();
  return items.flatMap(item => {
    const text = keywordText(item);
    if (typeof text !== 'string' || (typeof item === 'object' && (Array.isArray(item) || Object.keys(item).some(k => !['text', 'matchingCriteria', 'active', 'color'].includes(k))))) throw new Error('Keywords must be text or keyword records.');
    if (typeof item === 'object' && Object.hasOwn(item, 'active') && typeof item.active !== 'boolean') throw new Error('Keyword active state must be a boolean.');
    const clean = item?.matchingCriteria?.type === 'regex' ? text : text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    if (clean.length > 120) throw new Error('Keep each keyword or phrase under 121 characters.');
    const record = typeof item === 'string' ? clean : { ...item, text: clean };
    if (typeof record === 'object' && Object.hasOwn(record, 'color')) record.color = validateColor(record.color);
    keywordCriterion(record);
    const key = keywordKey(record);
    if (!clean || seen.has(key)) return [];
    seen.add(key);
    return [record];
  });
}
// Validate one explicit edit without the bulk normalizer's silent empty/duplicate removal.
export function validateKeyword(value, others = []) {
  const [clean] = normalizeKeywords([value]);
  if (!clean) throw new Error('Enter a keyword or phrase.');
  if (others.some(term => keywordText(term).toLowerCase() === keywordText(clean).toLowerCase())) throw new Error('This keyword already exists in this list. Choose a different keyword.');
  if (others.length >= 200) throw new Error('Use at most 200 keywords per list.');
  return clean;
}
export function mergeKeywords(existing, candidates) {
  const merged = [...existing];
  const seen = new Set(existing.map(term => keywordText(term).toLowerCase()));
  for (const term of normalizeKeywords(candidates)) {
    const key = keywordText(term).toLowerCase();
    if (!seen.has(key)) { merged.push(term); seen.add(key); }
  }
  return normalizeKeywords(merged);
}
export function makeProfile(input, existing) {
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  if (!name || name.length > 80) throw new Error('Enter a profile name of 1–80 characters.');
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? crypto.randomUUID(), name,
    positiveKeywords: normalizeKeywords(input.positiveKeywords ?? []),
    negativeKeywords: normalizeKeywords(input.negativeKeywords ?? []),
    enabled: typeof input.enabled === 'boolean' ? input.enabled : (existing?.enabled ?? true),
    createdAt: existing?.createdAt ?? now, updatedAt: now,
    rules: { ...(existing?.rules ?? { wholeWords: true }),
      ...(input.criteria !== undefined ? { criteria: validateCriteria(input.criteria) } : {}) }
  };
}
export function initialState() {
  return { schemaVersion: 1, enabled: true, profiles: [], preferences: { ...DEFAULT_PREFERENCES } };
}

// Apply one row mutation to the latest stored profile, never a UI profile draft.
export function changeKeyword(profile, { kind, previous, value }) {
  if (!['positive', 'negative'].includes(kind)) throw new Error('Invalid keyword list.');
  const positiveKeywords = editableKeywords(profile, 'positive');
  const negativeKeywords = editableKeywords(profile, 'negative');
  const keywords = kind === 'positive' ? positiveKeywords : negativeKeywords;
  const index = previous === null ? keywords.length : keywords.findIndex(item => keywordText(item) === keywordText(previous)
    && keywordKey(item) === keywordKey(previous) && item?.active === previous?.active && item?.color === previous?.color);
  if (index < 0) throw new Error('This keyword changed or was removed. Reopen the profile and try again.');
  if (value === null) {
    if (previous === null) throw new Error('Choose a keyword to remove.');
    keywords.splice(index, 1);
  } else {
    const clean = validateKeyword(value, keywords.filter((_, i) => i !== index));
    keywords.splice(index, previous === null ? 0 : 1, clean);
  }
  return makeProfile({ ...profile, positiveKeywords, negativeKeywords, criteria: [] }, profile);
}
