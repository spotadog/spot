# Prompt 042 — Generic video ad-skip support

## Purpose

Use generic player-based naming and check shared compatibility with the additional requested site.

## Prompt

don't call if youporn be more generic and also pornhub

## Implementation Notes

- Saved the complete prompt before changes; reviewed the processing flow and prompt 041. Preserved historical prompt files as required by the repository workflow.
- Inspected the additional requested site's page and player asset references. Pornhub currently loads the same MGP 9.2.1 basic-player.min.js URL previously observed on YouPorn: https://cdn1d-static-shared.phncdn.com/html5player/videoPlayer/es6player/9.2.1/basic-player.min.js. The existing adapter already uses control markup/readiness rather than hostname checks, so no runtime routing change is needed for this shared player.
- Removed site-specific wording from current feature documentation and the browser-fixture comment. Product naming remains Automatically skip video ads. Historical source evidence and verbatim prompts remain intact; no site media, watch URLs or HTML were committed.
- Expanded MGP regression coverage to two distinct synthetic HTTPS origins with actual media playback, verifying the same readiness/mouseup behavior without domain allowlists. Local fixtures exercise waiting, duplicate prevention, reused readiness and paused-video exclusion.
- Final validation: npm run check passed all 168 unit tests, build and complete MV3 browser suite; git diff --check passed. No runtime code, settings, permissions, dependencies or AI behavior changes were required.
- Limits: shared player-asset references and local tests confirm the adapter contract, not live ad delivery. Existing video/player heuristics and unsupported iframe/shadow-root/trusted-input conditions remain.
- Publication: current main, no branch, existing prompt 002 SSH identity; fetched origin without divergence. Invalid GitHub CLI authentication uses the documented repository/commit review-note fallback.
- Next step: use the existing generic toggle; reload the extension and refresh video pages if the previous activation fix has not yet been loaded.
