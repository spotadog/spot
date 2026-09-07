# Product implementation log

## Dependency map and baseline — prompt 004

The existing MV3 manifest and worker provide the lifecycle foundation. Pure profile validation feeds the versioned storage adapter; serialized worker mutations expose saved global/profile state to both UI clients and a credential-free projection to content scripts. Scanning depends on that projection and pure matching; rendering depends on scanner-created DOM ranges. Popup and panel share messaging/global controls. Settings and the isolated OpenAI service support candidate generation; approval depends on profile validation and serialized persistence, never on scanning.

Implementation order:

1. Preserve the working manifest, model, storage, worker, settings, and API foundations (R1–R4, R7–R9).
2. Replace suppression with independent typed matches and resolve negative overlap in pure logic (R5–R7). Keep legacy version-1 rules readable but inert; no data migration is needed for this behavioral change.
3. Connect typed ranges to two highlight layers and enable negative-only scanning (R1, R5–R7).
4. Update UI guidance, page availability feedback, and explicit candidate dismissal/approval (R2–R3, R10–R11).
5. Expand regression coverage, reconcile current-behavior documentation, and publish using the current-branch SSH convention in prompt 002. No separate GitHub flow document exists in the repository.

The baseline already implements CRUD, persistence, credential isolation, API error handling, literal matching, dynamic scanning, and shared UI messaging. The baseline tests incorrectly assert the superseded suppression rule and need replacement. Native panel docking and live API calls remain manual checks.

## Stage 1 — Domain and storage boundaries

- R4–R7: `matching/matcher.js` emits deduplicated positive/negative intervals, independently of DOM, UI, and profile legacy rules. Pure overlap resolution subtracts red intervals from yellow intervals, preserving non-overlapping positive characters without relying on browser highlight priority support.
- `profiles/model.js` stops assigning obsolete `negativeScope` to new profiles while preserving existing rules and schema version 1. No saved profiles, states, timestamps, or credentials are migrated or discarded.
- R10–R11: added domain `mergeKeywords`, used by the worker's existing serialized approval mutation. Deduplication precedes the 200-term capacity check, so approving an existing term in a full list succeeds without adding anything.
- Verification: replacement suppression test and new unit tests cover independent negative terms, negative-only and disabled profiles, literal/Unicode semantics, legacy rules, partial overlap, same-term red precedence, destination capacity, and unknown storage-version rejection. Initial test run exposed the expected obsolete suppression assertion; it was replaced with the new requirement.

## Stage 2 — Scanning and rendering

- R1, R5–R7: `content/scanner.js` starts for either nonempty keyword list, converts resolved typed matches to DOM ranges, and passes them to the separate highlighter. `highlighting/highlighter.js` owns two named CSS highlight sets; stopping clears both. `content/highlights.css` retains yellow underline and adds an opaque red underline style.
- Existing visibility filters, 150 ms rescan scheduling, and global stop behavior remain. No runtime dependencies, permissions, storage access, or API calls were added to matching/rendering.
- Verification: real-extension browser tests cover independent same-node colors, DOM preservation, dynamic text, negative-only profiles, cross-profile overlap/recomputation, global pause during mutations, and profile disable/delete. Visually inspected `test-results/highlights.png` (ignored generated artifact).

## Stage 3 — UI and approval

- R2–R3: shared `ui/client.js` page-status control probes content-script availability, updates on active-tab/navigation events, and explains unavailable pages without changing enabled state. No browsing-history permission was added. Popup panel-open failures now give recovery guidance.
- R5–R6: panel help explains yellow positives, red negatives, and overlap precedence.
- R10–R11: panel candidates have individual Dismiss buttons and a Dismiss all action. Both remove transient review data only; selection remains separate from Add selected. Existing explicit target profile/list and service-worker validation are retained.
- Verification: browser tests cover dismissal, positive/negative approval, approval while paused, safe text rendering, deleted-target rejection, injected storage failure with retained candidates and unchanged saved state, popup/panel state synchronization, closing/reopening review without auto-approval, availability feedback on tab changes, and browser-restart persistence. Visually inspected the 380px panel review screenshot.

## Completion review and remaining work

- Final `npm run check` passed: 10 unit tests, esbuild compilation targeting Chrome 120, and the real unpacked-MV3 Playwright suite. No separate lint/type-check scripts are configured. `git diff --check` and exact prompt-preservation validation passed.
- README, features, and requirements now distinguish implemented behavior from manual verification. Historical prompts and the initial implementation review remain untouched.
- A screenshot setup initially requested suggestions after reloading without restoring seeds; the test correctly received validation instead of candidates. Restored seed input and reran the complete suite successfully.
- Native Chrome toolbar activation/panel docking and a live OpenAI request remain unverified manual acceptance steps. API tests use a mocked network boundary and no live credentials. The panel-open recovery text is implemented but native failure handling has not been manually exercised.
- Retained scope limits: text-node phrases, no shadow DOM/iframe/PDF/canvas/restricted-page coverage, full rescans on dynamic pages, pure-CSS visibility limitations, explicit save with same-profile last-save behavior, and locally unencrypted user credentials.
- Suggested next work: complete native Chrome/live API smoke checks, add CI for `npm run check`, then measure large-page scanning cost before extending scope. No speculative integrations or architecture replacement were introduced.

## GitHub flow

Prompt 002 is the repository's only publication workflow: current `main` branch, SSH, no new branch, and review notes describing request, changes, issues, and next steps. GitHub CLI authentication was checked and is invalid, so standalone GitHub comments cannot be posted with it. This log and the commit description preserve those review notes using the previously documented fallback. Publication uses the existing SSH identity documented in prompt 002.

## Structured response contract — prompt 005

- Saved the complete prompt before implementation and inspected the API service, domain model, consuming worker/UI, existing tests, and product/publication documentation. The keyword suggestion Responses API call is the only structured AI integration.
- Added `src/services/suggestion-contract.js` as the authoritative wire schema, used in request instructions, native strict `text.format`, and schema-driven response validation. Exact required field: `suggestions`, a non-null array of strings, no additional properties. No unrelated status/summary/items fields or nested objects were introduced.
- Preserved the existing prompt target of 20 candidates, 30-item parser ceiling, normalized 120-character keyword limit, deduplication, seed exclusion, and explicit review/approval. The schema describes the domain normalization rule; domain validation remains in the profile model. The small local validator implements only the object/array/string schema subset used here; future schema features require extending validation and tests.
- Hardened malformed envelope, invalid JSON, wrong field/item type, unknown property, missing/null field, and multiple-output handling. Refusals/incomplete responses remain controlled errors. No Markdown/prose JSON extraction, runtime dependencies, storage changes, or UI redesign.
- Verified request/schema parity, valid/empty/boundary arrays, extra/missing/null/wrong-type fields, malformed envelopes/JSON, and preserved review behavior. `npm run check` passed: 14 unit tests, esbuild build, and real MV3 browser suite. Diff whitespace and exact prompt preservation checks passed. No live API request was made; native Chrome docking remains a manual check.
- Confirmed native strict JSON-schema configuration against [official OpenAI Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs).
- Publication follows prompt 002 and the implementation log: current main branch, SSH identity, no new branch. GitHub CLI credentials remain invalid; review notes are preserved here and in the commit description using the documented fallback. Next suggested work: live API/native Chrome smoke checks and CI for `npm run check`.
