# Prompt 013 — Per-keyword matching criteria

## Purpose

Associate optional matching criteria with individual keywords.

## Prompt

**Before implementation:** First save this complete prompt in the repository's prompt documentation or prompts directory, following the project's existing prompt-tracking conventions. This must happen before implementation begins so the instruction can be tracked, reused, audited, and used to help reproduce the project later.

## Objective

Update the keyword system so that **Keyword Matching Criteria is a property of each individual keyword**, rather than a single setting that applies to all keywords within a profile.

Each keyword must be able to define its own optional matching/search criterion independently.

## Required Behavior

When a user adds or edits a keyword, allow them to specify:

1. The **keyword text**.
2. An optional **Keyword Matching Criteria / Search Criteria** that determines how that specific keyword should be matched.

The matching criterion must belong to the individual keyword record.

Do **not** implement Keyword Matching Criteria as a profile-level setting that controls every keyword in the profile.

For example, a profile should be able to contain keywords such as:

* `invoice` — contains/default matching
* `urgent` — starts with
* `^INV-[0-9]+$` — regular expression
* `completed` — exact match

Each keyword can therefore behave differently even though all of them belong to the same profile.

## Add/Edit Keyword UI

When creating or editing a keyword, provide a search/matching criteria selector associated with that keyword.

The user should be able to select a matching criterion if they want one.

The keyword text itself remains the actual search value. For example:

* Keyword text: `invoice`
* Matching criteria: `Starts With`

or:

* Keyword text: `^INV-[0-9]+$`
* Matching criteria: `Regular Expression`

Do not require users to encode matching behavior into the keyword text using labels or prefixes such as:

* `starts with: invoice`
* `regex: ^INV-[0-9]+$`

The criterion should be stored separately from the keyword text while remaining part of the same keyword object/record.

## Matching Criteria

Inspect the existing repository to determine which matching/search criteria are already supported and preserve existing behavior and terminology wherever possible.

Expected examples may include criteria such as:

* Contains/default keyword matching
* Starts With
* Ends With
* Exact Match
* Regular Expression / Regex

Do not unnecessarily introduce new criteria if the application already defines the allowed options elsewhere.

If no criterion is selected, preserve the application's existing/default keyword matching behavior.

## Data Model

Update the keyword model/schema as necessary so each keyword can store its own matching criterion.

Conceptually, a keyword should resemble:

```text
Keyword
- text
- matchingCriteria
```

Use the repository's existing naming conventions and architecture rather than introducing these exact names if equivalent fields already exist.

A profile containing multiple keywords must support different criteria for different keywords.

Do not duplicate the criterion at the profile level unless a profile-level field already exists for an unrelated reason.

## Existing Data and Backward Compatibility

Existing keyword/profile data must continue working.

If existing keywords do not contain a matching criterion, interpret them using the current/default matching behavior.

If persistence, serialization, database schemas, APIs, DTOs, configuration files, or migrations need changes, update them safely and preserve compatibility with existing stored profiles wherever practical.

Do not unnecessarily modify unrelated profile data.

## Keyword Evaluation

Update the keyword-matching logic so that evaluation uses the criterion attached to the particular keyword being evaluated.

For example, when iterating through profile keywords:

```text
for each keyword:
    evaluate input using keyword.text and keyword.matchingCriteria
```

Do not retrieve one matching criterion from the profile and apply it indiscriminately to every keyword.

For regex matching, use the project's existing regex handling and validation conventions. Invalid regular expressions should be handled gracefully and must not crash keyword processing.

## Validation

Ensure that:

* Keyword text continues to use the application's existing validation rules.
* Matching criteria values are restricted to supported criteria.
* Editing a keyword preserves its currently selected criterion.
* Changing one keyword's criterion does not modify any other keyword.
* Removing or leaving the criterion unset restores or uses the existing default behavior.
* Regex input is validated or safely handled according to the project's current architecture.

## Repository Documentation and Existing Architecture

Before modifying code, inspect the repository for:

* Existing prompt documentation.
* Project instructions and development documentation.
* Keyword/profile models.
* Keyword add/edit UI.
* Keyword matching/search logic.
* Existing matching-criteria constants, enums, types, or utilities.
* Persistence/database/API representations of keywords.
* Existing migrations or compatibility patterns.
* Relevant unit tests.
* GitHub flow documentation.

Follow the repository's established architecture, terminology, UI patterns, and coding conventions. Do not redesign unrelated parts of the application.

## Testing and Verification

Create or update appropriate unit tests covering at minimum:

* A profile containing multiple keywords with different matching criteria.
* `Starts With` matching for an individual keyword.
* Regex matching for an individual keyword.
* Default matching when no criterion is specified.
* Editing one keyword's criterion without changing other keywords.
* Persistence/serialization of the criterion where applicable.
* Loading existing keywords that do not yet have a criterion.
* Invalid or unsupported criteria being handled safely.
* Invalid regex patterns being handled without crashing the application.

Run all relevant unit tests and resolve failures caused by this implementation.

Do not perform live/manual browser testing unless explicitly required by existing repository instructions. The user will perform live browser testing separately and provide feedback afterward.

## Acceptance Criteria

The work is complete when:

* Keyword Matching Criteria is stored per individual keyword.
* There is no requirement for all keywords in a profile to share the same criterion.
* Users can choose a criterion while adding a keyword.
* Users can view and change the criterion while editing a keyword.
* The keyword text remains separate from its matching criterion.
* Different keywords in the same profile can use different matching methods.
* Existing keywords without criteria continue to work using the previous/default matching behavior.
* Keyword evaluation uses each keyword's own criterion.
* Relevant unit tests pass.
* Unrelated functionality and profile behavior remain unchanged.

**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the repository's existing GitHub flow documentation rather than inventing a new workflow. Complete all applicable steps required by that documentation.


## Implementation Notes

- Saved the complete request before implementation and reviewed the prompt-processing flow, architecture, prompts 002/008/009/012, matching contract, editor, model, transfer, storage and tests.
- Added optional keyword records `{ text, matchingCriteria }` alongside legacy strings. Reused all 17 existing match types; word/phrase/regex search values come from keyword text, length types retain numeric configuration, and structural types retain automatic recognition with keyword text naming the search. Missing/null criteria retain default literal matching, which is distinct from Contains.
- Moved the selector into each Add/Edit Keyword row in the shared popup/sidebar editor. Saved rows display their criterion and numeric configuration. Edit restores the selection; Cancel preserves it; selecting Default clears it. Search and selection use the keyword text. Existing duplicate, length and capacity validation remains in the editor.
- Matching evaluates each record independently using the existing pure matcher and overlap resolution. Invalid criteria/regex fail closed. Regex source and case-sensitive behavior are preserved. AI approvals retain existing records and append default keywords without losing distinct legacy searches sharing a text value.
- Existing string keywords and independent rules.criteria remain readable, transferable and evaluable. Opening a legacy profile materializes standalone criteria as individual rows; Save profile stores those rows and clears the legacy criteria list. Other metadata is preserved. Storage and transfer version 1 accept the additive record form; older extensions cannot import record-based backups. Storage stays behind its existing abstraction, with no new dependencies or AI calls.
- Validation: final npm run check passed all 60 unit tests, build and the complete automated MV3 browser suite. Added tests for mixed positive/negative criteria, Starts with, Regex, default/unset criteria, independent edits/clearing, invalid configurations/patterns, transfer in both scopes, storage recreation, AI merge retention and legacy conversion. Browser coverage exercises all 17 per-keyword selectors, invalid row edits, persistence, transfer, and mixed-row edit/cancel/clear behavior. An initial new browser assertion matched a hidden input as well as the active input; scoped the locator and reran the complete check successfully. git diff --check and exact prompt preservation passed. No live/manual browser walkthrough or live AI calls were performed.
- Documentation updated in README, features, matching criteria and requirements. Existing native-regex runtime/backtracking limitations remain. Converting a legacy profile whose combined rules exceed 200 rows in one group requires removing entries before saving; failed validation preserves original storage.
- GitHub flow: main branch, no new branch; fetched origin using the existing SSH identity from prompt 002 and confirmed no divergence. GitHub CLI credentials remain invalid, so standalone comments are unavailable; request/change/validation/issues/next-step notes are retained here and in the commit description using the documented fallback.
- Suggested next steps: user-run live Chrome verification; execution isolation for expensive regex; CI for npm run check.
