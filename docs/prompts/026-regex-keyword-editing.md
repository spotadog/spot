# Prompt 026 — Regex keyword editing

## Purpose

Fix editing of regex keywords while preserving their exact pattern values.

## Prompt

**Before implementation:** First save this complete prompt in the repository's prompt documentation or prompts directory, following the project's existing prompt-tracking conventions. This must happen before implementation begins so the instruction can be tracked, reused, audited, and used to help reproduce the project later.

## Objective

Fix the bug that occurs when editing a keyword that contains a regular expression (regex).

Currently, when a keyword is a regex or contains regex-specific/special characters, attempting to edit it throws an error because the value being placed into or handled by the input field is not properly escaped.

## Requirements

1. Inspect the existing keyword editing flow and identify where regex keyword values are passed to, rendered in, or read from the input field.
2. Ensure regex values and regex special characters are safely escaped or encoded wherever necessary so they can be displayed and edited without causing an error.
3. Preserve the exact logical value of the regex. Escaping required for the UI must not accidentally modify the regex that is ultimately saved or used by the application.
4. Ensure normal, non-regex keywords continue to work exactly as they do today.
5. Handle regex patterns containing special characters, backslashes, quotes, brackets, parentheses, anchors, quantifiers, and other characters that could interfere with input rendering or parsing.
6. Avoid double-escaping values when opening, editing, saving, and reopening a regex keyword.
7. Make the smallest appropriate change and avoid modifying unrelated functionality or restructuring unrelated code.
8. Follow the repository's existing architecture, coding conventions, validation rules, and error-handling patterns.

## Investigation

Before changing the implementation, inspect the relevant repository documentation and trace the complete value lifecycle:

- Stored keyword/regex value
- Value loaded for editing
- Value assigned to the input field
- User-edited value
- Value submitted/saved
- Value subsequently used as a regex

Determine whether the failure is caused by HTML/input escaping, JavaScript/string escaping, regex construction, serialization/deserialization, or another layer. Apply escaping at the correct boundary rather than applying broad escaping that could alter the regex semantics.

## Testing and Verification

Add or update appropriate unit tests covering:

- Normal plain-text keywords.
- Simple regex patterns.
- Regex patterns containing backslashes.
- Character classes such as `[a-z]`.
- Parentheses and groups.
- Quantifiers such as `*`, `+`, `?`, and `{1,3}`.
- Anchors such as `^` and `$`.
- Escaped regex characters.
- Quotes and other characters that may affect input values or serialization.
- Opening and saving a regex without changing it.
- Editing an existing regex and saving the modified value.
- Reopening a saved regex to verify that it has not been double-escaped or otherwise altered.

Run the relevant unit tests and confirm that the regression is fixed without breaking existing keyword behavior. Do not perform live/manual browser testing unless specifically requested; the user will handle live browser verification.

## Acceptance Criteria

The fix is complete when an existing regex keyword can be opened in the edit interface without throwing an error, its exact value is represented correctly in the input field, it can be edited and saved successfully, and reopening it produces the expected regex without corruption or double-escaping. Existing non-regex keyword functionality must remain unaffected.

**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the repository's existing GitHub flow documentation rather than inventing a new workflow. Complete all applicable steps required by that documentation.

## Implementation Notes

- Saved the complete request before implementation; reviewed the prompt workflow, README, prompts 009/013/025, model, matching, shared editor, storage adapter, and prompt 002 / implementation-log GitHub flow.
- Traced the current lifecycle: the storage adapter returns keyword records unchanged; editableKeywords retains their text; keywordEditor renders textContent and assigns keywordText directly to input.value; Save keyword reads input.value and uses validateKeyword; makeProfile preserves regex text during profile saves; matching constructs RegExp(value, 'gu'). No HTML, JavaScript source, or selector interpolation of keyword text occurs in this path.
- Added an isolated headless DOM unit test using existing esbuild/Playwright dependencies. Twelve cases exercise both positive and negative groups, unchanged and modified saves, recreated storage, JSON backup round trips, reopening, matching results, and preservation of unrelated rows. Cases cover plain text, literal punctuation, simple regex, backslashes, classes, groups, quantifiers, anchors, escaped metacharacters, quotes/markup, escape sequences, significant spaces, and named backreferences. All pass against the unchanged implementation. The initial test harness needed a mocked localhost origin to expose crypto.randomUUID; this was a fixture issue, not an application failure.
- The reported editing exception has not been reproduced. Requested the exact failing regex and error message from the user; no speculative escaping or production-code changes have been made. The fix and its publication remain pending that reproduction. The documented GitHub flow requires publishing on current main via the existing SSH identity, with review notes; no new branch was created.
- Validation: npm run check passed all 111 tests, the build, and the full automated MV3 browser suite. git diff --check passed. No live/manual browser testing was performed. Source remains unchanged; these passing tests establish coverage but do not establish that the reported bug is fixed.
