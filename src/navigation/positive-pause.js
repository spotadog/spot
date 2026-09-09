const CONTENT = 'article, [role="article"], section, div';

// A semantic post stays whole, but a section can also be a feed containing
// independent div posts. Do not let that feed's growing bottom defer the pause.
export function positiveContent(range) {
  const element = range.startContainer.parentElement;
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

export class PositivePause {
  constructor() { this.reset(); }
  reset() { this.consumed = new WeakSet(); this.target = null; }
  boundary(win, ranges) {
    if (this.target && !this.target.isConnected) this.target = null;
    if (!this.target) {
      for (const range of ranges) {
        const block = positiveContent(range);
        if (!block?.isConnected || this.consumed.has(block)) continue;
        if (![...range.getClientRects()].some(rect => rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < win.innerHeight && rect.right > 0 && rect.left < win.innerWidth)) continue;
        this.target = block;
        break;
      }
    }
    const block = this.target;
    if (!block) return null;
    // Follow siblings up the tree, skipping inline decoration and empty wrappers.
    let next = null;
    for (let node = block; node && node !== win.document.body && !next; node = node.parentElement) {
      for (let sibling = node.nextElementSibling; sibling && !next; sibling = sibling.nextElementSibling) {
        const candidate = sibling.matches(CONTENT) ? sibling : sibling.querySelector(CONTENT);
        if (candidate?.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && candidate.getBoundingClientRect().height > 0) next = candidate;
      }
    }
    const bottom = block.getBoundingClientRect().bottom;
    const edge = next ? Math.max(bottom, next.getBoundingClientRect().top) : bottom;
    return Math.min(win.scrollY + edge, Math.max(0, win.document.scrollingElement.scrollHeight - win.innerHeight));
  }
  finish() {
    if (this.target) this.consumed.add(this.target);
    this.target = null;
  }
}
