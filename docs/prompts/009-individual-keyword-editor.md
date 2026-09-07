# Prompt 009 — Individual Keyword Editor

## Purpose

Manage profile keywords as individually selectable and editable items.

## Prompt

**Before implementation:** First save this complete prompt in the repository's prompt documentation or prompts directory, following the project's existing prompt-tracking conventions. This must happen before implementation begins so the instruction can be tracked, reused, audited, and used to help reproduce the project later.

## Objective

Update the profile keyword management UI and underlying data handling so that **each keyword is stored, displayed, selected, and edited as a separate individual record**.

The current implementation uses one large text box where multiple keywords are entered or listed together. Replace that experience with a clear, structured interface where every keyword is its own item.

The target users are **novice users**, so the UI must be extremely clear and should avoid requiring users to understand delimiters, comma-separated values, line-separated values, or any other bulk-text formatting convention.

## Core Requirements

1. Each keyword associated with a profile must exist as a separate record/item rather than being stored or presented as part of one large free-form keyword text field.

2. In the profile UI, display keywords as distinct individual entries.

3. A user must be able to select a single keyword independently from all other keywords.

4. A user must be able to edit one keyword without affecting the other keywords on the profile.

5. A user must be able to add a new keyword as its own record.

6. A user must be able to remove an individual keyword without editing or rebuilding the entire keyword list.

7. Do not require the user to enter multiple keywords in a single text box.

8. Do not expose comma-separated, newline-separated, JSON, or other bulk keyword syntax to the user.

## UX Requirements

Design the interaction specifically for novice users.

The interface should make it visually obvious that every keyword is a separate item. Prefer a simple pattern such as individual rows, cards, chips with clear editing controls, or another established UI pattern consistent with the existing application.

Each keyword should have an obvious way to:

* Select it.
* Edit it.
* Save changes.
* Delete/remove it when deletion is allowed.

Provide a clearly labeled control such as **Add Keyword** for creating another keyword.

Editing one keyword should not put the entire keyword collection into an ambiguous free-form editing state.

Avoid interfaces where the user has to understand how keywords are separated from one another.

Use clear labels, controls, validation messages, and confirmation behavior consistent with the rest of the application.

## Data and Implementation Requirements

Inspect the existing profile and keyword data model before making changes.

If keywords are currently persisted as a single string or combined text value, update the implementation as necessary so the application can reliably treat them as separate keyword records while preserving existing user data.

If a database/schema migration is required:

* Create the appropriate migration using the repository's existing migration conventions.
* Preserve all existing keywords.
* Safely split or migrate existing keyword data where possible.
* Prevent accidental data loss.
* Make the migration repeatable and safe according to the project's existing database practices.

If keywords are already represented individually in the backend but combined only in the UI, avoid unnecessary schema changes and update only the layers required to support the intended behavior.

Keep API contracts, types, models, validation, and frontend state consistent with the new individual-keyword behavior.

## Validation and Edge Cases

Handle at least the following cases appropriately:

* Empty keyword submissions.
* Accidental leading or trailing whitespace.
* Duplicate keywords, according to the application's existing business rules.
* Editing a keyword to a value that already exists.
* Deleting a keyword.
* Profiles with no keywords.
* Profiles with one keyword.
* Profiles with many keywords.
* Existing profiles created before this change.

Do not silently overwrite another keyword when editing an individual item.

## Backward Compatibility

Preserve existing profile data and unrelated profile functionality.

Do not redesign unrelated parts of the profile page or application.

If older data is stored in the previous combined format, ensure it remains accessible after this change and is converted or normalized safely as needed.

## Testing and Verification

Add or update tests covering the individual-keyword workflow, including:

* Creating multiple keywords and confirming they become separate records.
* Selecting one keyword independently.
* Editing one keyword without changing the others.
* Deleting one keyword without changing the others.
* Validation behavior.
* Existing profile data migration or compatibility, if applicable.
* UI rendering for profiles with zero, one, and multiple keywords.

Manually verify the complete novice-user workflow from the profile interface.

Confirm that there is no remaining primary workflow where users are expected to manage all profile keywords through one large combined text box.

## Acceptance Criteria

The work is complete when:

* Every profile keyword is represented as an individual record/item.
* Each keyword can be independently selected.
* Each keyword can be independently edited.
* Each keyword can be independently removed where deletion is supported.
* New keywords can be added individually.
* Users no longer need to type or manage an entire keyword list in one large text box.
* The UI clearly communicates the individual-item model to novice users.
* Existing profile keyword data is preserved.
* Relevant automated tests pass.
* Existing unrelated functionality continues to work.

Before making changes, inspect and follow all relevant repository documentation, architecture guidance, coding conventions, UI conventions, validation patterns, testing practices, and existing implementation patterns. Make the smallest coherent set of changes necessary to implement this requirement correctly and maintainably.

**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the repository's existing GitHub flow documentation rather than inventing a new workflow. Complete all applicable steps required by that documentation.


## Implementation Notes

- Saved the complete prompt before implementation; reviewed the prompt workflow, README, features/requirements, previous prompts 002/007/008, model, storage, worker, shared editor and tests.
- Replaced positive/negative profile textareas with a shared individual-row keyword editor in popup and sidebar. Each row owns its value, selection checkbox, edit/save/cancel controls and confirmed removal. New rows use Add Keyword. Selection is temporary and does not change matching. Scrollable groups keep large collections usable; focused edits scroll their controls into view.
- Existing persistence already uses separate string array items. Kept schema/backup version 1, profile APIs, storage abstraction, matching and dedicated AI service unchanged. No migration or keyword IDs are necessary for individual array items. Legacy combined API input remains supported by existing model normalization; the profile UI now submits arrays only. AI discovery seeds remain a separate, unchanged request input.
- Added domain validation for a single keyword: trims/collapses whitespace, rejects blank, case-insensitive duplicate within a group, over-120-character and over-200-item submissions. Editing excludes only its own record from duplicate/capacity checks. Same term in different colors remains supported; commas stay literal. Failed row validation preserves every other item.
- Save keyword updates a profile draft; Save profile persists the draft. Pending row edits block profile saving instead of silently discarding text. Cancel row restores the prior term or removes a new draft; profile cancel/close follows existing discard behavior. Failed persistence retains the draft and leaves stored profiles intact.
- Final npm run check passed all 51 unit tests, esbuild and the real unpacked MV3 browser suite. Coverage includes multiple individual additions, independent selection, isolated edit/delete, whitespace/empty/duplicate/length/capacity errors, pending edit protection, deletion confirmation cancellation, keyboard save, empty/single/multiple/200-item groups, pre-existing array compatibility, reopen persistence, both popup/sidebar, narrow layout and storage failure/retry. Existing matching, criteria, AI approval, transfer, browser restart and extension reload checks continue to pass. git diff --check and exact prompt preservation passed. No separate lint/typecheck scripts exist.
- Visually inspected generated popup and 320px sidebar screenshots, including full-capacity editing. The in-app Browser skill was read and startup attempted, but its runtime failed with “Cannot redefine property: process”; a hands-on browser walkthrough remains unverified. Automated tests exercised the complete requested UI workflow. During test expansion, corrected the storage-failure assertion to match the existing profile-save error (the original expectation belonged to imports).
- GitHub flow follows prompt 002 / implementation-log: current main branch, no new branch, existing SSH identity. Fetched origin and confirmed no divergence. GitHub CLI credentials are invalid; review notes (request, changes, issues and next steps) are preserved here and in the commit description using the documented fallback instead of standalone comments.
- Suggested next steps: perform the hands-on Chrome walkthrough when browser access is available and add CI for npm run check. Existing cross-panel last-save-wins behavior remains as documented in README.
