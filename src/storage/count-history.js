// Persist fingerprints, not page text or raw browsing URLs.
export async function fingerprint(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function fingerprintHistory(url, history) {
  const page = await fingerprint(url);
  const observations = Object.fromEntries(await Promise.all(Object.entries(history).map(async ([key, contexts]) => [key,
    Object.fromEntries(await Promise.all(Object.entries(contexts).map(async ([context, count]) => [await fingerprint(context), count])))
  ])));
  return { page, observations };
}
