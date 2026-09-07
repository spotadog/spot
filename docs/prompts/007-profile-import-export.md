# Prompt 007 — Profile Import and Export

## Purpose

Add portable profile backups and immediate runtime refresh, including reload handling.

## Prompt

**Before implementation:** First save this complete prompt in the repository's prompt documentation or prompts directory, following the project's existing prompt-tracking conventions. This must happen before implementation begins so the instruction can be tracked, reused, audited, and used to help reproduce the project later.

Locate the repository's existing prompt documentation or prompt directory and save the complete prompt there before making any implementation changes. Follow the repository's existing naming, numbering, organization, and formatting conventions. If a prompt-tracking structure does not yet exist, create an appropriate one without overwriting or disrupting existing documentation. Preserve this complete implementation prompt rather than only recording a summary.

## Objective

Add a new profile import/export feature that allows users to:

* Download/export all profiles at once.
* Download/export an individual profile.
* Upload/import all profiles when needed.
* Upload/import an individual profile when needed.
* Ensure newly uploaded or reloaded profile data takes effect immediately by invalidating and refreshing any stale plugin caches.

This is a new user-facing feature and must be documented before implementation begins.

## Repository Review

Before making changes:

1. Inspect the repository's relevant documentation, architecture notes, contribution guidance, plugin lifecycle documentation, profile storage format, caching behavior, testing conventions, and UI/API patterns.
2. Follow existing project conventions rather than introducing unnecessary new architecture.
3. Identify:

   * Where profiles are stored and how they are serialized.
   * How individual and multiple profiles are loaded.
   * Any caches containing profile-derived data, words, dictionaries, compiled data, lookup tables, indexes, or related state.
   * How plugin reload/reinitialization events are detected.
   * How profile changes are currently propagated to active plugin components.
4. Avoid unrelated refactoring unless it is necessary to implement this feature correctly.

## Documentation Must Be Updated Before Implementation

Because this is a new feature, update the appropriate user-facing and/or developer documentation **before implementing the code changes**.

Document at minimum:

* How to download/export all profiles.
* How to download/export an individual profile.
* How to upload/import all profiles.
* How to upload/import an individual profile.
* What file format or archive structure is used.
* How imported profiles interact with existing profiles.
* Any duplicate-name, overwrite, replacement, merge, or conflict behavior.
* Validation and error behavior for malformed or unsupported imports.
* That caches are automatically refreshed after a successful profile upload/import.
* That relevant stale caches are also refreshed when a plugin reload/reinitialization event is detected so current profile words/data are used.
* Any UI, command, API, or workflow added for this functionality.

Keep the documentation consistent with the repository's existing style and information architecture.

## Profile Export Requirements

Implement support for exporting profiles at both scopes.

### Export All Profiles

Provide a user-accessible way to download/export all profiles.

The export must:

* Include all information required to recreate the profiles accurately.
* Preserve profile-specific words, settings, metadata, and other persisted fields that are required for the profile to function after re-import.
* Use a stable and clearly defined format.
* Avoid including unrelated transient runtime/cache state.
* Produce deterministic or reasonably consistent output where practical.
* Handle an empty profile collection gracefully.

If multiple profiles require an archive or container format, use the repository's existing conventions if available. Otherwise choose a maintainable, portable representation that can be validated reliably during import.

### Export Individual Profile

Provide a user-accessible way to download/export one selected profile.

The individual export must:

* Contain everything required to recreate that profile.
* Preserve the same data fidelity guarantees as the all-profile export.
* Be compatible with the individual-profile import path.
* Clearly identify the profile or include the necessary profile metadata inside the exported data.

## Profile Import Requirements

Implement support for importing both individual profiles and collections of profiles.

### Import All Profiles

Allow the user to upload/import an export containing multiple profiles.

The implementation must:

* Validate the uploaded data before applying changes.
* Reject malformed, unsupported, corrupted, or incompatible files safely.
* Prevent partially applied state when validation fails.
* Follow existing repository conventions for replacement, merging, naming conflicts, or duplicate profile handling.
* If no existing convention exists, implement predictable conflict handling and document it clearly.
* Preserve profile data accurately during round-trip export/import.
* Surface useful errors to the caller/user without exposing sensitive internal details.

### Import Individual Profile

Allow the user to upload/import a single profile.

The implementation must:

* Validate the profile before persisting it.
* Preserve all supported profile data.
* Handle an existing profile with the same identifier/name according to established project behavior.
* Ensure the newly imported profile becomes available immediately after a successful import.

## Cache Invalidation and Refresh

A critical part of this feature is ensuring that newly uploaded profile content, especially newly uploaded words or other profile-derived data, takes effect immediately.

Identify every cache or derived runtime structure that can become stale after profile data changes.

After a **successful profile upload/import**, invalidate or refresh all affected caches so that:

* Newly imported words are immediately recognized.
* Removed or replaced words no longer remain active because of stale cache entries.
* Profile-derived settings or lookup structures reflect the newly imported data.
* No plugin restart should be required merely to make a successful import take effect unless the existing architecture fundamentally requires it.

Do not clear unrelated caches unnecessarily.

Cache refresh should happen only after the new profile data has been successfully validated and persisted so that failed imports do not destroy valid runtime cache state.

## Plugin Reload Handling

Also ensure stale profile caches are refreshed when a plugin reload/reinitialization event is detected.

When the plugin is reloaded:

* Detect the appropriate plugin lifecycle/reload event using the repository's existing lifecycle mechanisms.
* Invalidate and rebuild any caches that depend on profile data.
* Reload the current persisted profile information rather than continuing to use stale in-memory data.
* Ensure newly uploaded words and profile changes are active after the reload.
* Avoid accumulating duplicate registrations, listeners, cached entries, or other state across repeated reloads.
* Make the operation safe if the plugin is loaded or reloaded multiple times during the same application lifecycle.

If there are multiple reload/reinitialization paths, verify that each relevant path results in consistent profile state.

## Data Integrity and Compatibility

Maintain compatibility with existing profiles unless the repository already has an explicit migration/versioning mechanism requiring a format change.

Where applicable:

* Include a format/schema version in new export formats.
* Validate supported versions during import.
* Maintain backward compatibility with currently supported profile data.
* Do not silently discard unknown or required profile fields.
* Prefer explicit errors over silently accepting data that cannot be faithfully restored.
* Protect against path traversal, arbitrary file writes, unsafe deserialization, archive extraction issues, or other file-upload vulnerabilities.
* Apply reasonable file size/count limits if the project already has conventions for upload validation.

## UI / API Integration

Integrate the feature into the project's existing user interaction model.

Depending on the existing application architecture, expose appropriate actions for:

* Download all profiles.
* Download one profile.
* Upload/import all profiles.
* Upload/import one profile.

Follow existing UI, command, endpoint, plugin, or settings patterns. Do not introduce a separate interaction paradigm if the project already has an established way to perform similar import/export operations.

Make scope clear to the user so it is difficult to accidentally import or export all profiles when intending to operate on only one.

Provide meaningful success and failure feedback.

## Error Handling

Handle at least the following scenarios gracefully:

* Invalid file type.
* Malformed profile data.
* Unsupported schema/export version.
* Missing required profile fields.
* Duplicate/conflicting profiles.
* Empty import.
* Attempt to import a multi-profile package through the individual-profile workflow, where applicable.
* Attempt to import an individual-profile file through the all-profile workflow, where applicable.
* Storage/persistence failure.
* Cache rebuild failure.
* Plugin reload while profile state is being initialized.
* Profile export when no profiles exist.
* Export failure.

Avoid leaving persisted profiles and runtime caches in inconsistent states.

## Testing

Add or update automated tests following the repository's existing testing patterns.

Cover at minimum:

1. Exporting an individual profile.
2. Importing an individual profile.
3. Individual-profile export/import round trip.
4. Exporting all profiles.
5. Importing all profiles.
6. All-profile export/import round trip.
7. Preservation of profile words and other relevant profile data.
8. Invalid/corrupted import rejection.
9. Unsupported format/schema version handling if versioning is introduced.
10. Duplicate/conflict behavior.
11. Cache invalidation after a successful profile upload.
12. Verification that newly uploaded words take effect immediately.
13. Verification that removed/replaced words are not retained through stale caches.
14. Cache refresh on plugin reload/reinitialization.
15. Repeated plugin reloads without duplicate state/listeners/cache entries.
16. Failed imports do not incorrectly replace valid profiles or clear valid active state.
17. Empty-profile and edge-case behavior.

Add integration tests where appropriate to verify persistence, import/export, cache invalidation, and plugin lifecycle behavior together rather than testing those components only in isolation.

## Verification

Before considering the work complete:

* Run the relevant test suite.
* Run linting, formatting, type checking, build validation, and other repository-standard checks.
* Manually or programmatically verify an export/import round trip for both one profile and all profiles.
* Verify that changing or uploading a profile containing new words causes those words to become active without stale cache behavior.
* Verify the same behavior after a plugin reload.
* Verify documentation accurately describes the final implementation.
* Review the diff for accidental unrelated changes.

## Acceptance Criteria

The work is complete when:

* Users can download/export all profiles.
* Users can download/export a single profile.
* Users can upload/import all profiles.
* Users can upload/import a single profile.
* Exported profiles can be successfully restored with the expected data intact.
* Imports are validated and failures do not corrupt existing state.
* Successful profile uploads invalidate or refresh all affected stale caches.
* Newly uploaded words/profile data take effect immediately.
* Plugin reload/reinitialization detects and refreshes stale profile-derived caches.
* Repeated reloads do not create duplicate or inconsistent runtime state.
* Existing profile functionality remains backward compatible unless explicitly documented otherwise.
* Automated tests cover import/export, cache invalidation, and reload behavior.
* The new feature is documented, and that documentation was added before implementation.
* Repository-standard validation passes.

**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the repository's existing GitHub flow documentation rather than inventing a new workflow. Complete all applicable steps required by that documentation.


## Implementation Notes

- Preserved the complete prompt in 007 and added the README import/export contract before implementing code. Reviewed storage, matching/scanner state, worker/UI lifecycle, testing and the prompt 002 GitHub flow.
- Added pure version-1 JSON transfer validation/export/ID merge in profiles/transfer.js. Both scopes preserve every supported persisted profile field, including legacy rules, and reject unknown fields rather than discard them. Imports replace matching IDs, permit distinct IDs with equal names, reject duplicate IDs within a package, retain unrelated profiles/settings/credentials and enforce the existing 50-profile/200-term limits. The 10 MiB byte limit accommodates a full Unicode collection; empty collection imports are no-ops.
- Added all-profile download and both upload actions to the shared popup/sidebar, plus per-card single download, explicit confirmation and useful validation/persistence/refresh feedback. Files use JSON and browser Blob downloads, with no archives, arbitrary paths, runtime dependencies or API calls.
- All writes remain behind createStore and its serialized update. Profile state is not cached in the worker; queued broadcasts reread persisted state to prevent older mutation snapshots from arriving last. The affected runtime structures are the scanner state, scheduled scan, observer/listeners and two CSS highlight range sets; matching holds no persistent compiled dictionary/cache.
- Every worker start broadcasts fresh persisted state. onInstalled handles unpacked extension reload/install/update with scripting reinjection into HTTP/HTTPS tabs. Content reinitialization disposes its predecessor and guards pending startup reads against both disposal and later broadcasts. Added scripting/HTTP/HTTPS host permissions for this recovery. No unrelated storage or AI cache is cleared.
- Rendering failures clear obsolete highlights and return an explicit refresh failure; successful persistence remains saved and the UI advises reloading the affected page. Failed validation/writes do not broadcast or clear valid state. Unsupported/inaccessible pages retain the documented manual reload/restricted-page limitations.
- Validation: final npm run check passed 24 unit tests, esbuild and the real unpacked-MV3 Playwright browser suite. Tests cover both round trips, metadata/words/legacy rules, duplicate/capacity/empty/invalid/version cases, maximum Unicode payloads, atomic persistence, startup races, listener disposal, real downloads/uploads, immediate new/removed terms, storage and renderer failure/recovery, repeated reinjection and two actual runtime.reload cycles. Browser test setup explicitly enables Developer mode: command-line loading alone caused Chromium to disable the extension on reload until this was corrected. Renderer failure injection runs in the extension isolated world. No separate lint/format/typecheck commands are configured. Exact prompt preservation and git diff --check passed; inspected the transfer UI screenshot.
- Confirmed reload event semantics and scripting permissions against official Chrome runtime and scripting references linked in README. No live OpenAI calls were needed. Native toolbar/docking behavior remains the earlier manual check, outside this feature's changes.
- GitHub flow: current main branch, no new branch, existing documented SSH identity. GitHub CLI authentication is still invalid; the documented fallback keeps requested review comments (request, changes, issues and next steps) here, in the implementation log and commit description.
- Suggested next work: add CI for npm run check and perform the existing native Chrome toolbar/docking checks.
