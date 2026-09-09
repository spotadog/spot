# Spot a Dog features

Spot a Dog helps you quickly scan webpages by highlighting words and phrases related to subjects you care about. This guide describes the required product experience. See the [requirements](requirements.md) for precise behavior and the [README](../README.md#capabilities) for what the current extension implements.

| Feature | Required user experience |
| --- | --- |
| Spot a Dog On/Off | Pause all page scanning and remove highlights without deleting profiles or changing their individual switches. Resume with your saved configuration. |
| Popup | With sidebar mode off, the toolbar opens a popup with full profile/keyword management, AI review, and settings access. |
| Sidebar / Side Panel | Enable **Use sidebar** for the same interface beside the webpage. The saved preference controls later toolbar openings across tabs and browser sessions. |
| Keyword Profiles | Organize topics, subjects, categories, keyword types, or interests into named reusable profiles; create, edit, or delete them; add, activate/deactivate, edit, save and remove each keyword in its own row. |
| Positive Keywords | Highlight important or desirable words and multi-word phrases in a distinct positive color, initially yellow with an underline. |
| Negative Keywords | Highlight negative words and phrases in red by default so they are easy to distinguish, including when no positive terms appear nearby. |
| Keyword Match Criteria | Select and configure all [17 match types](keyword-match-criteria.md), including word/phrase operations, lengths, structural recognition and advanced regex, for positive or negative highlights. |
| Live Keyword Counts | Optionally enable **Track keyword occurrences** to see separate unique-in-context and repeated counts beside each saved keyword, updated for the current page. Disabled by default. |
| Independent Profiles | Switch each profile on or off without changing other profiles. Only enabled profiles scan when Spot a Dog is globally on. |
| AI Keyword Discovery | Enter seed words or phrases and ask an OpenAI or Anthropic model for synonyms, variations, associated concepts, and related terminology. |
| Human Approval | Review candidates individually, select useful terms, reject or dismiss unwanted ones, choose the profile and positive or negative list, then explicitly add your selection. |

## Privacy and data handling

Browsing information and page content accessed by Spot a Dog stay on your machine, within your browser. Scanning, matching, highlighting and keyword counts are processed locally without sending browsing data, page URLs, content or derived counts/fingerprints to external servers. The plugin developer, third parties and other external parties do not receive this information. Local storage is not synchronized to a cloud service.

Optional AI discovery sends only the seeds you explicitly submit as user content to your chosen provider, with its model configuration and authentication. Seeds are never populated from browsed pages. Text you manually copy into that field and submit is sent to the provider. See [Storage and privacy](../README.md#storage-and-privacy) for the full guarantee and [the architecture audit](privacy-architecture.md) for implementation evidence.

## Everyday use

Manage profiles and keywords in either the popup or side panel, with no API key required. **Use sidebar** selects the display location and does not change your profiles or scanning state. Both views share your saved global and profile states and link to settings. Closing either view does not turn Spot a Dog off; use the global switch to stop scanning. You can manage configuration even while scanning is off. Save profile edits before closing the editor if you want to keep them.

Choose a profile from the **Profile** dropdown to view its read-only details. Type in **Search keywords** to filter its positive and negative terms immediately. Choose the profile **Edit** action to change its name and enabled state. Keyword Edit and activity controls remain available independently. Switching profiles resets search, with confirmation before discarding changed drafts. Import/export actions live in **Profile backups** at the bottom.

Use **Add Keyword** to enter one term and **Save keyword** to persist that row independently for an existing profile. Each row has an activity checkbox (checked = active, unchecked = inactive), **Edit**, **Cancel**, and confirmed **Remove** action. Activity changes and removals save immediately. Profile Save/Cancel affect only name and enabled state; they preserve keyword saves and open keyword drafts. Failed writes retain the row for retry. Initial new-profile keywords are created together with its name using Save profile. Missing activity on legacy keywords defaults to active. Blank or duplicate terms show an inline error.

For example, a profile named **AI Infrastructure** could contain positive terms `GPU`, `inference`, and `data center`, and negative terms `gaming` and `graphics settings`. Default colors are yellow for positives and red for negatives. Each keyword can use one of six presets or any custom color. If the same characters match both kinds, the negative keyword takes precedence regardless of color. You can enable this profile alongside other interests or disable it independently.

Open **Settings** to save your own API key and model configuration. A blank key field retains the saved key; **Remove API key** deletes it. The key is stored locally, unencrypted, for use in a trusted browser profile. Only explicitly entered discovery seeds are sent as user content to OpenAI or Anthropic; scanned webpage text is never attached. No API key is needed to create profiles or highlight pages. See [credential requirements](requirements.md#r8--ai-configuration-and-credentials) for handling and privacy rules.

To expand a profile, select its destination, enter seeds, and click **Get suggestions**. Review the results, select terms you want, choose the positive or negative list, and click **Add selected**. Generation alone never changes your profile. Adding terms while the profile or global switch is off stores them for later use without turning scanning on.

## Keyword highlight colors

Add or edit a keyword to choose Yellow, Red, Green, Blue, Purple, Orange, or a custom color. The selected preset has an outline; the selected name and hex value are shown beside the custom picker. Save keyword persists and applies the color independently for existing profiles. Colors survive reload, reopening, and profile backups. Legacy keywords keep their group defaults. Custom highlights choose black or white foreground text for contrast.

## Availability and limits

Independent red negative highlights, red overlap precedence, individual candidate dismissal, and dismissal of all candidates are implemented. See the [implementation log](implementation-log.md) for automated validation and remaining manual checks.

Scanning covers supported webpage text, including dynamically added content. Browser-internal pages and other excluded content remain outside the current scope; see [matching decisions and limits](../README.md#matching-decisions-and-limits). Profiles and settings persist across browser restarts. The [functional requirements and acceptance checks](requirements.md) define the implementation contract for future changes.

## Keyword matching criteria

Use **Add Keyword** or **Edit** on a keyword, enter its text and optionally select **Keyword matching criteria**. Each keyword owns its criterion; its group determines highlight color. Choose Save keyword to apply it independently for an existing profile. Default retains literal matching. Criteria are included in profile backups. The [complete match-type table, examples, validation and semantics](keyword-match-criteria.md) describe every supported option.

## AI model choices

Settings offers separate OpenAI and Anthropic credentials and predefined model dropdowns. Custom IDs remain available, and each provider remembers its last model. Both providers support the same reviewed keyword suggestions. See [provider setup](../README.md#ai-providers-and-model-selection).

## Live keyword counts

Turn **Track keyword occurrences** on or off in the popup or sidebar. This global preference persists locally and defaults to off for existing and new installations. Counts appear beside each keyword while viewing a saved profile; choose Save profile or Cancel to return from editing to live counts. Tracking pauses with **Highlight pages**. Inactive keywords and disabled profiles record no new appearances; their saved history remains available. Unsupported pages or pending page analysis show **Counts unavailable**.

Analysis covers the same rendered DOM text nodes as highlighting, including text below the fold. Scripts, styles, forms, code/preformatted text, editable and hidden content, non-text media, shadow DOM and iframes remain excluded. Phrases cannot cross text-node boundaries. The existing per-keyword criteria, capitalization rules, flexible whitespace and Unicode boundaries determine valid matches; regex keeps its existing case-sensitive behavior.

**Repeated** is the cumulative observed total for that keyword on the exact current page URL, before highlight overlap/color resolution. Five valid matches give a repeated count of five. Counts are independent per profile and positive/negative keyword, even when another keyword matches the same characters.

**Unique in context** is the number of distinct complete matching text-node contents containing a valid occurrence. Context normalization lowercases text, trims it and collapses whitespace; punctuation is retained. Two nodes containing `GPU gpu` and ` GPU   GPU ` produce four repeated occurrences and one unique context. Adding a node containing `GPU!` yields five repeated occurrences and two unique contexts. This is deterministic text-context deduplication, not semantic AI analysis: inline markup can split contexts, and punctuation differences distinguish them. Context normalization does not change which occurrences match.

The existing scanner batches relevant DOM mutations over 150 ms and caches matches and count contributions for unchanged text nodes. Lazy-loaded and inserted content adds observations. Hidden, removed or temporarily absent content does not erase recorded appearances. Each normalized context retains its highest observed repeated count across scans; totals sum those context counts. Reprocessing the same content is idempotent. A new context adds its matches; additional simultaneous copies of an existing context increase its recorded multiplicity. Editing a context creates a distinct historical context. Scrolling alone needs no rescan because rendered text below the fold is already included; DOM changes caused by scrolling use the same observer. Resizes and disclosure toggles also refresh visibility. Navigation selects the history for the new exact URL (including query and fragment), including client-side routes; content retained by the website is observed for that URL. Returning to a URL or reloading restores its history. URL changes deliberately select separate histories rather than combine different pages. UI search and profile selection do not filter the stored observations. Counts are not exported or sent to AI services.

An open interface reads the active tab's latest snapshot every 500 ms while tracking and global scanning are enabled; these reads do not scan the page. Switching tabs clears the displayed result before querying the new page. Disabling tracking clears the active snapshot/cache and removes route listeners and UI polling while retaining persisted history; the existing highlighting observer remains if highlighting is enabled. Global pause disconnects scanning. Closed interfaces stop polling, and reinjection disposes the previous scanner. Mutation-driven passes still traverse the rendered DOM to reconcile visibility and removals, so very large dynamic pages retain the scanner's existing scaling limits. Stylesheet-only visibility changes without observed mutations retain the existing resize/refresh limitation.

Historical counts are stored locally through the worker’s serialized storage adapter, separately from version-1 profiles, under `spotadog.counts.v1.<SHA-256 URL>`. Each keyword identity (profile, positive/negative kind, text and criterion) maps hashed normalized contexts to their maximum observed multiplicities. The content script passes observations locally to the extension worker for hashing; raw URLs and page text are not stored, although fingerprints are not encryption. Concurrent and out-of-order observations merge by context rather than replace a total. Only acknowledged persisted totals are displayed; storage errors show Counts unavailable and a subsequent scan retries. Old installations have no persisted counts to migrate: history begins with the first scan after this update, without modifying profiles or preferences.

There are no stable source-record IDs in arbitrary DOM text. Identical contexts shown in disjoint batches are indistinguishable from reprocessing and therefore retain the largest observed multiplicity, not a sum of batches. Text edits form new contexts, and markup changes can change text-node boundaries. This conservative context-based history avoids inventing duplicate appearances, but cannot reconstruct unseen content or previously discarded counts. Removal from the DOM is not treated as an explicit source deletion. History has no automatic eviction; it remains until extension data is cleared or the extension is uninstalled. Very large histories can reach Chrome local-storage limits; failed writes preserve existing data and show Counts unavailable.

## Word list tabs

In both popup and sidebar, **Positive Words** and **Negative Words** switch lists in place. Only the active list appears and all its rows expand with normal page scrolling. Tabs support arrow keys, Home/End, and visible keyboard focus. Search applies to both lists, and switching tabs preserves unsaved keyword edits.

## Auto Scroll and automatic pagination

**Pause after positive keyword** is off by default and applies only to the active tab. With it enabled, a rendered positive highlight entering the viewport arms a pause: scrolling finishes its containing article/post or section (falling back to the nearest div), then stops with the next content boundary at the top of the viewport. Internal layout divs do not split semantic posts. The boundary follows layout changes; at the final content block it stops at the reachable document end before pagination. Negative highlights do not trigger it, including positives fully covered by negative matches. Resume skips the consumed block; disabling the option cancels its pending pause. Highlight pages must be enabled for new encounters. Unusual layouts and nested scrollers retain the document-scrolling limitation.

The shared popup/sidebar includes an optional **Auto Scroll** toggle for the active webpage tab. When enabled, **Scroll speed** selects 30–600 pixels per second (default 120), and **Pause** / **Resume** controls scrolling and pagination together. These controls are independent of Highlight pages and keyword tracking. Switching tabs displays that tab's own state; new tabs start off.

Auto Scroll moves through the document, including pagination initially below the viewport. At the bottom it allows at least four seconds without content changes before following a supported next control. Infinite-scroll additions reset this grace period. Recognized controls include `rel="next"`, an accessible “Next page” label, and Next/Older/arrows within a pagination region. A pager displaced above the viewport by a long footer is brought back into view after consuming the document. Only rendered controls in the viewport are eligible for activation; disabled, hidden, download, new-tab, fragment-only, same-page and cross-origin links are excluded. The extension activates the site's control, which can make the site's ordinary navigation requests; browsing content is never sent to an extension server or AI provider.

A successful automatic page navigation continues scrolling. AJAX pagination resumes after changed page content settles; appended content keeps position, while a replacement page of the same or smaller height starts at the top. Pausing preserves speed and the browser's position. Resume always uses the actual current position, including manual adjustments or Back restoration. User link/button interaction, history navigation, and new documents outside an authorized next-page action pause the feature. A paused detail-page / Back round trip stays paused. Reloading a page also pauses an enabled session.

With no next control or new content after twelve quiet seconds at the bottom, the feature pauses at the end. A canceled next action pauses after fifteen seconds. Resume explicitly retries from the current position. Busy indicators (`aria-busy="true"`) defer end detection. Only one loop and one pending pagination action run at a time; repeated page targets/content and a 200-action session limit prevent loops. Turning Auto Scroll off and on starts a new traversal.

State is scoped to browser tab IDs in trusted `chrome.storage.session`, behind the existing storage adapter. It survives service-worker suspension, but Chrome clears it on browser restart and extension disable/reload/update. Closed/new-tab events remove associated records; worker startup prunes records for tabs that no longer exist. No scrolling state is written to persistent local preferences or profile backups.

Limitations: the document's main scroll area is supported; nested scroll containers, shadow DOM, frames, virtualized content without normal document scrolling, and unusual/unlabeled pagination may require manual navigation. Sites loading after the end grace period require Resume. Pagination recognition is deliberately conservative; redirects to an unexpected URL pause. A page continuously changing its content or declaring itself busy can keep the feature waiting. Browser scheduling may suspend background-tab animation frames.

### Auto Scroll developer contract

- `src/navigation/state.js` contains the pure state transitions. Records contain enabled, paused, speed, pauseAfterPositive (default false), revision, documentId, URL, pending target/expiry, visited targets/content signatures, and status reason. No Y coordinate is persisted.
- `scroll.get` / `scroll.set` are trusted extension-UI messages with an explicit tabId. UI generation guards discard obsolete active-tab replies. `scroll.hello`, `scroll.next`, `scroll.progress`, and `scroll.pause` are accepted only from this extension's active top-frame HTTP(S) content scripts; tabId and documentId come from Chrome's sender, never page-supplied payloads.
- Rendered positive ranges stay local in the highlighter and feed `navigation/positive-pause.js`; pending content and consumed blocks are document-local DOM references, never stored or sent in messages. Custom colors do not change polarity.
- Content transitions carry a revision. A current-frame instance probe inside the serialized hello mutation rejects delayed initialization from a departed document. Old documents and stale next/progress requests cannot mutate a newer lifecycle. Pause can cancel a concurrently authorized next action from the same document. Next authorization is stored before clicking, scoped to a target and a fifteen-second deadline. History/reload cannot consume it as automatic continuation.
- `scroll.changed` is sent to the specific tab/document; `scroll.ui.changed` includes the tab ID. The content controller rejects stale revisions, cancels frames/observers on pause, disable, pagehide and disposal, and rereads state on pageshow. Reinjection disposes the old controller alongside the existing scanner.
- Tab state uses the `spotadog.scroll.v1.<tabId>` session namespace through `createTabStore` in `src/storage/store.js`. Session storage itself supplies the fresh-browser boundary; worker wake must not clear live tab state. See [Chrome session storage lifecycle](https://developer.chrome.com/docs/extensions/reference/api/storage) and [tab/document messaging](https://developer.chrome.com/docs/extensions/reference/api/tabs).
