# Prompt 012 — Profile Selection and Search

## Purpose

Prioritize viewing, searching and editing a selected profile above profile transfers.

## Prompt

**Before implementation:** First save this complete prompt in the repository's prompt documentation or prompts directory, following the project's existing prompt-tracking conventions. This must happen before implementation begins so the instruction can be tracked, reused, audited, and used to help reproduce the project later.

## Objective

Update the profile management experience so the primary workflow focuses on selecting, viewing, searching, and editing individual profiles and their keywords.

The existing profile import/export actions should remain available, but they are secondary functionality and should be moved toward the bottom of the interface.

Before making changes, inspect the repository's existing documentation, architecture, UI conventions, component patterns, styling system, and relevant profile-management implementation. Follow existing project conventions and avoid unnecessary changes to unrelated functionality.

## Profile Import and Export Actions

Replace the existing **"Download All Profiles"** terminology and related wording with the following actions:

* **Export Profiles**
* **Import Profiles**
* **Import Profile**

Do not use wording such as **"All"** or **"One"** in the action labels.

These import/export actions are not the primary functionality of this screen, so move them toward the bottom of the profile management interface rather than presenting them prominently at the top.

Preserve the existing underlying import/export functionality unless a change is required to support the updated labels or layout.

## Profile Selection

The primary interface should allow the user to select a profile from a dropdown containing all available profiles.

The dropdown should:

* List all available profiles.
* Clearly indicate the currently selected profile.
* Update the profile view immediately when another profile is selected.
* Handle an empty profile list gracefully.
* Follow the application's existing dropdown/select component patterns where available.

Once a profile is selected, display the details for that profile.

## Profile Details View

The selected profile's details should be presented in a clear profile-view screen or section.

The default state should be a viewing state rather than automatically placing the profile into edit mode.

Provide an **Edit** control that allows the user to enable or disable editing.

The edit behavior may be implemented as an Edit button or an Edit on/off state, depending on the project's established UI conventions, but the behavior must be clear to the user.

When editing is disabled:

* Profile information should be read-only.
* Existing keywords should be viewable and searchable.
* Users should still be able to select a keyword to inspect it.

When editing is enabled:

* Allow the profile's editable details to be changed.
* Allow existing keywords to be selected and edited.
* Allow new keywords to be added using the existing keyword creation/editing flow wherever practical.
* Preserve existing validation and persistence behavior.

Do not create a separate unrelated keyword-management experience if the application already has an established keyword editing flow that can be reused.

## Keyword Search

Add a keyword search field directly to the selected profile view.

The user should be able to type into the search field and have the displayed keyword list automatically filtered as they type.

The search should:

* Update without requiring a separate Search button.
* Filter the keywords belonging to the currently selected profile.
* Be case-insensitive unless the existing application intentionally behaves otherwise.
* Handle partial keyword matches.
* Clear cleanly and restore the full keyword list.
* Show an appropriate empty state when no keywords match the search.
* Reset or appropriately refresh when the selected profile changes.

Avoid unnecessary network requests if the profile's keywords are already loaded locally.

## Keyword Selection and Editing

Keywords displayed in the profile view should be selectable.

When a user selects a keyword, expose the appropriate keyword details and allow that keyword to be edited when profile editing is enabled.

The interaction should support the following flow:

1. Select a profile from the profile dropdown.
2. View that profile's details and keywords.
3. Search/filter the profile's keywords by typing in the keyword search field.
4. Select an existing keyword.
5. Enable Edit mode if it is not already enabled.
6. Edit the selected keyword.
7. Save the changes using the project's existing save/update conventions.

When Edit mode is enabled, also allow users to add a new keyword using the same established keyword flow.

Ensure selecting or editing a keyword does not accidentally change the selected profile.

## Layout Priority

The interface hierarchy should emphasize:

1. Profile selection.
2. Selected profile details.
3. Keyword search.
4. Keyword viewing, selection, addition, and editing.
5. Import/export functionality.

The profile import/export controls should therefore appear lower on the screen because they are secondary administrative actions rather than the main workflow.

Maintain responsive behavior and existing visual conventions.

## State and Data Handling

Ensure the implementation handles state cleanly for:

* Selected profile.
* Profile loading state.
* Profile edit mode.
* Keyword search/filter text.
* Selected keyword.
* Keyword editing state.
* Adding a new keyword.
* Saving changes.
* Errors.
* Empty profile lists.
* Profiles with no keywords.
* Search results with no matches.

Avoid stale state when switching between profiles. For example, a keyword selected under one profile should not remain selected after switching to another profile unless that behavior is explicitly supported by the existing application.

Do not lose unsaved changes silently. Follow the repository's existing behavior for dirty forms, navigation, or profile switching if such behavior already exists.

## Implementation Requirements

Reuse existing components, state-management patterns, APIs, services, forms, validation, and styling wherever practical.

Do not redesign unrelated portions of the application.

Maintain backward compatibility with existing profile data and existing import/export formats unless a format change is explicitly required.

Keep the implementation modular and maintainable. Avoid duplicating profile or keyword business logic between the new profile view and existing functionality.

Preserve accessibility, including appropriate labels, keyboard navigation, focus handling, button states, and dropdown behavior.

## Testing and Verification

Update or add tests appropriate to the repository covering at minimum:

* Profile dropdown renders the available profiles.
* Selecting a different profile updates the displayed profile details.
* Keyword search automatically filters keywords while typing.
* Clearing the search restores the full keyword list.
* Selecting a keyword works correctly.
* Read-only mode prevents unintended edits.
* Edit mode allows profile and keyword editing where applicable.
* A new keyword can be added while editing.
* Switching profiles does not retain incorrect keyword selection or stale data.
* Import/export actions remain functional.
* Labels use **Export Profiles**, **Import Profiles**, and **Import Profile**.
* No unnecessary **All** or **One** wording remains in these controls.
* Import/export controls appear as secondary functionality rather than the primary screen actions.

Run the repository's existing linting, formatting, type checking, tests, and build verification relevant to the changed code.

## Acceptance Criteria

The work is complete when:

* Users can select any available profile from a dropdown.
* Selecting a profile displays that profile's details.
* Profiles are read-only by default unless the existing product convention requires otherwise.
* An Edit control enables profile and keyword modification.
* Users can add new keywords through the editing flow.
* Users can search the current profile's keywords and see the list filter automatically as they type.
* Users can select and edit an existing keyword.
* The former **Download All Profiles** action has been replaced with the requested import/export terminology.
* The interface uses **Export Profiles**, **Import Profiles**, and **Import Profile** without unnecessary **All** or **One** wording.
* Import/export functionality has been moved toward the bottom of the interface and is visually secondary.
* Existing profile data, import/export behavior, and unrelated functionality remain working.
* Relevant tests and verification checks pass.

**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the repository's existing GitHub flow documentation rather than inventing a new workflow. Complete all applicable steps required by that documentation.


## Implementation Notes

- Preserved the complete prompt before implementation; reviewed prompt-processing-flow, README, features, prior profile/keyword prompts, shared UI, storage/worker contracts and prompt 002 publication instructions.
- Replaced profile cards with a native dropdown and selected-profile details in the shared popup/sidebar. Saved profiles open read-only; Edit enables profile fields, criteria and existing individual keyword controls. Save returns to viewing. New profiles begin editable and remain selected after saving.
- Extended the existing keyword editor with read-only mode and local, case-insensitive partial filtering across each profile’s positive/negative keywords. Selection stays available during viewing and survives enabling Edit; switching profiles clears search and row selection. Pending keyword edits remain visible during filtering, and empty groups/no results have distinct messages.
- Preserved keyword validation, individual Save keyword / Save profile semantics, confirmed removal, storage abstraction, matching and dedicated AI services. The internal profile.save response now returns the saved ID so the UI selects the exact newly created profile without guessing or a separate lookup; persisted profile and version-1 transfer formats are unchanged.
- Added draft-discard confirmation for profile switching, starting a new profile and canceling. Background refreshes retain open drafts and ignore older overlapping refresh results. Save blocks switching while in progress, retains failed drafts and reports progress/errors. Closing the extension page still discards unsaved changes and simultaneous cross-panel edits retain the documented last-save-wins behavior.
- Moved transfers below profile management and AI review into Profile backups. Labels are Export Profiles, Import Profiles and Import Profile; Export Profile preserves individual exports. Existing import confirmation, replacement behavior, validation and scanner refresh remain in place. Updated README/features and responsive popup width; inspected screenshots for both views at 320px.
- Final npm run check passed all 55 unit tests, build and the complete real-MV3 browser suite. Expanded browser coverage includes dropdown contents, selected details, search/clear/no results, selection across Edit, read-only controls, new profile selection, rename/keyword persistence, empty profiles, dirty-switch/cancel acceptance and rejection, unrelated broadcasts, narrow layout and transfer labels/placement. Existing transfer round trips, failures, matching, criteria, AI, restart/reload and keyword capacity checks remain exercised. Node syntax checks, git diff --check and exact prompt preservation passed. No separate linter, formatter or type-check scripts exist.
- During repeated full checks, the existing post-reload criterion scanner assertion intermittently timed out (contains expected doghouse/bulldog but observed no positive ranges). A targeted real-extension reproduction verified saved criteria and expected highlights, and the complete browser suite subsequently passed. The saved criterion was correct in a failing run. The independent criterion matrix now starts with a fresh page after the deliberate repeated-reload checks, and the final full check passed. Retained all reload and criterion assertions plus failure diagnostics; no unrelated scanner changes were introduced. The underlying post-reload interference remains a follow-up investigation. Native Chrome toolbar/docking still needs the existing desktop manual check.
- GitHub flow: current main branch, no new branch, existing SSH identity from prompt 002. Fetched origin and confirmed no divergence. GitHub CLI credentials remain invalid; request/change/validation/issue/next-step review notes are preserved here and in the commit description using the documented fallback for standalone comments.
- Suggested next steps: investigate the intermittent post-reload criterion assertion with the new diagnostics, run the native Chrome walkthrough, and add CI for npm run check.
