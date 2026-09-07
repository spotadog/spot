# Prompt 017 — Cumulative Keyword Appearance Counts

## Purpose

Preserve historical keyword appearances across partial scans and refreshes without duplicate counting.

## Prompt

**Before implementation:** First save this complete prompt in the repository's prompt documentation or prompts directory, following the project's existing prompt-tracking conventions. This must happen before implementation begins so the instruction can be tracked, reused, audited, and used to help reproduce the project later.

## Objective

Investigate and fix the issue where the displayed **keyword appeared times/count** can decrease over time.

The keyword appearance count should not go down once appearances have already been recorded. If a keyword has appeared a certain number of times, subsequent processing, refreshes, updates, re-fetches, or recalculations must not incorrectly reduce that historical count.

## Investigation

Before making changes:

1. Inspect the repository documentation, architecture notes, data model, and relevant existing implementation.
2. Identify exactly how keyword appearance counts are calculated, stored, updated, persisted, and displayed.
3. Determine why an existing count can become lower than a previously recorded value.
4. Check for possible causes including:

   * Counts being recalculated only from the latest subset of data.
   * Old records being excluded during refreshes or synchronization.
   * A stored cumulative count being overwritten by a smaller newly calculated count.
   * Pagination, filtering, date-window, deduplication, or query changes affecting the calculation.
   * Race conditions or asynchronous updates writing stale values.
   * Cache/state replacement issues.
   * Database upserts or synchronization logic replacing historical totals.
   * Frontend state temporarily or permanently overwriting a larger persisted value.

Do not apply a superficial UI-only workaround if the underlying stored or calculated data is incorrect.

## Required Behavior

Keyword appearance counts must accurately represent the intended cumulative historical number of appearances.

Once an appearance has legitimately been counted, normal application updates must not cause the cumulative count to decrease.

For example:

* If a keyword has appeared **15 times**, a later refresh must not show **12** merely because only 12 appearances were present in the latest fetched batch.
* If three additional valid appearances are discovered, the count should become **18**.
* Reprocessing the same data must not double-count appearances.
* Synchronizing or refreshing data must preserve previously known appearances unless the underlying source record was explicitly and legitimately deleted and the application's documented behavior requires counts to reflect such deletion.

Preserve the project's existing definition of what constitutes a unique keyword appearance. Do not change counting semantics unnecessarily.

## Implementation Requirements

Fix the problem at the appropriate source of truth rather than masking it in the presentation layer.

Ensure that:

* Historical appearance information is preserved correctly.
* Updates are idempotent where applicable.
* Duplicate processing does not inflate counts.
* Stale updates cannot overwrite newer or more complete count data.
* Existing persisted data remains compatible wherever practical.
* Any migrations or data-model changes are minimal and safe.
* Unrelated functionality is not changed.

If the current architecture intentionally recomputes counts from underlying occurrence records, make sure the complete authoritative occurrence dataset is used rather than an incomplete page, window, or temporary subset.

If the system stores cumulative counters directly, make sure updates cannot accidentally replace a larger valid cumulative value with a smaller partial value.

## Edge Cases

Verify behavior for:

* Initial keyword discovery.
* Repeated processing of the same source data.
* New appearances being added.
* Application refresh/restart.
* Background synchronization or repeated fetches.
* Pagination or partial API results.
* Filters or date ranges used elsewhere in the UI.
* Concurrent or out-of-order updates.
* Keywords with zero, one, and many appearances.
* Existing records created before this fix.

## Testing and Verification

Create or update appropriate unit tests that reproduce the current bug and verify the corrected behavior.

At minimum, tests should demonstrate that:

1. A previously recorded appearance count does not decrease after a subsequent partial or smaller update.
2. New unique appearances correctly increase the count.
3. Processing duplicate appearances does not incorrectly increase the count.
4. Reprocessing existing data produces a stable result.
5. Any stale or out-of-order update scenario relevant to the implementation cannot overwrite a newer valid count with a smaller value.

Run the relevant unit tests and any existing related automated test suites.

Do not perform live/manual browser testing unless it is already required by repository documentation. I will perform live browser testing separately and provide feedback if needed.

## Documentation

Update any relevant technical documentation if the fix changes how keyword appearance counts are persisted, synchronized, or calculated.

## Acceptance Criteria

The work is complete when:

* Keyword appearance counts no longer unexpectedly decrease.
* Counts remain stable across refreshes and repeated processing.
* Legitimate new appearances increase the count correctly.
* Duplicate processing does not inflate the count.
* The underlying cause has been fixed rather than hidden in the UI.
* Relevant unit tests pass.
* Existing unrelated behavior remains unchanged.

**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the repository's existing GitHub flow documentation rather than inventing a new workflow. Complete all applicable steps required by that documentation.


## Implementation Notes

- Saved the complete request before code changes. Reviewed prompt-processing-flow, README, feature/architecture documentation, prompts 014–016 and the prompt 002/implementation-log GitHub flow.
- Root cause: scanner.scan rebuilt totals exclusively from the currently rendered text nodes, while update/stop/reinjection discarded in-memory counts. DOM removal, hidden content, partial/lazy-loaded windows, configuration broadcasts and reloads therefore reduced totals. There was no historical count database, pagination API or persisted counter to repair; UI polling displayed these snapshots directly.
- Added per-exact-URL history using existing keyword identities and normalized full-text-node contexts. Merge each context’s maximum observed repeated multiplicity and sum retained contexts. New contexts and additional copies increase totals; smaller/duplicate/out-of-order snapshots do not erase history. Matching remains independent of UI and uses unchanged criteria/normalization. Removed DOM nodes are not treated as explicit source deletions.
- Persist hashed URLs/context identifiers through the sole storage adapter, using the existing serialized mutation queue and separate versioned count keys. Existing profile/settings schema and backups remain unchanged. No migration can recover past counts because earlier versions never persisted them. Worker-side hashing supports insecure HTTP pages as well as HTTPS without storing raw page text/URLs.
- Content messages are restricted to this extension’s top-frame HTTP(S) scripts; storage validates keyword identities, hashes and positive integer multiplicities. Only acknowledged storage totals reach the snapshot; revision guards reject stale replies across scans, configuration changes and routes. Failed writes preserve previous records and show unavailable until a subsequent scan succeeds.
- Validation: npm run check passed 76 unit tests, build and the complete automated MV3 browser suite. Regression coverage includes 15 → partial 12 → three new contexts = 18, duplicate scans, repeated updates, empty/hidden/removed content, route isolation, stale responses, zero counts, serialized out-of-order writes, restart persistence, invalid observations and failed-write recovery. Browser coverage checks persistence through page reload and duplicate content reinsertion. Updated previous tests whose falling-count expectations were explicitly superseded. No manual/live browser walkthrough or live AI calls.
- Documented limitations: arbitrary DOM content has no stable source-record identity. Identical contexts in disjoint batches cannot be distinguished from duplicates, so history conservatively retains their maximum observed multiplicity. Text edits form new contexts. Query/fragment changes select distinct URL histories; counts are not global across URLs. No automatic history eviction is introduced; storage quota failure leaves saved data intact. Existing discarded appearances cannot be reconstructed.
- GitHub flow: remained on main, no new branch; fetched origin with the existing prompt 002 SSH identity and confirmed no divergence. GitHub CLI credentials remain invalid, so review notes are preserved here and in the commit description using the documented fallback for standalone comments. Next step: user-run live Chrome verification on representative dynamic/virtualized sites, especially where identical source records lack distinct text contexts.
