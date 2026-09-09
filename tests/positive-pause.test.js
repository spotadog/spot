import test from 'node:test';
import assert from 'node:assert/strict';
import { PositivePause, positiveContent } from '../src/navigation/positive-pause.js';

function node(tag, bottom = 900, children = []) {
  const element = { tag, isConnected: true, children,
    matches(selector) { return selector.split(',').some(part => part.trim() === tag); },
    closest(selector) { return this.matches(selector) ? this : this.parentElement?.closest(selector); },
    querySelector(selector) { for (const child of this.children) { if (child.matches(selector)) return child; const found = child.querySelector(selector); if (found) return found; } return null; },
    checkVisibility: () => true,
    getBoundingClientRect: () => ({ top: bottom - 900, bottom, height: 900 }) };
  children.forEach((child, i) => { child.parentElement = element; child.nextElementSibling = children[i + 1] ?? null; child.previousElementSibling = children[i - 1] ?? null; });
  return element;
}
const range = element => ({ startContainer: { parentElement: element }, getClientRects: () => [{ top: 20, bottom: 40, width: 80, height: 20, left: 0, right: 80 }] });
const win = body => ({ document: { body, scrollingElement: { scrollHeight: 6000 } }, scrollY: 0, innerWidth: 1000, innerHeight: 500 });

test('div posts inside a feed section stop at the next post, not the growing feed end', () => {
  const text = node('span'), post = node('div', 900, [text]), next = node('div', 1800);
  const feed = node('section', 6000, [post, next]), body = node('body', 6000, [feed]);
  assert.equal(positiveContent(range(text)), post);
  const pause = new PositivePause();
  assert.equal(pause.boundary(win(body), [range(text)]), 900);
  feed.getBoundingClientRect = () => ({ top: 0, bottom: 9000, height: 9000 });
  assert.equal(pause.boundary(win(body), [range(text)]), 900);
});

test('plain paragraphs outside divs/sections still arm a keyword pause', () => {
  const text = node('span'), paragraph = node('p', 900, [text]), next = node('section', 1800);
  const body = node('body', 4000, [paragraph, next]);
  assert.equal(positiveContent(range(text)), paragraph);
  assert.equal(new PositivePause().boundary(win(body), [range(text)]), 900);
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
  assert.equal(pause.boundary(win(body), [range(text)]), 900);
  pause.finish();
  assert.equal(pause.boundary(win(body), [range(text)]), null);
  assert.equal(positiveContent(range(next.children[0])), next);
});
