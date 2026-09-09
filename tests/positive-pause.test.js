import test from 'node:test';
import assert from 'node:assert/strict';
import { PositivePause, positiveContent, positiveAtEyeball } from '../src/navigation/positive-pause.js';

function node(tag, bottom = 900, children = []) {
  const element = { tag, isConnected: true, children,
    matches(selector) { return selector.split(',').some(part => part.trim() === tag); },
    closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector); },
    querySelector(selector) { for (const child of this.children) { if (child.matches(selector)) return child; const found = child.querySelector(selector); if (found) return found; } return null; },
    checkVisibility: () => true,
    getBoundingClientRect: () => ({ top: bottom - 900, bottom, height: 900, width: 900, left: 0, right: 900 }) };
  children.forEach((child, i) => { child.parentElement = element; child.nextElementSibling = children[i + 1] ?? null; child.previousElementSibling = children[i - 1] ?? null; });
  return element;
}
const range = element => ({ startContainer: { parentElement: element }, getClientRects: () => [{ top: 20, bottom: 40, width: 80, height: 20, left: 0, right: 80 }] });
const win = body => ({ document: { body, scrollingElement: { scrollHeight: 6000 } }, scrollY: 0, innerWidth: 1000, innerHeight: 500 });

test('div posts inside a feed section pause at the reading line, not the growing feed end', () => {
  const text = node('span'), post = node('div', 900, [text]), next = node('div', 1800);
  const feed = node('section', 6000, [post, next]), body = node('body', 6000, [feed]);
  assert.equal(positiveContent(range(text)), post);
  const pause = new PositivePause();
  assert.equal(pause.boundary(win(body), [range(text)]), 0);
  feed.getBoundingClientRect = () => ({ top: 0, bottom: 9000, height: 9000 });
  assert.equal(pause.boundary(win(body), [range(text)]), 0);
});

test('plain paragraphs outside divs/sections still arm a keyword pause', () => {
  const text = node('span'), paragraph = node('p', 900, [text]), next = node('section', 1800);
  const body = node('body', 4000, [paragraph, next]);
  assert.equal(positiveContent(range(text)), paragraph);
  assert.equal(new PositivePause().boundary(win(body), [range(text)]), 0);
});

test('semantic posts and single section layout wrappers still finish as a whole', () => {
  for (const tag of ['article', 'section']) {
    const text = node('span'), inner = node('div', 30, [text]), post = node(tag, 900, [inner]);
    node('body', 4000, [post, node('section', 1800)]);
    assert.equal(positiveContent(range(text)), post);
  }
});

test('nested layout wrappers select the individual feed item and resume can select the next item', () => {
  const text = node('span'), inner = node('div', 30, [text]);
  const post = node('div', 900, [inner]), next = node('div', 1800, [node('span')]);
  const feed = node('section', 6000, [node('div', 6000, [post, next])]);
  const body = node('body', 6000, [feed]), pause = new PositivePause();
  assert.equal(positiveContent(range(text)), post);
  assert.equal(pause.boundary(win(body), [range(text)]), 0);
  pause.finish();
  assert.equal(pause.boundary(win(body), [range(text)]), null);
  assert.equal(positiveContent(range(next.children[0])), next);
});

test('earliest post wins despite range order; passed posts do not cause stale pauses', () => {
  const first = node('article', 1300), second = node('article', 1350), old = node('article', 100);
  const body = node('body', 4000, [first, second, old]);
  const pause = new PositivePause();
  assert.equal(pause.boundary(win(body), [range(second), range(old), range(first)]), 150);
  assert.equal(pause.target, first);
  assert.equal(positiveAtEyeball(win(body), [range(old)]), false);
});

import { createStore, scanningState } from '../src/storage/store.js';
test('eyeball preference defaults, validates, persists and projects only the safe configuration', async () => {
  let data = {};
  const area = { get: async key => ({ [key]: data[key] }), set: async values => { Object.assign(data, values); } };
  const store = createStore(area);
  assert.equal((await store.read()).preferences.eyeballLevel, 50);
  await store.saveNavigationSettings({ eyeballLevel: 70 });
  assert.equal((await createStore(area).read()).preferences.eyeballLevel, 70);
  assert.equal(scanningState(await store.read()).eyeballLevel, 70);
  assert.equal('preferences' in scanningState(await store.read()), false);
  for (const value of [0, 100, 50.5, NaN, '50', null, undefined]) assert.throws(() => store.saveNavigationSettings({ eyeballLevel: value }));
  assert.equal((await store.read()).preferences.eyeballLevel, 70);
  const failing = createStore({ ...area, set: async () => { throw Error('failed write'); } });
  await assert.rejects(failing.saveNavigationSettings({ eyeballLevel: 25 }), /failed write/);
  assert.equal((await store.read()).preferences.eyeballLevel, 70);
  data['spotadog.state'].preferences.eyeballLevel = 'bad';
  assert.equal((await store.read()).preferences.eyeballLevel, 50);
});

import { autoPauseColors, validateAutoPauseColors, DEFAULT_AUTO_PAUSE_COLORS } from '../src/navigation/preferences.js';
test('auto-pause palette normalizes exact hex colors, supports none, and rejects invalid writes', async () => {
  assert.deepEqual(autoPauseColors(), [...DEFAULT_AUTO_PAUSE_COLORS]);
  assert.deepEqual(validateAutoPauseColors(['#AB12CD', '#ab12cd', '#ffe077']), ['#ab12cd', '#ffe077']);
  assert.deepEqual(autoPauseColors([]), []);
  for (const value of [null, '#ffe077', ['red'], ['#fff'], [12], Array(201).fill('#ffe077')]) {
    assert.throws(() => validateAutoPauseColors(value));
    assert.deepEqual(autoPauseColors(value), []);
  }
  let data = {};
  const area = { get: async key => ({ [key]: data[key] }), set: async values => { Object.assign(data, structuredClone(values)); } };
  const store = createStore(area);
  await store.saveNavigationSettings({ eyeballLevel: 65, autoPauseColors: ['#AB12CD'] });
  assert.deepEqual((await createStore(area).read()).preferences.autoPauseColors, ['#ab12cd']);
  assert.deepEqual(scanningState(await store.read()).autoPauseColors, ['#ab12cd']);
  await store.saveNavigationSettings({ eyeballLevel: 25 }); // Older callers preserve the selection.
  assert.deepEqual((await store.read()).preferences.autoPauseColors, ['#ab12cd']);
  assert.throws(() => store.saveNavigationSettings({ eyeballLevel: 50, autoPauseColors: ['bad'] }));
  assert.equal((await store.read()).preferences.eyeballLevel, 25);
  await store.saveNavigationSettings({ eyeballLevel: 25, autoPauseColors: [] });
  assert.deepEqual((await store.read()).preferences.autoPauseColors, []);
});
