# Prompt 022 — Recreating the application from prompts

## Purpose

Document how to recreate the application using the preserved prompt history.

## Prompt

# Recreating the Application from Prompts

This repository includes the complete prompt history used to design and implement the application. All implementation prompts are stored in the `docs/prompt` directory.

If you prefer not to use the implementation currently available in the source code, you may use these prompts to recreate the application from scratch with a coding agent.

The prompts are intended to be executable with capable AI coding agents such as:

- Codex by OpenAI / ChatGPT
- Claude Code by Anthropic
- Other coding agents capable of reading, modifying, testing, and managing a software repository

## Rebuilding the Application

To recreate the application:

1. Start with a clean project or an appropriate base version of the repository.
2. Review the repository documentation to understand the intended architecture, development conventions, dependencies, environment requirements, and workflows.
3. Open the `docs/prompt` directory.
4. Execute the prompts in their documented chronological, numerical, or dependency order.
5. Provide each complete prompt to your preferred coding agent.
6. Allow the agent to implement the requested changes, create or update unit tests, and verify the implementation before proceeding to the next prompt.
7. Continue through the complete prompt history until all applicable prompts have been executed.

The prompts should be treated as a historical implementation specification. Together with the repository documentation, they are intended to preserve enough context to understand how the application was built and, where practical, reproduce the application independently of the existing source implementation.

## Using Codex or Another Coding Agent

A coding agent such as Codex may inspect the repository, read the documentation and prompt history, and reconstruct the application by executing the prompts sequentially.

When rebuilding from prompts, the agent should not assume that the current source implementation must be copied or preserved. If you intentionally choose to recreate the application without relying on the existing implementation, the agent may develop a new implementation based on the documented requirements, architecture, constraints, and prompt history.

However, the resulting application should preserve the behavior and requirements described by the prompts and project documentation unless a later prompt explicitly supersedes an earlier requirement.

When prompts conflict, later prompts should generally be treated as refinements or changes to earlier requirements, while repository documentation and any explicitly documented precedence rules should also be respected.

## Reproducibility

The `docs/prompt` directory exists so that implementation decisions and instructions can be reviewed, reused, audited, and used to help reproduce the project later.

For this reason, new development prompts should continue to be saved in the repository's prompt documentation before implementation begins. Preserve complete prompts rather than storing only summaries so that future developers or coding agents can understand and replay the original instructions.

## Implementation Notes

- Saved the complete prompt before implementation; reviewed the prompt-processing flow, README, AGENTS.md, and relevant prompts 001, 020, and 021.
- Added the supplied rebuilding guidance to the README, adjusting heading levels to fit its structure and linking to the actual `docs/prompts/` directory. Preserved the original singular `docs/prompt` wording above; no directories or historical prompts were renamed.
- Documented sequential replay, independent reimplementation, behavior preservation, later-prompt precedence, and complete prompt preservation. Existing README content remains intact.
- Validation: `git diff --check` passed; all README local file links resolve; prompt numbering is continuous through 022; verified existing README content is preserved and the saved prompt retains the original directory wording. No dedicated documentation checker is configured. Extension tests were not run because only documentation changed.
