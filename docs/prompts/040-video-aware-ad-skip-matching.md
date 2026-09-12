# Prompt 040 — Video-aware ad skip matching

## Purpose

Broaden cross-site skip-ad matching while requiring a playing main-content video.

## Prompt

not working. you need tyo mre broad in themathc ause dif wwb have dif but check if video is playing as main contrny thern matvh

## Implementation Notes

- Preserved the user's complete wording before implementation and reviewed the processing flow and prompt 039. Interpreted the request as broader cross-site ad-skip matching gated by a playing main-content video. Asked for an affected URL; none was supplied during implementation.
- Replaced exact-phrase-only matching with common ad/ads/advert/advertisement/commercial variants, optional this/the/all/now and punctuation/arrows. Check text/input value, ARIA label/references and title. Added custom skip-ID/class/test-ID candidates and ad-skip signatures. Bare Skip/icon controls require an ad-skip identifier or supported ad-playing player state; unrelated Skip intro and countdown text are excluded.
- Select the largest prominent visible HTML video before checking playing/not-ended/frame-ready/positive playback-time state. Prominence requires 300 by 160 visible pixels and 15% of the viewport. A paused main player cannot be replaced by a small playing preview. Controls must share a compact container and be geometrically near the video, preventing unrelated page buttons from qualifying.
- Retained enabled/visible/non-inert/hit-test checks, dynamic observation/polling, local-only processing and persisted toggle. Revalidate playback before each click. Nested candidate labels resolve to one outer control; pause/resume does not reset duplicate protection. Renamed the Settings label to Automatically skip video ads. No permissions, storage format, dependencies, networking or AI changes.
- Updated real-DOM tests to use actual canvas-stream video playback. Coverage includes broader labels, title/custom controls, no playback, paused main plus playing preview, hidden video, generic Skip with/without ad context, countdowns, off-player buttons, visibility/clickability, reinjection and disabling/disposal. Updated the unpacked-MV3 test to use real playback and the broader Skip ads label.
- Final validation: npm run check passed all 166 unit tests, build and full MV3 browser suite; git diff --check passed. README, features and requirements document the current heuristics and superseded exact matching.
- Limits: no affected site supplied, so live-site behavior remains unverified. Main-video/player association uses documented heuristics; iframe/shadow-root players and trusted-input-only sites remain unsupported. Existing off-by-default preference is preserved.
- GitHub flow continues prompt 039's authorization: current main, no branch, fetched without divergence via the existing prompt 002 SSH identity. Invalid GitHub CLI authentication uses the documented repository/commit review-note fallback.
- Next step: reload dist/, refresh the video page, enable Automatically skip video ads, and play the main video. Supply the affected URL if its player still needs a site-specific adjustment.
