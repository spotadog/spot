# Prompt 016 — Positive and Negative Word Tabs

## Purpose

Switch between positive and negative word lists in place using accessible tabs and normal page scrolling.

## Prompt

**Before implementation:** First save this complete prompt in the repository's prompt documentation or prompts directory, following the project's existing prompt-tracking conventions. This must happen before implementation begins so the instruction can be tracked, reused, audited, and used to help reproduce the project later.

## Objective

Update the existing Positive Words / Negative Words UI so users can switch between the two word lists using tabs, while removing the internal scrolling currently used within these sections.

## Requirements

1. Inspect the existing repository documentation, architecture, UI conventions, and relevant implementation before making changes. Follow the project's established patterns and avoid unnecessary changes to unrelated functionality.
2. Replace the current Positive Words and Negative Words presentation with a tab-based interface:
   - Add a **Positive Words** tab.
   - Add a **Negative Words** tab.
   - Selecting **Positive Words** should display the positive-word content.
   - Selecting **Negative Words** should display the negative-word content.
   - Only the selected tab's word list should be displayed at a time.
   - Clearly indicate which tab is currently active.
   - Preserve all existing word data and functionality.
3. Remove the internal scrolling behavior from both the Positive Words and Negative Words sections:
   - Do not use a fixed-height or max-height scrollable container for either word list.
   - Remove `overflow-y: auto`, `overflow: scroll`, or equivalent internal scrolling behavior associated with these sections.
   - Allow the selected word list to expand naturally to display all of its content on the page.
   - The user should use the normal page scroll when necessary rather than scrolling inside the Positive/Negative Words component.
4. Keep the Positive and Negative Words functionality within the same page. The tabs must switch content in place and must not navigate to separate pages or routes.
5. Preserve the existing styling and design language as much as possible. The tabs should integrate cleanly with the current UI and work correctly across supported screen sizes.
6. Ensure the tab controls are accessible:
   - Use appropriate semantic controls and ARIA attributes where applicable.
   - Support keyboard navigation/focus according to the project's existing accessibility conventions.
   - Make the active state visually clear.
7. Do not modify unrelated functionality or redesign surrounding parts of the page unless required to support this change.

## Testing and Verification

Create or update appropriate unit/component tests covering the new behavior, including:

- Positive Words can be selected and displayed.
- Negative Words can be selected and displayed.
- Switching tabs displays the correct corresponding content.
- Only the active tab's word list is displayed.
- Existing positive and negative word data remains intact.
- The Positive/Negative Words content container no longer has its own vertical scrolling behavior.

Run all relevant unit tests, linting, type checking, and other repository-defined automated checks applicable to the modified code.

Do not perform live or manual browser testing unless the repository's automated test workflow specifically requires it. The user will perform live browser testing and provide feedback afterward.

## Acceptance Criteria

The work is complete when:

- Positive Words and Negative Words are accessible through separate tabs on the same page.
- Clicking/selecting each tab shows the corresponding word list.
- There is no internal vertical scrollbar within either word-list section.
- The selected list expands naturally and normal page scrolling is used if the page becomes longer.
- Existing functionality and word data are preserved.
- The implementation follows existing repository conventions.
- Relevant automated tests pass.

**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the repository's existing GitHub flow documentation rather than inventing a new workflow. Complete all applicable steps required by that documentation.

## Implementation Notes

- Saved the complete request before implementation; reviewed the prompt workflow, README, features/requirements, shared UI, tests, relevant prompts 002/009/012/014/015, and the implementation log’s GitHub flow.
- Added Positive Words / Negative Words tabs to the shared popup/sidebar editor. ARIA tablist/tab/tabpanel relationships, roving focus, Arrow Left/Right wraparound, Home/End and existing focus styling support keyboard use. Both editors remain mounted, preserving data, search, activity, criteria, counts and drafts. New/different profiles select Positive Words; same-profile refreshes retain the selected tab.
- Removed the keyword rows’ maximum height and internal overflow. Selected lists expand naturally within the page at both narrow and wider widths; existing popup page scrolling remains. No storage, matching, AI, routes or schema changes.
- Pending keyword validation reveals its tab before focusing the unfinished input. Existing editing, saving and cancellation behavior remains intact.
- Validation: npm run check passed all 71 unit tests, build, and the complete automated MV3 browser suite. Added component checks for both surfaces, tab selection and exclusivity, keyboard navigation/focus, unchanged URL, 200 rows in each list, 320/680px layouts, computed non-scrolling containers, natural list/page growth, hidden draft validation and saved data/criteria/activity preservation. Updated existing interactions to select their target tab. git diff --check passed. No separate lint/typecheck scripts are configured. No manual/live browser testing or live AI calls performed.
- The first automated run exposed a new test-fixture mistake: profile.save returns an ID, not a full profile. Corrected the fixture to read the saved profile through state.get and reran the complete workflow successfully.
- GitHub flow: retained main with no new branch, fetched origin using the existing SSH identity from prompt 002 and confirmed no divergence. GitHub CLI authentication remains invalid; request/change/validation/issues/next-step review notes are retained here and in the commit description using the documented fallback for standalone comments.
- Next step: user-run live Chrome verification of the tabs and normal page scrolling. No known implementation blockers remain.
