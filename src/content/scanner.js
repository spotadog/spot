import { findMatches, resolveHighlights } from '../matching/matcher.js';
import { Highlighter } from '../highlighting/highlighter.js';
const SKIP = 'script,style,noscript,textarea,input,select,option,pre,code,kbd,samp,svg,canvas,[hidden],[inert],[aria-hidden="true"],[contenteditable]:not([contenteditable="false"])';
export class Scanner {
  constructor(doc = document) {
    this.doc = doc;
    this.win = doc.defaultView;
    this.highlighter = new Highlighter(this.win);
    this.state = { enabled: false, profiles: [] };
    this.schedule = () => {
      if (this.timer || !this.state.enabled) return;
      this.timer = this.win.setTimeout(() => { this.timer = null; this.scan(); }, 150);
    };
    this.observer = new this.win.MutationObserver(this.schedule);
  }
  update(state) {
    this.stop();
    this.state = state;
    if (!state.enabled || !state.profiles.some(p => p.enabled && (p.positiveKeywords.length || p.negativeKeywords.length))) return;
    this.observer.observe(this.doc.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open', 'aria-hidden', 'contenteditable', 'inert'] });
    this.win.addEventListener('resize', this.schedule);
    this.doc.addEventListener('toggle', this.schedule, true);
    this.scan();
  }
  stop() {
    this.observer.disconnect();
    this.win.clearTimeout(this.timer);
    this.timer = null;
    this.win.removeEventListener('resize', this.schedule);
    this.doc.removeEventListener('toggle', this.schedule, true);
    this.highlighter.clear();
  }
  scan() {
    if (!this.state.enabled || !this.doc.body) return;
    const ranges = [];
    const walker = this.doc.createTreeWalker(this.doc.body, this.win.NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement;
      if (!node.textContent.trim() || !element || element.closest(SKIP)) continue;
      if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      for (const match of resolveHighlights(findMatches(node.textContent, this.state.profiles))) {
        const range = this.doc.createRange();
        range.setStart(node, match.start);
        range.setEnd(node, match.end);
        if (range.getClientRects().length) ranges.push({ range, kind: match.kind });
      }
    }
    this.highlighter.paint(ranges);
  }
}
