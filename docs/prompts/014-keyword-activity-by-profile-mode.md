# Prompt 014 — Keyword activity by profile mode

## Purpose

Show saved keyword activity read-only in view mode and allow draft changes in edit/create modes.

## Prompt

**Before implementation:** First save this complete prompt in the repository's prompt documentation or prompts directory, following the project's existing prompt-tracking conventions. This must happen before implementation begins so the instruction can be tracked, reused, audited, and used to help reproduce the project later.

## Objective

Update the profile keyword UI so that the checkbox state is clear and behaves differently depending on whether the profile is being viewed, edited, or created.

Currently, showing an interactive-looking checkbox for each keyword while the profile is in read-only/view mode is confusing because it appears that the keyword's active state can be changed even though the profile is not being edited.

## Required Behavior

There are two distinct behaviors for keyword checkboxes depending on the current profile mode.

### Read-Only / View Mode

When an existing profile is being viewed and is **not** in edit mode:

* Continue displaying the checkbox/state indicator for each keyword already associated with the profile.
* The checkbox should visually indicate whether that keyword is currently **active or inactive**:

  * Selected/checked = active.
  * Unselected/unchecked = inactive.
* The checkbox must be completely read-only in this mode.
* Users must not be able to toggle or otherwise edit the active/inactive state of a keyword while simply viewing the profile.
* The UI should make it clear that this is a status indicator rather than an editable control.
* Ensure keyboard interaction, mouse interaction, and other applicable input methods cannot modify the checkbox while in read-only mode.
* Do not accidentally trigger profile state changes through the read-only checkbox.

### Edit Mode

When editing an existing profile:

* The keyword checkbox should become editable.
* The checkbox controls whether the associated keyword is **active or inactive**.
* Checked = active.
* Unchecked = inactive.
* Changes should follow the application's existing profile editing/save/cancel behavior.
* Do not persist checkbox changes prematurely if the rest of the profile editor only persists changes when the user saves.

### Create Mode

When creating a new profile:

* The keyword checkbox should also be editable.
* It should serve the same purpose as in edit mode: indicating whether the keyword is active or inactive.
* Checked = active.
* Unchecked = inactive.
* The resulting state should be persisted according to the existing profile creation workflow.

## Important Distinction

Do not remove the checkbox/state indicator from read-only mode.

The desired behavior is:

* **View/read-only:** display active/inactive state, but do not allow editing.
* **Edit:** display active/inactive state and allow the user to change it.
* **Create:** display active/inactive state and allow the user to change it.

The same underlying active/inactive keyword value should be represented consistently across all three modes.

## Implementation Requirements

Before making changes:

1. Inspect the repository's existing documentation, architecture guidance, coding conventions, and relevant profile/keyword components.
2. Identify how the application currently distinguishes profile view, edit, and create modes.
3. Identify the existing data model/property representing whether a keyword is active.
4. Reuse the existing mode and state-management architecture rather than introducing a parallel mechanism unnecessarily.

Implement the smallest maintainable change necessary to provide the required behavior.

Ensure that:

* Read-only rendering cannot mutate keyword state.
* Edit/create rendering continues to update keyword state correctly.
* Existing keyword values are displayed correctly when opening an existing profile.
* Entering edit mode does not unexpectedly change existing keyword states.
* Canceling editing continues to behave consistently with the application's existing cancel semantics.
* Saving correctly persists modified keyword active/inactive states.
* Other profile fields and unrelated functionality are not changed.

If the current checkbox component does not provide an appropriately clear read-only presentation, adjust its disabled/read-only styling or rendering as needed while maintaining visual consistency with the existing application.

## Testing and Verification

Create or update appropriate unit tests covering at least:

* An active keyword appears checked in read-only/view mode.
* An inactive keyword appears unchecked in read-only/view mode.
* A keyword checkbox cannot be changed in read-only/view mode.
* Keyword checkboxes can be changed in edit mode.
* Keyword checkboxes can be changed while creating a profile.
* Existing keyword active/inactive values are preserved when transitioning from view mode into edit mode.
* Saving changes uses the selected active/inactive states correctly.
* Existing profile behavior unrelated to keyword activity remains unaffected.

Run the relevant unit tests and any existing automated test suites appropriate for the changed code.

Do not perform live/manual browser testing unless explicitly requested; live browser testing will be handled separately by the user.

## Acceptance Criteria

The work is complete when:

1. Viewing an existing profile clearly shows whether each associated keyword is active or inactive.
2. Keyword checkboxes cannot be modified while the profile is in read-only/view mode.
3. Entering edit mode makes those keyword checkboxes editable.
4. Creating a profile allows keyword active/inactive state to be selected.
5. Checked consistently means active and unchecked consistently means inactive.
6. Existing saved keyword states display correctly.
7. No unrelated profile functionality is regressed.
8. Relevant unit tests pass.

**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the repository's existing GitHub flow documentation rather than inventing a new workflow. Complete all applicable steps required by that documentation.


## Implementation Notes

- Saved the complete prompt before implementation; reviewed the workflow, README, relevant prior prompts, model, editor, matcher, storage/transfer contracts and prompt 002 GitHub publication instructions.
- Inspection found no existing keyword activity property: checkboxes previously represented temporary row selection. Added optional boolean `active` to existing keyword records, with absent activity defaulting to true for legacy strings/records and materialized legacy criteria. This intentionally supersedes the prior selection behavior without introducing a separate profile mode or persistence mechanism.
- Shared popup/sidebar checkboxes now show activity, with explicit Active/Inactive text. View mode uses native disabled inputs, read-only labels/tooltips, and a guarded change handler that restores the displayed value without mutating drafts or marking profiles dirty. Edit/create modes update existing draft rows; Save profile persists activity and profile Cancel restores saved values. New rows default active, text/criterion edits retain activity, and original saved objects are not mutated.
- Model validation accepts only boolean activity. The pure matcher skips inactive keywords in both groups, preserving their text/criteria. Existing storage abstraction, scanning projection and version-1 transfer validation preserve the additive field without a rewrite/migration. Legacy keywords stay active. Older extensions cannot import backups containing the new activity field; documented this compatibility limit.
- Updated README, features and requirements. Other profile fields, AI approval, criteria, search, removal and save semantics remain in their existing paths.
- Validation: final npm run check passed all 64 unit tests, build and the complete automated real-MV3 browser suite. New unit coverage exercises view states/defaults, guarded synthetic changes, view-to-edit preservation, draft isolation/cancel, create mode, text-edit retention, saving, storage recreation, both backup scopes, matching, validation and unrelated metadata/approval preservation. Updated browser checks verify activity in both surfaces, draft discard, create/save/reopen, disabled label/mouse and keyboard attempts, and edit/save behavior. Two initial test-only failures required narrowing a label locator and forcing the attempted click on its disabled control; the final full run passed. Node syntax checks, git diff --check and exact complete prompt preservation passed. No live/manual browser walkthrough or live AI calls were performed.
- GitHub flow: retained current main branch; fetched origin using the existing SSH identity from prompt 002 and verified no divergence. GitHub CLI authentication is invalid, so standalone review comments are unavailable. Request/change/validation/issues/next-step notes are preserved here and in the commit description using the documented fallback.
- Suggested next steps: user-run live Chrome verification of keyword activity in popup/sidebar; add CI for npm run check.
