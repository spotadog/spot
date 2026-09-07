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
// A negative suppresses only its own profile, within this same text node.
export function findMatches(text, profiles) {
  const matches = [];
  for (const profile of profiles) {
    if (!profile.enabled || profile.negativeKeywords.some(keyword => occurrences(text, keyword).length)) continue;
    for (const keyword of profile.positiveKeywords) {
      for (const hit of occurrences(text, keyword)) matches.push({ ...hit, profileId: profile.id });
    }
  }
  matches.sort((a, b) => a.start - b.start || b.end - a.end);
  return matches.filter((hit, index) => !index || hit.start !== matches[index - 1].start || hit.end !== matches[index - 1].end);
}
