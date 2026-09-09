# Prompt 031 — Eyeball-level pause and alternative slowdown

## Purpose

Pause matching posts at a configurable reading level and add independent adaptive scrolling.

## Prompt

**Before implementation:** Save this complete prompt in the repository's existing prompt documentation or prompts directory before making implementation changes. Follow the repository's existing naming and organization conventions.
Fix the auto-scroll **pause on positive keyword match** feature. Currently, when the positive keyword checkbox/toggle is enabled, auto-scroll does not pause as expected.
When this feature is turned on, auto-scroll should pause when a post containing a matching positive keyword reaches the configured **eyeball level** on the screen. By default, this should be approximately halfway down the visible screen. The eyeball level must continue to be adjustable from the plugin configuration section, and the pause behavior should respect that configured position.
Also add a separate toggle for an alternative scrolling behavior. This toggle must be independent from the existing auto-pause feature. When enabled, instead of pausing on a keyword match, the plugin should slow down the auto-scroll when a matching keyword post is encountered and speed the scrolling back up when there is no matching keyword. This should function as an alternative to the auto-pause behavior.
Follow the repository's existing documentation, conventions, and configuration patterns when making these changes.
Create or update the appropriate unit tests for these behaviors and run the relevant tests to verify the changes.
**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the existing documentation rather than inventing a new workflow.

## Implementation Notes

- Saved the complete prompt before implementation and reviewed the prompt-processing flow, prompts 029/030/002, navigation/settings/storage code and feature/publication documentation. This request supersedes the old next-content-boundary pause behavior.
- The checkout had no eyeball-level configuration. Added Settings → Auto Scroll configuration with a 50% default and adjustable 10–90% viewport-height position. It is a globally persisted preference validated and serialized through createStore; the safe numeric field is included in the public scanning projection and live state broadcasts. Old or invalid saved values fall back to 50%; profile/backup schema and credentials remain unchanged.
- Matching posts now pause as their top reaches the reading line, including when their positive keyword is farther down the post. Already-spanning posts pause immediately, entirely passed posts are skipped, geometry follows resizing/layout shifts, and movement clamps without overshooting. Resume skips the consumed post. Existing positive rendering/negative-overlap rules, content selection and document-scrolling scope remain.
- Added independent per-tab Slow down on positive keyword control. It runs at 25% of the user's selected speed while a matching post spans the configured reading line, then restores that selected speed. It takes precedence over automatic keyword pausing when both toggles are checked without changing either selection. Manual pause, history, cleanup and pagination safeguards continue to apply. No additional permissions, dependencies or AI calls.
- Updated the shared UI, Settings, README, features and requirements. Unit coverage now checks reading levels, resizing, deep keyword placement, ordering/passed posts, mode independence, speed restoration, manual pause, removed/hidden highlights, settings validation/defaults/persistence/failure, and worker tab isolation. Updated the superseded boundary expectations rather than retaining conflicting behavior.
- Final validation: npm run check passed all 135 unit tests, build and the complete automated unpacked-MV3 browser suite. Browser checks verify Settings save/reload, real article/div-feed/paragraph pause positions at 50/25/75%, Resume, separate toggle state and measured slow/normal movement. The focused navigation suite also passed after adding worker slowdown-isolation assertions. git diff --check passed. No manual/live-site testing performed.
- GitHub flow: current main, no new branch; fetched origin using prompt 002's existing SSH identity with no divergence. GitHub CLI authentication remains invalid, so request/change/issue/next-step review notes use the documented repository/commit-description fallback.
- Limits/next step: reload dist/ in Chrome, adjust the reading line in Settings, and verify representative live-site layouts. Nested scroll containers and unusual/virtualized content retain existing support limitations. Slowdown ratio is a fixed quarter of selected speed; the two mode toggles are independent, and slowdown wins when both are selected.
