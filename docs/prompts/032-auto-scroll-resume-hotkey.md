# Prompt 032 — Auto Scroll Resume hotkey

## Purpose

Add a keyboard shortcut that performs the existing Auto Scroll Resume action.

## Prompt

**Before implementation:** Save this complete prompt in the repository's existing prompt documentation or prompts directory before making implementation changes. Follow the repository's existing naming and organization conventions.
Create a keyboard hotkey for the existing **Auto Scroll Resume** button. Pressing the hotkey should perform the same action as clicking the Auto Scroll Resume button.
Follow the repository's existing documentation, conventions, and patterns when implementing this change.
Create or update the appropriate unit tests for the hotkey behavior and run the relevant tests.
**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the existing documentation rather than inventing a new workflow.

## Implementation Notes

- Saved the complete prompt before implementation. Reviewed the prompt-processing flow, prompt 031, existing Resume UI/navigation transitions, prompt 002 GitHub flow, and the official Chrome commands API documentation.
- Added the native resume-auto-scroll extension command with Alt+Shift+R (Option+Shift+R on Mac). The worker registers its listener synchronously, so it can wake and resume without an open popup/sidebar. No new permissions or webpage keyboard listeners.
- Both the Resume button and hotkey call scroll.resume through the existing navigation service. Inside the serialized tab mutation it uses the existing set-paused-false transition only if scrolling is enabled and paused. Repeated presses leave running state alone and never enable a disabled tab. Speed, keyword modes, position and standard UI broadcasts retain their behavior.
- The command targets Chrome's event tab, falling back to the active tab in the last focused window when no event tab is supplied. Unsupported, closed, missing and unavailable tabs are handled without unhandled rejections. The existing source authorization applies to the shared action.
- Shared controls display Chrome's actual assigned shortcut and guidance for chrome://extensions/shortcuts, including unassigned bindings. Updated README, features and requirements.
- Added unit coverage for manifest/handler naming, button parity, preserved options, tab isolation, repeated keys, disabled state, focus changes, unrelated commands and unavailable/error cases. Extended the automated MV3 scrolling fixture to inspect registered commands and exercise the shared Resume action from the restored position.
- Publication follows prompt 002: current main, no new branch, existing SSH identity; fetched origin with no divergence. GitHub CLI authentication is invalid, so review notes use the documented repository/commit-description fallback.
- Suggested next step: reload dist/ and use the Resume shortcut; change its binding in Chrome extension shortcut settings if preferred or if Chrome leaves it unassigned due to a conflict.
- Browser investigation: the registered shortcut was present in chrome.commands.getAll(), but Playwright headless key injection did not trigger the native command and the movement wait timed out. The automated fixture now verifies registration plus the real shared Resume path, while unit tests invoke the native callback handler. Native OS key dispatch remains a manual Chrome check; no production test hook was introduced.
- Final validation: npm run check passed 140 unit tests, build and the complete automated unpacked-MV3 browser suite with registration/shared-action coverage. git diff --check passed. Native OS key dispatch was not manually tested.
