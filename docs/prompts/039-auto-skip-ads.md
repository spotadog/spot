# Prompt 039 — Automatically skip ads

## Purpose

Add an optional automatic click for visible, clickable “Skip this ad” buttons.

## Prompt

**Before implementation:** Save this complete prompt in the repository's existing prompt documentation or prompts directory before making implementation changes. Follow the repository's existing naming and organization conventions.
Add a feature that can be turned on or off. When enabled, it should automatically click any visible and clickable **“Skip this ad”** button when it appears on the page.
Follow the repository’s existing documentation, coding style, and conventions. Create or update appropriate unit tests for this feature and run the relevant tests.
**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the existing documentation rather than inventing a new workflow.

## Implementation Notes

- Saved the complete prompt before implementation; reviewed prompt-processing flow, prompt 038's settings/storage/content patterns, prompt 002 and the implementation-log GitHub flow. Current branch is main; no new branch.
- Added an off-by-default, automatically saved Settings toggle for all tabs, independent of keyword highlighting and Auto Scroll. The existing serialized storage adapter validates boolean writes, and the trusted worker route broadcasts the boolean scanning projection to open documents.
- Added a dedicated local AdSkipper controller. Exact normalized labels come from explicit aria-label or visible text/input value. Native buttons, button inputs and role=button elements must be connected, visible, enabled, non-inert, within the viewport and unobstructed at a hit-test point. No countdown bypass, scrolling into view, API request, dependency or permission change.
- DOM observation schedules checks without postponing them indefinitely; a 500 ms fallback covers CSS/property changes. Visible-document checks click once per observed clickable appearance and revalidate after previous click handlers. Disabling cancels timers/listeners/observation. Reinjection disposes the old controller and retains document-local duplicate protection; no browsing history is persisted.
- Added unit tests for exact label normalization, setting defaults/validation/persistence/failed writes, real DOM visibility, covered/offscreen/disabled/inert controls, dynamic eligibility, duplicate protection, disappearance/reappearance, reinjection and disposal. Updated the content-lifecycle test harness. Added an unpacked-MV3 fixture for default-off behavior, enabling through Settings, one click, saved toggle restoration and disabling before a new button appears.
- Final validation: npm run check passed all 166 unit tests, the build and complete automated MV3 browser suite. git diff --check passed. Updated README, features and requirements.
- Limits: current content-script scope is top-level HTTP/HTTPS documents, excluding iframe contents, shadow roots and restricted pages. Sites requiring trusted physical input may ignore programmatic clicks. No live ad-site/manual test was performed; README includes manual checks.
- Publication: origin fetched via existing prompt 002 SSH identity with no divergence. GitHub CLI authentication is invalid; requested review notes are preserved in this prompt, implementation-log and commit description using the documented fallback.
- Next step: reload dist/, turn on Settings → Automatic ad skipping, and verify a representative site's skip button; turn off to stop automatic clicks.
