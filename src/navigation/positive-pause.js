import { eyeballLevel } from './preferences.js';
const CONTENT = 'article, [role="article"], section, div';

// A semantic post stays whole, but a section can also be a feed containing
// independent div posts. Do not let that feed's growing bottom defer the pause.
export function positiveContent(range) {
  const element = range.startContainer.parentElement;
  const userCell = element?.closest('[data-testid="UserCell"]');
  if (userCell) return userCell;
  const semantic = element?.closest('article, [role="article"], section');
  const block = element?.closest(CONTENT);
  if (semantic?.matches('article, [role="article"]')) return semantic;
  if (semantic) {
    let item = null;
    for (let node = block; node && node !== semantic; node = node.parentElement) {
      if (node.matches(CONTENT) && [...node.parentElement.children].some(sibling => sibling !== node && sibling.matches(CONTENT))) item = node;
    }
    return item || semantic;
  }
  return block || element?.closest('p, li, blockquote, h1, h2, h3, h4, h5, h6');
}

// Scanning already resolves positive/negative overlap and paints these ranges.
// Inspect the whole post: its keyword can still be below the viewport when the
// beginning of that post reaches the reading line.
function matchingPosts(win, ranges) {
  const posts = new Map();
  for (const range of ranges) {
    const post = positiveContent(range);
    if (!post?.isConnected || posts.has(post) || !post.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
    const rect = post.getBoundingClientRect();
    if (rect.height <= 0 || rect.width <= 0 || rect.bottom <= 0 || rect.top >= win.innerHeight || rect.right <= 0 || rect.left >= win.innerWidth) continue;
    posts.set(post, rect);
  }
  return posts;
}
export function positiveAtEyeball(win, ranges, level = 50) {
  const line = win.innerHeight * eyeballLevel(level) / 100;
  return [...matchingPosts(win, ranges).values()].some(rect => rect.top <= line && rect.bottom > line);
}

export class PositivePause {
  constructor() { this.reset(); }
  reset() { this.consumed = new WeakSet(); this.target = null; }
  boundary(win, ranges, level = 50, eligible = () => true) {
    const line = win.innerHeight * eyeballLevel(level) / 100;
    let boundary = null;
    this.target = null;
    for (const [post, rect] of matchingPosts(win, ranges)) {
      if (this.consumed.has(post) || rect.bottom <= line || !eligible(post)) continue;
      const position = Math.max(win.scrollY, win.scrollY + rect.top - line);
      if (boundary === null || position < boundary) { boundary = position; this.target = post; }
    }
    return boundary === null ? null : Math.min(boundary, Math.max(0, win.document.scrollingElement.scrollHeight - win.innerHeight));
  }
  finish() {
    if (this.target) this.consumed.add(this.target);
    this.target = null;
  }
}
