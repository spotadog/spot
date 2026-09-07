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
4. Click its toolbar icon to open the full profile editor. No API key is required.
5. Click **New profile**, enter a name, choose **Add Keyword** under either keyword group, enter one word or phrase, and choose **Save keyword**. Repeat as needed, then **Save profile**.
6. Visit an HTTP or HTTPS webpage. Positive matches appear in yellow with an underline; negative matches appear in red.

The **Use sidebar** toggle saves a global display preference across tabs and browser sessions. Popup mode is the default for new and existing installations without a saved preference. Chrome controls panel visibility: a closed panel is reopened by a toolbar click, not forced open during navigation or startup. If Chrome declines the initial open gesture, **Show sidebar** retries directly; the preference remains saved.

After rebuilding, click **Reload** on the extension card. Accessible webpages refresh their scanners automatically; refresh a page manually if Chrome prevents reinjection. Keep loading from the same directory to retain the extension identity and storage. No runtime dependencies or remote scripts are used; esbuild bundles local JavaScript, and Playwright is used only for development tests.

## Extension icon

The toolbar and extension listing use a cream paw on the existing green UI color. Editable source is `src/icons/icon.svg`; committed PNGs cover 16, 20, 24, 32, 40, 48, 64, 128 and 256 pixels. `manifest.json` declares both `icons` and `action.default_icon`, following Chrome’s [extension icon](https://developer.chrome.com/docs/extensions/reference/manifest/icons) and [action icon](https://developer.chrome.com/docs/extensions/reference/api/action#icon) configuration.

After editing the SVG, run `npm run icons` (requires the development Playwright Chromium installed by `npx playwright install chromium`), then `npm run check`. The normal build copies the committed PNGs into `dist/icons/` and does not need a browser to generate assets. Load `dist/`, reload after rebuilding, and pin Spot a Dog from the extensions menu to show its paw in the toolbar.

For manual acceptance, check the pinned icon at normal and high-DPI display scales, click it to open the editor, and check `chrome://extensions` for errors. Automated loading, PNG decoding/dimensions, packaging and diagnostics were verified; native toolbar visual confirmation still requires a desktop display.

## Product documentation

[Product features](docs/features.md) and [functional requirements](docs/requirements.md) define the product behavior. The extension implements independent positive and negative highlights and explicit AI candidate dismissal. See the [implementation log](docs/implementation-log.md) for the dependency map, verification evidence, and remaining manual checks.

## Capabilities

- Multiple named profiles with stable IDs, enabled states, and creation/update timestamps.
- Create, edit, delete, and toggle profiles in the popup or side panel; select individual keyword rows, edit and save each keyword, or remove a keyword with confirmation.
- Global pause removes highlights and disconnects scanning observers while preserving profiles.
- Case-insensitive literal words and phrases, repeated matches, flexible whitespace, and Unicode-aware word boundaries.
- [17 selectable keyword match criteria](docs/keyword-match-criteria.md): word/phrase operations, word lengths, numbers, URLs, email, hashtags, mentions and advanced regex in both editors.
- Dynamic content, text edits, and common visibility attribute changes trigger a throttled rescan.
- Full profile management and AI review in both popup and side panel; **Use sidebar** persists your preferred display location; separate settings page for optional API configuration.
- User-reviewed OpenAI or Anthropic Claude suggestions can be added to either positive or negative keyword lists.
- Local persistence across browser and extension restarts.

## Managing individual keywords

In either editor, **Add Keyword** creates one row in the positive or negative group. Enter one word or phrase and choose **Save keyword**. Select any row with its checkbox; selection is independent and does not change highlighting. **Edit** opens only that keyword. **Cancel** restores its previous value or discards a new row. **Remove** asks for confirmation. Choose **Save profile** to persist additions, edits and removals; canceling or closing the profile editor discards the draft.

Blank values and duplicates within the same group are rejected with a message beside the keyword. Matching ignores case for duplicates; surrounding whitespace is trimmed and repeated whitespace is collapsed. A keyword can belong to both positive and negative groups. Each group allows 200 keywords of up to 120 characters. Punctuation is literal, so a comma does not create another keyword. Empty groups are supported.

Keywords already persist as individual strings in `positiveKeywords` and `negativeKeywords` arrays. This editor keeps that schema, API and backup format, so existing profiles need no migration. Row selection is temporary UI state and is not exported.

## Profile import and export

In the popup or sidebar, choose **Download all profiles** to back up the collection, or **Download profile** on a profile card for one saved profile. Unsaved edits are not exported. Choose **Import all profiles** or **Import one profile**, select a `.json` file, and confirm the import. Success and validation errors appear above the profile list.

Files use UTF-8 JSON: `{ "format": "spotadog.profiles", "version": 1, "scope": "all", "profiles": [...] }`. Individual exports use `"scope": "single"` and exactly one profile. Both preserve IDs, names, positive/negative keywords, enabled states, timestamps and rules (including optional matching `criteria` and legacy `negativeScope`). Global pause, display/model preferences, API keys and runtime highlights are excluded.

Imports merge by ID: matching IDs are replaced completely, including their words and metadata; other profiles remain. Distinct IDs may share a name, as in the existing editor. Duplicate IDs within a file are rejected. The confirmation explains replacement behavior. An empty collection exports successfully; importing it is a no-op. Single and collection files must use their matching import action. Maximum file size is 10 MiB, with at most 50 resulting profiles, 200 terms per list and 120 characters per term. Malformed JSON, non-JSON filenames, unsupported versions, missing or unknown fields, invalid rules, timestamps or keywords are rejected before any write. Unsupported data is never silently discarded or normalized during import.

A successful import persists the complete change in one serialized storage write and immediately rebuilds affected scanners and both highlight layers. New terms become active and replaced terms disappear, subject to global/profile enabled switches. Failed validation or persistence leaves active state intact. If a page cannot refresh, the saved import remains available and feedback requests a page reload. Pages without a content script are skipped.

Every worker start rereads persisted profiles and refreshes connected pages. Extension install/update/reload reinjects the scanner into accessible HTTP/HTTPS tabs; reinitialization disposes the previous scanner, timers and listeners before reading current state. Browser/page restart also reads current storage. The `scripting` permission and HTTP/HTTPS host permissions support this reload recovery. Restricted pages remain unsupported. See Chrome’s [runtime reload lifecycle](https://developer.chrome.com/docs/extensions/reference/api/runtime/) and [scripting permissions](https://developer.chrome.com/docs/extensions/reference/api/scripting).

## Matching decisions and limits

Each visible DOM text node is a matching unit. Positive terms produce yellow underlined highlights; negative terms produce red underlined highlights independently, including in profiles containing only negative terms. For a profile with positive `GPU` and negative `gaming`, `GPU gaming` highlights both terms in their respective colors.

The original keyword lists use literal text. Additional [keyword match criteria](docs/keyword-match-criteria.md) support 17 selectable types, including advanced regular expressions. `GPU` matches `gpu` but not `GPUs`; `data center` can match whitespace or a newline between the words. Duplicate matches are deduplicated by kind and interval. Where positive and negative ranges overlap, pure matching logic subtracts the negative intervals from positive ranges: only overlapping characters turn red. Disabling a contributing profile recomputes these ranges. Both highlight layers are cleared when globally paused.

The scanner skips scripts, styles, forms, code/preformatted text, editable areas, hidden content, and non-text media. CSS Custom Highlight ranges paint text without inserting wrappers or rewriting the webpage DOM. “Visible” includes rendered text below the fold, not just text in the viewport.

Initial limitations:

- Phrases do not cross text-node boundaries (including inline formatting).
- Shadow DOM, iframes, PDFs, canvas text, browser-internal pages, and Chrome Web Store pages are not scanned. File URLs are not enabled.
- Mutation events are coalesced to at most one full scan per 150 ms. Very large or continuously updating pages may need an incremental scanner later.
- Pure CSS animation/stylesheet changes without an observed DOM change may require a resize, page refresh, or global off/on to refresh highlights.
- The UI uses explicit **Save profile** for profile edits. **Save keyword** updates one draft row; pending row edits must be saved or canceled before saving the profile. Selection is local to each row and does not enable/disable matching. Unsaved edits are lost when its page closes. Editing the same profile in multiple panels uses the last saved version; distinct profile operations are serialized by the service worker.

## Storage and privacy

`src/storage/store.js` is the sole Chrome storage adapter. `chrome.storage.local` stores versioned profile/settings data under `spotadog.state` and optional provider keys separately under `spotadog.apiKey` (OpenAI) and `spotadog.anthropicApiKey` (Anthropic). No Chrome sync storage is used. Uninstalling the extension removes its local data.

The worker restricts local storage to `TRUSTED_CONTEXTS`. Content scripts receive only enabled state and scanning profile fields through validated messages; they cannot read settings or the API key or invoke profile/settings mutations. Extension UI reads only whether a key exists, not its value. The key is persisted locally **without encryption**; this personal bring-your-own-key implementation is intended for a trusted browser profile, not for embedding a developer’s shared secret in a distributed extension.

Permissions are `storage`, `sidePanel`, `scripting`, HTTP/HTTPS host and content-script access for automatic scanning, and the OpenAI and Anthropic API hosts for explicit suggestion requests. No webpage text is sent to either provider. The extension does not use analytics.

## AI providers and model selection

Open **Settings** from the popup or side panel. Choose **OpenAI** or **Anthropic**, enter your own API key, select a predefined model from **Model**, and **Save settings**. A key is optional for manual profiles and highlighting. Providers remain selectable for setup and are labeled as configured once a key is saved. Blank retains the selected provider's saved key; **Remove API key** clears only that provider's key. Switching providers clears an unsaved key field to prevent saving it to the wrong provider. Save a new key before switching.

The settings page shows the saved provider/model, and both keyword review interfaces show the active selection. Each provider remembers its last model. Existing OpenAI keys and model IDs migrate without changing them. **Custom model…** retains manual ID entry (including legacy custom IDs); custom models must support the selected API's structured JSON format. Unknown models are retained, not silently replaced. Invalid IDs/providers and unavailable or inaccessible API models produce actionable errors; choose a predefined model and save to recover. Predefined availability still depends on your API account. API usage and billing are separate from ChatGPT or Claude subscriptions.

| Provider | Predefined models |
| --- | --- |
| OpenAI | GPT-4o Mini (existing default), GPT-4.1 Mini, GPT-4.1 |
| Anthropic | Claude Haiku 4.5 (default), Claude Sonnet 5, Claude Opus 5 |

Get an Anthropic API key from the [Claude Console](https://platform.claude.com/). Keys use the existing unencrypted, trusted-context local storage pattern and are never returned in UI state, exported with profiles, or included in errors. This browser extension has no environment-variable configuration; enter keys in Settings. No shared developer key is bundled.

`src/services/models.js` contains the curated IDs, display names, provider defaults, and supported application feature metadata. To maintain it, verify IDs and structured-output support against official documentation, update this table and tests, and run `npm run check`. The catalog was checked on September 6, 2026 against [Claude models](https://platform.claude.com/docs/en/models/overview), [Claude structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs), [GPT-4o Mini](https://developers.openai.com/api/docs/models/gpt-4o-mini), [GPT-4.1 Mini](https://developers.openai.com/api/docs/models/gpt-4.1-mini), and [GPT-4.1](https://developers.openai.com/api/docs/models/gpt-4.1).

`src/services/ai.js` dispatches to dedicated provider adapters. Claude uses `https://api.anthropic.com/v1/messages`, API version `2023-06-01`, a top-level system prompt, user seed message, `max_tokens: 1000`, and native `output_config.format` JSON schema. Anthropic does not support `maxItems`, so its native schema omits that constraint while the full contract remains in the system prompt and local validation enforces the 30-candidate ceiling. Refusals, truncation, malformed output, network/timeouts, authentication, access, model, input-limit and rate-limit errors leave saved keywords unchanged. Credentials and preferences save in a single serialized storage operation.

Both providers support the complete existing AI feature: non-streaming text keyword suggestions with a 25-second timeout, strict response validation, seed exclusion, deduplication, safe rendering, dismissal and explicit approval into either list. The app has no chat history, streaming UI, tools, attachments, vision, agent execution, token usage display, configurable reasoning, or user cancellation controls; those are not advertised by the application catalog. The 1–20 seeds of at most 120 characters keep input bounded. Retry uses the same Get suggestions action. A timed-out first Claude schema compilation can be retried. No unsupported OpenAI-specific parameters are sent to Claude.

In either interface, select a profile, enter 1–20 seed keywords, and click **Get suggestions**. Only those seeds are sent to the selected provider on your explicit request. For OpenAI, the endpoint is `https://api.openai.com/v1/responses`. The dedicated `src/services/openai.js` service requests a strict JSON schema with `store: false` and a 25-second timeout. The authoritative `src/services/suggestion-contract.js` schema is included in both the instructions and strict response format on every request. It defines exactly `{ "suggestions": string[] }`: a required, non-null array with at most 30 candidates and no extra fields. The prompt targets 20 candidates; the 30-item validation ceiling preserves existing compatibility. The parser validates the wire structure against that schema before applying existing keyword normalization and the 120-character domain limit. It handles authentication/quota/network errors, refusals, malformed envelopes/JSON, schema violations, and incomplete responses without extracting JSON from prose or Markdown. Suggestions are validated, bounded, deduplicated, rendered as text, and never added automatically. Select the suggestions and target list, then click **Add selected**. Use each candidate’s **Dismiss** button or **Dismiss all** to discard review candidates without changing saved keywords. Closing the panel also discards unapproved review candidates.

References used for the implementation: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Chrome side panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel), and [Chrome storage access levels](https://developer.chrome.com/docs/extensions/reference/api/storage).

## Project structure

```text
manifest.json              Extension configuration and permissions
src/
  icons/                   Editable SVG and packaged toolbar/extension PNGs
  background/worker.js     Message authorization, serialized mutations, state broadcasts
  popup/                   Popup entry point using the shared profile interface
  sidepanel/               Shared profile editor, display toggle, and AI review
  options/                 API key and model preferences
  ui/                      Shared UI helpers and styles
  profiles/model.js        Profile schema and input validation
  profiles/transfer.js     Versioned JSON import/export validation and ID merge
  storage/store.js         Versioned persistence and credential isolation
  matching/matcher.js      Pure typed matching and overlap resolution
  content/                 Page lifecycle, visibility filtering, mutation observer
  highlighting/            Non-destructive CSS highlight rendering
  services/ai.js           Provider dispatch for keyword suggestions
  services/models.js       Curated provider/model catalog and selection validation
  services/openai.js       OpenAI request/response boundary
  services/anthropic.js    Anthropic Messages request/response boundary
scripts/build.mjs          Reproducible local bundle into dist/
tests/                     Core unit tests and real-extension browser checks
docs/features.md           Product feature guide (required experience)
docs/requirements.md       Authoritative requirements and implementation gaps
docs/prompts/              Append-only development prompt history
docs/prompt-processing-flow.md
AGENTS.md                  Project workflow instructions for future coding agents
```

The profile `rules` object optionally contains `criteria` for the [17 match types](docs/keyword-match-criteria.md#developer-representation-and-compatibility). Absent criteria retain legacy text-node literal matching; no migration is needed. Existing `negativeScope` fields remain readable but have no effect; new profiles omit that obsolete field. Storage rejects unknown schema versions rather than overwriting them. Add explicit migration logic in the storage adapter when the schema changes.

## Validation

```sh
npx playwright install chromium
npm run check
```

No formatter, linter, or separate type-check command is configured; this project uses JavaScript, Node syntax checks and the build/test workflow.

`npm test` also verifies provider migration, atomic settings/key saves, Claude requests and response validation/error handling. Browser checks cover provider-specific dropdowns, model persistence, masked key setup/removal, provider switching, and mocked Claude approval into both lists.

`npm test` also verifies backward-compatible sidebar defaults, JSON transfer fidelity/validation/capacity, and content initialization races and listener disposal. Browser checks cover actual downloads/uploads, immediate term replacement, failure recovery, and repeated full extension reloads with Developer mode enabled. Browser checks exercise no-key popup profile editing, actionable missing-key handling, global/per-tab Chrome routing, display rollback on storage failure, and sidebar restoration across browser restart.

`npm test` runs core model, literal matching, red overlap precedence, approval capacity/deduplication, storage concurrency/persistence and version rejection, and mocked API validation/error tests. `npm run test:browser` loads the actual unpacked MV3 extension in isolated Playwright Chromium, exercises profile CRUD, dynamic highlights and excluded elements, both highlight colors, negative-only profiles, shared enabled controls, settings, safe AI approval/dismissal and storage failures with a mocked network response, content-script access restrictions, popup rendering, and persistence after closing/reopening the browser. Screenshots go to ignored `test-results/`.

A live request to either provider requires your own configured key and is not made by the tests. Native Chrome panel docking and toolbar interaction should also be checked manually:

1. Open the popup from the toolbar with no key configured. Create/edit a profile and add/remove keywords. Enable **Use sidebar** and verify the panel opens. Close it, switch tabs, and click the toolbar icon: it should reopen in the sidebar. Disable **Use sidebar** and verify the next toolbar click opens the full popup with your data intact. Repeat after restarting Chrome.
2. Create `AI Infrastructure` with positive `GPU`, `inference`, `data center`, and negative `gaming`.
3. Confirm `GPU gaming` highlights GPU in yellow and gaming in red; check overlapping terms, negative-only profiles, and removal/reappearance with profile and global toggles.
4. In Settings, configure each provider with your own real API key, select multiple predefined models, and switch between providers. Verify the saved model and key persist. Request suggestions with each provider, dismiss an unwanted candidate, and verify only selected suggestions are added to the chosen list.
5. Restart Chrome and verify profiles/settings remain. Remove the key if no longer needed.

## Development prompt history

**Save first, implement second.** Before implementing any development request, read [the prompt processing flow](docs/prompt-processing-flow.md), review relevant [previous prompts](docs/prompts/), and save the complete request to a new sequential file. Never overwrite prior prompts. Redact secrets with clear placeholders. After validation, append implementation notes and update documentation when needed.

The initial request is preserved in [001-initial-project-setup.md](docs/prompts/001-initial-project-setup.md). Prompt history is source-controlled and deliberately not ignored. Source, README, workflow, and ordered prompts together document the project’s evolution.
