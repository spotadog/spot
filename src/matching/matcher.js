import { keywordText, keywordCriterion, keywordActive } from '../profiles/keyword.js';
import { validateCriterion } from './criteria.js';
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
const tokens = text => [...text.matchAll(/[\p{L}\p{N}_][\p{L}\p{M}\p{N}_]*/gu)];
const interval = match => ({ start: match.index, end: match.index + match[0].length });
const tokenWord = /[\p{L}\p{M}\p{N}_]/u;
function phraseOccurrences(text, value, type) {
  const result = [];
  const phrase = value.trim().split(/\s+/u).map(escape).join('\\s+');
  for (const match of text.matchAll(new RegExp(phrase + (type === 'endsWithPhrase' ? '(?=\\s*$)' : ''), 'giu'))) {
    const hit = interval(match);
    const before = [...text.slice(0, hit.start)].at(-1) ?? '';
    const after = [...text.slice(hit.end)][0] ?? '';
    if ((tokenWord.test([...match[0]][0]) && tokenWord.test(before)) || (tokenWord.test([...match[0]].at(-1)) && tokenWord.test(after))) continue;
    if (type === 'startsWithPhrase' && text.slice(0, hit.start).trim()) continue;
    if (type === 'endsWithPhrase' && text.slice(hit.end).trim()) continue;
    result.push(hit);
  }
  return result;
}
// Practical public DNS hostnames (including international names); reject partial labels.
const host = /^(?:[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?\.)+(?:[\p{L}]{2,63}|xn--[a-z0-9-]{2,59})$/iu;
function urls(text) {
  const result = [];
  const candidates = /(?:https?:\/\/[^\s<>"']+|(?:[\p{L}\p{N}-]+\.)+[\p{L}][\p{L}\p{N}-]*(?::\d+)?(?:[/?#][^\s<>"']*)?)/giu;
  for (const match of text.matchAll(candidates)) {
    const before = [...text.slice(0, match.index)].at(-1) ?? '';
    if (/[\p{L}\p{M}\p{N}_@.\/-]/u.test(before)) continue;
    let value = match[0].replace(/[.,;:!?]+$/u, '');
    // Keep balanced parentheses in paths, remove surrounding prose delimiters.
    for (const [open, close] of [['(', ')'], ['[', ']'], ['{', '}']]) {
      while (value.endsWith(close) && value.split(close).length > value.split(open).length) value = value.slice(0, -1);
    }
    try {
      const explicit = /^https?:\/\//i.test(value);
      const url = new URL(explicit ? value : `https://${value}`);
      if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) continue;
      if (!explicit && !host.test(url.hostname)) continue;
      if (!url.hostname || /[\p{L}\p{M}\p{N}_-]/u.test([...text.slice(match.index + match[0].length)][0] ?? '')) continue;
      result.push({ start: match.index, end: match.index + value.length });
    } catch { /* Invalid ports, hosts and malformed URLs are not matches. */ }
  }
  return result;
}
function emails(text) {
  const result = [];
  for (const match of text.matchAll(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-z0-9-]+\.)+[a-z]{2,63}/gi)) {
    const [local, domain] = match[0].split('@');
    const before = [...text.slice(0, match.index)].at(-1) ?? '', after = [...text.slice(match.index + match[0].length)][0] ?? '';
    if (/^\.[\p{L}\p{M}\p{N}_-]/u.test(text.slice(match.index + match[0].length))) continue;
    if (/[\p{L}\p{M}\p{N}_@.!#$%&'*+/=?^`{|}~-]/u.test(before) || /[\p{L}\p{M}\p{N}_@-]/u.test(after)) continue;
    if (local.length > 64 || match[0].length > 254 || local.startsWith('.') || local.endsWith('.') || local.includes('..') || !host.test(domain)) continue;
    result.push(interval(match));
  }
  return result;
}
export function criterionOccurrences(text, criterion) {
  let c;
  try { c = validateCriterion(criterion); } catch { return []; }
  const { type, value } = c;
  if (['exactPhrase', 'startsWithPhrase', 'endsWithPhrase'].includes(type)) return phraseOccurrences(text, value, type);
  if (type === 'url') return urls(text);
  if (type === 'email') return emails(text);
  if (type === 'regex') return [...text.matchAll(new RegExp(value, 'gu'))].filter(m => m[0].length).map(interval);
  if (type === 'number') {
    return [...text.matchAll(/(?<![\p{L}\p{M}\p{N}_])[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][-+]?\d+)?(?![\p{L}\p{M}\p{N}_])/gu)]
      .filter(m => !/[\d.]/u.test(text[m.index - 1] ?? '') && !/^\.\d/u.test(text.slice(m.index + m[0].length))).map(interval);
  }
  if (type === 'hashtag' || type === 'mention') {
    const prefix = type === 'hashtag' ? '#' : '@';
    return [...text.matchAll(new RegExp(`(?<![\\p{L}\\p{M}\\p{N}_@#])${prefix}[\\p{L}\\p{N}_][\\p{L}\\p{M}\\p{N}_]*`, 'gu'))].map(interval);
  }
  // Compile once per criterion/text unit, not once for every word.
  const source = typeof value === 'string' ? escape(value) : '';
  const wordPattern = typeof value === 'string' ? new RegExp(
    (['exactWord', 'startsWith'].includes(type) ? '^' : '') + source + (['exactWord', 'endsWith'].includes(type) ? '$' : ''), 'iu') : null;
  return tokens(text).filter(match => {
    const term = match[0];
    if (wordPattern) return wordPattern.test(term);
    const length = [...term].length;
    switch (type) {
      case 'shorterThan': return length < value;
      case 'longerThan': return length > value;
      case 'exactLength': return length === value;
      case 'betweenLengths': return length >= c.min && length <= c.max;
      default: return false;
    }
  }).map(interval);
}
// Return independent match kinds. Legacy negativeScope never enables suppression.
export function findMatches(text, profiles) {
  const matches = new Map();
  for (const profile of profiles) {
    if (!profile.enabled) continue;
    for (const criterion of profile.rules?.criteria ?? []) {
      for (const hit of criterionOccurrences(text, criterion)) matches.set(`${criterion.kind}:${hit.start}:${hit.end}`, { ...hit, kind: criterion.kind });
    }
    for (const [kind, keywords] of [['positive', profile.positiveKeywords], ['negative', profile.negativeKeywords]]) {
      for (const keyword of keywords) {
        if (!keywordActive(keyword)) continue;
        const hits = keywordOccurrences(text, keyword, kind);
        for (const hit of hits) matches.set(`${kind}:${hit.start}:${hit.end}`, { ...hit, kind });
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

// Shared by highlighting and counts; preserve all existing criterion semantics.
export function keywordOccurrences(text, keyword, kind = 'positive') {
  if (!keywordActive(keyword) || !keywordText(keyword)) return [];
  try {
    const criterion = keywordCriterion(keyword, kind);
    return criterion ? criterionOccurrences(text, criterion) : occurrences(text, keywordText(keyword));
  } catch { return []; }
}
