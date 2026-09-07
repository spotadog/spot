# Spot a Dog features

Spot a Dog helps you quickly scan webpages by highlighting words and phrases related to subjects you care about. This guide describes the required product experience. See the [requirements](requirements.md) for precise behavior and the [README](../README.md#capabilities) for what the current extension implements.

| Feature | Required user experience |
| --- | --- |
| Spot a Dog On/Off | Pause all page scanning and remove highlights without deleting profiles or changing their individual switches. Resume with your saved configuration. |
| Popup | With sidebar mode off, the toolbar opens a popup with full profile/keyword management, AI review, and settings access. |
| Sidebar / Side Panel | Enable **Use sidebar** for the same interface beside the webpage. The saved preference controls later toolbar openings across tabs and browser sessions. |
| Keyword Profiles | Organize topics, subjects, categories, keyword types, or interests into named reusable profiles; create, edit, or delete them and manage their terms. |
| Positive Keywords | Highlight important or desirable words and multi-word phrases in a distinct positive color, initially yellow with an underline. |
| Negative Keywords | Highlight negative words and phrases in red so they are easy to distinguish, including when no positive terms appear nearby. |
| Independent Profiles | Switch each profile on or off without changing other profiles. Only enabled profiles scan when Spot a Dog is globally on. |
| AI Keyword Discovery | Enter seed words or phrases and ask ChatGPT through the OpenAI integration for synonyms, variations, associated concepts, and related terminology. |
| Human Approval | Review candidates individually, select useful terms, reject or dismiss unwanted ones, choose the profile and positive or negative list, then explicitly add your selection. |

## Everyday use

Manage profiles and keywords in either the popup or side panel, with no API key required. **Use sidebar** selects the display location and does not change your profiles or scanning state. Both views share your saved global and profile states and link to settings. Closing either view does not turn Spot a Dog off; use the global switch to stop scanning. You can manage configuration even while scanning is off. Save profile edits before closing the editor if you want to keep them.

For example, a profile named **AI Infrastructure** could contain positive terms `GPU`, `inference`, and `data center`, and negative terms `gaming` and `graphics settings`. The required behavior highlights positives in yellow and negatives in red. If the same characters match both kinds, red takes precedence. You can enable this profile alongside other interests or disable it independently.

Open **Settings** to save your own API key and model configuration. A blank key field retains the saved key; **Remove API key** deletes it. The key is stored locally, unencrypted, for use in a trusted browser profile. Only explicitly entered discovery seeds are sent to OpenAI; webpage text is not sent. No API key is needed to create profiles or highlight pages. See [credential requirements](requirements.md#r8--ai-configuration-and-credentials) for handling and privacy rules.

To expand a profile, select its destination, enter seeds, and click **Get suggestions**. Review the results, select terms you want, choose the positive or negative list, and click **Add selected**. Generation alone never changes your profile. Adding terms while the profile or global switch is off stores them for later use without turning scanning on.

## Availability and limits

Independent red negative highlights, red overlap precedence, individual candidate dismissal, and dismissal of all candidates are implemented. See the [implementation log](implementation-log.md) for automated validation and remaining manual checks.

Scanning covers supported webpage text, including dynamically added content. Browser-internal pages and other excluded content remain outside the current scope; see [matching decisions and limits](../README.md#matching-decisions-and-limits). Profiles and settings persist across browser restarts. The [functional requirements and acceptance checks](requirements.md) define the implementation contract for future changes.
