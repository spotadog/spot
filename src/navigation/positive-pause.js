const CONTENT = 'article, [role="article"], section, div';

// Prefer a whole semantic post/section over its internal layout divs.
export function positiveContent(range) {
  const element = range.startContainer.parentElement;
  return element?.closest('article, [role="article"], section') || element?.closest('div');
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
