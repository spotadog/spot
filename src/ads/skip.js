const SELECTOR = 'button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"]';
export function skipLabel(value) {
  return typeof value === 'string' && value.trim().replace(/\s+/g, ' ').toLowerCase() === 'skip this ad';
}
export function clickableSkip(node, doc) {
  if (!node.isConnected || !node.matches(SELECTOR) || !skipLabel(node.getAttribute('aria-label') || (node.tagName === 'INPUT' ? node.value : node.innerText))) return false;
  if (node.matches(':disabled') || node.closest('[inert], [aria-disabled="true"], [hidden]') || !node.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
  if (doc.defaultView.getComputedStyle(node).pointerEvents === 'none') return false;
  // Hit-test the visible portion, including partially clipped controls. A cover
  // or clipped ancestor must not turn a programmatic click into a hidden action.
  for (const rect of node.getClientRects()) {
    const left = Math.max(0, rect.left), right = Math.min(doc.defaultView.innerWidth, rect.right);
    const top = Math.max(0, rect.top), bottom = Math.min(doc.defaultView.innerHeight, rect.bottom);
    if (right <= left || bottom <= top) continue;
    for (const fraction of [0.5, 0.2, 0.8]) {
      const hit = doc.elementFromPoint(left + (right - left) * fraction, top + (bottom - top) * fraction);
      if (hit && node.contains(hit)) return true;
    }
  }
  return false;
}
export class AdSkipper {
  constructor(doc, clicked = new Set()) {
    this.doc = doc; this.win = doc.defaultView; this.clicked = clicked;
    this.enabled = false; this.disposed = false;
    this.schedule = () => {
      if (!this.enabled || this.disposed || this.timer) return;
      this.timer = this.win.setTimeout(() => { this.timer = null; this.scan(); }, 100);
    };
    this.observer = new this.win.MutationObserver(this.schedule);
  }
  configure(enabled) {
    if (this.disposed || this.enabled === (enabled === true)) return;
    this.enabled = enabled === true;
    this.stop();
    if (!this.enabled) { this.clicked.clear(); return; }
    this.observer.observe(this.doc.documentElement, { subtree: true, childList: true, characterData: true, attributes: true });
    this.doc.addEventListener('visibilitychange', this.schedule);
    this.win.addEventListener('scroll', this.schedule, true);
    // Also catches CSS animation and property-only changes without DOM mutations.
    this.poll = this.win.setInterval(() => this.scan(), 500);
    this.schedule();
  }
  scan() {
    if (!this.enabled || this.disposed || this.doc.visibilityState !== 'visible') return;
    const eligible = new Set([...this.doc.querySelectorAll(SELECTOR)].filter(node => clickableSkip(node, this.doc)));
    for (const node of this.clicked) if (!eligible.has(node)) this.clicked.delete(node);
    for (const node of eligible) {
      // Earlier click handlers can hide, disable or remove another candidate.
      if (!this.enabled || this.disposed) break;
      if (this.clicked.has(node) || !clickableSkip(node, this.doc)) continue;
      this.clicked.add(node);
      node.click();
    }
  }
  stop() {
    this.observer.disconnect();
    this.win.clearTimeout(this.timer); this.timer = null;
    this.win.clearInterval(this.poll); this.poll = null;
    this.doc.removeEventListener('visibilitychange', this.schedule);
    this.win.removeEventListener('scroll', this.schedule, true);
  }
  dispose() { this.disposed = true; this.enabled = false; this.stop(); }
}
