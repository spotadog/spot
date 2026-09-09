import { defaultColor, keywordColor, contrastColor } from './colors.js';
export const HIGHLIGHT_NAME = 'spotadog-matches';
export const NEGATIVE_HIGHLIGHT_NAME = 'spotadog-negative';
const names = { positive: HIGHLIGHT_NAME, negative: NEGATIVE_HIGHLIGHT_NAME };
export class Highlighter {
  constructor(win = window) { this.win = win; this.customNames = new Set(); this.positiveRanges = []; }
  clearRanges() {
    this.positiveRanges = [];
    for (const name of [...Object.values(names), ...this.customNames]) this.win.CSS?.highlights?.delete(name);
    this.customNames.clear();
  }
  clear() { this.clearRanges(); this.style?.remove(); this.style = null; }
  paint(ranges) {
    this.clearRanges();
    if (!this.win.CSS?.highlights || !this.win.Highlight) return;
    const groups = new Map();
    for (const item of ranges) {
      if (!Object.hasOwn(names, item.kind)) continue;
      const color = keywordColor(item, item.kind);
      const name = color === defaultColor(item.kind) ? names[item.kind] : `spotadog-${item.kind}-${color.slice(1)}`;
      if (!groups.has(name)) groups.set(name, { color, highlight: new this.win.Highlight() });
      groups.get(name).highlight.add(item.range);
    }
    const rules = [];
    for (const [name, { color, highlight }] of groups) {
      if (!Object.values(names).includes(name)) {
        this.customNames.add(name);
        rules.push(`::highlight(${name}) { background-color: ${color}; color: ${contrastColor(color)}; text-decoration: underline; }`);
      }
      this.win.CSS.highlights.set(name, highlight);
    }
    this.positiveRanges = ranges.filter(item => item.kind === 'positive').map(item => item.range);
    // Reuse unchanged rules so our own stylesheet does not trigger endless rescans.
    const css = rules.join('\n');
    if (css) {
      if (!this.style) { this.style = this.win.document.createElement('style'); this.win.document.documentElement.append(this.style); }
      if (this.style.textContent !== css) this.style.textContent = css;
    } else if (this.style) { this.style.remove(); this.style = null; }
  }
}
