# Prompt 020 — README project images

## Purpose

Present the existing banner and screenshot in the root README and publish using the repository's GitHub flow.

## Prompt

**Before implementation:** First save this complete prompt in the repository's prompt documentation or prompts directory, following the project's existing prompt-tracking conventions. This must happen before implementation begins so the instruction can be tracked, reused, audited, and used to help reproduce the project later.

## Objective

Update the root `README` so the repository presents the two newly added images nicely when viewed on GitHub.

The image files are already located in the repository's `doc` folder:

- `screenshot.png`
- the banner PNG whose filename contains `banner` (inspect the `doc` folder and use the exact existing filename rather than renaming or guessing it)

## Requirements

1. Inspect the repository structure and relevant documentation before making changes.
2. Locate the root README file and preserve its existing content, organization, tone, and formatting unless a small adjustment is necessary to integrate the images cleanly.
3. Add the banner image in a visually appropriate location near the top of the README so it works as a repository/project header.
4. Add `screenshot.png` in an appropriate section where it helps demonstrate the project visually.
5. Use repository-relative image paths pointing to the files in the `doc` folder so the images render correctly on GitHub.
6. Make the presentation clean and polished. Use sensible Markdown or GitHub-compatible HTML where useful for alignment or sizing, but avoid unnecessary complexity.
7. Do not move, rename, duplicate, or modify the image files unless required by an existing repository convention.
8. Do not remove or rewrite unrelated README content.
9. Verify that the referenced filenames and paths exactly match the files that exist in the repository, including capitalization.

## Verification

Review the resulting README source and confirm:

- Both images are referenced.
- Both paths resolve to files that actually exist under `doc`.
- The banner is positioned appropriately near the top.
- The screenshot appears in a logical project/demo area.
- Existing README information has not been unintentionally removed or changed.
- The Markdown/HTML used is compatible with GitHub README rendering.

This is a documentation-only change, so do not add artificial unit tests solely for the README update. Do not perform live browser testing; I will review the rendered repository separately.

**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the repository's existing GitHub flow documentation rather than inventing a new workflow. Complete all applicable steps required by that documentation.

## Implementation Notes

- Saved the complete prompt before implementation and reviewed the root README, prompt-processing flow, prompt 002 publication instructions, prompt 019, and implementation-log publication conventions.
- Added the banner immediately below the project title and the screenshot after the Get started numbered steps, using standard GitHub-compatible Markdown and descriptive alternative text. All existing README text and organization are preserved.
- Path discrepancy: the repository has no doc directory or screenshot.png. The supplied images actually exist as docs/spotadogbanner.png and docs/screen_shot.png. Used those exact existing paths rather than moving, renaming, duplicating, or modifying images. Both images were initially untracked and are included in the publication so GitHub can render them.
- Validation: git diff --check passed; exact case-sensitive filenames and both references were checked; SHA-256 checks confirmed neither image changed. Removing only the two inserted image blocks reproduces the original README exactly. Source review confirmed banner and screenshot placement. No artificial unit tests, extension checks, or browser testing were run for this documentation-only change.
- GitHub flow: retained main with no new branch; fetched origin with the existing SSH identity from prompt 002 and confirmed no divergence. GitHub CLI authentication remains invalid, so standalone review comments are unavailable; request/change/validation/issues/next-step notes are preserved here and in the commit description using the documented fallback. Publish over SSH.
- Next step: user to review the rendered README on GitHub.
