export const HIGHLIGHT_NAME = 'spotadog-matches';
export class Highlighter {
  constructor(win = window) { this.win = win; }
  clear() { this.win.CSS?.highlights?.delete(HIGHLIGHT_NAME); }
  paint(ranges) {
    this.clear();
    if (ranges.length && this.win.CSS?.highlights && this.win.Highlight) {
      const highlight = new this.win.Highlight();
      for (const range of ranges) highlight.add(range);
      this.win.CSS.highlights.set(HIGHLIGHT_NAME, highlight);
    }
  }
}
