# Prompt 006 — Optional API Key and Persistent Sidebar

## Purpose

Make configuration available without an API key or sidebar, and persist the display preference.

## Prompt

**Before implementation:** First save this complete prompt in the repository's prompt documentation or prompts directory, following the project's existing prompt-tracking conventions. This must happen before implementation begins so the instruction can be tracked, reused, audited, and used to help reproduce the project later.

## Objective

Update the Chrome extension so that:

1. The OpenAI API key is optional and is not required for users to begin adding keywords or configuring the extension.
2. Profiles and keywords can be configured without requiring the extension to run in the Chrome sidebar.
3. The sidebar setting acts as a persistent toggle that controls where the extension opens rather than being required for configuration.

## OpenAI API Key

The OpenAI API key must be optional.

Users must be able to install and begin using the extension, create/configure profiles, and add/manage keywords without entering an OpenAI API key.

Do not block initial setup, profile configuration, keyword creation, keyword editing, or other functionality that does not actually require the OpenAI API behind an API-key requirement.

Only functionality that specifically depends on the OpenAI API should require an API key. If a user attempts to use such functionality without a configured API key, provide a clear message explaining that the feature requires an API key and provide an appropriate way to configure one.

Do not unnecessarily prompt users for an API key before they need an API-dependent feature.

## Extension UI and Sidebar Behavior

The extension must not need to run in Chrome's sidebar in order for users to:

* Configure profiles.
* Create profiles.
* Edit profiles.
* Add keywords.
* Edit or remove keywords.
* Access normal configuration functionality.

The existing extension interface should remain usable independently of sidebar mode.

### Sidebar Toggle

Implement or correct the sidebar setting so that it behaves as a persistent toggle controlling how the extension is displayed.

When sidebar mode is enabled:

* The Chrome extension should open and remain in the Chrome sidebar.
* The user's preference must be persisted.
* Closing and reopening the extension should continue using the sidebar.
* Opening the extension later from another browser tab should respect the saved sidebar preference and open/show the extension according to sidebar mode.
* The user should not need to re-enable sidebar mode for every tab or browser session unless Chrome itself imposes an unavoidable platform limitation.

When sidebar mode is disabled:

* The extension should use its normal non-sidebar interface.
* Profiles, keywords, and configuration must remain fully accessible.
* Future openings of the extension should continue using the normal interface until the user enables sidebar mode again.

Treat the sidebar as a **display/location preference**, not as a prerequisite for configuring or using the extension.

## Persistence

Persist the user's sidebar preference using the extension's existing settings/storage architecture where possible.

The saved preference should be respected across:

* Extension reopenings.
* Different browser tabs.
* Normal navigation between tabs.
* Browser sessions, where supported by Chrome's extension APIs.

Do not introduce a separate or conflicting settings system if the repository already has an appropriate persistence mechanism.

## Existing Repository and Architecture

Before modifying code:

1. Inspect the repository structure and existing documentation.
2. Read and follow all relevant project instructions, architecture documentation, Chrome extension conventions, and development workflows.
3. Identify how profiles, keywords, API-key configuration, extension popup/UI behavior, sidebar behavior, and persisted settings are currently implemented.
4. Preserve existing functionality that is unrelated to this change.
5. Reuse the existing architecture and components where practical instead of unnecessarily redesigning the extension.

Ensure the implementation complies with the Chrome extension APIs and manifest version already used by the project.

## Testing and Verification

Verify at minimum that:

* A new user can use the extension without an OpenAI API key.
* A new user can add keywords without an OpenAI API key.
* Profiles can be created and configured without an OpenAI API key.
* Features that genuinely require OpenAI handle a missing API key gracefully.
* Profiles and keywords can be managed without sidebar mode.
* Enabling sidebar mode causes the extension to use the sidebar as intended.
* The sidebar preference persists.
* Opening the extension from another tab respects the saved sidebar preference.
* Disabling sidebar mode restores the normal extension interface.
* Disabling sidebar mode does not remove or reset profiles, keywords, or other user data.
* Existing users' settings and data remain compatible after the change.
* No unrelated extension functionality regresses.

Where the repository has automated tests, update or add appropriate tests. Also perform any necessary Chrome extension/manual verification for behavior that cannot reasonably be validated through automated tests.

## Acceptance Criteria

The work is complete when the OpenAI API key is optional for initial and non-AI functionality, users can create profiles and add/manage keywords without providing a key, configuration does not depend on sidebar mode, and the sidebar is a persistent user-controlled display preference that is respected when the extension is subsequently opened, including from other tabs.

Do not make unrelated changes or remove existing functionality unless necessary to satisfy these requirements.

**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the repository's existing GitHub flow documentation rather than inventing a new workflow. Complete all applicable steps required by that documentation.


## Implementation Notes

- Saved the complete prompt before implementation and reviewed the workflow, earlier architecture/product prompts, and prompt 002 publication convention.
- Reused the profile editor HTML/controller for both popup and sidebar; the build emits the same HTML for both entry points. Profile CRUD, keyword editing/removal, settings access, global/profile switches, and AI review are available in either interface.
- Kept the already-optional API credential boundary. Added an actionable Configure API key button only after a missing-key suggestion attempt, and clarified optional credentials in settings.
- Added preferences.sidebar to the existing version-1 storage abstraction, defaulting legacy/new installations to false while preserving profiles, custom models, credentials, and other fields.
- The worker serializes display changes, applies global Chrome sidePanel options/toolbar behavior and action popup routing, restores the preference each worker start, and rolls back routing on failed storage writes. No tab-specific preference or new permissions were introduced. See https://developer.chrome.com/docs/extensions/reference/api/sidePanel for global panel and user-gesture behavior.
- Validation: npm run check passed 15 unit tests, build, and the real unpacked MV3 browser suite. Added no-key popup creation/editing, missing-key feedback, real sidePanel.open invocation, global/new-tab routing, toggle disable/data preservation, failed-write rollback, invalid preference rejection, legacy settings compatibility, and browser restart restoration. Existing matching, AI contract/review, storage security, and scanning checks pass. Visually inspected the shared profile interface screenshot; git diff --check passed.
- Limits: browser tests open extension pages and invoke real Chrome extension APIs; native toolbar clicks/docking and a live OpenAI request were not manually verified in this environment. Chrome controls panel visibility and requires a gesture after closure; Show sidebar provides a retry if initial opening is declined. Unsaved drafts retain the existing close-to-discard behavior.
- GitHub flow: use current main branch and the existing SSH identity, with no new branch. GitHub CLI authentication remains invalid; review notes are retained here, in the implementation log, and in the commit description per the documented fallback.
- Suggested next work: perform the README native toolbar/docking smoke checks across tabs and browser restarts, then add automated CI.
