# Prompt 001 — Initial Project Setup

## Purpose

Create the initial Spot a Dog Chrome extension and preserve its development workflow.

## Prompt

# Spot a Dog — Chrome Extension

This is a new Chrome browser extension project. The repository is currently empty.

The project is called **Spot a Dog**.

## Purpose

Spot a Dog helps users quickly scan web pages by automatically highlighting words and phrases that match keyword profiles configured by the user.

The core idea is simple: instead of reading every piece of text on a page, users can immediately "spot" the words and phrases that matter to them.

This is the initial implementation. Keep the architecture clean, modular, and easy to extend because additional requirements and features will be added as the project develops.

---

# Development Prompt Preservation

Prompt history is an important part of this project.

Create the following documentation structure:

```text
docs/
├── prompts/
│   ├── 001-initial-project-setup.md
│   └── ...
└── prompt-processing-flow.md
```

## Prompt Preservation Rule

**Before implementing any development prompt, save the complete prompt as a Markdown file in `docs/prompts/`.**

This includes this initial prompt.

Save this complete prompt as:

```text
docs/prompts/001-initial-project-setup.md
```

Future development prompts must follow the same process.

Use sequential numbering:

```text
docs/prompts/
├── 001-initial-project-setup.md
├── 002-<short-description>.md
├── 003-<short-description>.md
├── 004-<short-description>.md
└── ...
```

Do not overwrite previous prompts.

The prompt files form an append-only development history that should make it possible to understand how the application evolved and, as much as practical, recreate the application by replaying the prompts in order.

Each prompt file should contain:

```markdown
# Prompt XXX — Title

## Purpose

Short description of what this prompt is intended to accomplish.

## Prompt

The complete original development prompt.

## Implementation Notes

Brief notes about important implementation decisions, assumptions, or deviations made while processing the prompt.
```

The **Prompt** section must preserve the actual development instructions. Do not silently rewrite or remove requirements when recording the prompt.

## Prompt Processing Flow

Create:

```text
docs/prompt-processing-flow.md
```

Document the following workflow in that file.

### Spot a Dog Prompt Processing Flow

Every new development prompt should be processed using this sequence:

```text
New Development Prompt
        ↓
Read Existing Project State
        ↓
Read docs/prompt-processing-flow.md
        ↓
Review Relevant Previous Prompts
        ↓
Determine Next Prompt Number
        ↓
Save New Prompt to docs/prompts/
        ↓
Analyze Requirements
        ↓
Plan Minimal Required Changes
        ↓
Implement Changes
        ↓
Test / Validate Changes
        ↓
Update Documentation if Necessary
        ↓
Add Implementation Notes to Prompt File
        ↓
Report What Changed
```

### Rules

1. **Save first, implement second.**

   A development prompt must be written to `docs/prompts/` before its requested code changes are implemented.

2. **Never overwrite prompt history.**

   Every development prompt receives a new sequential number.

3. **Preserve intent.**

   The stored prompt should contain the complete instructions that caused the implementation change.

4. **Review previous context.**

   Before implementing a new prompt, inspect relevant previous prompt files so new work remains consistent with earlier architectural and product decisions.

5. **Current instructions take precedence when explicitly changing previous behavior.**

   Previous prompts document history. They should not prevent intentional changes requested by a newer prompt.

6. **Keep implementation notes.**

   After implementation, record important architectural decisions, assumptions, limitations, or deviations in the corresponding prompt file.

7. **Maintain reproducibility.**

   The combination of:

   * repository source code
   * `README.md`
   * `docs/prompt-processing-flow.md`
   * ordered files in `docs/prompts/`

   should provide a clear history of how Spot a Dog was built.

8. **Keep prompts in source control.**

   The `docs/prompts/` directory must be committed to Git and must not be excluded by `.gitignore`.

9. **Do not store secrets in prompts.**

   API keys, credentials, tokens, private keys, or other secrets must never be written into prompt-history files. If a future prompt contains a secret, replace the secret in the stored version with a clear placeholder such as `[REDACTED API KEY]`.

10. **Prompt preservation is a project-level rule.**

    Treat this workflow as part of the project's development process for future Codex work, not merely as a requirement of the initial setup.

---

# Initial Requirements

## 1. Chrome Extension Foundation

Create the basic structure for a modern Chrome extension using **Manifest V3**.

Organize the project so that the following concerns are separated:

* Extension configuration
* Popup UI
* Sidebar / side panel UI
* Options/settings
* Content scripts
* Background/service worker
* Keyword profile management
* Page scanning and text matching
* Highlighting
* Storage
* AI-assisted keyword discovery

Do not over-engineer the first version, but establish clear module boundaries so features can be expanded later.

## 2. Keyword Profiles

Users should be able to create and manage multiple keyword profiles.

Each profile should contain:

* Unique ID
* Profile name
* Positive keywords and phrases
* Negative keywords and phrases
* Enabled/disabled state
* Created timestamp
* Updated timestamp

Example:

Profile: `AI Infrastructure`

Positive keywords:

* GPU
* inference
* data center
* CUDA
* model serving

Negative keywords:

* gaming
* graphics settings

Users must be able to:

* Create a profile
* Edit a profile
* Delete a profile
* Enable or disable a profile
* Add/remove positive keywords
* Add/remove negative keywords

Design the profile data model so additional matching rules can be added later.

## 3. Extension On/Off Control

The entire Spot a Dog extension should have a global enabled/disabled state.

When disabled:

* Page scanning stops.
* Existing Spot a Dog highlights should be removed from the page.
* User profiles and settings must remain saved.

When enabled again, active profiles should resume scanning/highlighting.

## 4. Page Scanning and Highlighting

When Spot a Dog is enabled, scan visible webpage text for matches from enabled profiles.

Positive keywords and phrases should be highlighted.

The initial matching implementation should support:

* Individual words
* Multi-word phrases
* Case-insensitive matching
* Multiple matches on the same page

Avoid modifying page content unnecessarily.

Do not scan or modify inappropriate elements such as:

* script
* style
* textarea
* input
* code used internally by the page

Keep the matching/highlighting engine separate from the UI so it can become more sophisticated later.

The implementation should also be designed with dynamic websites in mind. Modern sites frequently add content after the initial page load, so structure the scanner so support for dynamically inserted content can be handled cleanly.

## 5. Negative Keywords

Negative keywords should influence whether content is considered relevant.

For the initial implementation, establish a simple and clearly documented matching rule.

For example, a positive keyword may create a match while nearby negative keywords can suppress or reduce that match.

Keep this logic modular because the meaning and weighting of positive and negative keywords will become more sophisticated later.

## 6. Chrome Side Panel

Support Chrome's side panel functionality.

The user should be able to open Spot a Dog in the browser side panel and keep it visible while browsing.

The side panel should provide quick access to:

* Global Spot a Dog on/off control
* Keyword profiles
* Profile on/off controls
* Keyword management
* AI keyword suggestions

The popup can provide a smaller quick-control interface while the side panel serves as the primary interface.

## 7. Persistent Storage

Use appropriate Chrome extension storage APIs to persist:

* Keyword profiles
* Positive keywords
* Negative keywords
* Profile enabled states
* Global extension state
* User preferences

Create a storage abstraction rather than accessing Chrome storage directly throughout the application.

This will make migrations and future storage changes easier.

## 8. ChatGPT / OpenAI API Integration

Allow the user to configure an OpenAI API key.

The purpose of the AI integration is to help users build better keyword profiles.

For example, if the user enters:

`artificial intelligence`

they should be able to request suggestions for related words and phrases such as:

* AI
* machine learning
* LLM
* large language model
* generative AI

AI-generated suggestions must **not** automatically become part of the profile.

The workflow should be:

1. User enters one or more keywords.
2. User requests related keyword/phrase suggestions.
3. The extension requests suggestions from the OpenAI API.
4. Suggestions are displayed to the user.
5. The user reviews them.
6. The user explicitly chooses which suggestions to add.

Keep the OpenAI integration behind a dedicated service/module so it can be changed or replaced later.

Do not hard-code an API key or include secrets in the repository.

Treat AI suggestions as untrusted input and validate/sanitize them before storing or rendering them.

## 9. UI

Keep the initial UI simple, functional, and clean.

This first version does not need elaborate styling.

Prioritize:

* Easy profile creation
* Easy keyword entry
* Clear enabled/disabled states
* Quick access from the side panel
* Clear distinction between positive and negative keywords
* Easy review of AI-generated suggestions

Use the **Spot a Dog** name consistently throughout the extension.

## 10. Code Quality

Build this as a real maintainable project rather than a quick prototype.

Requirements:

* Clear directory structure
* Small focused modules
* Avoid unnecessary dependencies
* Avoid duplicated logic
* Keep matching logic independent from UI logic
* Keep storage behind an abstraction
* Keep OpenAI integration behind an abstraction
* Add useful comments where behavior is not obvious
* Handle Chrome extension errors gracefully
* Make future feature additions straightforward

## 11. Documentation

Create a README that explains:

* What Spot a Dog does
* Current capabilities
* Project structure
* How to install dependencies
* How to build the extension
* How to load it as an unpacked Chrome extension
* Where profiles/settings are stored
* How the OpenAI integration works
* How the prompt-history system works
* Any important architectural decisions

Also add an appropriate `.gitignore`.

The README should reference:

```text
docs/prompt-processing-flow.md
docs/prompts/
```

so future developers and coding agents know where the development history and workflow are located.

# Initial Goal

For this first pass, focus on creating a strong project foundation and a minimal working extension.

At minimum, I should be able to:

1. Load Spot a Dog into Chrome.
2. Open its popup or side panel.
3. Create a keyword profile.
4. Add positive and negative keywords.
5. Enable or disable individual profiles.
6. Enable or disable Spot a Dog globally.
7. Visit a webpage and see matching positive keywords highlighted.
8. Keep the Spot a Dog interface open in Chrome's side panel while browsing.
9. Enter an OpenAI API key.
10. Request related keyword suggestions.
11. Review suggestions before adding them to a profile.
12. Reload Chrome or the extension without losing my profiles and settings.
13. Find this initial development prompt at `docs/prompts/001-initial-project-setup.md`.
14. Find the documented prompt workflow at `docs/prompt-processing-flow.md`.

# Start Here

Begin by:

1. Inspecting the empty repository.
2. Creating `docs/`.
3. Creating `docs/prompts/`.
4. Creating `docs/prompt-processing-flow.md`.
5. Saving this complete prompt as `docs/prompts/001-initial-project-setup.md`.
6. Creating the basic project structure.
7. Implementing the initial extension.
8. Testing the core functionality.
9. Updating the implementation notes in the prompt file.
10. Reporting the resulting structure, major decisions, tests performed, and any remaining limitations.

**Do not begin implementation before this prompt has been preserved in the prompt-history directory.**

Do not invent major product features beyond these requirements. If an implementation detail is ambiguous, choose the simplest maintainable approach and document the decision so we can refine it in later iterations.


## Implementation Notes

- Preserved the complete original prompt before implementation; added the specified workflow and root AGENTS.md so future coding agents follow it.
- Built a Manifest V3 extension requiring Chrome 120+, using plain JavaScript/HTML/CSS and esbuild. Playwright is a development-only browser test dependency; no runtime libraries or remote scripts.
- Separated popup, side panel, options, service worker, profile model, matching, scanner, highlighting, storage, and OpenAI service.
- Implemented profile CRUD, positive/negative lists, per-profile/global toggles, timestamps, persistent preferences, and explicit AI suggestion review.
- Negative keywords suppress matches from the same profile in the same DOM text node. Matching is literal, case-insensitive, Unicode boundary-aware, and supports phrases with flexible whitespace. Cross-node matching, shadow DOM, and frames are not implemented.
- CSS Custom Highlights paint ranges without modifying page DOM. A 150 ms coalesced MutationObserver rescan supports dynamic text and common visibility changes; disabling removes ranges and disconnects observation. Full scans may need incremental optimization on very large pages.
- The service worker serializes storage writes. Versioned chrome.storage.local is restricted to trusted extension contexts; content scripts receive a scanning-only projection. The optional user API key is local and unencrypted, never synced or returned to content scripts/UI state.
- OpenAI Responses API integration uses strict JSON schema, store:false, a timeout, actionable errors, and validated text-only suggestions. Only explicit seed keywords are submitted. Model is configurable, defaulting to gpt-4o-mini. No real credential was used or committed.
- Validation: seven core unit tests and real unpacked-extension Chromium checks cover matching, negative suppression, excluded/hidden/editable text, dynamic updates, profile CRUD, both toggles, settings, credential removal/isolation, mocked AI selection and hostile HTML text, popup rendering, and persistence through a browser restart. Inspected the generated side-panel screenshot.
- Live OpenAI requests and native Chrome toolbar/side-panel docking require the README manual checks. Browser automation loads the actual panel page but does not verify native docking visually.
- README documents installation, build, permissions, architecture, storage, prompt history, validation, and limitations. Limits are 50 profiles, 200 keywords per list, 120 characters per keyword, and 20 seeds per AI request.
