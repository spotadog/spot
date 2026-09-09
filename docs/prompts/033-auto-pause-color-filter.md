# Prompt 033 — Auto-pause color filter

## Purpose

Limit keyword-triggered auto-pause to the configured highlight colors.

## Prompt

**Before implementation:** Save this complete prompt in the repository's existing prompt documentation or prompts directory before making implementation changes. Follow the repository's existing naming and organization conventions.
Add a feature so that the auto-pause functionality only stops on keywords whose assigned color matches one of the configured auto-pause colors. Keywords with other colors should not trigger auto-pause.
Follow the repository's existing documentation, conventions, and current auto-pause behavior when implementing this change.
Create or update the appropriate unit tests for this behavior and run the relevant tests.
**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the existing documentation rather than inventing a new workflow.

## Implementation Notes

- Saved the complete prompt before implementation and reviewed prompt processing, prompts 025/031/032, current navigation/highlighting/settings/storage code, and prompt 002's GitHub flow.
- Added Auto-pause colors to Settings → Auto Scroll configuration. The six preset colors are initially selected; custom colors can be added with the existing native color-input pattern. Unchecked colors remain highlighted but cannot trigger automatic keyword pauses. Selecting none prevents keyword-triggered pauses; ordinary end/navigation safeguards still apply.
- The globally persisted autoPauseColors list uses normalized six-digit hex values, deduplicated and validated through the existing serialized navigation-settings storage method. Missing legacy preferences default to the six presets; explicitly empty lists remain empty; malformed stored selections fail closed. Older callers saving only the eyeball level preserve the palette. No profile schema/backup, permission or dependency changes.
- Highlighter retains a local range-to-resolved-color map after painting. Only allowed positive ranges reach the existing eyeball-level pause detector. Legacy positive keywords use their normal yellow default; custom colors normalize case; negative matches never enter the positive map. Repainting, recoloring and clearing refresh the map. Matching logic, slowdown, Resume/hotkey and tab runtime state are unchanged.
- Settings broadcasts update the palette in open tabs. Removing a color cancels its upcoming pause; adding one can pause a matching post already spanning the reading level, consistent with existing current-position behavior. Slowdown continues to receive all positive ranges even with an empty pause palette.
- Added unit coverage for renderer filtering/default/custom/negative colors and recoloring/cleanup, palette normalization/validation/defaults/persistence/empty selection/older callers, live controller changes and independent slowdown. Browser fixtures configure and persist a custom color, skip an unchecked blue post, pause at the allowed post across 25/50/75% levels, and verify slowdown with no pause colors selected.
- GitHub flow: current main, no new branch; fetched origin via prompt 002's existing SSH identity and confirmed no divergence. Invalid GitHub CLI authentication requires the documented repository/commit review-note fallback.
- Next step: reload dist/, choose the desired colors in Settings, and Save scrolling settings. Add any custom keyword colors explicitly. Existing document-scrolling/unusual-layout limitations remain; no manual/live-site tests or external AI calls.
- Final validation: npm run check passed all 144 unit tests, build and the full automated unpacked-MV3 browser suite, including selected/excluded colors, persisted custom selection, eyeball alignment, Resume and slowdown with an empty palette. git diff --check passed.
