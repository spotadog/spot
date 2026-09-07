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

// Preserve each normalized context's largest observed multiplicity. A snapshot
// may be only a page/window; absence is never evidence of historical deletion.
export function contextCounts(units) {
  const result = {};
  for (const unit of units) for (const { key, context, repeated } of unit) {
    const contexts = result[key] ??= {};
    const id = JSON.stringify(context);
    contexts[id] = (contexts[id] ?? 0) + repeated;
  }
  return result;
}
export function mergeCountHistory(previous = {}, incoming = {}) {
  const result = structuredClone(previous);
  for (const [key, contexts] of Object.entries(incoming)) {
    const target = result[key] ??= {};
    for (const [context, count] of Object.entries(contexts)) target[context] = Math.max(target[context] ?? 0, count);
  }
  return result;
}
export function historyTotals(history, entries) {
  return Object.fromEntries(entries.map(({ key }) => {
    const counts = Object.values(history[key] ?? {});
    return [key, { repeated: counts.reduce((sum, count) => sum + count, 0), unique: counts.length }];
  }));
}
