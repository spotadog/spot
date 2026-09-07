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


## Prompt 006 — Optional credentials and persistent display preference

- Saved the complete prompt before implementation and reviewed the workflow, earlier architecture/product prompts, and prompt 002 publication convention.
- Reused the profile editor HTML/controller for both popup and sidebar; the build emits the same HTML for both entry points. Profile CRUD, keyword editing/removal, settings access, global/profile switches, and AI review are available in either interface.
- Kept the already-optional API credential boundary. Added an actionable Configure API key button only after a missing-key suggestion attempt, and clarified optional credentials in settings.
- Added preferences.sidebar to the existing version-1 storage abstraction, defaulting legacy/new installations to false while preserving profiles, custom models, credentials, and other fields.
- The worker serializes display changes, applies global Chrome sidePanel options/toolbar behavior and action popup routing, restores the preference each worker start, and rolls back routing on failed storage writes. No tab-specific preference or new permissions were introduced. See https://developer.chrome.com/docs/extensions/reference/api/sidePanel for global panel and user-gesture behavior.
- Validation: npm run check passed 15 unit tests, build, and the real unpacked MV3 browser suite. Added no-key popup creation/editing, missing-key feedback, real sidePanel.open invocation, global/new-tab routing, toggle disable/data preservation, failed-write rollback, invalid preference rejection, legacy settings compatibility, and browser restart restoration. Existing matching, AI contract/review, storage security, and scanning checks pass. Visually inspected the shared profile interface screenshot; git diff --check passed.
- Limits: browser tests open extension pages and invoke real Chrome extension APIs; native toolbar clicks/docking and a live OpenAI request were not manually verified in this environment. Chrome controls panel visibility and requires a gesture after closure; Show sidebar provides a retry if initial opening is declined. Unsaved drafts retain the existing close-to-discard behavior.
- GitHub flow: use current main branch and the existing SSH identity, with no new branch. GitHub CLI authentication remains invalid; review notes are retained here, in the implementation log, and in the commit description per the documented fallback.
- Suggested next work: perform the README native toolbar/docking smoke checks across tabs and browser restarts, then add automated CI.


## Prompt 007 — Profile import/export and reload refresh

- Preserved the complete prompt in 007 and added the README import/export contract before implementing code. Reviewed storage, matching/scanner state, worker/UI lifecycle, testing and the prompt 002 GitHub flow.
- Added pure version-1 JSON transfer validation/export/ID merge in profiles/transfer.js. Both scopes preserve every supported persisted profile field, including legacy rules, and reject unknown fields rather than discard them. Imports replace matching IDs, permit distinct IDs with equal names, reject duplicate IDs within a package, retain unrelated profiles/settings/credentials and enforce the existing 50-profile/200-term limits. The 10 MiB byte limit accommodates a full Unicode collection; empty collection imports are no-ops.
- Added all-profile download and both upload actions to the shared popup/sidebar, plus per-card single download, explicit confirmation and useful validation/persistence/refresh feedback. Files use JSON and browser Blob downloads, with no archives, arbitrary paths, runtime dependencies or API calls.
- All writes remain behind createStore and its serialized update. Profile state is not cached in the worker; queued broadcasts reread persisted state to prevent older mutation snapshots from arriving last. The affected runtime structures are the scanner state, scheduled scan, observer/listeners and two CSS highlight range sets; matching holds no persistent compiled dictionary/cache.
- Every worker start broadcasts fresh persisted state. onInstalled handles unpacked extension reload/install/update with scripting reinjection into HTTP/HTTPS tabs. Content reinitialization disposes its predecessor and guards pending startup reads against both disposal and later broadcasts. Added scripting/HTTP/HTTPS host permissions for this recovery. No unrelated storage or AI cache is cleared.
- Rendering failures clear obsolete highlights and return an explicit refresh failure; successful persistence remains saved and the UI advises reloading the affected page. Failed validation/writes do not broadcast or clear valid state. Unsupported/inaccessible pages retain the documented manual reload/restricted-page limitations.
- Validation: final npm run check passed 24 unit tests, esbuild and the real unpacked-MV3 Playwright browser suite. Tests cover both round trips, metadata/words/legacy rules, duplicate/capacity/empty/invalid/version cases, maximum Unicode payloads, atomic persistence, startup races, listener disposal, real downloads/uploads, immediate new/removed terms, storage and renderer failure/recovery, repeated reinjection and two actual runtime.reload cycles. Browser test setup explicitly enables Developer mode: command-line loading alone caused Chromium to disable the extension on reload until this was corrected. Renderer failure injection runs in the extension isolated world. No separate lint/format/typecheck commands are configured. Exact prompt preservation and git diff --check passed; inspected the transfer UI screenshot.
- Confirmed reload event semantics and scripting permissions against official Chrome runtime and scripting references linked in README. No live OpenAI calls were needed. Native toolbar/docking behavior remains the earlier manual check, outside this feature's changes.
- GitHub flow: current main branch, no new branch, existing documented SSH identity. GitHub CLI authentication is still invalid; the documented fallback keeps requested review comments (request, changes, issues and next steps) here, in the implementation log and commit description.
- Suggested next work: add CI for npm run check and perform the existing native Chrome toolbar/docking checks.
