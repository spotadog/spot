# Prompt 041 — Investigate YouPorn ad skipping

## Purpose

Diagnose and fix the reported ad-skip failure on YouPorn.

## Prompt

still not working i refreshed the page exmampe was youporn

## Implementation Notes

- Saved the complete request before implementation; reviewed the processing flow and prompt 040. Continued the authorized GitHub publication flow from this feature's earlier prompts.
- Fetched the reported site's page and a watch-page HTML document for technical inspection, then fetched its linked MGP 9.2.1 basic-player.min.js. Inspected only player identifiers, asset references and event/readiness code; no site media, titles, watch URLs or page HTML are included in the repository.
- Source evidence: the linked player asset was https://cdn1d-static-shared.phncdn.com/html5player/videoPlayer/es6player/9.2.1/basic-player.min.js, SHA-256 cc7138a5101972ef321b3c0ef6830ed31e0f53def54c7564a9f5d4f7bf6ffd72. Its adRollSkipButton wraps adRollSkipButtonContent; readiness adds skippable. Its desktop event adapter cancels click and invokes the action on mouseup. The extension's generic .click() therefore did not activate this control. The earlier possible paused-underlying-video explanation was not established and no speculative change to main-video selection was made.
- Added an MGP-specific activation path: require the outer adRollSkipButton's skippable class and adRollContainer/adRollRunning ancestry, plus the existing playback, player association, label, visibility and hit-test checks. Send a left-button mouseup at a validated visible hit point; do not additionally click. Generic controls still use .click(). Nested labels cannot activate independently.
- Added a regression fixture modeling the inspected readiness/event contract with real canvas-stream video playback. It failed before the fix (click event sent, no skip) and passes afterward. Tests cover waiting for readiness, one activation, readiness reset for a reused control and paused-video exclusion. The MV3 fixture additionally checks the targeted mouseup action through the actual extension bundle.
- Final validation: npm run check passed 167 unit tests, build and complete unpacked-MV3 browser suite; git diff --check passed. Updated README, features and requirements. No new permissions, dependencies, storage changes, runtime network calls or AI use.
- Limit: source-level evidence and synthetic player fixtures verify the event mismatch, but no live served ad was exercised. Existing main-video heuristics and iframe/shadow-root/trusted-input limitations remain.
- Publication: current main, no new branch; origin fetched without divergence using prompt 002's existing SSH identity. GitHub CLI authentication remains invalid, so repository notes and commit description supply the documented review-comment fallback.
- Next step: reload Spot a Dog at chrome://extensions, then refresh the affected video page and ensure Automatically skip video ads is enabled. Page refresh alone does not load a newly built extension bundle.
