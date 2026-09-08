# Prompt 028 — Independent keyword saving

## Purpose

Separate project detail editing from independently persisted keyword changes.

## Prompt

**Before implementation:** Save this complete prompt in the repository's existing prompt documentation or prompts directory before making implementation changes. Follow the repository's existing naming and organization conventions.

The current UI is confusing because there is an Edit/Save flow for the profile or project details, plus a separate Edit/Save flow for each keyword. Users must also save the profile before keyword changes are saved, which creates an unnecessary double-save experience.

Update the UI so there is a single Edit action for the project details. Keywords should remain editable individually, and each keyword should be able to save its own changes independently without requiring the user to save the overall project details first.

The goal is to remove the double-save behavior and make it clear that:

- Project details have one Edit/Save flow.
- Each keyword can be edited and saved individually.
- Saving a keyword does not depend on saving the project details first.

Follow the repository's existing UI patterns, documentation, and conventions. Create or update the appropriate unit tests for this change and run the relevant tests.

**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the existing documentation rather than inventing a new workflow.

## Implementation Notes

- Saved the complete prompt before implementation and reviewed the prompt-processing flow, README, prompts 002/009/026/027, and the implementation-log GitHub flow.
- The shared popup/sidebar now keeps keyword controls available independently of profile detail Edit. Grouped profile name/enabled Save/Cancel controls above keyword management. Existing-profile row saves, additions, activity changes and confirmed removals persist immediately; detail Save/Cancel preserve saved keywords and unfinished row edits. Initial new-profile creation retains its existing name-and-keywords submission.
- Added serialized profile.keyword mutations through the existing worker/storage abstraction and a profile.details action that preserves stored keyword lists. The domain helper validates against the latest profile, preserves unrelated rows and metadata, materializes legacy criteria without duplication, and rejects stale row edits. Matching, AI services and storage schema remain unchanged.
- Failed row writes retain entered text/criteria/color for retry; failed activity writes restore the checkbox. In-flight persistence protects the form from conflicting UI actions. Background broadcasts and profile-detail actions retain open keyword drafts.
- Browser verification exposed Chrome storage reordering keyword object fields. Replaced property-order-sensitive comparison with keyword value/criterion/activity/color comparisons and added regression coverage. Updated older browser tests to wait for asynchronous row persistence and to assert the new independent-save behavior.
- Validation: final npm run check passed all 118 unit tests, the build and the complete automated unpacked-MV3 browser suite. Focused popup/sidebar tests also passed for independent save/reload, invalid unsaved profile details, multiple unfinished rows, detail Save/Cancel isolation, activity and removal. Unit coverage includes failure/retry, stale writes, legacy criteria, regex/color/activity preservation, concurrent row mutations and reordered storage fields. git diff --check passed. No live/manual browser testing was performed.
- Updated README, feature/requirement documentation and keyword criteria guidance. No known failures remain in the automated checks; native Chrome interaction remains a manual verification step. Concurrent edits to the same row fail with reopen guidance; concurrent profile-detail edits retain last-save behavior.
- GitHub flow: publish on current main with no new branch, using the existing SSH identity from prompt 002. Fetched origin and confirmed no divergence. GitHub CLI authentication remains invalid, so request/change/issue/next-step review notes are retained here and in the commit description using the documented fallback for standalone comments.
- Suggested next steps: reload the unpacked extension for the updated UI and complete the README native Chrome smoke checks; add CI for npm run check.
