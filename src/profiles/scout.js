// The scout export is data only. Notes and follow status never control navigation.
export const SCOUT_MAX_BYTES = 5 * 1024 * 1024;
const fields = ['accountBasedIn', 'checkedAt', 'connectedVia', 'dateJoined', 'followStatus', 'handle', 'note', 'profileUrl', 'status'];
const normalized = value => value.trim().replace(/\s+/g, ' ').toLowerCase();
export function xHandle(value, base) {
  try {
    const url = new URL(value, base);
    if (url.protocol !== 'https:' || !['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com'].includes(url.hostname) || url.username || url.password || url.port) return null;
    const match = url.pathname.match(/^\/([a-zA-Z0-9_]{1,15})\/?$/);
    return match ? match[1].toLowerCase() : null;
  } catch { return null; }
}
export function parseScout(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > SCOUT_MAX_BYTES) throw Error('Choose a scout JSON file of at most 5 MiB.');
  let data;
  try { data = JSON.parse(text); } catch { throw Error('Invalid scout JSON.'); }
  const exact = (value, keys) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
  if (!exact(data, ['version', 'exportedAt', 'records']) || data.version !== 1 || typeof data.exportedAt !== 'string' || !Number.isFinite(Date.parse(data.exportedAt)) || !Array.isArray(data.records) || data.records.length > 10000) throw Error('Expected a version 1 scout export with exportedAt and up to 10,000 records.');
  const handles = new Set();
  for (const record of data.records) {
    if (!exact(record, fields) || !fields.every(key => typeof record[key] === 'string' && record[key].length <= 4096) || !/^[a-zA-Z0-9_]{1,15}$/.test(record.handle) || xHandle(record.profileUrl) !== record.handle.toLowerCase() || !Number.isFinite(Date.parse(record.checkedAt)) || !['checked', 'unavailable'].includes(record.status)) throw Error('Invalid scout record. Include all sample fields and a matching X handle/profile URL.');
    const handle = record.handle.toLowerCase();
    if (handles.has(handle)) throw Error('Duplicate scout handle. Each profile must appear once.');
    handles.add(handle);
  }
  return data;
}
export function validateLocationSettings(value) {
  if (!value || typeof value.enabled !== 'boolean' || typeof value.location !== 'string' || value.location.trim().length > 120 || (value.enabled && !value.location.trim())) throw Error('Enter a location before enabling the checkbot (up to 120 characters).');
  return { enabled: value.enabled, location: value.location.trim() };
}
export function locationMatches(record, location) {
  return !!record && record.status === 'checked' && !!normalized(location) && normalized(record.accountBasedIn) === normalized(location);
}
export function scoutProjection(state) {
  const settings = state.locationCheck ?? { enabled: false, location: '' };
  return { ...settings, handles: settings.enabled ? (state.scoutData?.records ?? []).filter(record => locationMatches(record, settings.location)).map(record => record.handle.toLowerCase()) : [] };
}
