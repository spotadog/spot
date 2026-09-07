const word = /[\p{L}\p{N}_]/u;
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function pattern(keyword) { return new RegExp(escape(keyword).replace(/\s+/g, '\\s+'), 'giu'); }
function occurrences(text, keyword) {
  const result = [];
  for (const match of text.matchAll(pattern(keyword))) {
    const start = match.index, end = start + match[0].length;
    const before = [...text.slice(0, start)].at(-1) ?? '';
    const after = [...text.slice(end)][0] ?? '';
    if ((word.test([...match[0]][0]) && word.test(before)) || (word.test([...match[0]].at(-1)) && word.test(after))) continue;
    result.push({ start, end });
  }
  return result;
}
// Return independent match kinds. Legacy negativeScope never enables suppression.
export function findMatches(text, profiles) {
  const matches = new Map();
  for (const profile of profiles) {
    if (!profile.enabled) continue;
    for (const [kind, keywords] of [['positive', profile.positiveKeywords], ['negative', profile.negativeKeywords]]) {
      for (const keyword of keywords) {
        for (const hit of occurrences(text, keyword)) matches.set(`${kind}:${hit.start}:${hit.end}`, { ...hit, kind });
      }
    }
  }
  return [...matches.values()].sort((a, b) => a.start - b.start || b.end - a.end || a.kind.localeCompare(b.kind));
}
// Subtract negative intervals from positives before creating DOM ranges. This makes
// red precedence deterministic even on browsers without Highlight.priority.
export function resolveHighlights(matches) {
  const negative = matches.filter(hit => hit.kind === 'negative');
  return matches.flatMap(hit => {
    if (hit.kind === 'negative') return [hit];
    let pieces = [hit];
    for (const cut of negative) {
      pieces = pieces.flatMap(piece => {
        if (cut.end <= piece.start || cut.start >= piece.end) return [piece];
        const remaining = [];
        if (cut.start > piece.start) remaining.push({ ...piece, end: cut.start });
        if (cut.end < piece.end) remaining.push({ ...piece, start: cut.end });
        return remaining;
      });
    }
    return pieces;
  });
}
