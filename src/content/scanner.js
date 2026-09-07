import { countEntries, countUnit, contextCounts, mergeCountHistory, historyTotals } from '../matching/counts.js';
import { findMatches, resolveHighlights } from '../matching/matcher.js';
import { Highlighter } from '../highlighting/highlighter.js';
const SKIP = 'script,style,noscript,textarea,input,select,option,pre,code,kbd,samp,svg,canvas,[hidden],[inert],[aria-hidden="true"],[contenteditable]:not([contenteditable="false"])';
export class Scanner {
  constructor(doc = document, persistCounts = null) {
    this.doc = doc;
    this.persistCounts = persistCounts;
    this.histories = new Map();
    this.revision = 0;
    this.win = doc.defaultView;
    this.highlighter = new Highlighter(this.win);
    this.state = { enabled: false, profiles: [] };
    this.cache = new WeakMap();
    this.counts = null;
    this.route = () => {
      this.revision++;
      this.counts = null;
      this.cache = new WeakMap();
      this.schedule();
    };
    this.schedule = () => {
      if (this.timer || !this.state.enabled) return;
      this.timer = this.win.setTimeout(() => { this.timer = null; this.scan(); }, 150);
    };
    this.observer = new this.win.MutationObserver(this.schedule);
  }
  update(state) {
    this.stop();
    this.state = state;
    this.entries = state.tracking ? countEntries(state.profiles) : [];
    this.url = this.win.location.href;
    if (state.tracking && state.enabled) this.recordCounts([]);
    if (!state.enabled || !state.profiles.some(p => p.enabled && (p.positiveKeywords.length || p.negativeKeywords.length || p.rules?.criteria?.length))) return;
    this.observer.observe(this.doc.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open', 'aria-hidden', 'contenteditable', 'inert'] });
    this.win.addEventListener('resize', this.schedule);
    if (state.tracking) {
      this.win.navigation?.addEventListener('navigatesuccess', this.route);
      this.win.addEventListener('popstate', this.route);
      this.win.addEventListener('hashchange', this.route);
    }
    this.doc.addEventListener('toggle', this.schedule, true);
    this.scan();
  }
  stop() {
    this.revision++;
    this.observer.disconnect();
    this.win.clearTimeout(this.timer);
    this.timer = null;
    this.win.removeEventListener('resize', this.schedule);
    this.doc.removeEventListener('toggle', this.schedule, true);
    this.win.navigation?.removeEventListener('navigatesuccess', this.route);
    this.win.removeEventListener('popstate', this.route);
    this.win.removeEventListener('hashchange', this.route);
    this.cache = new WeakMap();
    this.counts = null;
    this.highlighter.clear();
  }
  snapshot() {
    if (!this.state.tracking || !this.state.enabled) return null;
    if (this.url !== this.win.location.href) { this.url = this.win.location.href; this.route(); }
    return this.counts;
  }
  recordCounts(units) {
    const url = this.url;
    const history = mergeCountHistory(this.histories.get(url), contextCounts(units));
    this.histories.set(url, history);
    if (!this.persistCounts) { this.counts = historyTotals(history, this.entries); return; }
    const revision = ++this.revision;
    // Only acknowledged storage totals are displayed. Late replies from a
    // previous route/configuration must not replace the current snapshot.
    Promise.resolve(this.persistCounts(url, history)).then(counts => {
      if (revision === this.revision) this.counts = counts;
    }).catch(() => { if (revision === this.revision) this.counts = null; });
  }
  scan() {
    if (!this.state.enabled) return;
    if (this.url !== this.win.location.href) { this.url = this.win.location.href; this.counts = null; this.revision++; }
    if (!this.doc.body) {
      this.highlighter.clear();
      if (this.state.tracking) this.recordCounts([]);
      return;
    }
    const ranges = [], units = [];
    const walker = this.doc.createTreeWalker(this.doc.body, this.win.NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const element = node.parentElement;
      if (!node.textContent.trim() || !element || element.closest(SKIP)) continue;
      if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      let cached = this.cache.get(node);
      if (!cached || cached.text !== node.textContent) {
        cached = { text: node.textContent, matches: resolveHighlights(findMatches(node.textContent, this.state.profiles)),
          counts: this.state.tracking ? countUnit(node.textContent, this.entries) : null };
        this.cache.set(node, cached);
      }
      if (this.state.tracking && cached.counts.length) {
        const visible = this.doc.createRange();
        visible.selectNodeContents(node);
        if (visible.getClientRects().length) units.push(cached.counts);
      }
      for (const match of cached.matches) {
        const range = this.doc.createRange();
        range.setStart(node, match.start);
        range.setEnd(node, match.end);
        if (range.getClientRects().length) ranges.push({ range, kind: match.kind });
      }
    }
    if (this.state.tracking) this.recordCounts(units);
    this.highlighter.paint(ranges);
  }
}
