import { keywordOccurrences } from './matcher.js';
import { editableKeywords, keywordKey } from '../profiles/keyword.js';
// A context is one complete matching unit (DOM text node), lowercased with
// whitespace collapsed. Punctuation is retained, as in literal matching.
export const normalizeContext = text => text.toLowerCase().replace(/\s+/gu, ' ').trim();
export const countKey = (profileId, kind, keyword) => JSON.stringify([profileId, kind, keywordKey(keyword)]);
export function countEntries(profiles) {
  return profiles.flatMap(profile => ['positive', 'negative'].flatMap(kind => editableKeywords(profile, kind).map(keyword => ({
    key: countKey(profile.id, kind, keyword), keyword, kind, enabled: profile.enabled
  }))));
}
export function countUnit(text, entries) {
  return entries.flatMap(entry => {
    const repeated = entry.enabled ? keywordOccurrences(text, entry.keyword, entry.kind).length : 0;
    return repeated ? [{ key: entry.key, repeated, context: normalizeContext(text) }] : [];
  });
}
export function summarizeCounts(units, entries) {
  const totals = new Map(entries.map(entry => [entry.key, { repeated: 0, contexts: new Set() }]));
  for (const unit of units) for (const hit of unit) {
    const total = totals.get(hit.key);
    total.repeated += hit.repeated;
    total.contexts.add(hit.context);
  }
  return Object.fromEntries([...totals].map(([key, total]) => [key, { repeated: total.repeated, unique: total.contexts.size }]));
}
