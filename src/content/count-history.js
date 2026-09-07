export async function persistCountHistory(url, history) {
  // Hash in the extension worker: Web Crypto is unavailable on insecure HTTP pages.
  const response = await chrome.runtime.sendMessage({ type: 'counts.record', url, history });
  if (!response?.ok) throw new Error('Counts could not be saved.');
  return response.data;
}
