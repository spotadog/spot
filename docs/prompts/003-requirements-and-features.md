# Prompt 003 — Requirements and Features Documentation

## Purpose

Define the authoritative product requirements and feature set without implementing features, then follow the repository’s documented publication flow.

## Prompt

# Spot a Dog — Requirements and Features Documentation

## Before Implementation

First, save this complete prompt in the repository's prompt documentation or prompts directory, following the project's existing prompt-tracking conventions.

This must happen **before making any other changes** so the instruction can be tracked, reused, audited, and used to help reproduce the project later.

Do not replace or overwrite previous prompts. Preserve the project's existing naming, numbering, organization, and formatting conventions.

## Objective

Create or update the project documentation for **Spot a Dog** to formally define the application's requirements and features.

Spot a Dog is a browser extension that helps users quickly scan web pages by highlighting keywords and phrases relevant to subjects they care about.

The documentation created from this task should serve as the source of truth for future implementation work.

Do not implement these features as part of this task unless the repository's existing documentation workflow explicitly requires implementation. The primary purpose of this task is to document the requirements and feature set clearly.

## Requirements

### 1. Extension On/Off Control

The entire Spot a Dog extension must be capable of being turned **on or off** by the user.

When Spot a Dog is enabled:

* Enabled profiles participate in page scanning.
* Matching keywords and phrases are highlighted.
* Normal Spot a Dog functionality is available.

When Spot a Dog is disabled:

* Page scanning and keyword matching should stop.
* Spot a Dog should not add new highlights to webpages.
* Existing Spot a Dog highlights should be removed or disabled as appropriate.
* Profile configuration and settings should remain preserved.
* Turning the extension back on should restore normal operation using the user's existing configuration.

This global extension state is separate from the enabled/disabled state of individual profiles.

### 2. Popup and Sidebar / Side Panel Interfaces

Spot a Dog must support being viewed and controlled through both:

* A browser extension **popup**.
* A browser **sidebar / side panel**.

The user should be able to access the appropriate interface through a button click.

The popup should provide quick access to the most important Spot a Dog controls and information without requiring the user to leave the current webpage.

The sidebar / side panel should provide a larger persistent interface suitable for more detailed interaction with Spot a Dog while continuing to browse the current page.

The documentation should define the relationship between these two interfaces and identify which capabilities are shared between them.

Where practical, shared functionality should use common underlying components and application logic rather than maintaining two independent implementations.

### 3. UI Mode Controls

Provide clear button-based controls that allow the user to open or access Spot a Dog through the appropriate popup or sidebar experience.

Document expected behavior for:

* Opening Spot a Dog.
* Opening or switching to the sidebar / side panel.
* Using the popup for quick interactions.
* Closing the interfaces without disabling Spot a Dog.
* Turning Spot a Dog itself on or off independently of whether the popup or sidebar is currently visible.

Opening and closing the user interface must not be treated as enabling or disabling the extension.

### 4. Keyword Profiles

Users must be able to create **keyword profiles**.

A profile represents a particular:

* Topic
* Subject
* Category
* Keyword type
* Area of interest

Each profile should have at minimum:

* A user-defined name.
* Positive keywords and phrases.
* Negative keywords and phrases.
* An enabled/disabled state.

The architecture and documentation should allow additional profile configuration to be introduced later.

### 5. Positive Keywords

Each profile can contain a set of **positive keywords and phrases**.

When an enabled profile detects one of its positive keywords or phrases on a webpage, Spot a Dog highlights the matching text.

Positive matches must use a visually distinct highlight color from negative matches.

The requirements should support both individual words and multi-word phrases.

### 6. Negative Keywords

Each profile can contain **negative keywords and phrases**.

Negative keywords represent terms that the user wants to identify separately from positive matches.

Negative keyword matches must be highlighted in **red**.

Positive and negative matches must therefore be immediately distinguishable while scanning a webpage.

### 7. Independent Profile Activation

Every profile must be independently enabled or disabled.

For example, if a user has five profiles, they should be able to enable profiles 1, 3, and 5 while leaving profiles 2 and 4 disabled.

Disabling one profile must not disable or otherwise affect other profiles.

Only enabled profiles should participate in page scanning and highlighting.

This is separate from the global Spot a Dog on/off control. If Spot a Dog itself is disabled, no profiles should scan the page regardless of their individual state.

When Spot a Dog is re-enabled, the previously enabled profile states should remain intact.

### 8. ChatGPT Integration

Spot a Dog must support integration with ChatGPT for AI-assisted keyword discovery.

The user must be able to configure their API key through the extension's settings.

API credentials must be handled securely and must never be committed to the repository, hard-coded into the application, included in logs, or exposed unnecessarily.

Document the expected configuration and security requirements for API-key handling.

### 9. AI-Assisted Keyword Expansion

Users should be able to select or enter a keyword and ask ChatGPT to generate **similar, related, or contextually relevant words and phrases**.

The purpose is to improve the coverage of a profile without requiring the user to manually think of every possible keyword.

AI suggestions can include:

* Synonyms.
* Closely related terminology.
* Common variations.
* Associated concepts.
* Relevant phrases.
* Alternative terminology that could appear on webpages.

AI-generated keywords are suggestions and must not automatically become active keywords.

### 10. Keyword Approval Workflow

When ChatGPT generates related keyword suggestions, present those suggestions to the user for review.

The user must be able to:

* Review generated suggestions.
* Approve individual suggestions.
* Reject or remove unwanted suggestions.
* Add approved suggestions to the appropriate keyword set.

The user remains in control of the final keyword set.

The workflow should make it easy to expand a profile while preventing irrelevant AI-generated terms from degrading the quality of the profile.

### 11. Positive and Negative AI Expansion

AI-assisted keyword discovery should integrate directly with the profile keyword system.

The requirements should account for generated terms ultimately being reviewed and added to the appropriate:

* Positive keyword set.
* Negative keyword set.

AI generation, user approval, and keyword storage should remain conceptually separate so these capabilities can evolve independently.

## Feature Documentation

Create or update feature documentation that explains these capabilities from a product/user perspective.

Clearly document:

**Spot a Dog On/Off**
Users can globally enable or disable page scanning without deleting or changing their profiles.

**Popup**
Users can quickly access Spot a Dog through the browser extension popup.

**Sidebar / Side Panel**
Users can open a larger Spot a Dog interface alongside the webpage for more detailed interaction.

**Keyword Profiles**
Users organize the subjects they want Spot a Dog to detect into reusable profiles.

**Positive Keywords**
Important or desirable terms are visually highlighted when found.

**Negative Keywords**
Negative terms are highlighted in red so they are immediately distinguishable.

**Independent Profiles**
Profiles can be switched on and off individually.

**AI Keyword Discovery**
ChatGPT can help expand a profile by suggesting related terminology and phrases.

**Human Approval**
AI-generated terms are reviewed by the user before becoming part of a profile.

## Documentation Organization

Inspect the repository's existing `/docs` structure before creating files.

Prefer extending the existing documentation architecture rather than creating duplicate or competing documents.

Where appropriate, maintain documentation covering:

* Product features.
* Functional requirements.
* UI behavior.
* Popup and sidebar behavior.
* Profile and keyword behavior.
* AI integration.
* Settings and configuration.

Cross-reference related documentation where useful.

## Future Extensibility

Document these requirements in a way that leaves room for future Spot a Dog capabilities.

Avoid unnecessarily coupling:

* Global extension state.
* Popup/sidebar presentation.
* Profiles.
* Keyword storage.
* Page scanning.
* Highlight rendering.
* AI keyword generation.
* Settings/API configuration.

These should remain conceptually separate capabilities so they can evolve independently.

## Documentation Quality

Before finishing:

* Verify that every requirement in this prompt is represented in the documentation.
* Correct spelling, grammar, terminology, and formatting.
* Make requirements specific enough that a future coding agent can implement them without having to reinterpret the original request.
* Clearly distinguish required behavior from examples or future possibilities.
* Do not remove or minimize existing documented requirements.
* Do not modify unrelated documentation.
* Update relevant documentation indexes or links if the repository uses them.
* Ensure the global extension on/off state and individual profile on/off states are clearly documented as separate concepts.
* Ensure popup and sidebar visibility are not confused with the extension's enabled/disabled state.

## GitHub Flow

After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the repository's existing GitHub flow documentation rather than inventing a new workflow. Complete all applicable steps required by that documentation.


## Implementation Notes

- Saved the complete attached prompt before any other file changes; reviewed prompts 001 and 002, README, workflow, and relevant current source.
- Added docs/requirements.md as the authoritative future implementation contract and docs/features.md as its user-facing companion; linked both from README while preserving current implementation details and historical documents.
- Covered all eleven requested areas, retained prior platform/profile/storage/matching limits, and explicitly superseded negative suppression with independent red negative highlights. Chose red precedence for overlapping positive/negative characters to make future rendering deterministic.
- Recorded pending negative matching/rendering/help-text changes and an explicit AI candidate dismiss/remove action. No extension code, configuration, or tests changed.
- Validation passed: complete prompt preservation comparison, local Markdown link target checks, all eleven requirement sections present, manual requirement/acceptance coverage review, and git diff --check. npm run check was not run because this change affects documentation only; the document specifies it for future extension implementation.
- No standalone GitHub flow document exists among tracked files. The only repository publication instructions are prompt 002: use the current branch (main), no new branches, SSH publication, and review notes. Followed that convention with request/change/issues/next-step notes in this file and the commit description.
- GitHub CLI authentication remains invalid, preventing standalone API comments through the CLI. Review notes are retained in the repository and commit description, following the fallback recorded in prompt 002.
- Suggested next work: implement red negative highlighting and overlap behavior, update suppression tests and panel help text, add candidate dismissal, then run the extension checks and applicable manual Chrome verification.
