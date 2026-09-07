# Spot a Dog

A Manifest V3 Chrome extension that highlights the words and phrases you care about. Create topic profiles, add positive and negative keywords, and keep the side panel open as you browse.

## Get started

Requires Node.js 20+ and Chrome 120+.

```sh
npm ci
npm run build
```

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select this repository’s `dist/` directory.
3. Pin **Spot a Dog** from Chrome’s extensions menu.
4. Click its toolbar icon, then **Open side panel**.
5. Click **New profile**, enter a name and keywords (one word or phrase per line), then **Save profile**.
6. Visit an HTTP or HTTPS webpage. Positive matches appear in yellow with an underline; negative matches appear in red.

After rebuilding, click **Reload** on the extension card and refresh any already-open webpages. Keep loading from the same directory to retain the extension identity and storage. No runtime dependencies or remote scripts are used; esbuild bundles local JavaScript, and Playwright is used only for development tests.

## Product documentation

[Product features](docs/features.md) and [functional requirements](docs/requirements.md) define the product behavior. The extension implements independent positive and negative highlights and explicit AI candidate dismissal. See the [implementation log](docs/implementation-log.md) for the dependency map, verification evidence, and remaining manual checks.

## Capabilities

- Multiple named profiles with stable IDs, enabled states, and creation/update timestamps.
- Create, edit, delete, and toggle profiles in the side panel; remove keywords by deleting their lines and saving.
- Global pause removes highlights and disconnects scanning observers while preserving profiles.
- Case-insensitive literal words and phrases, repeated matches, flexible whitespace, and Unicode-aware word boundaries.
- Dynamic content, text edits, and common visibility attribute changes trigger a throttled rescan.
- Popup for quick controls; side panel for profiles and AI review; separate settings page for API configuration.
- User-reviewed OpenAI suggestions can be added to either positive or negative keyword lists.
- Local persistence across browser and extension restarts.

## Matching decisions and limits

Each visible DOM text node is a matching unit. Positive terms produce yellow underlined highlights; negative terms produce red underlined highlights independently, including in profiles containing only negative terms. For a profile with positive `GPU` and negative `gaming`, `GPU gaming` highlights both terms in their respective colors.

Matching uses literal text, not regular expressions. `GPU` matches `gpu` but not `GPUs`; `data center` can match whitespace or a newline between the words. Duplicate matches are deduplicated by kind and interval. Where positive and negative ranges overlap, pure matching logic subtracts the negative intervals from positive ranges: only overlapping characters turn red. Disabling a contributing profile recomputes these ranges. Both highlight layers are cleared when globally paused.

The scanner skips scripts, styles, forms, code/preformatted text, editable areas, hidden content, and non-text media. CSS Custom Highlight ranges paint text without inserting wrappers or rewriting the webpage DOM. “Visible” includes rendered text below the fold, not just text in the viewport.

Initial limitations:

- Phrases do not cross text-node boundaries (including inline formatting).
- Shadow DOM, iframes, PDFs, canvas text, browser-internal pages, and Chrome Web Store pages are not scanned. File URLs are not enabled.
- Mutation events are coalesced to at most one full scan per 150 ms. Very large or continuously updating pages may need an incremental scanner later.
- Pure CSS animation/stylesheet changes without an observed DOM change may require a resize, page refresh, or global off/on to refresh highlights.
- The initial UI uses explicit Save for profile edits. Unsaved edits are lost when its page closes. Editing the same profile in multiple panels uses the last saved version; distinct profile operations are serialized by the service worker.

## Storage and privacy

`src/storage/store.js` is the sole Chrome storage adapter. `chrome.storage.local` stores versioned profile/settings data under `spotadog.state` and the optional API key separately under `spotadog.apiKey`. No Chrome sync storage is used. Uninstalling the extension removes its local data.

The worker restricts local storage to `TRUSTED_CONTEXTS`. Content scripts receive only enabled state and scanning profile fields through validated messages; they cannot read settings or the API key or invoke profile/settings mutations. Extension UI reads only whether a key exists, not its value. The key is persisted locally **without encryption**; this personal bring-your-own-key implementation is intended for a trusted browser profile, not for embedding a developer’s shared secret in a distributed extension.

Permissions are `storage`, `sidePanel`, HTTP/HTTPS content-script access for automatic scanning, and the OpenAI API host for explicit suggestion requests. No webpage text is sent to OpenAI. The extension does not use analytics.

## OpenAI integration

Open **Settings** from the popup or side panel. Save your own API key and a Responses-compatible model ID (default `gpt-4o-mini`). Leave the key field blank to retain it; use **Remove API key** to delete it. Model access and API billing depend on your OpenAI account; a ChatGPT subscription does not supply API credit.

In the side panel, select a profile, enter 1–20 seed keywords, and click **Get suggestions**. Only those seeds are sent to `https://api.openai.com/v1/responses`, on your explicit request. The dedicated `src/services/openai.js` service requests a strict JSON schema with `store: false` and a 25-second timeout. It handles authentication/quota/network errors, refusals, malformed output, and incomplete responses. Suggestions are validated, bounded, deduplicated, rendered as text, and never added automatically. Select the suggestions and target list, then click **Add selected**. Use each candidate’s **Dismiss** button or **Dismiss all** to discard review candidates without changing saved keywords. Closing the panel also discards unapproved review candidates.

References used for the implementation: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Chrome side panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel), and [Chrome storage access levels](https://developer.chrome.com/docs/extensions/reference/api/storage).

## Project structure

```text
manifest.json              Extension configuration and permissions
src/
  background/worker.js     Message authorization, serialized mutations, state broadcasts
  popup/                   Compact global/profile controls and panel launcher
  sidepanel/               Profile editor and AI suggestion review
  options/                 API key and model preferences
  ui/                      Shared UI helpers and styles
  profiles/model.js        Profile schema and input validation
  storage/store.js         Versioned persistence and credential isolation
  matching/matcher.js      Pure typed matching and overlap resolution
  content/                 Page lifecycle, visibility filtering, mutation observer
  highlighting/            Non-destructive CSS highlight rendering
  services/openai.js       OpenAI request/response boundary
scripts/build.mjs          Reproducible local bundle into dist/
tests/                     Core unit tests and real-extension browser checks
docs/features.md           Product feature guide (required experience)
docs/requirements.md       Authoritative requirements and implementation gaps
docs/prompts/              Append-only development prompt history
docs/prompt-processing-flow.md
AGENTS.md                  Project workflow instructions for future coding agents
```

The profile `rules` object establishes a future extension point; version 1 uses the documented text-node matching and whole-word semantics. Existing `negativeScope` fields remain readable but have no effect; new profiles omit that obsolete field. Storage rejects unknown schema versions rather than overwriting them. Add explicit migration logic in the storage adapter when the schema changes.

## Validation

```sh
npx playwright install chromium
npm run check
```

`npm test` runs core model, literal matching, red overlap precedence, approval capacity/deduplication, storage concurrency/persistence and version rejection, and mocked API validation/error tests. `npm run test:browser` loads the actual unpacked MV3 extension in isolated Playwright Chromium, exercises profile CRUD, dynamic highlights and excluded elements, both highlight colors, negative-only profiles, shared enabled controls, settings, safe AI approval/dismissal and storage failures with a mocked network response, content-script access restrictions, popup rendering, and persistence after closing/reopening the browser. Screenshots go to ignored `test-results/`.

A live OpenAI request requires your own configured key and is not made by the tests. Native Chrome panel docking and toolbar interaction should also be checked manually:

1. Open the popup from the toolbar and click **Open side panel**. Keep the panel open while switching tabs.
2. Create `AI Infrastructure` with positive `GPU`, `inference`, `data center`, and negative `gaming`.
3. Confirm `GPU gaming` highlights GPU in yellow and gaming in red; check overlapping terms, negative-only profiles, and removal/reappearance with profile and global toggles.
4. Configure a real API key, request suggestions, dismiss an unwanted candidate, and verify only selected suggestions are added to the chosen list.
5. Restart Chrome and verify profiles/settings remain. Remove the key if no longer needed.

## Development prompt history

**Save first, implement second.** Before implementing any development request, read [the prompt processing flow](docs/prompt-processing-flow.md), review relevant [previous prompts](docs/prompts/), and save the complete request to a new sequential file. Never overwrite prior prompts. Redact secrets with clear placeholders. After validation, append implementation notes and update documentation when needed.

The initial request is preserved in [001-initial-project-setup.md](docs/prompts/001-initial-project-setup.md). Prompt history is source-controlled and deliberately not ignored. Source, README, workflow, and ordered prompts together document the project’s evolution.
