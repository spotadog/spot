import { normalizeKeywords } from './model.js';
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
function object(value, keys, required = keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !keys.includes(k)) || required.some(k => !Object.hasOwn(value, k))) throw new Error('Missing or unsupported profile fields.');
}
function validateProfile(p) {
  object(p, ['id', 'name', 'positiveKeywords', 'negativeKeywords', 'enabled', 'createdAt', 'updatedAt', 'rules']);
  if (typeof p.id !== 'string' || !p.id.trim() || p.id.length > 128 || typeof p.name !== 'string' || !p.name.trim() || p.name.length > 80 || typeof p.enabled !== 'boolean') throw new Error('Invalid profile identity, name or enabled state.');
  for (const field of ['createdAt', 'updatedAt']) {
    if (typeof p[field] !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(p[field]) || !Number.isFinite(Date.parse(p[field])) || new Date(p[field]).toISOString() !== p[field]) throw new Error('Invalid profile timestamp.');
  }
  for (const field of ['positiveKeywords', 'negativeKeywords']) {
    if (!Array.isArray(p[field]) || JSON.stringify(normalizeKeywords(p[field])) !== JSON.stringify(p[field])) throw new Error('Invalid profile keywords: use unique, normalized text.');
  }
  object(p.rules, ['wholeWords', 'negativeScope'], []);
  if (Object.hasOwn(p.rules, 'wholeWords') && typeof p.rules.wholeWords !== 'boolean') throw new Error('Invalid wholeWords rule.');
  if (Object.hasOwn(p.rules, 'negativeScope') && p.rules.negativeScope !== 'text-node') throw new Error('Unsupported negativeScope rule.');
}
function validatePackage(data, scope) {
  if (!['single', 'all'].includes(scope)) throw new Error('Invalid import/export scope.');
  object(data, ['format', 'version', 'scope', 'profiles']);
  if (data.format !== 'spotadog.profiles' || data.version !== 1) throw new Error('Unsupported profile export format or version.');
  if (data.scope !== scope) throw new Error('Use the matching single-profile or all-profiles import action.');
  if (!Array.isArray(data.profiles) || data.profiles.length > 50 || (scope === 'single' && data.profiles.length !== 1)) throw new Error('Use exactly one profile for a single import, or at most 50 for a collection.');
  const ids = new Set();
  for (const p of data.profiles) {
    validateProfile(p);
    if (ids.has(p.id)) throw new Error('Duplicate profile IDs in the import.');
    ids.add(p.id);
  }
  return data.profiles;
}
export function parseImport(text, scope) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_IMPORT_BYTES) throw new Error('Choose a JSON file no larger than 10 MiB.');
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('The file is not valid JSON.'); }
  return validatePackage(data, scope);
}
export function exportProfiles(profiles, scope, id) {
  const selected = scope === 'single' ? profiles.filter(p => p.id === id) : profiles;
  const data = { format: 'spotadog.profiles', version: 1, scope, profiles: selected };
  validatePackage(data, scope);
  return JSON.stringify(data, null, 2) + '\n';
}
export function mergeProfiles(existing, imported) {
  const replacements = new Map(imported.map(p => [p.id, p]));
  const ids = new Set(existing.map(p => p.id));
  const result = [...existing.map(p => replacements.get(p.id) ?? p), ...imported.filter(p => !ids.has(p.id))];
  if (result.length > 50) throw new Error('You can save up to 50 profiles. Remove profiles before importing.');
  return result;
}
