import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
const source = (await readFile(new URL('../src/content/index.js', import.meta.url), 'utf8')).replace(/^import .*;$/gm, '');
const flush = () => new Promise(resolve => setImmediate(resolve));
function fixture() {
  const listeners = new Set(), pending = [], scanners = [];
  class Scanner {
    constructor() { this.updates = []; this.stops = 0; scanners.push(this); }
    update(state) { if (state.fail) throw Error('paint'); this.updates.push(state); }
    stop() { this.stops++; }
  }
  const context = vm.createContext({ AdSkipper: class { configure() {} dispose() {} }, wirePopups: () => ({ dispose() {} }), AutoNavigator: class { configure() {} dispose() {} }, window: {}, Scanner, document: {}, persistCountHistory() {}, chrome: { runtime: {
    onMessage: { addListener(fn) { listeners.add(fn); }, removeListener(fn) { listeners.delete(fn); } },
    sendMessage() { return new Promise((resolve, reject) => pending.push({ resolve, reject })); }
  } } });
  return { listeners, pending, scanners, run() { vm.runInContext(`(() => {${source}\n})()`, context); }, send(state) { let result; for (const fn of listeners) fn({ type: 'state.changed', state }, {}, value => { result = value; }); return result; } };
}
test('reinitialization disposes old listeners and ignores initialization completing after reload', async () => {
  const f = fixture();
  f.run(); f.run(); f.run();
  assert.equal(f.listeners.size, 1);
  assert.equal(f.scanners[0].stops, 1);
  assert.equal(f.scanners[1].stops, 1);
  f.pending[2].resolve({ ok: true, data: { words: ['new'] } });
  f.pending[0].resolve({ ok: true, data: { words: ['old'] } });
  f.pending[1].reject(Error('disposed'));
  await flush();
  assert.equal(f.scanners[0].updates.length, 0);
  assert.deepEqual(f.scanners[2].updates, [{ words: ['new'] }]);
  assert.equal(f.scanners[2].stops, 0);
});
test('broadcast wins startup race and rebuild failures stop stale rendering and are acknowledged', async () => {
  const f = fixture(); f.run();
  assert.equal(f.send({ words: ['imported'] }).ok, true);
  f.pending[0].resolve({ ok: true, data: { words: ['old'] } });
  await flush();
  assert.deepEqual(f.scanners[0].updates, [{ words: ['imported'] }]);
  assert.equal(f.send({ fail: true }).ok, false);
  assert.equal(f.scanners[0].stops, 1);
  assert.equal(f.send({ words: ['recovered'] }).ok, true);
});
