export const DEFAULT_PREFERENCES = { model: 'gpt-4o-mini' };
export function normalizeKeywords(value) {
  const items = typeof value === 'string' ? value.split(/\r?\n/) : value;
  if (!Array.isArray(items) || items.length > 200) throw new Error('Use at most 200 keywords per list.');
  const seen = new Set();
  return items.flatMap(item => {
    if (typeof item !== 'string') throw new Error('Keywords must be text.');
    const clean = item.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    if (clean.length > 120) throw new Error('Keep each keyword or phrase under 121 characters.');
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) return [];
    seen.add(key);
    return [clean];
  });
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
    rules: existing?.rules ?? { negativeScope: 'text-node', wholeWords: true }
  };
}
export function initialState() {
  return { schemaVersion: 1, enabled: true, profiles: [], preferences: { ...DEFAULT_PREFERENCES } };
}
