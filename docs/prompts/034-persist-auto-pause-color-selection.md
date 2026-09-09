# Prompt 034 — Persist auto-pause color selection

## Purpose

Ensure saved auto-pause colors and newly opened settings views retain the user's actual selection.

## Prompt

**Before implementation:** Save this complete prompt in the repository's existing prompt documentation or prompts directory before making implementation changes. Follow the repository's existing naming and organization conventions.
There seems to be a bug with the auto-scroll color selection. The selected colors are either not being saved correctly, or they are saved but then all colors appear selected again when opening the new view.
Please investigate and fix the issue so that the user's color selections persist correctly and the new view displays only the colors that were actually selected.
Follow the relevant existing repository documentation and conventions.
Create or update the appropriate unit tests for this change and run the relevant tests.
**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the existing documentation rather than inventing a new workflow.

## Implementation Notes

- Saved the complete prompt before implementation; reviewed prompt processing, prompt 033, current palette/settings/storage code, and prompt 002 publication guidance.
- Reproduced the reset with a DOM/unit regression: unchecking a color only changed a local draft; the separate AI Save settings action refreshed from stored defaults and checked all colors again. Existing explicit Save scrolling settings persistence was already functioning, so storage normalization/defaults were not the cause.
- Checkbox changes and custom-color additions now send color-only save requests immediately. The existing worker/storage queue serializes mutations; the view processes acknowledgments in edit order, reports save progress, and restores the last acknowledged selection on failure. Immediate dispatch avoids leaving unsent changes in a local queue when the view closes.
- Added partial navigation-settings writes so palette and eyeball changes preserve each other's latest saved values. Save scrolling settings now sends only the eyeball value, preventing an older open view from overwriting another view's palette. AI settings saves await local palette acknowledgments and their refresh no longer replaces palette edits.
- Palette controls remain disabled until the initial stored selection loads. Each new Settings view reconstructs checked states from the saved set, including custom-only and empty selections. Defaults still apply only to missing legacy preferences. Matching, auto-pause geometry, slowdown, Resume and profile/backup schemas are unchanged.
- Added a DOM/unit regression covering auto-save without a second Save, AI-save isolation, empty/custom reopen, rapid changes, failed-save rollback and stale-view eyeball saves. Extended the real MV3 fixture to open a separate Settings view and assert its exact checked palette. The regression failed against the prior UI and passes with the fix.
- Publication: current main, no new branch, existing SSH identity from prompt 002; fetched origin without divergence. Invalid GitHub CLI authentication uses the documented repository/commit review-note fallback.
- Next step: reload dist/ and change colors in Settings; wait for Auto-pause colors saved before checking another view. Save scrolling settings is now needed only for the eyeball level. No manual/live-site testing or external AI calls.
- Final validation: npm run check passed 145 unit tests, build and the complete automated unpacked-MV3 browser suite on the final implementation. git diff --check passed. No known automated failures remain.
