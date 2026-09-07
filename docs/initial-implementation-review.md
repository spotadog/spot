# Initial implementation review

## What was asked

Build a minimal, maintainable Spot a Dog Manifest V3 Chrome extension with multiple keyword profiles, positive and negative keyword lists, profile/global enabled controls, automatic highlighting, a popup and persistent side panel, local storage, and optional user-reviewed OpenAI keyword discovery. Preserve every development prompt before implementation and document the workflow.

## What changed

- Added separate modules for extension configuration, popup, side panel, settings, background worker, profile validation, storage, matching, scanning, highlighting, and OpenAI requests.
- Implemented profile creation/editing/deletion, positive/negative keyword entry, per-profile/global toggles, timestamps, and local persistence.
- Added case-insensitive literal word/phrase matching, Unicode-aware word boundaries, dynamic page rescanning, and CSS highlights without rewriting page content.
- Defined negative matching: a negative keyword suppresses positive matches from its own profile within the same DOM text node.
- Added locally stored API credentials, configurable model, structured and validated suggestions, explicit selection before insertion, and actionable error handling.
- Restricted credential storage to trusted extension contexts; content scripts receive only scanning data.
- Added README, build scripts, automated tests, AGENTS.md, prompt-processing workflow, and complete initial prompt history.
- Validation completed: seven unit tests and real unpacked-extension Chromium tests passed with `npm run check`, including profile CRUD, dynamic matching, toggles, settings, credential isolation/removal, safe suggestion review with a mocked API response, popup rendering, and persistence across restart.

## Known issues and limitations

- Live OpenAI requests and native Chrome toolbar/side-panel docking still need manual verification.
- Matching and negative context do not cross text-node boundaries; phrases split by inline markup will not match.
- Shadow DOM, iframes, PDFs, canvas text, restricted Chrome pages, and the Chrome Web Store are unsupported.
- Dynamic changes trigger full rescans with a 150 ms throttle; large or constantly changing pages may need performance improvements.
- Pure CSS visibility changes without an observed DOM event may require refreshing or toggling highlighting.
- API keys are stored locally without encryption; use a trusted browser profile. No shared developer key is included.
- Unsaved profile edits are not retained when the interface closes; concurrent edits to the same profile use the last save.

## Suggested next changes

1. Complete the documented native Chrome and live OpenAI smoke checks before expanding functionality.
2. Add repeatable CI build/test checks for future changes.
3. Measure scanning cost on large, dynamic pages; use the results to guide incremental scanning and precompiled matchers.
4. Define and test block-level text context before supporting phrases split across inline elements or broader negative-keyword scope.
5. Decide whether shadow-root/frame coverage and unsaved-edit protection should be included in the next iteration.

These are recommendations only; they are not implemented by the publication request.
