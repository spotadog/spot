# Prompt 008 — Keyword Match Criteria

## Purpose

Support 17 configurable keyword match types throughout profile editing, evaluation and transfer.

## Prompt

**Before implementation:** First save this complete prompt in the repository's prompt documentation or prompts directory, following the project's existing prompt-tracking conventions. This must happen before implementation begins so the instruction can be tracked, reused, audited, and used to help reproduce the project later.

# Objective

Add a comprehensive set of **keyword match types / matching logic** to the application. These match types must be available as selectable **keyword matching criteria** wherever keyword matching rules are configured or evaluated.

Implement the functionality and update the project's documentation so that all supported match types are clearly documented as product features.

# Before Making Changes

1. Inspect the repository structure and existing documentation.
2. Read and follow all relevant repository instructions, architecture documentation, coding conventions, testing requirements, and existing workflows.
3. Identify the current implementation of:

   * Keywords
   * Keyword criteria
   * Match types
   * Rule/criteria configuration
   * Text/token processing
   * Keyword evaluation
   * Validation
   * Relevant UI components, APIs, schemas, models, persistence, and tests
4. Extend the existing architecture rather than creating a parallel matching system.
5. Preserve existing behavior and backward compatibility unless a change is explicitly required by this prompt.
6. Avoid unrelated refactoring or changes.

# Required Keyword Match Types

Implement the following match types as keyword match criteria:

| Match Type             | Behavior                                                                                               | Example                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------- |
| **Exact word**         | Matches the complete word, respecting word boundaries rather than matching it as part of another word. | `dog`                           |
| **Contains**           | Matches when a word contains the specified text anywhere within it.                                    | `doghouse`, `bulldog` for `dog` |
| **Starts with**        | Matches when a word starts with the specified text.                                                    | `doghouse`, `doggy` for `dog`   |
| **Ends with**          | Matches when a word ends with the specified text.                                                      | `bulldog`, `underdog` for `dog` |
| **Exact phrase**       | Matches an entire specified phrase.                                                                    | `hot dog`                       |
| **Starts with phrase** | Matches when the relevant text starts with the specified phrase.                                       | `artificial intelligence...`    |
| **Ends with phrase**   | Matches when the relevant text ends with the specified phrase.                                         | `...machine learning`           |
| **Shorter than**       | Matches words containing fewer than X characters.                                                      | `< 5 characters`                |
| **Longer than**        | Matches words containing more than X characters.                                                       | `> 10 characters`               |
| **Exact length**       | Matches words containing exactly X characters.                                                         | `5 characters`                  |
| **Between lengths**    | Matches words whose character length falls within a configured range.                                  | `5–10 characters`               |
| **Number**             | Matches numeric values.                                                                                | `123`, `42`                     |
| **URL**                | Matches web addresses/URLs.                                                                            | `example.com/...`               |
| **Email**              | Matches email addresses.                                                                               | `name@example.com`              |
| **Hashtag**            | Matches hashtags.                                                                                      | `#dog`                          |
| **@ Mention**          | Matches usernames/mentions beginning with `@`.                                                         | `@spotadog`                     |
| **Regex (Advanced)**   | Allows an advanced user to supply a custom regular expression for pattern matching.                    | `\b(dog\|cat)s?\b`              |

# Matching Semantics

Define the behavior of each match type clearly and consistently.

The implementation must distinguish between **word-based criteria**, **phrase/text-based criteria**, **structural criteria** such as URL/email/hashtag/mention, **length-based criteria**, and **advanced regex criteria**.

Do not implement all match types as superficial aliases for the same underlying string operation. Each criterion must behave according to its documented semantics.

Where the existing application already defines concepts such as case sensitivity, Unicode handling, punctuation handling, tokenization, normalization, or whitespace normalization, preserve those conventions.

If these behaviors are currently undefined, establish sensible and consistent behavior and document it.

Pay particular attention to:

* Word boundaries
* Punctuation adjacent to words
* Multiple spaces
* Newlines
* Uppercase/lowercase input
* Unicode characters
* Empty input
* Empty criteria
* Invalid numeric ranges
* Invalid regular expressions
* URLs with and without schemes where appropriate
* Email validation/matching
* Hashtags and mentions adjacent to punctuation
* Numeric values surrounded by punctuation or text

# Length-Based Criteria

The following criteria require numeric configuration rather than a normal keyword value:

* Shorter than
* Longer than
* Exact length
* Between lengths

Validate these values appropriately.

For **Between lengths**, support a minimum and maximum length and ensure invalid ranges cannot be configured, including cases where the minimum exceeds the maximum.

Clearly define whether range boundaries are inclusive. Unless the existing product semantics require otherwise, treat **Between lengths** as inclusive so that `5–10` matches words with lengths 5 through 10.

# Structural Match Types

Implement reliable recognition for:

* Number
* URL
* Email
* Hashtag
* @ Mention

These should operate as first-class match criteria and should not require users to manually construct regular expressions.

Reuse mature existing utilities or dependencies already present in the repository where appropriate rather than duplicating parsing logic unnecessarily.

# Regex (Advanced)

Provide an advanced regex matching criterion.

The implementation must:

* Accept a user-provided regular expression.
* Validate the expression before using or persisting it where appropriate.
* Handle invalid patterns gracefully.
* Prevent an invalid regex from crashing keyword evaluation.
* Surface a useful validation/error message through the application's existing error-handling mechanism.
* Follow the project's existing security and performance practices for user-supplied patterns.

Do not silently modify a user's regex in a way that changes its intended semantics.

# Integration

Integrate these match types throughout all relevant layers of the application.

Depending on the repository architecture, this may include:

* Domain models
* Enums/constants
* Schemas
* Database/persistence representation
* Serialization/deserialization
* APIs
* Validation
* Matching/evaluation engine
* Configuration UI
* Forms and controls
* Import/export functionality
* Existing rule builders
* Tests
* Documentation

Do not implement only the matching functions if users also need to be able to select and configure these criteria through the application's existing keyword-rule workflow.

The match types should appear naturally alongside existing keyword criteria and follow the project's existing UX patterns.

# Backward Compatibility

Existing keyword rules and previously stored criteria must continue to work.

If the persisted representation of keyword criteria needs to change, provide an appropriate backward-compatible migration or compatibility layer following the repository's established migration conventions.

Do not reinterpret existing rules in a way that silently changes their matching behavior.

# Testing and Verification

Add or update automated tests for every match type.

At minimum, cover:

* Positive matches
* Negative matches
* Boundary conditions
* Case behavior
* Punctuation
* Multiple-word input
* Empty values
* Unicode where supported
* Invalid configuration
* Length boundaries
* Invalid length ranges
* Valid and invalid regex
* Number recognition
* URL recognition
* Email recognition
* Hashtag recognition
* @ mention recognition
* Existing keyword rules to verify backward compatibility

For example, `dog` using **Exact word** should match `dog` as a word but should not accidentally behave like **Contains** and match `doghouse`.

Conversely, `dog` using **Contains** should match examples such as `doghouse` and `bulldog`.

Verify **Starts with** and **Ends with** independently so their semantics cannot accidentally collapse into generic substring matching.

Test phrase criteria independently from word criteria.

Run the repository's applicable test suite, linting, type checking, formatting checks, builds, and other documented verification commands.

Fix failures caused by this implementation without making unrelated changes.

# Documentation

Update the project's relevant user-facing and developer documentation.

Document these match types as supported **Keyword Match Types / Keyword Match Criteria**, including:

* Match type name
* What it does
* Example
* Required configuration
* Important matching semantics
* Validation behavior where relevant

Include a table equivalent to the match-type table in this prompt so users can quickly understand the available criteria.

Also update any existing feature lists, keyword-rule documentation, configuration documentation, API documentation, or help text where these capabilities belong.

Ensure the documentation describes the actual implemented behavior rather than an intended or hypothetical implementation.

# Acceptance Criteria

The work is complete when:

1. All 17 requested match types are implemented.
2. They can be used as keyword matching criteria through the application's existing keyword-rule system.
3. Each criterion behaves according to the semantics described above.
4. Length-based criteria accept and validate their required numeric configuration.
5. Number, URL, email, hashtag, and @ mention matching work without requiring custom regex.
6. Advanced regex criteria validate and safely handle invalid patterns.
7. Existing keyword rules remain compatible.
8. Relevant UI/API/persistence layers support the new criteria where applicable.
9. Automated tests cover every match type and important edge cases.
10. Relevant user-facing and developer documentation is updated.
11. The repository's required tests and verification checks pass.
12. No unrelated behavior or architecture is unnecessarily changed.

**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the repository's existing GitHub flow documentation rather than inventing a new workflow. Complete all applicable steps required by that documentation.


## Implementation Notes

- Saved the complete request before implementation and reviewed architecture, matching/model/transfer/UI/scanner paths, previous prompts 002/004/007, and the repository publication workflow.
- Added the shared 17-type catalog and strict criterion validation in matching/criteria.js. The existing matcher dispatches word, phrase, length, structure and regex criteria into its existing typed interval/deduplication/red-precedence pipeline; no parallel scanner, storage adapter, AI path, dependencies or permissions were introduced.
- Added optional rules.criteria in schema/transfer version 1. Missing criteria retain original literal list behavior, including historical punctuation and wholeWords behavior. Profile save accepts an editable criteria array; omitted arrays preserve saved criteria, and empty arrays remove them. Toggle/AI approval and scanning projection preserve criteria. Both transfer scopes validate and preserve them exactly.
- Added shared popup/sidebar controls for all 17 types, positive/negative selection, type-specific numeric/text fields, add/remove, persisted editing and useful validation errors. Criteria-only profiles activate scanning and receive normal dynamic refresh/global controls.
- Defined Unicode token and code-point length behavior, literal phrase whitespace/edge semantics, practical structure recognizers, and exact native JavaScript gu regex semantics in docs/keyword-match-criteria.md. Updated README, features and requirements. No Unicode composition normalization or regex source rewriting occurs. Regex is case-sensitive; other textual criteria ignore case.
- Validation: final npm run check passed 49 unit tests, esbuild, and the real unpacked MV3 browser suite. New tests cover all 17 types both in pure evaluation and through UI-to-worker-to-page highlighting, boundary distinctions, overlapping phrase suffixes, Unicode/astral offsets, empty/invalid configurations, numeric limits, structural boundaries, valid/invalid/zero-width regex, backward compatibility, transfer/store recreation, criteria-only and negative highlights, failed save retention and removal. Existing AI, lifecycle, browser restart and reload checks continue to pass. No separate lint, formatting or typecheck scripts exist. Exact prompt preservation and git diff --check passed; visually inspected the criterion editor screenshot.
- Browser verification initially exposed ambiguous nested select labels; changed controls to explicit unique label associations and reran successfully. Final review also corrected overlapping end-phrase recognition and Unicode email boundaries, with regression tests.
- Limits: existing text-node scanning scope remains. Structural recognizers use documented practical syntax, without network verification. Native regex syntax is validated and invalid patterns fail closed, but synchronous native matching has no execution timeout: expensive valid patterns can slow a page despite the 120-character pattern limit. This limitation is explicit in UI help and documentation.
- GitHub flow: current main branch, no new branches, existing SSH identity from prompt 002. GitHub CLI authentication remains invalid; requested review notes (request, changes, issues and next steps) are retained in this prompt, implementation log and commit description using the documented fallback.
- Suggested next work: add execution isolation/time limits for advanced regex and measure large-page matching performance; add CI for npm run check. Existing native Chrome toolbar/docking and live AI smoke checks remain manual.
