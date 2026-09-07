# Prompt 019 — Stable popup layout

## Purpose

Investigate and fix popup width oscillation while preserving natural scrolling and the shared layout.

## Prompt

**Before implementation:** First save this complete prompt in the repository's prompt documentation or prompts directory, following the project's existing prompt-tracking conventions. This must happen before implementation begins so the instruction can be tracked, reused, audited, and used to help reproduce the project later.

## Objective

Investigate and fix a UI bug that occurs when the application window is in **popup mode**.

In popup mode, the visible page/window width rapidly oscillates: it repeatedly becomes slightly narrower and then expands again. This shrinking-and-expanding cycle continues very quickly until the user scrolls far enough down that the rest of the page content comes into view.

This behavior is incorrect. The popup should maintain a stable width and layout without repeatedly expanding and contracting, regardless of the current scroll position.

## Required Investigation

Do not apply a superficial fixed-width workaround without first determining the actual cause.

Inspect the popup layout and identify what is causing the repeated resize/reflow loop. Pay particular attention to interactions involving:

* Viewport width and height calculations.
* `100vw`, `100vh`, `100%`, `calc(...)`, `min-width`, `max-width`, and related CSS sizing.
* Vertical scrollbar appearance/disappearance changing the available viewport width.
* `overflow`, `overflow-x`, and `overflow-y` behavior.
* Content whose height changes after render.
* Layout measurements performed with APIs such as `getBoundingClientRect`, `offsetWidth`, `clientWidth`, `scrollWidth`, `innerWidth`, or similar.
* `ResizeObserver`, `MutationObserver`, scroll handlers, resize handlers, or effects that update layout state based on measured dimensions.
* React/component effects whose dependencies may create a measurement → state update → rerender → new measurement loop.
* Conditional rendering that changes page height or scrollbar visibility.
* Popup-specific CSS or JavaScript that differs from the normal/full-page mode.
* Responsive breakpoints that may repeatedly trigger as the available width changes by a few pixels.
* Scroll locking or body/document overflow changes.
* Elements that unintentionally exceed the viewport width and cause horizontal overflow.
* Width calculations that include or exclude scrollbar width inconsistently.

Determine why scrolling far enough down causes the oscillation to stop, as that behavior may reveal the root cause.

## Implementation Requirements

Fix the underlying issue so that:

* Popup mode has a stable width immediately after opening.
* The page does not rapidly shrink and expand.
* Scrolling is not required to stabilize the layout.
* The fix works when the page content is taller than the popup viewport.
* Vertical scrolling remains functional where intended.
* Horizontal overflow is not introduced.
* The normal/non-popup layout continues to behave as before.
* Existing responsive behavior continues to work correctly.
* The solution does not rely on arbitrary delays, repeated timers, forced rerenders, or hardcoded pixel values unless there is a clearly justified platform-specific reason.
* Avoid changing unrelated styling or application behavior.

Prefer a root-cause fix, such as stabilizing scrollbar behavior, correcting overflow ownership, removing a layout feedback loop, or correcting inconsistent width measurement, rather than masking the symptom.

## Repository Guidance

Before modifying code:

1. Inspect the repository documentation, architecture notes, coding conventions, and any popup/window-specific documentation.
2. Locate the implementation responsible for popup sizing, page layout, overflow, scrolling, and responsive behavior.
3. Follow the existing project structure and conventions rather than introducing a new layout architecture unnecessarily.

## Testing and Verification

Create or update appropriate unit/component tests for the affected behavior where practical.

Tests should cover the underlying logic responsible for the bug, especially if the issue involves:

* Resize calculations.
* Scrollbar/overflow state.
* Responsive state updates.
* Popup-specific layout state.
* Resize observers or effects that can create feedback loops.

Run the relevant unit tests and existing related test suites after making the change.

Do not perform live/manual browser testing unless the repository's automated test setup already includes it. I will perform the live browser testing separately and provide feedback if additional adjustments are needed.

## Acceptance Criteria

The fix is complete when all of the following are true:

* Opening the application in popup mode no longer causes rapid width shrinking and expanding.
* The popup remains visually stable without any user scrolling.
* Long pages can scroll normally without changing the popup width back and forth.
* No repeated resize/render feedback loop remains.
* No new horizontal scrollbar or unintended clipping is introduced.
* Normal window mode is unaffected.
* Relevant unit tests pass.
* The root cause and the implemented fix are clear from the code and, where useful, concise comments or documentation.

When finished, provide a concise summary of:

* The root cause of the oscillation.
* Why scrolling previously caused it to stop.
* The files changed.
* The specific fix applied.
* The tests added or updated and their results.

**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the repository's existing GitHub flow documentation rather than inventing a new workflow. Complete all applicable steps required by that documentation.


## Implementation Notes

- Saved the complete prompt before implementation; reviewed README architecture/validation, prompts 002/009/016/018, the shared editor, build routing, CSS, and implementation-log GitHub flow.
- Located the popup-only sizing conflict in body.popup: width: min(420px, 100vw), max-height: 600px, overflow-y: auto. Body overflow propagates to the viewport; the body itself is capped even though its content keeps growing. Automated pre-change inspection at 420×600 measured a 600px body with 2158px scroll content. At the top the main bottom was 2158px; at maximum scroll it was 600px while the body bottom was -958px. This gives the native popup autosizer inconsistent body/content geometry, while viewport-based width includes scrollbar space and couples layout back to the host viewport.
- No popup layout measurement, ResizeObserver, MutationObserver, resize/scroll handler, React effect, responsive breakpoint, or scroll lock exists in the shared UI. The popup entry imports the same side-panel editor and only adds a popup body class. Keyword focus uses scrollIntoView on explicit user actions, not a recurring measurement loop. Prompt 016 intentionally removed internal list scrolling, exposing long content to the old popup body cap.
- Fix: remove the artificial body height cap and overflow override so the document owns scrolling and the body includes all content. Retain the existing 420px preferred width, capped with max-width: 100% of the available containing block instead of 100vw. Reserve the root scrollbar gutter only for popup documents. No new pixel dimensions, timers, rerenders, JavaScript sizing, or changes to the side panel/options rules.
- Why scrolling can settle the old layout: it brings the overflowing content bottom inside the viewport, changing the out-of-viewport geometry seen during native sizing. This is the explanation supported by the measured scroll geometry, not a reproduced trace of Chrome's native autosizer. The rapid native-toolbar oscillation itself cannot be confirmed by the suite's extension pages in tabs; user-run native Chrome verification remains necessary. No manual/live browser walkthrough was performed.
- Validation: npm run check passed 76 unit tests, esbuild, and the full existing automated unpacked-MV3 Playwright suite. New tests/popup-layout.mjs covers short/tall/short content transitions, top/middle/bottom scrolling, repeated animation-frame geometry, natural body height, no horizontal overflow, and popup-only stable scrollbar policy at widths 320/420/680. Existing tests also exercise real 200-keyword lists, editor changes, and narrow popup/sidebar layouts. Applying the old CSS in a separate isolated automated run fails the new regression. git diff --check and exact prompt preservation passed. No new pure unit test was added because this fix concerns browser CSS layout rather than JavaScript logic.
- GitHub flow: retained main without a new branch; fetched origin using the existing prompt 002 SSH identity and verified no divergence. GitHub CLI credentials remain invalid, so request/change/validation/issues/next-step notes are preserved here and in the commit description using the documented fallback.
- Next step: reload the rebuilt extension and verify the native toolbar popup at the top and bottom of long profiles, including the operating system's scrollbar settings.
