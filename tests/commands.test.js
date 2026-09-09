import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resumeCommand, RESUME_COMMAND } from '../src/background/commands.js';
import { navigationService } from '../src/background/navigation.js';
import { defaults, transition } from '../src/navigation/state.js';

function fixture() {
  const states = new Map(), messages = [], queries = [];
  let active = 1, supported = true, closed = false;
  const store = { prune: async () => {}, remove: async id => states.delete(id), read: async id => states.get(id),
    update: async (id, change) => { const state = await change(states.get(id)); states.set(id, state); return state; } };
  const event = { addListener() {} };
  const api = { runtime: { id: 'extension', getURL: path => `chrome-extension://extension/${path}`, sendMessage: async msg => messages.push(msg) }, tabs: {
    query: async query => { queries.push(query); return active === null ? [] : [{ id: active }]; },
    get: async id => { if (closed) throw Error('closed'); return { id }; },
    sendMessage: async (id, msg) => { messages.push({ id, ...msg }); return { supported }; },
    onRemoved: event, onCreated: event
  } };
  const navigate = navigationService(api, store);
  return { states, messages, queries, api, navigate, command: resumeCommand(api, navigate),
    active(id) { active = id; }, supported(value) { supported = value; }, close() { closed = true; } };
}
const paused = () => transition(defaults(), { type: 'set', enabled: true, paused: true, speed: 400, pauseAfterPositive: true, slowOnPositive: true });

test('shortcut manifest names the registered resume command and supplies a default key', async () => {
  const manifest = JSON.parse(await readFile(new URL('../manifest.json', import.meta.url), 'utf8'));
  assert.equal(manifest.commands[RESUME_COMMAND].suggested_key, 'Alt+Shift+R');
});
test('hotkey and Resume button share the same transition and preserve options in the active tab', async () => {
  const f = fixture(), original = paused(); f.states.set(1, original); f.states.set(2, paused());
  await f.command(RESUME_COMMAND);
  const result = f.states.get(1);
  assert.deepEqual(result, transition(original, { type: 'set', paused: false }));
  assert.equal(f.states.get(2).paused, true);
  assert.ok(f.queries.some(query => query.active && query.lastFocusedWindow));
  assert.ok(f.messages.some(msg => msg.type === 'scroll.ui.changed' && msg.tabId === 1));
  f.states.set(1, original);
  const button = await f.navigate({ type: 'scroll.resume', tabId: 1 }, { id: 'extension', url: 'chrome-extension://extension/popup/index.html' });
  assert.deepEqual(button, result);
});
test('repeated hotkeys never pause running scrolling or turn on disabled scrolling', async () => {
  const f = fixture(); f.states.set(1, paused());
  await f.command(RESUME_COMMAND); const running = f.states.get(1);
  await f.command(RESUME_COMMAND); assert.deepEqual(f.states.get(1), running);
  f.states.set(1, defaults()); await f.command(RESUME_COMMAND);
  assert.deepEqual(f.states.get(1), defaults());
});
test('event tab is retained if focus changes, and unrelated commands do nothing', async () => {
  const f = fixture(); f.states.set(1, paused()); f.states.set(2, paused()); f.active(2);
  await f.command('unrelated'); assert.equal(f.states.get(2).paused, true);
  await f.command(RESUME_COMMAND, { id: 1 });
  assert.equal(f.states.get(1).paused, false); assert.equal(f.states.get(2).paused, true);
});
test('missing, closed, unsupported tabs and navigation failures are handled without unhandled rejections', async () => {
  for (const mode of ['missing', 'closed', 'unsupported']) {
    const f = fixture(); f.states.set(1, paused());
    if (mode === 'missing') f.active(null);
    if (mode === 'closed') f.close();
    if (mode === 'unsupported') f.supported(false);
    await f.command(RESUME_COMMAND); assert.equal(f.states.get(1).paused, true);
  }
  const f = fixture(); await resumeCommand(f.api, async () => { throw Error('storage failed'); })(RESUME_COMMAND, { id: 1 });
  await assert.rejects(f.navigate({ type: 'scroll.resume', tabId: 1 }, { id: 'webpage', url: 'https://example.test/' }), /Invalid scrolling source/);
});
