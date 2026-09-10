# Prompt 037 — Popup seen tracking

## Purpose

Detect browser popups and website overlays and track repeat appearances with URL visit history.

## Prompt

**Before implementation:** Save this complete prompt in the repository's existing prompt documentation or prompts directory before making implementation changes. Follow the repository's existing naming and organization conventions.
Update the browser plugin so it can detect popups and track whether the user has seen the same popup before.
This should include both traditional browser popups and “fake” popups that are rendered as overlays on top of the current website.
Where possible, associate each detected popup with a unique item or identifier, such as the URL that triggered or activated the popup, so the plugin can determine whether that popup has previously been seen.
Integrate this with the URL visit-tracking functionality that already exists in the project, reusing the same tracking concepts where appropriate.
Follow the repository's existing documentation, conventions, and patterns when making the change.
Create or update appropriate unit tests for this functionality and run the relevant tests.
**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the existing documentation rather than inventing a new workflow.

## Implementation Notes

- Saved the complete prompt before implementation; reviewed prompt workflow, prompts 035–036, current content lifecycle, visit adapter/UI, privacy documentation and prompt 002 publication rules.
- Extended existing URL tracking with separate popup appearance history using the same opt-in toggle, session/all-time selection and clear action. Both extension views show First seen/Seen before and counts inside the searchable visit history. Overlay detection does not inflate URL navigation counts; existing count animation remains unchanged.
- Browser-level committed HTTP/HTTPS navigation detects popup windows and tabs with an opener, keyed by destination URL. Reloads count again. Opener tabs include ordinary links opened in new tabs and are labeled accordingly. No extra permissions or network calls were added.
- Added independent DOM detection for visible native dialogs/popovers, ARIA dialogs/modal elements and positioned, raised modal/popup/overlay class candidates. Nested dialog/backdrop wrappers count once. The content observer is debounced with a one-second CSS visibility fallback, runs only while tracking is enabled and the document is visible, and disposes on reinjection.
- Identity prefers site-scoped explicit item IDs, recent activating link URLs, page-scoped dialog IDs/labels/headings, then a bounded content fingerprint. Reopening or changing an item creates a new appearance token. Duplicate observation/retry tokens are idempotent in storage; reinjection retains live appearance acknowledgements. Storage remains behind src/storage/store.js; histories preserve backward compatibility via optional popup fields.
- Local storage retains fingerprinted identities/event tokens plus display labels, source URLs, types and counts. Raw fallback text is not persisted. Popup settings/observation messages authenticate the extension's top-frame HTTP/HTTPS content scripts and do not expose other pages' history. No popup data enters AI requests, profile backups or external servers.
- Testing found and fixed secure-context-only randomUUID use in the content observer by following the existing AutoNavigator getRandomValues pattern, so ordinary HTTP pages work. Added nested semantic-wrapper coverage and corrected duplicate wrapper selection.
- Validation: final npm run check passed 157 unit tests, build and the full automated unpacked-MV3 browser suite. Unit/DOM coverage includes browser popup/opener classification, normal-tab exclusion, source authentication, identity selection, visibility/wrappers, repeated scans/reopens/item changes, disabling, reinjection/disposal, duplicate delivery, concurrent writes, failure recovery, mode isolation, worker/browser persistence and clearing. The real browser fixture reopens an actual popup window and overlay and verifies Seen before and count 2 in the UI. git diff --check passed. No manual/live-site testing or live AI calls.
- Limits: detection means observed appearance/navigation, not proof of reading. Blocked windows, native alerts/confirms, persistent non-HTTP(S) windows, iframe/shadow-root content, unmarked overlays, very short appearances and unusual layouts may be missed. Generic reused IDs can merge items; dynamic fallback content can split them; recent activating-link association is heuristic. Already acknowledged visible overlays are not recounted merely by clearing/switching modes. Enabling detects currently visible overlays. Storage quotas apply without automatic eviction. See README for full semantics.
- Publication: existing main, no new branch; fetched origin with the SSH identity documented in prompt 002 and confirmed no divergence. GitHub CLI credentials remain invalid; review comments use the documented repository/commit-description fallback.
- Next step: reload dist/, enable Track URL visits, open/reopen site popups, and expand URL visit history → Popup history. No known automated failures remain.
