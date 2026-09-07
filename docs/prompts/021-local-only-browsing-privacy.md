# Prompt 021 — Local-only browsing privacy

## Purpose

Verify and document the local-only handling of browsing information and page content.

## Prompt

**Before implementation:** First save this complete prompt in the repository's prompt documentation or prompts directory, following the project's existing prompt-tracking conventions. This must happen before implementation begins so the instruction can be tracked, reused, audited, and used to help reproduce the project later.

## Objective

Update the project's README and relevant documentation to clearly and consistently explain the plugin/extension's privacy architecture: users' browsing information and page/content information remain entirely on the user's local machine and within the browser. This information is not uploaded to, transmitted to, shared with, or processed by any third-party server, the plugin developer, or any other external party.

## Documentation Requirements

Review the existing README and all relevant user-facing and developer-facing documentation before making changes. Follow the repository's existing documentation style, terminology, formatting, and organization.

Update the documentation so that it clearly communicates all of the following:

* At no point is the user's browsing information or browsed content uploaded to a third-party server.
* Browsing information and page/content information used by the plugin never leave the user's machine or browser.
* Matching and processing of browsed information occur locally within the user's browser/machine.
* Matching does not require sending the user's browsed information or page content to an external server.
* No server interaction sends, uploads, or otherwise exposes the user's browsed information or browsed content to the plugin developer.
* The plugin developer does not receive the user's browsing information or browsed page/content information.
* The user's browsing information and browsed content are not shared with third parties or any other external party.
* The privacy model is local-only processing: information required for matching is processed locally rather than being transmitted elsewhere for processing.

Make these guarantees easy for users to discover rather than burying them in implementation details. The README should contain a clear privacy/data-handling section if an appropriate section does not already exist.

## Accuracy and Consistency

Before documenting these statements as guarantees, inspect the implementation and repository configuration to verify that they accurately describe the current behavior.

In particular, check relevant code paths involving:

* browsing/page-content access;
* matching and processing;
* network requests;
* APIs and backend services;
* analytics or telemetry;
* logging and error reporting;
* third-party SDKs or services;
* extension/plugin permissions;
* storage or synchronization mechanisms; and
* any other mechanism that could transmit browsed information or page content outside the local browser/machine.

Do not make unrelated architectural changes merely as part of this documentation task.

If the existing implementation contradicts any of the required privacy guarantees, do not silently document a guarantee that is untrue. Clearly identify the conflicting behavior and make only the changes necessary to bring the implementation into compliance with the stated local-only privacy model, provided doing so is within the existing project's architecture and intended functionality. Preserve existing functionality wherever it does not conflict with these privacy requirements.

Distinguish browsing/page-content data from unrelated network activity where appropriate. Do not inaccurately claim that the extension makes absolutely no network requests if it legitimately performs unrelated network communication that does not contain, derive from, or expose the user's browsed information/content. The key guarantee is that users' browsed information and content remain local and are never transmitted to or shared with the developer, third parties, or external servers.

## Documentation Coverage

Review the repository for other documentation containing privacy, security, architecture, data-processing, installation, permissions, FAQ, or data-handling descriptions. Update relevant documents so they do not contradict the README or the local-only processing guarantee.

Avoid unnecessary duplication, but ensure important privacy statements are sufficiently explicit and consistent wherever users would reasonably look for this information.

Use precise language rather than vague statements such as "we value your privacy." Explain concretely what happens to the data and where processing occurs.

## Testing and Verification

If this task requires implementation changes in addition to documentation changes, create or update appropriate unit tests that verify the relevant local-processing/data-handling behavior and run the relevant unit test suite.

If the task is documentation-only, run any repository-provided documentation validation, linting, link checking, or equivalent automated checks that are applicable.

Do not perform live or manual browser testing. The user will handle live browser testing separately and provide feedback if necessary.

## Acceptance Criteria

The task is complete when:

1. The README clearly states that users' browsing information and browsed content remain on the user's machine/browser.
2. The README clearly states that matching and relevant content processing happen locally.
3. The documentation clearly states that browsed information/content is not uploaded or transmitted to third-party servers.
4. The documentation clearly states that this information is not shared with or made available to the plugin developer or any other external party.
5. Relevant repository documentation is consistent with these guarantees.
6. The documented guarantees have been checked against the actual implementation and configuration rather than assumed.
7. Any implementation changes required to satisfy these guarantees have appropriate unit-test coverage and pass the relevant automated tests.
8. No unrelated functionality, documentation, or architecture has been unnecessarily changed.

**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the repository's existing GitHub flow documentation rather than inventing a new workflow. Complete all applicable steps required by that documentation.


## Implementation Notes

- Saved the complete prompt before changes; reviewed the prompt workflow, README, feature/requirements/criteria documents, initial review, implementation log and relevant AI/count/publication history.
- Audited page access, local matching/rendering/counting, worker authorization, storage and hashing, AI request construction and UI seed provenance, logs/errors, permissions/CSP, dependencies, build and profile transfer paths. No runtime browsing-data upload path or conflicting architecture was found, so implementation remains unchanged.
- Added a prominent README privacy statement and explicit storage/privacy guarantee, consistent feature/requirements/criteria guidance, and docs/privacy-architecture.md with source-backed data-flow evidence and maintenance checks. Historical prompts/reviews remain preserved.
- Clarified the existing optional AI boundary: explicitly entered seeds are externally submitted with model/request configuration and credentials; scanned data is never attached. Manually copying page content into that field and submitting it sends that text as AI input. The guarantee concerns the extension's browsing-data handling, not website traffic or other software.
- Validation: all 76 unit tests passed; 43 local Markdown file targets resolved; exact complete-prompt preservation and git diff --check passed. No dedicated documentation validator/linter is configured. No runtime changes, browser testing, or live provider calls; npm run check was not needed for this documentation-only change.
- GitHub flow: current main branch, no new branch; fetched origin through the existing prompt 002 SSH identity. GitHub CLI credentials remain invalid, so request/change/validation/issues/next-step notes are retained here, in the implementation log and commit description using the documented fallback for standalone comments.
- Issues/next steps: no implementation blocker found. Re-audit the documented data boundary whenever adding network calls, telemetry, dependencies or storage synchronization; live browser verification remains with the user.
