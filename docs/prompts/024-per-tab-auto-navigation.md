# Prompt 024 — Per-tab auto-navigation

## Purpose

Add optional per-tab scrolling, pause/resume and automatic pagination.

## Prompt

**Before implementation:** First save this complete prompt in the repository's prompt documentation or prompts directory, following the project's existing prompt-tracking conventions. This must happen before implementation begins so the instruction can be tracked, reused, audited, and used to help reproduce the project later.

## Objective

Add an optional per-tab auto-navigation feature that can automatically scroll through page content and, when the current page uses pagination instead of infinite scroll, automatically advance to the next page.

The feature must support:

* Auto-scroll.
* Automatic next-page navigation for paginated content.
* Scrolling until pagination becomes visible when pagination exists but is initially below the viewport.
* Adjustable auto-scroll speed.
* Pause and resume.
* Correct behavior when navigating into a detail page and then returning with Back.
* Strictly isolated state per browser tab.
* Cleanup of stale tab-related scrolling state when the browser/application starts fresh.

Inspect and follow the repository's existing architecture, coding conventions, extension/browser APIs, state-management patterns, UI conventions, and relevant documentation before making implementation changes. Do not unnecessarily redesign unrelated parts of the project.

## Feature Menu / Controls

Add the auto-scroll functionality to the appropriate existing menu or controls area.

The menu should include:

* An Auto Scroll toggle.
* An adjustable scroll-speed control.
* Pause and Resume controls or equivalent state-aware control when Auto Scroll is enabled.

The speed control should be part of the same feature area/menu and should only affect the relevant tab's auto-scroll behavior.

Use the project's existing UI style and component patterns rather than introducing an unrelated design system.

## Auto-Scroll Behavior

When Auto Scroll is enabled for a tab:

1. Automatically scroll down the current page at the configured speed.
2. Continue scrolling as additional content becomes available.
3. Detect whether the current content flow behaves like infinite scrolling or uses pagination.
4. If the page is paginated, automatically locate and activate the appropriate "Next" page control when the current page has been consumed.
5. If pagination controls are not currently visible, continue scrolling until they become visible rather than assuming pagination does not exist.
6. When a next page is loaded as part of this automatic pagination flow, automatically continue auto-scrolling on the newly loaded page without requiring the user to manually restart it.
7. Stop or otherwise handle the end of the available content safely when there is no valid next page.

Do not repeatedly activate pagination controls, create navigation loops, or trigger multiple simultaneous next-page actions.

## Pagination Detection

Implement pagination detection defensively.

Support the pagination patterns already relevant to this project and, where appropriate, common indicators such as:

* Next buttons.
* Next links.
* Pagination controls.
* Accessible labels or semantic attributes identifying a next-page action.

Do not assume pagination must initially be visible in the viewport.

If a page has pagination below the visible content, the auto-scroll process should naturally continue until the pagination area becomes reachable and then use the next-page control.

Avoid incorrectly clicking unrelated elements merely because they contain text such as "next."

Respect disabled, unavailable, hidden, or invalid next-page controls.

## Infinite Scroll vs. Pagination

The implementation should work for both content models:

* Infinite-scroll pages should continue scrolling while new content is being appended.
* Paginated pages should scroll through the current page and then activate the next-page control when appropriate.

Do not require the user to manually choose whether the site is infinite-scroll or paginated unless the existing project architecture already requires that distinction.

The detection logic should avoid prematurely concluding that a page has ended while content is still loading.

Use reasonable guards or timing/state checks to avoid repeatedly evaluating or triggering navigation while the DOM is changing.

## Pause and Resume

When Auto Scroll is active, the user must be able to pause it.

Pausing must:

* Stop automated scrolling.
* Stop automatic pagination/navigation while paused.
* Preserve the current scroll position and relevant auto-scroll state.
* Preserve the configured speed.
* Preserve the fact that this specific tab is paused.

Resuming must continue from the user's current position rather than restarting from the top or treating the page as a completely new auto-scroll session.

## Detail Page / Back Navigation Behavior

Handle the common workflow where the user is browsing a scrolling list, opens or navigates to a detail page, and then returns using the browser's Back action.

Important behavior:

1. If the user pauses Auto Scroll before viewing the detail page, that paused state must remain associated with the original tab.
2. When the user returns to the previous listing page with Back, do not incorrectly detect the restored page as a brand-new page that should immediately restart Auto Scroll.
3. Preserve or restore the relevant position/state for that tab as appropriate to the browser's navigation behavior.
4. Auto Scroll should remain paused after returning.
5. The user must be able to explicitly resume from that point.
6. Resuming should continue from the restored/current scroll position instead of restarting the browsing session from the top.

Differentiate between:

* An actual new page loaded through the automatic pagination process, where Auto Scroll should continue automatically.
* A user navigating away and then returning through browser history while the tab's Auto Scroll state is paused, where it must remain paused.

Do not simply treat every navigation event as a signal to restart auto-scrolling.

## Per-Tab State Isolation

All auto-scroll state must be scoped to a specific browser tab.

At minimum, keep relevant state such as:

* Auto Scroll enabled/disabled.
* Paused/running state.
* Scroll speed.
* Current navigation/scroll lifecycle state.
* Any flags needed to distinguish automatic pagination navigation from normal user navigation.
* Any temporary pagination-detection state that must survive navigation within that tab.

Opening another browser tab must not inherit or modify the running/paused state of the original tab unless the existing product explicitly defines some separate global default behavior.

Examples:

* Tab A can have Auto Scroll enabled and running.
* Tab B can have Auto Scroll disabled.
* Tab C can have Auto Scroll enabled but paused.

Changing Tab B must not reset, pause, resume, or otherwise mutate Tab A's state.

If a tab is closed, remove any transient state associated with that tab when practical.

## Fresh Browser Startup Cleanup

Do not preserve stale per-tab scrolling session data across a genuinely fresh browser/application startup in a way that creates orphaned state.

On fresh startup:

* Clean up stale tab-related auto-scroll information from previous browser sessions.
* Do not associate old scroll state with newly created tabs that happen to receive reused tab IDs.
* Ensure orphaned paused/running/navigation records cannot unintentionally affect new tabs.

If the project uses persistent storage for preferences, distinguish user preferences from transient per-tab runtime state.

For example:

* A global/default preferred scroll speed may be persistent if that matches the existing product behavior.
* A specific old tab's paused/running state, navigation markers, or scroll-session data should not survive as orphaned state after a fresh browser start.

Use the browser lifecycle APIs and the project's existing state/storage abstraction where appropriate.

## Navigation State

Create a clear internal distinction between navigation initiated by the feature and navigation initiated by the user.

For example, the implementation may need to track whether a navigation was triggered by:

* Automatic "Next Page" handling.
* A normal link/detail-page click.
* Browser Back/Forward navigation.
* A reload.
* Some other existing application navigation mechanism.

The exact architecture should follow the existing codebase, but the result must prevent false "new page" detections from restarting paused Auto Scroll.

Avoid race conditions between:

* Navigation listeners.
* Content script initialization.
* Stored tab state.
* Scroll timers/animation loops.
* DOM observers.
* Pagination clicks.
* Back/forward cache or restored pages where applicable.

## Scroll Implementation

Use an implementation that provides smooth and predictable adjustable speed while remaining easy to pause and resume.

Requirements:

* Do not create multiple concurrent scroll loops for the same tab/page.
* Properly cancel timers, intervals, animation frames, observers, or listeners when Auto Scroll is stopped or paused.
* Reinitialize only the pieces required after valid automatic page navigation.
* Avoid excessive CPU usage or high-frequency DOM polling.
* Account for pages where content height changes while scrolling.
* Do not continuously force the page back to a stored Y coordinate if the user manually adjusts their position while paused.
* Resume from the actual current/restored page position.

If the project already contains scrolling helpers, reuse or extend them rather than duplicating competing logic.

## State Synchronization

Keep the menu/UI synchronized with the actual state of the currently active tab.

When switching between tabs, the UI should accurately reflect that tab's:

* Auto Scroll enabled state.
* Running or paused state.
* Current configured speed.

Do not display another tab's state.

If the extension/app uses background/service-worker messaging, content scripts, or another tab communication layer, use the established messaging architecture and ensure messages include sufficient tab/session context to prevent cross-tab leakage.

## Error Handling and Safety

Gracefully handle situations such as:

* No scrollable content.
* No pagination control.
* Pagination control disappearing or changing.
* A next button becoming disabled.
* Navigation being canceled.
* The tab being closed.
* The content script being unloaded.
* The page being reloaded.
* DOM content being replaced dynamically.
* The user disabling Auto Scroll during a pending pagination action.

Do not leave stale loops, observers, timers, or tab records behind.

Avoid unrelated modifications to browsing/navigation behavior.

## Unit Tests

Create or update appropriate unit tests covering the new behavior.

At minimum, test the project's applicable layers for:

* Enabling and disabling Auto Scroll.
* Pause and resume.
* Adjustable scroll speed.
* Per-tab state isolation.
* Switching between tabs with different Auto Scroll states.
* Automatic continuation after a feature-triggered next-page navigation.
* Paused state remaining paused after navigating to a detail page and returning with Back.
* Resume continuing from the current/restored position.
* Differentiating automatic pagination navigation from user/history navigation.
* Pagination becoming visible only after additional scrolling.
* Infinite-scroll behavior.
* No-next-page/end-of-content behavior.
* Prevention of duplicate next-page clicks.
* Cleanup when a tab closes.
* Cleanup of stale per-tab session state on a fresh browser/application startup.
* Prevention of orphaned state being assigned to a newly created/reused tab.
* Correct cleanup of timers, observers, event listeners, or equivalent resources.

Use mocks/fakes for browser APIs and navigation events as appropriate to the existing test architecture.

Run the relevant unit tests and any existing automated checks appropriate to the changed code.

Do not perform live/manual browser testing unless existing repository automation requires it. The user will perform live browser testing and provide feedback separately.

## Documentation

Update any relevant internal documentation, comments, state diagrams, configuration documentation, or feature documentation necessary to explain:

* The new Auto Scroll controls.
* Per-tab state behavior.
* Pause/resume behavior.
* Pagination behavior.
* Fresh-start cleanup behavior.
* Any new state or messaging contracts introduced.

Keep documentation consistent with the repository's existing standards.

## Acceptance Criteria

The work is complete when all of the following are true:

* The user can enable Auto Scroll from the appropriate menu.
* The user can adjust the scrolling speed.
* The user can pause and resume Auto Scroll.
* Infinite-scroll pages continue scrolling as additional content appears.
* Paginated pages automatically advance using the next-page control.
* If pagination is below the viewport, Auto Scroll continues until it becomes visible.
* A page loaded through automatic pagination continues scrolling automatically.
* A user who pauses, opens/views a detail page, and returns using Back remains paused.
* Returning with Back does not incorrectly trigger the "new page loaded, start scrolling" behavior.
* The user can resume from the restored/current position after returning.
* Auto-scroll state is isolated per browser tab.
* New tabs do not alter or inherit another tab's transient pause/run state.
* Closed-tab runtime state is cleaned up.
* Fresh browser/application startup removes stale per-tab scrolling session data and does not create orphaned state.
* No duplicate scroll loops or duplicate next-page actions occur.
* Existing functionality outside this feature continues to work.
* Relevant unit tests pass.

**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the repository's existing GitHub flow documentation rather than inventing a new workflow. Complete all applicable steps required by that documentation.


## Implementation Notes

- Saved the complete prompt before implementation. Reviewed prompt workflow, README, prompts 002/006/015/017/023 and the documented GitHub flow. No new branch or unrelated architecture change.
- Added Auto Scroll, per-tab 30–600 px/s speed, and state-aware Pause/Resume to the shared popup/sidebar. Tab generation guards discard delayed UI replies. Highlighting, profiles, AI services and persistent preferences retain their existing behavior.
- Added pure navigation transitions, a worker messaging service, and a single page controller. Trusted session storage remains behind src/storage/store.js; Chrome clears it on browser/extension restart, worker wake retains live sessions, closed/new tabs remove records, and startup prunes orphans. No new permissions or dependencies.
- Automatic next actions require a stored target/expiry, current document and revision, reachable valid control, stable-content grace, duplicate/loop guards and post-authorization revalidation. A current-frame instance probe rejects delayed hello messages from departed documents. Pausing immediately blocks stale running broadcasts and pending clicks. Back/reload/user navigation cannot restart a paused session; Resume uses actual scrollY.
- Infinite content growth resets the end grace. AJAX replacement/append handling, busy indicators, no-next/end pause, navigation timeout, below-fold pagination and pagination above long footers are covered. Fractional distance accumulation preserves slow-speed accuracy. Dispose/pagehide/pause cancel appropriate frames, observers and listeners.
- Final validation: npm run check passed all 91 unit tests, build and the complete automated unpacked-MV3 browser suite. Added 15 unit tests and browser controls, speed, detail/Back, automatic continuation, tab switching, close cleanup and fresh-browser session cleanup checks. Exact prompt preservation and git diff --check passed. No live/manual browser testing or external AI calls.
- Test investigation: an intermediate browser run timed out on the first programmatic toggle click while tab-status refresh temporarily disabled it. The isolated fixture passed; the browser fixture now checks readiness and dispatches the click atomically, with state diagnostics on startup failure. The complete suite then passed.
- Limits: document scrolling only; unusual/nested/virtualized pagination can require manual navigation. Same-origin HTTP(S) next links and recognized semantic/region controls are supported. Unexpected redirects pause. End grace is 12 quiet seconds, pending-next timeout 15 seconds, and automatic traversal is capped at 200 actions. Unusually slow sites may need Resume. Browser scheduling controls background-tab animation frames.
- GitHub flow: existing main branch, no new branch; fetched origin using the existing prompt 002 SSH identity and confirmed no divergence. GitHub CLI authentication is invalid, so request/change/validation/issue/next-step review notes are preserved here and in the commit description using the documented fallback for standalone comments.
- Suggested next step: reload dist/ in Chrome and perform the user-owned live check on representative listing/detail/infinite-scroll sites; report site-specific pagination patterns that are not recognized.
