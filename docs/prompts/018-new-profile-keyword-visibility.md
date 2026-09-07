# Prompt 018 — New Profile Keyword Visibility

## Purpose

Keep every added keyword visible in the unsaved profile draft.

## Prompt

**Before implementation:** First save this complete prompt in the repository's prompt documentation or prompts directory, following the project's existing prompt-tracking conventions. This must happen before implementation begins so the instruction can be tracked, reused, audited, and used to help reproduce the project later.

## Objective

Improve the keyword-entry experience when a user is creating a new profile.

Currently, when a user adds keywords while creating a profile, previously entered keywords are not consistently visible in the UI as additional keywords are added. The keywords are not actually lost: after the user saves the profile, all previously entered keywords are present. However, the current UI makes it appear as though earlier keywords have disappeared, which is confusing and can cause users to enter duplicates or question whether their input was saved.

Update the UI so that every keyword added during new-profile creation remains visibly displayed immediately after it is added, before the profile itself is saved.

## Requirements

* Inspect the existing new-profile creation flow and identify how keyword state is stored and rendered before profile submission.
* Preserve the current underlying behavior where all entered keywords are saved with the profile.
* Fix the presentation/state-rendering issue so previously added keywords remain visible while the user continues adding new keywords.
* As soon as a keyword is successfully added, it should appear in the visible list of selected/saved keywords for that new profile.
* Adding another keyword must not cause previously added keywords to disappear from the UI.
* The visible keyword list should accurately represent the complete set of keywords currently associated with the unsaved profile.
* Do not require the user to save the entire profile before the full keyword list becomes visible.
* Ensure the UI clearly distinguishes keywords that have already been added from the input used to add another keyword.
* Preserve any existing keyword removal/editing behavior unless a change is required to support this fix.
* Preserve existing validation and duplicate-prevention behavior. If duplicate keywords are already prevented, do not regress that behavior.
* Do not redesign unrelated parts of the profile creation UI.

## Repository and Architecture Requirements

Before changing code:

* Inspect and follow the repository's existing documentation, architecture, coding conventions, component patterns, state-management conventions, and UI patterns.
* Reuse existing keyword components, styling, state-management mechanisms, and design-system elements where appropriate.
* Avoid introducing a parallel state model if the existing architecture can represent the unsaved keyword collection correctly.
* Keep the implementation focused and avoid unnecessary refactoring of unrelated code.

Pay particular attention to whether the issue is caused by:

* the keyword input state replacing the accumulated keyword state,
* temporary/local state not being rendered,
* stale state updates,
* the rendered list being sourced only from persisted profile data,
* asynchronous state handling,
* or another mismatch between the draft profile state and the displayed keyword list.

Correct the underlying cause rather than adding a visual workaround.

## Expected Behavior

For example:

1. The user starts creating a new profile.
2. The user adds the keyword `React`.
3. `React` immediately appears in the visible keyword list.
4. The user enters and adds `TypeScript`.
5. The UI now visibly shows both `React` and `TypeScript`.
6. The user adds `Node.js`.
7. The UI visibly shows `React`, `TypeScript`, and `Node.js`.
8. The user saves the profile.
9. All three keywords remain associated with the saved profile.

At no point during steps 3–7 should previously added keywords visually disappear simply because the profile has not yet been saved.

## Edge Cases

Verify appropriate behavior for:

* Adding several keywords sequentially.
* Quickly adding multiple keywords.
* Attempting to add a duplicate keyword.
* Removing a keyword before the profile is saved, if removal is supported.
* Adding another keyword after removing one.
* Validation failures or invalid/empty keyword input.
* Editing another profile field after adding keywords.
* Profile-save failure: the visible draft keyword state should remain consistent with the application's existing unsaved-form behavior.
* Existing-profile editing, if it shares the same keyword component or state logic. Do not regress that flow.

## Testing and Verification

Create or update appropriate unit/component tests covering the changed behavior.

At minimum, test that:

* A newly added keyword becomes visible immediately.
* Previously added keywords remain visible after another keyword is added.
* Multiple sequentially added keywords are all rendered before the profile is saved.
* Duplicate handling continues to work according to existing behavior.
* Keyword removal continues to work if currently supported.
* Saving the profile still submits/persists the complete keyword collection.

Run the relevant unit tests and any repository-standard automated checks appropriate to the changed code.

Do not perform live/manual browser testing unless the repository's automated workflow specifically requires it. The user will perform live browser testing separately and provide feedback if needed.

## Acceptance Criteria

The task is complete when:

* Users can see every keyword they have added while creating a new profile.
* Previously added keywords do not visually disappear when another keyword is entered or added.
* The displayed keyword list before profile save matches the draft keyword state.
* Saving the profile continues to persist all selected keywords correctly.
* Existing keyword validation, duplicate handling, removal behavior, and profile editing behavior are not unintentionally regressed.
* Relevant automated tests pass.
* No unrelated UI or architectural changes are introduced.

**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the repository's existing GitHub flow documentation rather than inventing a new workflow. Complete all applicable steps required by that documentation.


## Implementation Notes

- Saved the complete prompt before implementation; reviewed the prompt workflow, README, shared profile/keyword components, relevant prompts 009/012/016/017 and the prompt 002/implementation-log publication workflow.
- Reproduced the visibility mismatch in automated isolated Chromium: with search set to React, adding React, TypeScript and Node.js showed only React before profile save, while all three persisted. The existing row collection and synchronous updates are correct; the active search hides nonmatching rows when they leave keyword editing mode.
- New-profile creation now resets search and hides its labeled control, keeping the complete draft collection rendered in each word tab. Search returns after profile save and remains available during existing-profile viewing/editing. Reused the existing draft rows, validation, save/removal controls and tab layout; no new state model, storage changes, matching changes or AI changes.
- Validation: npm run check passed all 76 unit tests, build and the complete automated MV3 browser suite. Added popup/sidebar component regressions for immediate/sequential and same-turn rapid additions, both word groups, duplicate/blank/length validation, removal and re-addition, other field changes, background broadcasts, failed save retention/retry, complete persisted collections and restored saved-profile search. Existing editing/search/criteria/activity tests remain passing. Syntax checks, git diff --check and exact prompt preservation passed.
- The first full run caught an incorrect new test expectation for the existing length error (under 121 characters); corrected the assertion and reran the complete check successfully. No manual/live browser walkthrough or live AI calls were performed.
- GitHub flow: retained main with no new branch, fetched origin using the existing prompt 002 SSH identity and confirmed no divergence. GitHub CLI credentials remain invalid, so request/change/validation/issues/next-step review notes are preserved here and in the commit description using the documented fallback for standalone comments.
- Next step: user-run live Chrome verification after reloading the rebuilt extension. Only the selected word tab is shown, with normal page scrolling for long lists, as required by prompt 016. If disappearance occurs with no active search, user reproduction details will be needed to investigate that separate cause.
