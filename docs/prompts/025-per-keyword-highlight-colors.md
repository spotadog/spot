# Prompt 025 — Per-keyword highlight colors

## Purpose

Allow users to select, edit, and persist a highlight color for each keyword.

## Prompt

**Before implementation:** First save this complete prompt in the repository's prompt documentation or prompts directory, following the project's existing prompt-tracking conventions. This must happen before implementation begins so the instruction can be tracked, reused, audited, and used to help reproduce the project later.

## Objective

Add the ability for users to choose, change, and persist the highlight color associated with each keyword.

## Requirements

1. **Color selection when adding a keyword**
   - When a user adds a new keyword highlight, allow them to choose its highlight color.
   - Provide a predefined set of **6 colors** for quick selection.
   - Clearly indicate which color is currently selected.
   - If none of the six predefined colors is suitable, provide a **custom color picker** so the user can select any color.
2. **Change the color of an existing keyword**
   - Allow users to edit the highlight color of an existing keyword.
   - The same color-selection interface should be available when editing:
     - The 6 predefined colors.
     - The custom color picker.
   - Changing the color should update the keyword's highlights appropriately.
3. **Persist the selected color**
   - Save the selected color together with the keyword's existing persisted data.
   - The selected color must remain associated with the keyword after refresh/reload and when the application is reopened, according to the application's existing persistence behavior.
   - Custom colors must be persisted just like predefined colors.
4. **Existing keywords and backward compatibility**
   - Existing saved keywords that do not yet have an explicitly stored color must continue to work.
   - Assign or resolve an appropriate default highlight color for legacy keyword data without breaking existing saved state.
   - Avoid unnecessary migrations or unrelated data-model changes unless required by the repository's architecture.

## Implementation Requirements

Before making changes, inspect the repository's existing documentation, architecture, keyword/highlighting implementation, persistence mechanism, UI conventions, and styling patterns. Follow the existing architecture and conventions rather than introducing an unrelated design or state-management approach.

Keep the implementation modular and maintainable. Reuse existing components and color/highlighting utilities where appropriate, and avoid changes to unrelated functionality.

Ensure color values are validated and handled consistently wherever they are stored, loaded, edited, and applied to keyword highlights.

The UI should remain usable and accessible, including clear selected states and appropriate controls for choosing custom colors.

## Testing and Verification

Create or update appropriate unit tests covering at least:

- Selecting one of the 6 predefined colors when adding a keyword.
- Selecting a custom color when adding a keyword.
- Changing the color of an existing keyword.
- Persisting and restoring predefined colors.
- Persisting and restoring custom colors.
- Handling existing/legacy keywords that do not have stored color information.
- Relevant validation and edge cases introduced by this change.

Run the relevant unit tests and resolve any regressions caused by the implementation.

Do not perform live/manual browser testing unless explicitly requested. The user will perform live browser testing and provide feedback separately.

## Acceptance Criteria

The work is complete when users can select a highlight color while creating a keyword, choose from six predefined colors or use a custom color picker, change the color later, and have the chosen color persist correctly. Existing keyword functionality and previously saved keywords must continue to work.

**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the repository's existing GitHub flow documentation rather than inventing a new workflow. Complete all applicable steps required by that documentation.

## Implementation Notes

- Saved the complete prompt before implementation and reviewed the prompt workflow, prior keyword/editor/criteria prompts, README, model, storage, matching, scanner, shared UI, styling and the prompt 002 GitHub flow.
- Added a shared color editor for creation and editing in popup/sidebar: six named presets, exclusive aria-pressed selection with an outline, a labeled native custom picker, and selected name/hex feedback. Saved rows display a color swatch and hex value. Existing Save keyword / Save profile and Cancel draft behavior remain.
- Added an optional validated color field to existing keyword records. Six-digit hex writes normalize case; legacy strings and missing colors retain group defaults without schema changes or migrations. Malformed loaded colors safely resolve to defaults. Existing storage projection, serialized saves and backup validation preserve supported colors. Keyword identity/count keys exclude color; activity and criteria remain intact.
- Pure matching carries optional color metadata through existing negative-overlap resolution. The scanner passes it to the dedicated renderer, which groups ranges by kind/color, validates dynamic CSS values, selects black/white contrast text and removes obsolete groups/styles on repaint/stop. Unchanged styles are reused to avoid a self-triggered rescan loop. Existing default layer names remain compatible. Exact same-kind intervals retain last-contributor precedence; other same-kind overlaps use CSS registration order.
- Validation: npm run check passed all 98 unit tests, build and the full automated unpacked-MV3 browser suite. New tests cover all six preset selections, custom creation/edit/cancel, activity preservation, storage recreation, both backup scopes, legacy defaults, validation/injection edge cases, count identity, overlap propagation and renderer cleanup. Automated popup/sidebar workflows verify native color inputs, live fixture highlight updates, reload restoration, unchanged page text and persistence across browser restart. No live/manual browser testing or external AI requests.
- Test issues resolved: extended the existing minimal DOM fixture with style/attribute support; narrowed browser keyword textbox selectors because native color inputs also have a textbox role, and used a distinct custom-label class to preserve activity-label selectors. No new dependencies, permissions or storage migration.
- GitHub flow: existing main branch, no new branch; fetched origin via the existing prompt 002 SSH identity and confirmed no divergence. GitHub CLI credentials remain invalid, so request/change/validation/issue/next-step review notes are retained here and in the commit description under the documented fallback for standalone comments.
- Next step: user to reload dist/ in Chrome and perform live color-picker/highlight checks. Explicit Save profile remains necessary; older extension versions cannot import backups containing color fields.
