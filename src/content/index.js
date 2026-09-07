import { Scanner } from './scanner.js';
const scanner = new Scanner();
let receivedUpdate = false;
chrome.runtime.onMessage.addListener(message => {
  if (message?.type === 'state.changed') { receivedUpdate = true; scanner.update(message.state); }
});
chrome.runtime.sendMessage({ type: 'scan.get' }).then(response => {
  if (!receivedUpdate && response?.ok) scanner.update(response.data);
}).catch(() => scanner.stop());
