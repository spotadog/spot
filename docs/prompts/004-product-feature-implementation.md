# Prompt 004 — Product Feature Implementation

## Purpose

Implement documented product behavior in dependency order while preserving working foundations.

## Prompt

# Spot a Dog — Begin Product Feature Implementation

## Before Implementation

First, save this **complete prompt** in the repository's prompt documentation or prompts directory, following the project's existing prompt-tracking conventions.

This must happen **before making any implementation changes** so the instruction can be tracked, reused, audited, and used to help reproduce the project later.

Do not overwrite or replace previous prompts. Preserve the repository's existing naming, numbering, organization, and formatting conventions.

## Objective

Review the documented **Spot a Dog product features and requirements** and begin implementing them.

The repository documentation is the source of truth for the currently defined product behavior.

Do not treat the features as independent tasks that can simply be implemented in the order they appear in the documentation. First understand the relationships and dependencies between features, then implement them in a logical dependency-driven order.

We will continue adding features to Spot a Dog, so implementation decisions should favor a clean, modular, maintainable, and extensible architecture.

## 1. Review the Repository First

Before writing implementation code:

1. Inspect the repository structure.
2. Read the relevant documentation in `/docs`.
3. Read the documented product features and functional requirements.
4. Review any existing architecture documentation.
5. Review existing implementation code.
6. Identify existing conventions and patterns that should be preserved.
7. Identify any existing tests and testing conventions.
8. Identify the documented GitHub workflow.
9. Understand what has already been implemented versus what remains to be built.

Do not unnecessarily replace working functionality that already satisfies the documented requirements.

## 2. Build a Feature Dependency Map

Before implementing the product features, analyze their dependencies.

Determine which features provide foundations required by other features.

For example, consider relationships between capabilities such as:

* Extension configuration and Manifest V3 foundation.
* Storage and persistent application state.
* Global Spot a Dog enabled/disabled state.
* Profile data model.
* Profile creation and management.
* Individual profile enabled/disabled state.
* Positive and negative keyword storage.
* Page scanning.
* Keyword and phrase matching.
* Highlight rendering.
* Positive versus negative highlight behavior.
* Popup UI.
* Sidebar / side panel UI.
* Shared UI components and application state.
* Settings.
* ChatGPT/API configuration.
* AI-assisted keyword discovery.
* AI-generated keyword review and approval.

These examples should not override the repository documentation. Use the actual documented requirements to determine the real dependency graph.

## 3. Implement in Dependency Order

Implement features beginning with the features or components that have the **fewest dependencies** and that provide foundations for other features.

Then progressively implement features that depend on those foundations.

The general principle should be:

**Foundation → Core domain logic → Storage/state → Scanning/matching → Highlighting → User interfaces → Integrations → Higher-level workflows**

However, determine the actual implementation order from the repository's architecture and documented requirements rather than blindly following this example.

Avoid implementing a higher-level feature by creating temporary or duplicated infrastructure that will immediately need to be replaced when its dependencies are implemented.

When Feature B depends on Feature A, prefer implementing and verifying Feature A before implementing Feature B.

## 4. Preserve Separation of Concerns

Keep the implementation modular.

Do not unnecessarily couple:

* Extension lifecycle.
* Global enabled/disabled state.
* Profile management.
* Keyword management.
* Storage.
* Page scanning.
* Text matching.
* Highlight rendering.
* Popup presentation.
* Sidebar / side panel presentation.
* Settings.
* AI integration.
* AI suggestion approval.

Business logic that is shared by the popup and sidebar should not be independently reimplemented in both interfaces.

Similarly, keyword matching should not be unnecessarily tied to the UI responsible for configuring keywords.

Design components so additional features can be introduced later without requiring large rewrites of unrelated functionality.

## 5. Implement Documented Behavior

Implement features according to the existing product and requirements documentation.

This includes all currently documented behavior that is appropriate for the current dependency stage.

Do not silently change documented requirements because another implementation would be easier.

If documentation contains a genuine conflict or an implementation-blocking ambiguity, document the issue and choose the solution that best preserves the existing product intent.

## 6. Incremental Implementation and Verification

Do not build everything as one large unverified change.

Work incrementally.

For each logical feature or foundational component:

1. Implement its required dependencies.
2. Implement the feature.
3. Verify the behavior.
4. Add or update appropriate tests.
5. Confirm existing functionality has not been unnecessarily broken.
6. Record the implementation in the build/change documentation.
7. Continue to the next dependency level.

Prefer meaningful, independently understandable implementation steps.

## 7. Tests

Add appropriate tests for implemented functionality.

Tests should cover important behavior and edge cases where practical.

Pay particular attention to boundaries between components, including:

* Global extension state versus individual profile state.
* Positive versus negative keywords.
* Keyword and phrase matching.
* Persistence and restoration of configuration.
* Enabling and disabling profiles.
* Enabling and disabling Spot a Dog globally.
* Shared behavior between popup and sidebar interfaces.
* AI-generated suggestions versus user-approved keywords.

Do not consider a feature complete merely because the code exists. Verify that it behaves according to the documented requirements.

## 8. Build / Change Documentation

Maintain documentation of the changes made during this implementation.

Create or update an appropriate build log, implementation log, changelog, or similar document within the `/docs` folder, following existing repository conventions where available.

For each meaningful implementation stage, record:

* Feature or capability implemented.
* Relevant requirements addressed.
* Major files/components created or modified.
* Important architectural decisions.
* Dependencies introduced or satisfied.
* Tests or verification performed.
* Known limitations.
* Deferred work.
* Any decisions that future implementation work needs to understand.

The purpose of this documentation is to make it possible for future development sessions and coding agents to understand **what was built, why it was built that way, and what remains to be done**.

Do not rely solely on Git history to communicate this information.

## 9. Keep Product Documentation Current

If implementation reveals information that materially affects the architecture or understanding of a documented feature, update the appropriate documentation.

Do not rewrite product requirements merely to match implementation shortcuts.

Requirements should continue to describe what the product is supposed to do, while implementation/build documentation should describe how the current version accomplishes it.

## 10. Prepare for Additional Features

Spot a Dog will receive additional requirements and features after this implementation.

Avoid unnecessary hard-coded assumptions that make future expansion difficult.

Prefer:

* Clear interfaces.
* Reusable modules.
* Explicit data models.
* Centralized state where appropriate.
* Shared services.
* Small focused components.
* Testable business logic.
* Minimal duplication.
* Backward-compatible data evolution where practical.

Do not over-engineer speculative features that have not been requested. The architecture should be **extensible without attempting to predict every future requirement**.

## 11. Completion Review

Before considering this implementation pass complete:

* Re-read the product requirements.
* Compare implemented behavior against the documented features.
* Verify the dependency order was sensible.
* Verify foundational components are not unnecessarily coupled to higher-level features.
* Run the project's tests.
* Run applicable linting, type checking, and build validation.
* Verify the extension builds successfully.
* Check for obvious regressions.
* Confirm the `/docs` implementation/change log accurately reflects what was actually changed.
* Clearly document anything that remains incomplete or intentionally deferred.

Do not claim that a feature is complete if only part of its documented behavior has been implemented.

## GitHub Flow

After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the repository's existing GitHub flow documentation rather than inventing a new workflow. Complete all applicable steps required by that documentation.


## Implementation Notes

- Preserved the complete attached prompt before implementation, after reviewing the workflow and relevant historical prompts.
- Reviewed all current requirements, architecture, source, and tests. Recorded the dependency map and stage-by-stage changes, tests, decisions, limitations, and next work in `docs/implementation-log.md`.
- Implemented independent typed negative matching, pure red overlap precedence, two highlight layers, negative-only scanning, revised keyword guidance, page availability feedback, actionable panel-open errors, and individual/all AI candidate dismissal.
- Preserved the MV3 foundation, storage adapter and schema, serialized worker mutations, shared UI messaging, and dedicated API service. Legacy negativeScope remains readable but inert. Approval now deduplicates before checking list capacity.
- Validation passed: 10 unit tests, esbuild build, real-extension browser suite via `npm run check`, visual inspection of panel/highlight screenshots, and diff whitespace checks. Tests include paused negative approval, profile overlap recomputation, storage failure, deleted targets, safe candidate rendering, both UI controls, availability feedback, and restart persistence.
- README/features/requirements reflect shipped behavior; native Chrome docking/toolbar checks and live OpenAI calls remain manual and unverified. Existing scanning scope/performance and storage limits remain documented.
- Followed prompt 002's GitHub convention: current main branch, existing SSH identity, no new branch. GitHub CLI authentication remains invalid; review notes are retained in the implementation log and commit description instead of standalone API comments.
