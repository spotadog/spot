export const HIGHLIGHT_NAME = 'spotadog-matches';
export const NEGATIVE_HIGHLIGHT_NAME = 'spotadog-negative';
const names = { positive: HIGHLIGHT_NAME, negative: NEGATIVE_HIGHLIGHT_NAME };
export class Highlighter {
  constructor(win = window) { this.win = win; }
  clear() { for (const name of Object.values(names)) this.win.CSS?.highlights?.delete(name); }
  paint(ranges) {
    this.clear();
    if (!this.win.CSS?.highlights || !this.win.Highlight) return;
    for (const [kind, name] of Object.entries(names)) {
      const highlight = new this.win.Highlight();
      for (const item of ranges) if (item.kind === kind) highlight.add(item.range);
      if (highlight.size) this.win.CSS.highlights.set(name, highlight);
    }
  }
}
