# Prompt 035 — URL visit tracking

## Purpose

Add optional, clearable URL visit counts for the browser session or all time.

## Prompt

**Before implementation:** Save this complete prompt in the repository's existing prompt documentation or prompts directory before making implementation changes. Follow the repository's existing naming and organization conventions.

Add a toggle that enables URL visit tracking.

When the toggle is turned on, record the URLs the user visits and keep a visit count for each URL so the user can see whether they have visited that URL before and how many times they have visited it.

The tracking mode should support:

- **Per session:** Count visits only during the current session.
- **All time:** Keep the visit count across sessions until the history is cleared.

The recorded URL history and visit counts should be clearable when needed.

When the toggle is turned off, URL visits should not be recorded.

Follow the existing repository documentation, coding conventions, and UI patterns when implementing this feature.

Create or update the appropriate unit tests for this change and run the relevant tests.

**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the existing documentation rather than inventing a new workflow.

## Implementation Notes

- Saved the complete prompt before implementation; reviewed prompt-processing-flow, relevant count/privacy/settings history, README architecture and prompt 002/implementation-log GitHub workflow.
- Added independent URL tracking, off by default, to the shared popup/sidebar UI. Both views expose the persisted toggle/mode, current URL count, searchable history with incremental display and a confirmed clear action that removes both histories, including while tracking is disabled.
- Browser-level webNavigation listeners count committed top-frame HTTP/HTTPS navigations (including reloads and back/forward) and route/fragment changes. They ignore subframes, prerender events, repeated same-URL route updates, duplicate/stale events and disabled tracking. No historical backfill or count on tab activation. The first observed route event counts when no prior tab navigation is known in the selected history; this boundary is documented.
- Kept storage inside src/storage/store.js. A separate serialized adapter protects visits, mode/toggle changes and clearing from lost updates. Per-session history uses storage.session; all-time history uses storage.local. Modes retain separate histories, and only the selected mode records. Worker restarts retain session data; browser restart/extension reload clears it. Preferences persist. Keyword matching/counting, profile backups and AI submissions remain independent.
- URL strings, counts and navigation deduplication metadata remain locally in trusted browser storage; no external requests carry them. Added webNavigation permission and updated README, features, requirements and privacy documentation. URLs include query/fragment; no automatic history eviction. Storage failures preserve previously saved counts and report failures to open views. Chrome storage quotas still apply.
- Validation: npm run check passed all 151 unit tests, build and the complete automated MV3 browser suite. New unit coverage exercises off/default behavior, re-enable, concurrent tabs, duplicate/stale/reload/route events, unsupported sources, clear/disable serialization, failed-write recovery, independent modes, worker/browser lifetimes and storage isolation. Browser coverage verifies real navigations, reloads, same-URL state updates, disabled tracking, search, popup/sidebar persistence, clearing both histories, and restart persistence/reset. git diff --check passed. No manual/live-site testing or live AI calls.
- Publication: existing main branch, no new branch, fetched origin with the SSH identity documented in prompt 002 and confirmed no divergence. GitHub CLI authentication is still invalid, so review comments use the documented repository/commit description fallback.
- Next step: reload dist/ in Chrome, accept the added permission if prompted, enable Track URL visits and choose a mode. No known automated failures remain.
