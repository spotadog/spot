# Keyword Match Types / Keyword Match Criteria

In either the popup or sidebar, create or edit a profile, choose **Add criterion**, select a **Match type** and positive (yellow) or negative (red) **Highlight**, fill its configuration, then **Save profile**. Add several criteria to match any of them. **Remove criterion** takes effect when saved. Criteria work even with empty keyword lists. The original one-term-per-line lists and approved AI suggestions still use their original case-insensitive literal word/phrase matching.

| Match type | Behavior | Example | Required configuration |
| --- | --- | --- | --- |
| Exact word | Complete word, never a substring of another word | `dog` matches `DOG`, not `doghouse` | One word |
| Contains | Word contains the literal text anywhere | `dog` matches `doghouse`, `bulldog` | Word or word fragment |
| Starts with | Word begins with the literal text | `dog` matches `doggy`, not `bulldog` | Word or word fragment |
| Ends with | Word ends with the literal text | `dog` matches `underdog`, not `doggy` | Word or word fragment |
| Exact phrase | Complete literal phrase anywhere in the text node, bounded at word edges | `hot dog` matches `HOT  dog`, not `hot doghouse` | Phrase |
| Starts with phrase | Phrase begins the text node, ignoring leading whitespace | `artificial intelligence` matches `artificial intelligence is…` | Phrase |
| Ends with phrase | Phrase ends the text node, ignoring trailing whitespace | `machine learning` matches `…uses machine learning` | Phrase |
| Shorter than | Word has fewer than X Unicode code points | X = 5 matches `dog`, not `fives` | Integer X |
| Longer than | Word has more than X Unicode code points | X = 10 matches `architecture` | Integer X |
| Exact length | Word has exactly X Unicode code points | X = 5 matches `fives` | Integer X |
| Between lengths | Word length is within an inclusive range | 5–10 includes both 5 and 10 | Minimum and maximum integers |
| Number | Standalone ASCII integer, signed decimal or scientific notation | `123`, `-42`, `.25`, `6e-2` | None |
| URL | HTTP(S) addresses or bare dotted domains with optional port/path/query/fragment | `https://example.com`, `example.com/dogs` | None |
| Email | Practical ASCII email addresses with dotted DNS domain | `name+tag@example.com` | None |
| Hashtag | `#` followed by letters, numbers or underscores | `#dog`, `#犬` | None |
| @ Mention | `@` followed by letters, numbers or underscores | `@spotadog`, `@犬` | None |
| Regex (Advanced) | JavaScript regular expression over the original text node | `\bdogs?\b` matches `dog` and `dogs` | Pattern source, without `/` delimiters |

For example, enter `\b(dog|cat)s?\b` in **Regular expression** to match `dog`, `dogs`, `cat` or `cats`.

## Text and highlighting semantics

- Each visible DOM text node is independent. Phrases and regex cannot cross inline elements or other text-node boundaries. Phrase anchors refer to the text node, not a sentence, paragraph or viewport.
- Word criteria recognize tokens beginning with a Unicode letter, number or underscore and continuing with those characters or combining marks. Punctuation, hyphens and apostrophes separate tokens. A word criterion accepts one such token/fragment. Contains, Starts with and Ends with highlight the **whole matching word**. Length criteria also highlight whole words.
- Word and phrase criteria use JavaScript Unicode case-insensitive matching. They do not remove accents or normalize Unicode composition: `café` and `cafe` plus a combining accent differ. Combining marks stay attached to their token and count separately for length; astral characters count once. Length counts code points, not UTF-16 units or displayed graphemes. No empty words are emitted, so exact length zero never matches.
- Phrase input is trimmed for matching, and any run of input whitespace matches one or more spaces, tabs or newlines in the page. Original offsets and highlight text are preserved. Non-whitespace punctuation is literal: **Ends with phrase** `hot dog` does not match `hot dog.`; configure `hot dog.` to include the period. Exact phrase can appear anywhere, and need not occupy the entire node.
- Structural recognition includes adjacent prose punctuation without highlighting it. Numbers do not match within identifiers such as `x42` or `42dogs`; they use ASCII digits, a dot decimal separator and optional exponent, with no locale/grouping interpretation. `1,000` is two numeric tokens. Dot-separated versions such as `1.2.3` are not numeric values.
- Bare URLs require a dotted domain with a letter-based or punycode top-level label. Explicit HTTP(S) addresses also support localhost, IP literals and international hosts through the platform URL parser. Other schemes and embedded credentials are excluded. Trailing prose punctuation and unmatched closing brackets are stripped; balanced parentheses in paths remain. No network lookup or domain-existence check occurs.
- Email recognition accepts an unquoted ASCII local part (up to 64 characters), no leading/trailing/consecutive dots, a valid dotted domain, and a maximum total of 254 characters. Quoted local parts, address literals and international local parts are outside this practical recognizer. It does not verify mailbox existence.
- Hashtags and mentions include their prefix, accept Unicode and underscores, and stop at punctuation. They cannot begin within a word or immediately after `@` or `#`; an email's `@example` is not a mention. Recognition types run independently; matching a URL does not exclude its text from other criteria.
- All criteria share existing profile/global switches, repeated-match handling, interval deduplication, and red-over-yellow overlap precedence. Empty text produces no highlights.

## Validation and regex behavior

Profiles allow at most 200 additional criteria, alongside the existing 200 entries per literal list. Word/phrase/pattern input must be nonblank and at most 120 UTF-16 code units, matching the existing keyword limit. Length values must be integers from 0 through 10000. Minimum must not exceed maximum; equal boundaries are valid. Structural criteria have no keyword/numeric fields. Unknown types, missing/extra fields and invalid highlight kinds are rejected.

The shared validator runs in the editor, service-worker profile save and JSON import/export. Errors use the existing status message; failed saves/imports do not alter persisted or active profiles. Evaluation ignores an invalid criterion defensively instead of throwing.

Regex uses JavaScript `gu` flags: global and Unicode, **case-sensitive**, with no implicit literal escaping, whitespace normalization, case folding, multiline or dot-all behavior. Pattern source is preserved exactly; delimiters are not stripped. Use character classes such as `[dD]` for explicit case choices and `[\s\S]` to include newlines. Invalid syntax is rejected before save/import and handled defensively during evaluation. Zero-width matches are ignored because they cannot highlight characters. Matching follows normal non-overlapping JavaScript regex iteration.

Regex runs in the existing synchronous page matcher. The 120-character source limit is not a runtime timeout or a guarantee against pathological backtracking. Use trusted patterns, avoid nested ambiguous repetition, and test advanced patterns on representative text; very large pages or expensive expressions can slow scanning. No remote evaluation, dynamic code execution, dependency, permission or AI call is added.

## Developer representation and compatibility

`src/matching/criteria.js` is the shared type catalog and strict criterion validator. `src/matching/matcher.js` evaluates criteria through `findMatches`, alongside unchanged legacy literal matching, returning UTF-16 `{start, end, kind}` ranges for the existing scanner/highlighter. Storage continues exclusively through the adapter and serialized worker mutations; `scanningState` already includes `rules`.

Persist criteria in optional `profile.rules.criteria`:

```json
{
  "wholeWords": true,
  "criteria": [
    { "type": "contains", "kind": "positive", "value": "dog" },
    { "type": "betweenLengths", "kind": "negative", "min": 5, "max": 10 },
    { "type": "email", "kind": "positive" },
    { "type": "regex", "kind": "positive", "value": "\\b(dog|cat)s?\\b" }
  ]
}
```

Type IDs in table order: `exactWord`, `contains`, `startsWith`, `endsWith`, `exactPhrase`, `startsWithPhrase`, `endsWithPhrase`, `shorterThan`, `longerThan`, `exactLength`, `betweenLengths`, `number`, `url`, `email`, `hashtag`, `mention`, `regex`. Word/phrase/regex types require string `value`; single-length types require numeric `value`; range requires numeric `min` and `max`; structural types accept neither. Every criterion requires `kind: "positive" | "negative"`.

The trusted `profile.save` message accepts `profile.criteria` as the editable array; `makeProfile` validates it and stores it in `rules.criteria`. Omission preserves existing criteria; `[]` explicitly removes them. Toggle and AI keyword approval preserve criteria. Other existing rule metadata remains untouched. State responses expose the persisted `rules.criteria` form.

Storage schema and JSON transfer version remain 1 because this is an optional rules extension. Absent criteria mean an empty set, with no migration or reinterpretation of existing literal lists, `wholeWords` or inert `negativeScope`. Both transfer scopes round-trip the new data exactly and reject invalid criteria atomically. Older application versions reject backups containing the new field rather than silently losing it; use the updated extension to import them.

`npm run check` covers each type in pure tests and through real extension editor/scanner integration, invalid configuration, Unicode offsets/lengths, legacy compatibility, persistence, transfer, removal and both highlight kinds.
