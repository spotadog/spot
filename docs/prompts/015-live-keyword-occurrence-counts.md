# Prompt 015 — Live keyword occurrence counts

## Purpose

Add optional live per-keyword repeated and unique-in-context counts.

## Prompt

**Before implementation:** First save this complete prompt in the repository's prompt documentation or prompts directory, following the project's existing prompt-tracking conventions. This must happen before implementation begins so the instruction can be tracked, reused, audited, and used to help reproduce the project later.

## Objective

Update the project's features documentation to add a new optional feature that tracks how many times configured keywords appear on the page the user is currently viewing.

When this feature is enabled, the plugin should detect keyword occurrences and update the counts live as the user scrolls or browses the page.

The feature must distinguish between:

* **Unique in context** — track whether/how often the keyword appears in distinct relevant contexts rather than treating every occurrence as equivalent.
* **Repeated** — track repeated occurrences of the same keyword, including multiple appearances throughout the page.

## Features Documentation

Locate the existing features documentation and add this feature using the same structure, terminology, formatting, and level of detail as the existing documented features.

Document:

* What the feature does.
* That it is optional and can be turned on/off.
* What content is analyzed.
* How keyword occurrences are counted.
* The distinction between unique-in-context and repeated occurrences.
* Where the counts are displayed.
* How live updates work while browsing or scrolling.
* Any relevant limitations or expected behavior.

Do not remove, rewrite, or restructure unrelated feature documentation.

## Feature Behavior

When enabled, the plugin should keep track of occurrences of each configured keyword on the current page.

The displayed information should make it possible for the user to understand both the unique-in-context and repeated occurrence information for each keyword.

The count should be displayed either:

1. In the plugin's profile section, or
2. Directly next to each keyword in the existing keyword interface.

Inspect the current UI and architecture and choose the location that integrates most naturally with the existing design. If the existing interface already has a suitable keyword list or keyword status area, prefer displaying the count next to the corresponding keyword rather than introducing unnecessary new UI.

The feature must remain disabled when the user has not turned it on.

## Live Tracking

Tracking must update dynamically as the page changes while the user browses.

This includes content that becomes available or changes because of:

* Scrolling.
* Lazy-loaded content.
* Dynamically inserted page content.
* Relevant DOM changes.
* Client-side navigation where the page changes without a traditional full reload.

Counts should remain accurate without requiring the user to manually refresh the plugin.

Avoid implementing continuous expensive full-page rescans if the existing architecture allows changes to be detected and processed more efficiently.

Prevent duplicate counting caused by repeatedly observing or processing the same DOM content.

## Counting Semantics

Define clear, deterministic rules for:

### Repeated occurrences

Count the total number of valid occurrences of each configured keyword in the relevant page content.

For example, if a keyword appears five valid times, its repeated count should reflect those five occurrences.

### Unique in context

Track occurrences based on distinct context so that identical/repeated appearances can be differentiated from genuinely separate contextual uses.

Before implementation, inspect the existing project for any established definition or logic for "unique in context." Reuse that definition if one already exists.

If the project does not currently define it, introduce a deterministic and documented method for identifying distinct contexts. The implementation should avoid arbitrary behavior and should make the chosen definition clear in code comments or feature documentation where appropriate.

Ensure normalization rules are consistent, including handling of capitalization, whitespace, punctuation, and keyword matching boundaries according to the plugin's existing keyword-matching behavior.

Do not silently change existing keyword matching semantics unless required for this feature.

## State and Navigation

Ensure counts correctly reflect the currently active page.

When navigating to a different page or route, stale counts from the previous page must not incorrectly carry over unless the existing product requirements explicitly call for persistent historical statistics.

If the plugin already has a state-management or content-analysis mechanism, integrate with it instead of introducing a parallel architecture.

## Performance

Because tracking can run while users scroll and browse potentially large or highly dynamic pages:

* Avoid unnecessary repeated DOM scans.
* Debounce or batch rapid DOM updates where appropriate.
* Prevent memory leaks from observers or event listeners.
* Properly clean up tracking when the page, route, plugin state, or feature state changes.
* Do not perform tracking work while the feature is disabled.
* Ensure dynamic content does not cause the same occurrence to be counted multiple times.

## Existing Repository Requirements

Before making implementation changes:

1. Inspect the repository structure.
2. Read and follow relevant repository documentation, architecture guidance, coding conventions, and contributor instructions.
3. Identify the existing keyword detection/matching implementation.
4. Identify the plugin's existing settings/feature-toggle mechanism.
5. Identify the profile and keyword UI components.
6. Reuse existing abstractions and patterns wherever practical.

Do not unnecessarily redesign or restructure unrelated parts of the project.

## Testing and Verification

Create or update appropriate unit tests covering at minimum:

* Feature disabled behavior.
* Feature enabled behavior.
* A keyword appearing once.
* A keyword appearing repeatedly.
* Multiple configured keywords.
* Unique-in-context counting.
* Repeated occurrence counting.
* Case/normalization behavior consistent with existing keyword matching.
* Dynamically added content.
* Prevention of duplicate counting when content is observed more than once.
* Count updates when content changes.
* Navigation or page changes resetting/updating counts correctly.
* Cleanup when tracking is disabled.
* Relevant edge cases for empty pages, missing keywords, and rapidly changing content.

Run the relevant unit tests and resolve any regressions introduced by the implementation.

Do not perform live/manual browser testing unless existing automated repository workflows require it. I will perform live browser testing separately and provide feedback afterward.

## Acceptance Criteria

The feature is complete when:

* It is documented in the features documentation.
* Users can enable or disable it.
* Disabled tracking introduces no unnecessary page-processing work.
* Enabled tracking counts configured keywords on the current page.
* Repeated occurrences are counted correctly.
* Unique-in-context occurrences are tracked separately and deterministically.
* Counts are visible in the profile section or next to the corresponding keywords.
* Counts update live as relevant page content appears or changes while browsing and scrolling.
* Dynamic content does not create artificial duplicate counts.
* Navigation does not leave stale counts from previous pages.
* The implementation follows existing plugin architecture and UI conventions.
* Appropriate unit tests have been added or updated and pass.
* Unrelated functionality has not been unnecessarily changed.

**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the repository's existing GitHub flow documentation rather than inventing a new workflow. Complete all applicable steps required by that documentation.


## Implementation Notes

- Preserved the complete request before implementation. Reviewed the prompt workflow, README, features, matching contract, prompts 002/013/014, storage, scanner, shared editor, tests and documented GitHub flow.
- Added the persisted, default-off Track keyword occurrences toggle through the existing storage adapter and trusted worker mutation. Only its boolean is included in the scanner projection. Counts stay in content-script memory, with no history, exports, page-text uploads or AI calls.
- Reused per-keyword matching for independent repeated totals, before highlight overlap resolution. No prior unique-in-context definition existed: distinct full DOM text-node contents containing matches are compared after lowercasing, whitespace collapse and trim, retaining punctuation. Documented examples and text-node/regex limitations in features.md.
- Counts appear within each keyword row in the shared popup/sidebar saved-profile view. Draft editing hides counts to avoid implying unsaved changes have been applied. The open interface queries active-tab snapshots every 500 ms only while enabled and globally unpaused; tab/navigation changes invalidate responses and clear stale display. Restricted or pending pages show Counts unavailable; inactive keywords/disabled profiles contribute zero.
- Integrated contributions into the existing 150 ms mutation-batched scanner. WeakMap caches reuse matches/contributions for unchanged text nodes and release removed nodes. Each pass reconstructs current totals rather than accumulating observations. Relevant DOM/visibility changes, removals, empty bodies, lazy loading, route events and configuration changes refresh/reset snapshots. Below-fold content is already included, so scrolling needs no additional scanner. Disable removes tracking state/listeners/polling; global pause also disconnects the scanner.
- Validation: final npm run check passed all 71 unit tests, build, and the complete automated MV3 browser suite. New unit coverage includes defaults/persistence/projection, once/repeated/multiple keywords, boundaries/case/whitespace/punctuation, criteria/activity/overlap, empty or missing content, rapid mutation batching, duplicate prevention, cached reuse, edits/visibility/removal, navigation, configuration replacement and cleanup. Automated browser coverage verifies toggle/display, repeated and distinct contexts, dynamic changes, pushState and active-tab switching. Updated an existing migration expectation and replaced brittle editor input indices in its fixture. git diff --check and exact prompt preservation passed. No manual/live browser walkthrough or live AI calls performed.
- Limitations: mutation passes retain the existing DOM traversal for visibility/removal reconciliation; expensive keyword evaluation is cached for unchanged nodes. Existing stylesheet-only visibility, text-node boundaries, exclusions and native-regex runtime limitations remain. Unique context means normalized text equality, not semantic understanding. Counts describe the current rendered DOM, including shared content retained by SPA navigation.
- GitHub flow: retained main, no new branch; fetched origin over the existing SSH identity from prompt 002 and confirmed no divergence. GitHub CLI authentication remains invalid; request/change/validation/issues/next-step notes are preserved here and in the commit description using the documented fallback for standalone comments.
- Suggested next steps: user-run live Chrome verification, especially representative lazy-loaded/infinite-scroll sites; consider incremental visibility reconciliation for exceptionally large dynamic documents.
