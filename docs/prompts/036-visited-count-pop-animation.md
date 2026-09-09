# Prompt 036 — Visited count pop animation

## Purpose

Make visit-count changes noticeable with a subtle animation limited to the count.

## Prompt

**Before implementation:** Save this complete prompt in the repository's existing prompt documentation or prompts directory before making implementation changes. Follow the repository's existing naming and organization conventions.
When I visit a URL, I want the **Visited** count in the sidebar to update with a subtle pop animation so the change is noticeable without being distracting.
Keep the animation small and smooth, affecting only the count when it changes.
Follow the repository’s existing documentation, styling, and implementation conventions. Create or update the appropriate unit tests for this change and run the relevant tests.
**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the existing documentation rather than inventing a new workflow.

## Implementation Notes

- Saved the complete prompt before implementation; reviewed prompt-processing-flow, prompt 035, existing shared visit UI/styles/tests and prompt 002 GitHub publication instructions.
- Isolated the current URL's numeric count in a stable inline span in the shared sidebar/popup renderer. On a numeric change, animate only that span from scale 1 to 1.1 and back over 220 ms with ease-out timing. Transforms preserve surrounding layout. Initial display and unchanged refreshes (including tracking-toggle-only changes) do not animate.
- Rapid changes cancel the previous animation before starting the next. Unsupported pages and page teardown cancel animation; returning to a supported page initializes quietly. Reduced-motion users receive immediate count updates without animation; switching reduced motion on also cancels a running pop.
- Added a DOM/unit test using the existing esbuild/Playwright pattern to check initial/unchanged renders, numeric changes, target isolation, stable layout, animation size/duration, rapid updates, reduced motion, clearing, unsupported pages, completion and cleanup. Storage and visit-count semantics are unchanged. Updated the README's existing visit-count description.
- Validation: npm run check passed all 152 unit tests, build and the complete automated unpacked-MV3 browser suite. git diff --check passed. No manual/live-site tests or external AI calls.
- Publication: existing main branch, no new branch; fetched origin with the SSH identity from prompt 002 and confirmed no divergence. GitHub CLI credentials remain invalid, so request/change/validation/issues/next-step review notes use the documented repository/commit description fallback.
- Issues/next step: no known automated failures. Reload dist/ and revisit a URL with the sidebar open and URL tracking enabled to see the subtle count pop.
