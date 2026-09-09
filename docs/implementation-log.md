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


## Prompt 008 — Keyword match criteria

- Saved the complete request before implementation and reviewed architecture, matching/model/transfer/UI/scanner paths, previous prompts 002/004/007, and the repository publication workflow.
- Added the shared 17-type catalog and strict criterion validation in matching/criteria.js. The existing matcher dispatches word, phrase, length, structure and regex criteria into its existing typed interval/deduplication/red-precedence pipeline; no parallel scanner, storage adapter, AI path, dependencies or permissions were introduced.
- Added optional rules.criteria in schema/transfer version 1. Missing criteria retain original literal list behavior, including historical punctuation and wholeWords behavior. Profile save accepts an editable criteria array; omitted arrays preserve saved criteria, and empty arrays remove them. Toggle/AI approval and scanning projection preserve criteria. Both transfer scopes validate and preserve them exactly.
- Added shared popup/sidebar controls for all 17 types, positive/negative selection, type-specific numeric/text fields, add/remove, persisted editing and useful validation errors. Criteria-only profiles activate scanning and receive normal dynamic refresh/global controls.
- Defined Unicode token and code-point length behavior, literal phrase whitespace/edge semantics, practical structure recognizers, and exact native JavaScript gu regex semantics in docs/keyword-match-criteria.md. Updated README, features and requirements. No Unicode composition normalization or regex source rewriting occurs. Regex is case-sensitive; other textual criteria ignore case.
- Validation: final npm run check passed 49 unit tests, esbuild, and the real unpacked MV3 browser suite. New tests cover all 17 types both in pure evaluation and through UI-to-worker-to-page highlighting, boundary distinctions, overlapping phrase suffixes, Unicode/astral offsets, empty/invalid configurations, numeric limits, structural boundaries, valid/invalid/zero-width regex, backward compatibility, transfer/store recreation, criteria-only and negative highlights, failed save retention and removal. Existing AI, lifecycle, browser restart and reload checks continue to pass. No separate lint, formatting or typecheck scripts exist. Exact prompt preservation and git diff --check passed; visually inspected the criterion editor screenshot.
- Browser verification initially exposed ambiguous nested select labels; changed controls to explicit unique label associations and reran successfully. Final review also corrected overlapping end-phrase recognition and Unicode email boundaries, with regression tests.
- Limits: existing text-node scanning scope remains. Structural recognizers use documented practical syntax, without network verification. Native regex syntax is validated and invalid patterns fail closed, but synchronous native matching has no execution timeout: expensive valid patterns can slow a page despite the 120-character pattern limit. This limitation is explicit in UI help and documentation.
- GitHub flow: current main branch, no new branches, existing SSH identity from prompt 002. GitHub CLI authentication remains invalid; requested review notes (request, changes, issues and next steps) are retained in this prompt, implementation log and commit description using the documented fallback.
- Suggested next work: add execution isolation/time limits for advanced regex and measure large-page matching performance; add CI for npm run check. Existing native Chrome toolbar/docking and live AI smoke checks remain manual.

## Prompt 009 — Individual keyword editor

- Saved the complete prompt before implementation; reviewed the prompt workflow, README, features/requirements, previous prompts 002/007/008, model, storage, worker, shared editor and tests.
- Replaced positive/negative profile textareas with a shared individual-row keyword editor in popup and sidebar. Each row owns its value, selection checkbox, edit/save/cancel controls and confirmed removal. New rows use Add Keyword. Selection is temporary and does not change matching. Scrollable groups keep large collections usable; focused edits scroll their controls into view.
- Existing persistence already uses separate string array items. Kept schema/backup version 1, profile APIs, storage abstraction, matching and dedicated AI service unchanged. No migration or keyword IDs are necessary for individual array items. Legacy combined API input remains supported by existing model normalization; the profile UI now submits arrays only. AI discovery seeds remain a separate, unchanged request input.
- Added domain validation for a single keyword: trims/collapses whitespace, rejects blank, case-insensitive duplicate within a group, over-120-character and over-200-item submissions. Editing excludes only its own record from duplicate/capacity checks. Same term in different colors remains supported; commas stay literal. Failed row validation preserves every other item.
- Save keyword updates a profile draft; Save profile persists the draft. Pending row edits block profile saving instead of silently discarding text. Cancel row restores the prior term or removes a new draft; profile cancel/close follows existing discard behavior. Failed persistence retains the draft and leaves stored profiles intact.
- Final npm run check passed all 51 unit tests, esbuild and the real unpacked MV3 browser suite. Coverage includes multiple individual additions, independent selection, isolated edit/delete, whitespace/empty/duplicate/length/capacity errors, pending edit protection, deletion confirmation cancellation, keyboard save, empty/single/multiple/200-item groups, pre-existing array compatibility, reopen persistence, both popup/sidebar, narrow layout and storage failure/retry. Existing matching, criteria, AI approval, transfer, browser restart and extension reload checks continue to pass. git diff --check and exact prompt preservation passed. No separate lint/typecheck scripts exist.
- Visually inspected generated popup and 320px sidebar screenshots, including full-capacity editing. The in-app Browser skill was read and startup attempted, but its runtime failed with “Cannot redefine property: process”; a hands-on browser walkthrough remains unverified. Automated tests exercised the complete requested UI workflow. During test expansion, corrected the storage-failure assertion to match the existing profile-save error (the original expectation belonged to imports).
- GitHub flow follows prompt 002 / implementation-log: current main branch, no new branch, existing SSH identity. Fetched origin and confirmed no divergence. GitHub CLI credentials are invalid; review notes (request, changes, issues and next steps) are preserved here and in the commit description using the documented fallback instead of standalone comments.
- Suggested next steps: perform the hands-on Chrome walkthrough when browser access is available and add CI for npm run check. Existing cross-panel last-save-wins behavior remains as documented in README.

## Prompt 010 — Multi-provider model selection

- Preserved the complete prompt before implementation. Reviewed architecture, product requirements, previous AI/structured-contract and credential prompts, tests, and prompt 002 publication workflow. Audited all existing AI usage: only non-streaming structured text keyword suggestions exist; no chat, streaming, tools, attachments, agent workflows, usage display or cancellation UI required porting.
- Added centralized curated models (three per provider), provider dispatch and a dedicated Anthropic Messages adapter. Verified identifiers and native JSON support against current official sources linked in README. Anthropic maxItems is removed only from its native schema; the complete shared prompt contract and local validation retain the limit.
- Settings provide provider/model dropdowns, saved selection labels, masked key entry, separate credentials, custom IDs and remembered per-provider models. Legacy OpenAI model/key settings remain intact. Unknown custom IDs remain explicit and provider errors guide recovery without silently substituting a model. Matching, profiles and transfer formats remain unchanged.
- Credentials and settings save together in one serialized Chrome storage write. Removing a credential overwrites its value with an empty string in that same write; unrelated credentials remain unchanged. UI state exposes only credential presence, and scanner projections exclude settings/credentials.
- Validation passed: npm run check (55 unit tests, build and real MV3 browser suite), node --check on 28 JavaScript files, git diff --check and exact prompt preservation. Browser tests exercise both provider catalogs, saved/reloaded model choices, custom models, Anthropic key setup/removal, switching, missing-key errors and mocked Claude approval into positive and negative lists. Visually inspected Claude and custom-model settings screenshots. An initial new browser test attempted to reset a hidden review control; moved that action into the visible review phase and reran the full suite successfully.
- No formatter, linter or separate type checker is configured. No live API calls were made. Account-specific model access, billing and live provider behavior remain manual smoke checks; native Chrome docking remains the existing manual check. The app retains its 25-second request deadline and 1000-output-token budget; incomplete responses are reported for retry/model change.
- GitHub flow: current main branch, no new branch, existing SSH identity per prompt 002. GitHub CLI authentication is invalid; preserve request, changes, validation, issues and next steps in this file, the implementation log and commit description as the documented fallback for standalone comments.
- Suggested next work: live smoke tests using user-owned keys for both providers and CI for npm run check.

## Prompt 011 — Browser toolbar icon

- Saved the complete prompt before implementation and reviewed the prompt workflow, README, requirements/features, build, UI palette, manifest, browser tests and previous publication instructions. This remains a Chrome 120+ Manifest V3 extension bundled by esbuild.
- Created an editable, simple cream paw on the existing #246447 green, with transparent rounded corners and no text. Added nine PNG sizes (16/20/24/32/40/48/64/128/256) under src/icons. No earlier branding assets existed or were removed.
- Configured extension-level icons and action.default_icon; the build copies committed PNGs to dist/icons. npm run icons regenerates PNGs from SVG using the existing development Playwright dependency; normal builds do not require Chromium. No runtime dependencies, permissions or architecture changes.
- Validation passed: npm run check (55 unit tests, build, real MV3 browser regression suite), syntax checks for both build/generation scripts and git diff --check. Separate browser checks verified source/build manifest equality, byte-identical packaged PNGs, expected dimensions, successful decoding of every declared asset, enabled installation and pinned toolbar state. Chrome reported no manifest/runtime errors or installation warnings. Inspected light/dark size previews at device scale factors 1 and 2 and the extension diagnostics screenshot.
- Limitation: native toolbar visual acceptance remains pending. Headed Chromium loaded and pinned the extension, but desktop screenshot capture failed with “could not create image from display”; page screenshots do not include browser chrome. README documents the final manual pin/appearance/click check. No separate formatter, linter or type checker is configured.
- GitHub flow follows prompt 002 and implementation-log: current main branch, no new branch, existing SSH identity. Fetched origin and confirmed no divergence before publication. GitHub CLI authentication remains invalid, so request/change/validation/issue/next-step notes are retained here and in the commit description as the documented fallback for standalone comments.
- Suggested next step: visually confirm the pinned paw in native Chrome at normal and high-DPI display scales and click it to open the editor.

## Profile selection and keyword search — prompt 012

- Preserved the complete prompt before implementation; reviewed prompt-processing-flow, README, features, prior profile/keyword prompts, shared UI, storage/worker contracts and prompt 002 publication instructions.
- Replaced profile cards with a native dropdown and selected-profile details in the shared popup/sidebar. Saved profiles open read-only; Edit enables profile fields, criteria and existing individual keyword controls. Save returns to viewing. New profiles begin editable and remain selected after saving.
- Extended the existing keyword editor with read-only mode and local, case-insensitive partial filtering across each profile’s positive/negative keywords. Selection stays available during viewing and survives enabling Edit; switching profiles clears search and row selection. Pending keyword edits remain visible during filtering, and empty groups/no results have distinct messages.
- Preserved keyword validation, individual Save keyword / Save profile semantics, confirmed removal, storage abstraction, matching and dedicated AI services. The internal profile.save response now returns the saved ID so the UI selects the exact newly created profile without guessing or a separate lookup; persisted profile and version-1 transfer formats are unchanged.
- Added draft-discard confirmation for profile switching, starting a new profile and canceling. Background refreshes retain open drafts and ignore older overlapping refresh results. Save blocks switching while in progress, retains failed drafts and reports progress/errors. Closing the extension page still discards unsaved changes and simultaneous cross-panel edits retain the documented last-save-wins behavior.
- Moved transfers below profile management and AI review into Profile backups. Labels are Export Profiles, Import Profiles and Import Profile; Export Profile preserves individual exports. Existing import confirmation, replacement behavior, validation and scanner refresh remain in place. Updated README/features and responsive popup width; inspected screenshots for both views at 320px.
- Final npm run check passed all 55 unit tests, build and the complete real-MV3 browser suite. Expanded browser coverage includes dropdown contents, selected details, search/clear/no results, selection across Edit, read-only controls, new profile selection, rename/keyword persistence, empty profiles, dirty-switch/cancel acceptance and rejection, unrelated broadcasts, narrow layout and transfer labels/placement. Existing transfer round trips, failures, matching, criteria, AI, restart/reload and keyword capacity checks remain exercised. Node syntax checks, git diff --check and exact prompt preservation passed. No separate linter, formatter or type-check scripts exist.
- During repeated full checks, the existing post-reload criterion scanner assertion intermittently timed out (contains expected doghouse/bulldog but observed no positive ranges). A targeted real-extension reproduction verified saved criteria and expected highlights, and the complete browser suite subsequently passed. The saved criterion was correct in a failing run. The independent criterion matrix now starts with a fresh page after the deliberate repeated-reload checks, and the final full check passed. Retained all reload and criterion assertions plus failure diagnostics; no unrelated scanner changes were introduced. The underlying post-reload interference remains a follow-up investigation. Native Chrome toolbar/docking still needs the existing desktop manual check.
- GitHub flow: current main branch, no new branch, existing SSH identity from prompt 002. Fetched origin and confirmed no divergence. GitHub CLI credentials remain invalid; request/change/validation/issue/next-step review notes are preserved here and in the commit description using the documented fallback for standalone comments.
- Suggested next steps: investigate the intermittent post-reload criterion assertion with the new diagnostics, run the native Chrome walkthrough, and add CI for npm run check.

## Optional live keyword counts — prompt 015

- Added a persisted default-off toggle and separate repeated/normalized text-context counts in saved keyword rows in both interfaces. Reused matching semantics and the existing scanner with per-node caches, batched changes, active-tab snapshots and navigation/disable cleanup.
- Documented counting semantics, scope, live behavior and limitations in features.md; complete implementation/review notes are in prompt 015.
- Final npm run check passed 71 unit tests, build and automated MV3 checks including live counts, dynamic changes, client-side navigation and tab switching. No manual browser testing or live AI calls.
- Publication follows prompt 002: current main, existing SSH identity, no new branch. GitHub CLI credentials are invalid; review notes are retained in the prompt and commit description. Next: user-run live Chrome verification; incremental visibility reconciliation remains a possible performance follow-up.

## Positive and negative word tabs — prompt 016

- Request: accessible in-place Positive Words / Negative Words tabs and removal of internal word-list scrolling. Complete prompt saved before implementation.
- Changes: shared popup/sidebar tab controls retain both editors and drafts; keyboard navigation and active state use existing styles. Selected lists expand naturally. Pending edit validation reveals the appropriate tab before focusing its input. Storage, matching, AI and profile data formats remain unchanged.
- Validation: npm run check passed all 71 unit tests, build and the full automated MV3 suite, including new two-surface tab, focus, data preservation and 200-row layout checks at 320/680px. git diff --check passed. Fixed a new test fixture to read full saved data after receiving the profile ID. No manual/live browser testing was performed.
- Publication: current main branch, existing SSH identity, no new branch; origin fetched with no divergence. CLI authentication remains invalid, so this log, prompt notes and commit description provide the documented review-note fallback.
- Issues/next steps: no known implementation blockers; user to verify live Chrome behavior and page scrolling.


## Cumulative keyword appearances — prompt 017

- Request/root cause: prevent historical counts falling after refreshes or partial updates. The previous scanner rebuilt counts only from current visible DOM and discarded all history on updates/reload.
- Changes: per-URL, per-keyword context multiplicity history with idempotent maximum merges, worker-side fingerprints, serialized local persistence and stale-response guards. Existing matching/profile schemas remain compatible; technical semantics and limitations are in features.md and the complete prompt 017.
- Validation: npm run check passed 76 unit tests, build and automated MV3 browser checks, including smaller batches, new/duplicate contexts, out-of-order replies/writes, failed writes and reload persistence. No manual browser testing.
- Issues/next steps: previously discarded counts are unrecoverable; indistinguishable identical contexts in separate batches retain maximum multiplicity. User to verify representative live sites. Histories remain per exact URL and are subject to local-storage quota.
- Publication: current main, no new branch, existing SSH identity; origin fetched without divergence. Invalid GitHub CLI authentication requires the documented repository/commit review-note fallback.

## New-profile keyword visibility — prompt 018

- Request: keep every added keyword visible before saving a new profile. Automated reproduction showed that active search hid nonmatching saved draft rows even though all keywords persisted.
- Changes: new profiles reset search and omit its control until saved; each selected word tab displays its full draft list. Existing-profile search/editing and keyword persistence, validation and removal remain intact. Full request and implementation review are preserved in prompt 018.
- Validation: npm run check passed 76 unit tests, build and the automated MV3 suite, including new popup/sidebar coverage for sequential/rapid additions, invalid/duplicate input, removal/re-addition, background updates, field edits, save failure/retry and complete persistence. Corrected a new test's expected length-error wording. No manual browser testing.
- Publication: current main, no new branch, existing SSH identity; origin fetched without divergence. Invalid GitHub CLI authentication requires the documented repository/commit review-note fallback.
- Next step: user to reload the extension and verify live creation. A separate reproduction will be needed if keywords disappear without search filtering; long lists continue to use normal page scrolling and only the selected word tab is shown.

## Stable popup layout — prompt 019

- Request: investigate popup width oscillation, preserve scrolling/responsiveness, add automated coverage, and publish through the existing flow.
- Removed the popup body height cap/overflow override, replaced viewport-unit sizing with the existing preferred width bounded by available document width, and reserved the popup root scrollbar gutter. Body geometry now contains long content and scrolling belongs to the document; other surfaces retain their rules.
- Pre-change automated measurements confirmed a 600px body with 2158px overflowing content. Scrolling moves that overflow bottom into the viewport, explaining how native sizing could settle. Native toolbar oscillation was not reproduced in the tab-based harness; the remaining acceptance step is the user's Chrome check.
- npm run check passed all 76 unit tests, build, and automated MV3 browser checks, including new short/long content and scroll-position layout regressions at 320/420/680px. The old CSS fails the regression. No manual/live testing performed.
- Publication: main, existing SSH identity, no new branch. Invalid GitHub CLI authentication requires the documented repository/commit review-note fallback. See prompt 019 for investigation evidence, limitations, and next steps.


## Local-only browsing privacy — prompt 021

- Request: verify the implementation before documenting that browsing information/content stays local and is never sent to the developer or other external parties.
- Audited scanning/matching/count data, local Chrome messages and storage, provider request inputs, logging/errors, permissions/CSP, dependencies/build and profile backups. No runtime change was necessary. The [privacy architecture audit](privacy-architecture.md) records the boundaries and source evidence.
- Updated README, features, requirements and match-criteria guidance. Distinguished optional user-entered AI seeds from browsing data; manually copied text submitted as seeds is sent externally. Historical prompts/reviews remain unchanged.
- Validation: 76 unit tests passed, 43 local Markdown file targets resolved, complete prompt preservation and git diff --check passed. No dedicated documentation validation script exists. No browser testing or live AI requests.
- Publication: current main, existing SSH identity, no new branch; origin fetched. Invalid GitHub CLI authentication requires the documented repository/commit review-note fallback.
- Issues/next steps: no runtime privacy conflict found; maintain the audited boundary when extending services, dependencies, permissions or persistence. User handles live browser verification separately.

## Rebuilding guidance and publication — prompts 022–023

- Request: publish the application rebuilding guidance using the documented GitHub flow; complete requests are preserved in prompts 022 and 023.
- Changes: README explains sequential prompt replay, independent reimplementation, behavior preservation, precedence and reproducibility. Links use the actual docs/prompts/ directory; prompt 022 preserves the original wording.
- Validation: existing README content is preserved, local README links resolve, prompt numbering is continuous through 023, and git diff --check passed. Documentation-only changes; extension tests were not rerun.
- Publication: existing main branch, no new branch; fetched origin and confirmed no divergence. Use the existing SSH identity documented in prompt 002. GitHub CLI authentication remains invalid, so repository notes and the commit description provide the documented fallback for standalone comments.
- Issues/next steps: no documentation blocker found. Review the rendered README on GitHub; independent reconstruction from the prompt history has not been tested.


## Per-tab Auto Scroll and pagination — prompt 024

- Request: optional tab-isolated scrolling, speed, pause/resume, automatic pagination and safe detail/Back/startup behavior. Full prompt was saved before implementation.
- Changes: shared popup/sidebar controls, pure navigation state, document-scoped worker messaging, trusted session storage, and one disposable page controller. Conservative pagination includes below-fold/long-footer controls, loading grace, duplicate prevention and pending-action cancellation. Profiles, matching and AI behavior are unchanged.
- Validation: npm run check passed 91 unit tests, build and automated MV3 browser checks, including actual automatic navigation, speed, paused detail/Back, tab switching, closed-tab cleanup and fresh browser cleanup. Exact prompt preservation and git diff --check passed. No manual/live-site testing. See prompt 024 for the intermediate test-click timing investigation.
- Limits/next steps: document scrolling and recognized same-origin pagination; unusual controls/nested containers, unexpected redirects and slow loaders may require manual navigation or Resume. User to reload dist/ and verify representative live sites.
- Publication: existing main, existing SSH identity, no new branch; origin fetched without divergence. Invalid GitHub CLI authentication requires the documented repository/commit review-note fallback.

## Per-keyword highlight colors — prompt 025

- Request: six preset colors and a custom picker for adding/editing keywords, persisted with backward compatibility. Complete prompt saved before implementation.
- Changes: shared accessible color controls, optional validated keyword color, safe legacy defaults, and per-color highlight groups with contrast-aware text and cleanup. Existing storage abstraction, backup version, activity, criteria, counts and explicit draft saving remain.
- Validation: npm run check passed 98 unit tests, build and the full automated MV3 suite, including popup/sidebar color changes, rendered ranges and browser-restart persistence. No manual/live-site browser testing. See prompt 025 for coverage and resolved test-fixture issues.
- Publication: current main, existing SSH identity, no new branch; fetched origin without divergence. Invalid GitHub CLI authentication requires the documented repository/commit review-note fallback.
- Next step: user to reload dist/ and check colors in Chrome. Older versions cannot import backups with color fields; Save profile applies color drafts.

## Autoplay pause after positive keyword — prompt 029

- Request: optional autoplay pause after finishing content containing an encountered highlighted positive keyword; disabled behavior unchanged. Complete prompt saved before implementation.
- Changes: per-tab checkbox, validated session setting, local rendered-positive range handoff, content-boundary detection and clamped pause through the existing controller. Resume skips consumed content; negative highlights do not trigger pauses. Matching, storage boundaries and AI services retain their architecture.
- Coverage: unit tests for settings/isolation, positive range polarity, visible encounters, boundary stopping, resume/cancellation, detached/growing content and pagination precedence; automated MV3 UI fixture for a nested semantic post with custom highlights.
- Limits/next step: document scrolling and ordinary semantic posts/sections/divs; reload dist/ and verify representative live-site layouts. No manual/live-site testing.
- Publication: existing main branch, no new branch, existing SSH identity; origin fetched without divergence. Invalid GitHub CLI authentication requires the documented repository/commit review-note fallback.
- Final validation: npm run check passed 124 unit tests, build and the full automated MV3 browser suite; git diff --check passed. No known automated failures remain.

## Fix missed auto-scroll keyword pauses — prompt 030

- Request: repair keyword-triggered pauses according to the existing optional positive-highlight behavior; complete prompt preserved before implementation.
- Reproduced failures: the old content resolver selected a whole section wrapping div posts, so a growing feed could postpone the pause indefinitely; standalone paragraphs had no target. Regression tests failed before the fix.
- Changes: recognize individual div feed items through nested wrappers while preserving whole semantic posts/single-content sections; add standalone text-block fallbacks. Existing toggle, matching polarity, tab state, clamping and Resume behavior remain.
- Validation: npm run check passed 128 unit tests, build and the full automated MV3 browser suite, including article, div-feed and paragraph pause/resume fixtures; git diff --check passed.
- Issues/next step: no affected-site URL was supplied for site-specific verification. Document scrolling limitations remain. Reload dist/ and retry the affected site with the option enabled. No manual/live-site testing.
- Publication: current main, SSH identity from prompt 002, no new branch; fetched origin without divergence. Invalid GitHub CLI authentication uses the documented repository/commit review-note fallback.

## Eyeball-level pause and alternative slowdown — prompt 031

- Request: positive-matching posts pause at an adjustable reading level, default halfway down the viewport; independent slowdown mode provides an alternative. Full prompt saved before implementation.
- Changes: replace next-boundary stopping with clamped post-top alignment; add a persisted 10–90% eyeball-level setting (50% default) through the existing settings/storage/message layers. Add an independent per-tab slowdown toggle using quarter speed while a matching post crosses that level and normal selected speed elsewhere. Slowdown overrides automatic keyword pausing if both toggles are on, preserving both selections. Manual pause/navigation safeguards remain.
- Validation: npm run check passed 135 unit tests, build and the complete automated MV3 suite; focused navigation tests passed with worker isolation assertions; git diff --check passed. Browser fixtures verify persisted configuration, 25/50/75% pause positions, Resume and measured slow/normal movement. No manual/live-site tests or AI calls.
- Issues/next step: the checkout had no eyeball control, so it was added to Settings. Prior boundary behavior is superseded. Reload dist/, choose the desired reading level, and verify representative pages; existing nested-scroll/unusual-layout limitations remain.
- Publication: current main, no new branch, existing SSH identity from prompt 002; fetched origin without divergence. Invalid GitHub CLI authentication requires the documented repository/commit review-note fallback.

## Auto Scroll Resume hotkey — prompt 032

- Request: a keyboard shortcut performing the existing Resume action; complete prompt saved before implementation.
- Changes: native resume-auto-scroll command defaults to Alt+Shift+R (Option+Shift+R on Mac); the worker targets the command's tab or active tab in the last focused window. Both button and shortcut use a serialized resume-only action that preserves speed/modes/position and ignores running/off states. Shared controls show the assigned shortcut and Chrome remapping guidance. No new permissions or page keyboard listeners.
- Coverage: unit tests exercise command/button parity, active-tab isolation, focus changes, repeated presses, disabled state and missing/unsupported/failure paths. The browser fixture checks native registration and real Resume movement from a restored position.
- Investigation/limit: Playwright headless key injection did not trigger the registered native command, timing out the initial browser attempt. Native OS key dispatch remains a manual check documented in README; command handling is verified with unit events and the shared live-extension action.
- Publication: current main, no new branch, existing SSH identity from prompt 002; origin fetched without divergence. Invalid GitHub CLI authentication requires the documented repository/commit review-note fallback.
- Next step: reload dist/, verify the native Resume key in Chrome, and remap it at chrome://extensions/shortcuts if desired or unassigned.
- Final validation: npm run check passed 140 unit tests, build and the full automated MV3 browser suite; git diff --check passed. Native OS key dispatch was not manually tested.

## Auto-pause color filter — prompt 033

- Request: trigger automatic keyword pauses only for configured keyword colors; complete prompt saved before implementation.
- Changes: Settings provides checked preset colors plus custom additions, persisted globally through the existing navigation-settings adapter. The six presets default on; empty selections prevent keyword-triggered pauses. The highlighter maps positive ranges to resolved colors and filters them before the existing eyeball detector. Negative matches, unselected colors and removed colors cannot trigger keyword pauses; slowdown and Resume retain their behavior.
- Validation: npm run check passed 144 unit tests, build and the full automated MV3 browser suite. Coverage includes defaults/custom normalization, negative exclusion, recoloring, cleanup, persistence, live palette changes, skipped blue posts and selected custom posts at configured reading levels, plus slowdown with no pause colors selected. git diff --check passed.
- Issues/next step: reload dist/, select colors in Settings and Save scrolling settings; custom colors must be added explicitly. Existing unusual/nested-scroll limitations remain. No manual/live-site tests or external AI calls.
- Publication: existing main, no new branch, existing SSH identity from prompt 002; fetched origin without divergence. Invalid GitHub CLI authentication uses the documented repository/commit review-note fallback.

## Persist auto-pause color selections — prompt 034

- Request: correct selection persistence and newly opened view checkbox states; complete prompt saved before implementation.
- Reproduction: changing a checkbox left an unsaved draft; the unrelated AI Save settings refresh restored the stored default palette. Explicit palette saves were already persisted correctly.
- Changes: immediate color-only auto-save through the existing worker/storage queue, ordered acknowledgments and rollback/error feedback; initialize checkbox states only after loading storage. Eyeball saves preserve the latest palette and AI refreshes do not replace local selection state. Defaults, matching and pause semantics remain intact.
- Coverage: DOM/unit regression for no-second-save persistence, AI-save isolation, empty/custom reopen, rapid changes, failed saves and stale-view saves; real MV3 fixture opens an independent Settings view and compares the exact selected palette.
- Publication: existing main, SSH identity from prompt 002, no new branch; origin fetched without divergence. Invalid GitHub CLI authentication uses the documented repository/commit review-note fallback.
- Next step: reload dist/ and verify automatic color-save feedback and reopened selections. No manual/live-site tests or external AI calls.
- Final validation: npm run check passed 145 unit tests, build and the complete automated MV3 browser suite; git diff --check passed. No known automated failures remain.

## URL visit tracking — prompt 035

- Request: optional URL visit counts with per-session/all-time modes and clearable history; complete prompt saved before implementation.
- Changes: shared popup/sidebar toggle, persisted mode, current URL count, searchable history and confirmed clear of both modes. Browser navigation events feed a separate serialized storage adapter; local/session histories remain independent of keyword counting, highlights, profile backups and AI requests. Added webNavigation permission and documented local readable-URL storage and visit semantics.
- Validation: npm run check passed 151 unit tests, build and the complete automated MV3 browser suite. New coverage includes concurrency, disabled behavior, reload/route counting, deduplication, failures, mode isolation, clearing and real browser restart persistence/reset. git diff --check passed; no manual/live-site tests or external AI calls.
- Limits/next step: browser storage quotas apply; no automatic eviction. The first route event counts if no preceding navigation is known. Reload dist/, accept the added permission if prompted, and enable Track URL visits in either view.
- Publication: existing main, no new branch, SSH identity from prompt 002; origin fetched without divergence. Invalid GitHub CLI authentication uses the documented repository/commit review-note fallback.

## Visited count pop animation — prompt 036

- Request: a subtle, smooth pop limited to the sidebar visit count when it changes; complete prompt saved before implementation.
- Changes: shared sidebar/popup numeric span animates to 1.1 scale and back over 220 ms. Initial/unchanged values stay still, rapid updates replace the previous pop, and reduced-motion preferences suppress it. Surrounding text and layout do not animate. Visit tracking and storage semantics remain unchanged.
- Validation: npm run check passed 152 unit tests, build and the full automated MV3 suite. New DOM/unit coverage verifies change detection, number-only targeting, stable layout, timing/scale, reduced motion, repeated updates, completion and cleanup. git diff --check passed.
- Publication: existing main, no new branch, SSH identity from prompt 002; fetched origin without divergence. Invalid GitHub CLI authentication uses the documented repository/commit review-note fallback.
- Issues/next step: no known automated failures; reload dist/ and revisit URLs with tracking enabled and the sidebar open. No manual/live-site testing or external AI calls.
