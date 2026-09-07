# Prompt 023 — Publish rebuilding guidance

## Purpose

Publish the rebuilding documentation through the repository's documented GitHub flow.

## Prompt

execute the github flow as documented

## Implementation Notes

- Request: publish the application rebuilding guidance using the documented GitHub flow; complete requests are preserved in prompts 022 and 023.
- Changes: README explains sequential prompt replay, independent reimplementation, behavior preservation, precedence and reproducibility. Links use the actual docs/prompts/ directory; prompt 022 preserves the original wording.
- Validation: existing README content is preserved, local README links resolve, prompt numbering is continuous through 023, and git diff --check passed. Documentation-only changes; extension tests were not rerun.
- Publication: existing main branch, no new branch; fetched origin and confirmed no divergence. Use the existing SSH identity documented in prompt 002. GitHub CLI authentication remains invalid, so repository notes and the commit description provide the documented fallback for standalone comments.
- Issues/next steps: no documentation blocker found. Review the rendered README on GitHub; independent reconstruction from the prompt history has not been tested.
