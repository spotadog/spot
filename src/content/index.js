import { Scanner } from './scanner.js';
import { persistCountHistory } from './count-history.js';
// A reinjected bundle shares the extension's isolated world. Dispose its predecessor.
const key = '__spotadogContent';
globalThis[key]?.dispose();
const scanner = new Scanner(document, persistCountHistory);
let receivedUpdate = false, disposed = false;
function update(state) {
  try { scanner.update(state); return { ok: true }; }
  catch { scanner.stop(); return { ok: false }; }
}
const listener = (message, sender, respond) => {
  if (message?.type === 'counts.get') { respond({ counts: scanner.snapshot() }); return; }
  if (message?.type === 'page.status') { respond({ supported: true }); return; }
  if (message?.type === 'state.changed') { receivedUpdate = true; respond(update(message.state)); }
};
chrome.runtime.onMessage.addListener(listener);
globalThis[key] = { dispose() {
  disposed = true;
  scanner.stop();
  chrome.runtime.onMessage.removeListener(listener);
} };
chrome.runtime.sendMessage({ type: 'scan.get' }).then(response => {
  if (!disposed && !receivedUpdate && response?.ok) update(response.data);
}).catch(() => { if (!disposed && !receivedUpdate) scanner.stop(); });
