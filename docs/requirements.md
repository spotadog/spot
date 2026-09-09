# Spot a Dog requirements

## Authority and scope

This document defines required product behavior, based on [prompt 003](prompts/003-requirements-and-features.md). The [feature guide](features.md) describes the same behavior for users. “Must” indicates a requirement; examples illustrate it, and explicitly marked future possibilities are optional. The [README](../README.md) describes the current implementation and its limitations, not a claim that every requirement below is shipped.

The requirements from [prompt 001](prompts/001-initial-project-setup.md) remain applicable except where explicitly superseded here. In particular, negative keywords must now produce red highlights independently of positive matches. This replaces the initial same-text-node suppression rule. Prompt 003 established this contract; prompt 004 implements the changes.

## R1 — Global extension state

Spot a Dog must expose a persistent global on/off control in both the popup and side panel. When on, it must scan supported webpage text using only enabled profiles and render their positive and negative matches. When off, it must stop scanning and matching, disconnect scanning observers, cancel or ignore pending scan results, and remove existing Spot a Dog highlights. It must not add new highlights while off.

Turning Spot a Dog off must preserve profiles, keyword lists, individual profile states, preferences, and API configuration. Turning it on must scan using the saved enabled profiles. Configuration interfaces must remain usable while scanning is off.

| Global state | Profile state | UI visible | Required scanning behavior |
| --- | --- | --- | --- |
| Off | Either | Either | No profile scans; no Spot a Dog highlights |
| On | Off | Either | This profile contributes no matches |
| On | On | Either | This profile contributes matches on supported pages |

## R2 — Popup and side panel

The toolbar button must respect the persisted **Use sidebar** preference. When off (the default), it opens the full popup interface. When on, it opens/focuses the global side panel across tabs and browser sessions. Chrome controls physical visibility and requires a user gesture to reopen a closed panel. Configuration must never depend on sidebar mode or an API key. These requirements supersede the earlier popup-only quick-controls design (prompt 006).

| Capability | Popup | Side panel |
| --- | --- | --- |
| View and change global/profile enabled states | Required | Required |
| Open settings | Required | Required |
| Persist display preference | Required | Required |
| Create, edit, delete profiles and manage keyword lists | Required | Required |
| Generate, review, and approve AI suggestions | Required; key needed only for generation | Required; key needed only for generation |

Changing display mode must preserve profiles, keywords, settings, and credentials. Existing version-1 settings without a sidebar field must default to popup mode without replacing saved data. Missing-key errors must appear only when an AI feature is requested and offer access to API configuration.

Changes saved in either interface must be reflected in other open interfaces. Interface-specific presentation must not duplicate matching, persistence, or AI request logic.

## R3 — UI visibility and controls

Opening the popup or panel must not change global or profile enabled states. Dismissing the popup, using the browser’s panel close button, or opening settings must not disable Spot a Dog. Opening the side panel from the popup may dismiss the popup; the persisted state and ongoing scanning must remain unchanged. Reopening either interface must show the saved state.

The global on/off control must be visibly separate from interface launch/close buttons and individual profile controls. Labels must make clear whether an action changes scanning, a profile, or interface visibility. If opening a panel fails, show an actionable error without changing scanning state. Unsupported pages must be identified without implying that Spot a Dog has been turned off.

Profile edits retain the existing explicit **Save profile** behavior. Closing an editor without saving may discard its draft; it must not modify saved profiles. Browser visibility and draft lifetime are separate from extension activation.

## R4 — Keyword profiles

Users must be able to create, edit, delete, and independently enable or disable multiple reusable profiles representing topics, subjects, categories, keyword types, or interests. Each profile must retain a stable unique ID, user-defined name, positive keyword list, negative keyword list, enabled state, and creation/update timestamps. Users must be able to add and remove words and multi-word phrases in both lists.

Retain current input constraints: up to 50 profiles, names of 1–80 characters, up to 200 terms per list, and up to 120 characters per term. Trim and normalize whitespace, ignore empty terms, and deduplicate terms case-insensitively within each list. Empty lists are allowed. Invalid changes must produce a clear error without corrupting saved data.

Additional configuration must be possible through the existing profile rules extension point and explicit storage migrations. The legacy negativeScope field must not silently reactivate suppression when implementing these requirements.

## R5 — Positive matching

Every positive word or phrase from an enabled profile must be highlighted when found on a supported webpage while global scanning is on. Positive highlights must be visually distinct from negative highlights; retain the existing yellow background and underline as the initial positive style.

Retain literal, case-insensitive matching, Unicode-aware whole-word boundaries, repeated occurrences, and flexible whitespace between phrase words. Terms must not be interpreted as regular expressions unless that keyword explicitly selects Regex. Matching remains within an individual DOM text node; cross-node phrases are outside the current scope.

## R6 — Negative matching and overlap

Every matching negative word or phrase from an enabled profile must be highlighted in red, including when no positive term matches nearby. Negative terms use the same word and phrase matching semantics as positive terms. A negative match must not suppress a separate positive match, whether from the same profile or another profile.

For deterministic rendering, red takes precedence on characters where positive and negative ranges overlap; non-overlapping positive characters retain their positive style. Duplicate matches must not create stacked visual effects. A term present in both lists is allowed and renders red when both are active. This overlap rule is a documented implementation decision, not an additional filtering feature.

Example: with positive `GPU` and negative `gaming`, `GPU gaming` must display `GPU` in the positive color and `gaming` in red. `gaming` alone must still be red. The implementation must retain both independent matches in this example.

## R7 — Independent profile activation

Enabling or disabling one profile must not change any other profile or the global state. Disabling a profile must remove its contribution on the current page; matches still contributed by another enabled profile must remain. Recompute overlap colors when contributing profiles change.

For example, five profiles may have only profiles 1, 3, and 5 enabled. Global off must stop all five without changing their stored states; global on must resume only 1, 3, and 5. Profile changes made while global scanning is off must persist without triggering scanning.

## R8 — AI configuration and credentials

Settings, accessible from both interfaces, must allow the user to configure, replace, retain, and remove their own API key and configure the model. A blank key field must retain an existing key; a separate explicit removal action must delete it. Missing or invalid configuration must produce an actionable error when requesting suggestions. Manual profile management and scanning must work without an API key.

AI-assisted discovery is provided through dedicated OpenAI and Anthropic API adapters, using explicit user requests. Preserve these security and privacy requirements:

- Never hard-code or commit credentials, include them in prompts, fixtures, logs, error messages, analytics, or expose them unnecessarily.
- Persist the key separately from profile state in local storage restricted to trusted extension contexts. Do not use sync storage. UI state must expose only whether a key exists, not the saved key value; content scripts must never receive credentials or invoke privileged configuration or AI operations.
- Send the key only to the configured integration’s authorized HTTPS API endpoint. Send only user-entered seed terms for discovery, not webpage content. Keep network requests in the dedicated service and retain `store: false` for OpenAI (it is not an Anthropic parameter).
- Treat suggestions as untrusted data: validate bounded text, normalize and deduplicate it, and render it as text rather than HTML. Errors must be useful without leaking secrets.

The current local key storage is unencrypted and assumes a trusted browser profile. Documentation and settings guidance must not describe it as encrypted or suitable for distributing a shared developer secret. Settings must explain local storage and the explicit external submission of seeds. See the [README storage and privacy details](../README.md#storage-and-privacy).

## Local-only browsing privacy

[Prompt 021](prompts/021-local-only-browsing-privacy.md) makes the browsing-data boundary explicit: all browsing information and page/content information accessed by the extension must remain on the user's machine, within the browser. Scanning, matching, highlighting and count processing must run locally, without transmitting this information or its derivatives (including URLs, matches, counts and fingerprints) to a server, the plugin developer, an AI provider or any other external party. The developer must not receive browsing data through logging, telemetry, error reporting, storage synchronization or another service.

Chrome messages between content scripts, the extension worker and extension UI are local browser communication. Keep persistence behind the existing local storage adapter and matching independent of UI and AI services. Broad HTTP/HTTPS permissions authorize local scanning and reinjection, not browsing-data uploads.

Preserve the separate, explicit AI seed-submission feature in R8–R9: user-entered seeds, model configuration, instructions and credentials go to the selected provider. Never derive seeds from pages or attach browsing information to that request. Documentation must explain that manually copying page text into the seed field and submitting it sends that text as AI input. The extension's guarantee covers its handling of browsing data, not unrelated website traffic or other software. Verify future changes against the [privacy architecture audit](privacy-architecture.md).

## R9 — AI-assisted keyword expansion

Users must be able to enter one or more seed words or phrases and explicitly request related suggestions for a selected profile. Retain the current limit of 1–20 seeds per request. Suggestions may include synonyms, related terminology, common variations, associated concepts, relevant phrases, and alternative terms that appear on webpages; these examples are possibilities, not mandatory output categories.

Generation must produce reviewable candidates only. It must never enable a profile, change global state, or automatically store candidates as keywords. Show request progress and actionable authentication, quota, network, timeout, refusal, incomplete-response, and malformed-output errors. Failed requests must not change saved keyword sets. AI service behavior remains independent of scanning and UI visibility.

## R10 — Human approval

Present generated suggestions for individual review before any profile mutation. Users must be able to approve individual items, leave unwanted items unselected, and dismiss or remove unwanted suggestions from review. Merely displaying or selecting a suggestion must not store it: **Add selected** is the explicit approval and persistence action.

Before adding, clearly identify the target profile and keyword list. Only selected, validated terms must be added, deduplicated against that list; leave existing terms and the other list intact. Reject an invalid or deleted target and report validation/storage failures without claiming success or silently adding to a different profile. Unapproved suggestions must never become active on closing or reopening an interface.

## R11 — Positive and negative expansion

The approval workflow must support adding reviewed suggestions to either the positive or negative list of the selected profile. The user must explicitly control the destination. Adding to one list must not implicitly move or add terms to the other list. Suggestions added to a disabled profile or while global scanning is off remain stored but inactive until the corresponding states allow scanning.

Keep generation, candidate review/approval, and keyword persistence conceptually separate. Future generation methods may change without bypassing approval or replacing the profile storage abstraction.

## Retained platform, scanning, and persistence requirements

Retain the Manifest V3 Chrome foundation and current Chrome 120+ baseline. Scan rendered text, including text below the fold, on supported HTTP/HTTPS pages and rescan dynamically inserted/edited content and observed visibility changes. Avoid scripts, styles, form fields, code/preformatted text, editable regions, hidden content, and non-text media. Render highlights without rewriting page content.

Current scope excludes shadow DOM, iframes, PDFs, canvas text, browser-internal pages, the Chrome Web Store, and file URLs. Phrase matching remains within text nodes. Keep the documented 150 ms mutation coalescing and known pure-CSS visibility limitation until separately revised. These are existing limits, not newly requested capabilities.

Persist profiles, both lists, independent/global states, and preferences across browser and extension restarts through the single versioned storage abstraction. Serialize mutations, preserve unrelated profile updates, and reject unsupported schema versions without overwriting data. Same-profile concurrent edits retain the documented last-save behavior. Report extension/storage errors gracefully.

Keep modules small, focused, and free of unnecessary dependencies. Matching must remain independent of UI and rendering; storage must stay behind its adapter; AI calls must stay behind the dedicated service. Global state, interface presentation, profiles, keyword persistence, scanning, rendering, AI generation, and settings must remain separate responsibilities. Additional profile rules, incremental scanning, broader document coverage, are future possibilities, not requirements for this implementation.

## Implementation status and acceptance checks

Independent negative matching, red precedence, negative-only scanning, revised panel guidance, and explicit candidate dismissal are implemented in prompt 004. The [implementation log](implementation-log.md) records dependencies, changed components, verification, and remaining limitations.

`npm run check` covers the automated acceptance scenarios below, including real unpacked-extension tests. Native toolbar/panel docking and a live OpenAI request still require the README’s manual Chrome checks; automated panel-page tests do not establish those behaviors.

| Scenario | Expected result | Requirements |
| --- | --- | --- |
| Global off with existing highlights; page then changes | All highlights removed; no new scan/highlight; saved configuration retained | R1 |
| Open popup, launch panel, close both, reopen | Saved states unchanged; enabled scanning continues independently of visibility | R2–R3 |
| Create, edit, delete, reload a profile | Validated fields and lists persist correctly; deletion removes its contributions | R4 |
| Match mixed-case words, phrases, repeated and negative-only terms | Positive style and red negatives; literal boundaries and whitespace behavior retained | R5–R6 |
| Overlap positive/negative terms across profiles, then disable one | Red precedence only where active ranges overlap; other contributions remain | R6–R7 |
| Enable only profiles 1, 3, 5; globally off and on | Only those profiles resume; other states preserved | R1, R7 |
| Configure/replace/remove key; inspect content-script data and errors | Credentials remain isolated; missing key does not break manual use | R8 |
| Generate candidates and close without adding | Saved keyword sets unchanged | R9–R10 |
| Select subset, dismiss others, add separately to each target list | Only approved terms enter the chosen profile/list; duplicates handled | R10–R11 |
| AI failure, invalid output, deleted target, or storage failure | Clear error; no unintended profile mutation | R8–R11 |

This table remains the acceptance contract. See the implementation log for what has been verified automatically and what remains manual.

## R13 — Keyword match criteria

[Prompt 008](prompts/008-keyword-match-criteria.md) requires all 17 [documented match types](keyword-match-criteria.md) in both profile editors and the existing evaluation/storage/transfer workflow. Criteria must distinguish word, phrase/text, length, structure and regex semantics; validate numeric bounds and regex syntax; and preserve existing literal rules. Between-length bounds are inclusive. Invalid saves/imports must fail without changing active profiles, and invalid regex must not crash evaluation. Each type must have positive, negative and boundary coverage. These additional criteria are implemented; the linked guide defines the precise supported recognition and regex performance limits.

## R14 — Individual keyword management

[Prompt 009](prompts/009-individual-keyword-editor.md) replaces combined profile keyword text fields with individual rows in both editors. Each term can be added, selected independently, edited, saved to the draft, canceled or removed with confirmation. Save profile persists the draft only after all row edits finish. Empty, whitespace-only, duplicate (case-insensitive within a group), overlength and overcapacity submissions show useful errors without replacing other terms. Existing array items, unrelated metadata, matching rules, AI approval and profile backups remain compatible; no schema migration is needed. Empty, single and many-item groups must render correctly. Selection does not alter matching and is not persisted.

## R15 — Provider and model configuration

[Prompt 010](prompts/010-multi-provider-model-selection.md) adds OpenAI and Anthropic provider selection, curated model dropdowns, retained custom IDs, separate masked key configuration and per-provider last-selected models. Legacy settings normalize to OpenAI without losing the stored model/key. Both adapters must implement the existing structured keyword suggestion and approval contract, with actionable errors and no automatic model fallback. See the [setup and catalog maintenance guide](../README.md#ai-providers-and-model-selection).


## R17 — Per-keyword matching criteria

[Prompt 013](prompts/013-per-keyword-matching-criteria.md) associates an optional criterion with each keyword. Add/Edit Keyword exposes the existing 17 types, preserves the selected criterion and uses the keyword text as the word/phrase/regex search value. Numeric and structural recognition retain their documented behavior. Unset criteria preserve default literal matching. Mixed criteria in a profile, legacy strings and independent legacy rules, transfer, AI approval and individual editing must preserve unrelated keywords. Invalid criteria and regex fail safely. This supersedes the separate profile criterion editor described in R13.


## Keyword activity by profile mode

[Prompt 014](prompts/014-keyword-activity-by-profile-mode.md) supersedes the temporary selection checkbox behavior above. Checkboxes represent keyword activity consistently: checked is active, unchecked is inactive. View mode disables the input and labels it read-only; edit/create modes update the existing profile draft. Save profile persists activity and Cancel restores saved values. Optional boolean `active` on keyword records defaults to true when absent, preserving legacy matching. Inactive keywords retain their text and criteria in storage/backups and do not match.


## Per-keyword colors — prompt 025

[Prompt 025](prompts/025-per-keyword-highlight-colors.md) supersedes fixed highlight colors: adding and editing keywords must offer six presets and a custom picker with a clear selected state. Save profile persists valid six-digit hex colors with the existing keyword data, including backups. Legacy keywords resolve yellow positive/red negative defaults without a migration. Negative overlap precedence follows keyword kind, regardless of selected color.


## Independent keyword persistence — prompt 028

[Prompt 028](prompts/028-independent-keyword-saving.md) supersedes the draft-only saves and read-only keyword viewing described in prompts 009/012/014/025. Existing profiles expose keyword Edit/Save, Add, activity and confirmed Remove independently of the profile detail mode. Each row save persists immediately; profile Save/Cancel operate only on name and enabled state, preserving stored keywords and unfinished row edits. Errors retain keyword input for retry. Mutations validate against the latest stored profile and reject stale row values. New-profile creation retains its initial name-and-keywords submission. No schema migration is required.

## Autoplay keyword reading modes — prompts 029–031

The per-tab Auto Scroll controls include independent, off-by-default Pause on positive keyword and Slow down on positive keyword toggles. A positive-matching post pauses when its top reaches the eyeball level, default 50% of the visible page height; Settings configures the globally persisted level from 10% to 90%. This supersedes the earlier pause at the next content boundary. Resume skips the consumed post.

The slowdown alternative uses one-quarter of the selected speed while a positive-matching post spans the configured level, and restores normal speed on nonmatching content. It overrides automatic keyword pausing if both toggles are selected, without modifying either selection or saved speed. Negative-only highlights do not trigger these modes. Disabling both retains ordinary autoplay; manual Pause and navigation safeguards remain effective.

## Auto Scroll Resume hotkey — prompt 032

Alt+Shift+R (Option+Shift+R on Mac) performs the same active-tab action as Resume, preserving scroll position, speed and keyword modes. The command works without an open popup/sidebar, never enables disabled scrolling or pauses running scrolling, and is configurable through Chrome extension shortcut settings. Unsupported/closed/missing tabs are handled safely.

## Auto-pause color selection — prompt 033

Settings configures a global set of auto-pause colors, persisted across restarts. Only highlighted positive matches whose assigned/resolved color exactly matches a selected normalized hex color can trigger the existing eyeball-level pause. The six presets are initially selected; custom colors can be added. An empty selection prevents keyword-triggered pauses. Unselected keywords retain highlighting; slowdown, Resume and navigation safeguards retain their current behavior.
