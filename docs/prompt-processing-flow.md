# Prompt Processing Flow

### Spot a Dog Prompt Processing Flow

Every new development prompt should be processed using this sequence:

```text
New Development Prompt
        ↓
Read Existing Project State
        ↓
Read docs/prompt-processing-flow.md
        ↓
Review Relevant Previous Prompts
        ↓
Determine Next Prompt Number
        ↓
Save New Prompt to docs/prompts/
        ↓
Analyze Requirements
        ↓
Plan Minimal Required Changes
        ↓
Implement Changes
        ↓
Test / Validate Changes
        ↓
Update Documentation if Necessary
        ↓
Add Implementation Notes to Prompt File
        ↓
Report What Changed
```

### Rules

1. **Save first, implement second.**

   A development prompt must be written to `docs/prompts/` before its requested code changes are implemented.

2. **Never overwrite prompt history.**

   Every development prompt receives a new sequential number.

3. **Preserve intent.**

   The stored prompt should contain the complete instructions that caused the implementation change.

4. **Review previous context.**

   Before implementing a new prompt, inspect relevant previous prompt files so new work remains consistent with earlier architectural and product decisions.

5. **Current instructions take precedence when explicitly changing previous behavior.**

   Previous prompts document history. They should not prevent intentional changes requested by a newer prompt.

6. **Keep implementation notes.**

   After implementation, record important architectural decisions, assumptions, limitations, or deviations in the corresponding prompt file.

7. **Maintain reproducibility.**

   The combination of:

   * repository source code
   * `README.md`
   * `docs/prompt-processing-flow.md`
   * ordered files in `docs/prompts/`

   should provide a clear history of how Spot a Dog was built.

8. **Keep prompts in source control.**

   The `docs/prompts/` directory must be committed to Git and must not be excluded by `.gitignore`.

9. **Do not store secrets in prompts.**

   API keys, credentials, tokens, private keys, or other secrets must never be written into prompt-history files. If a future prompt contains a secret, replace the secret in the stored version with a clear placeholder such as `[REDACTED API KEY]`.

10. **Prompt preservation is a project-level rule.**

    Treat this workflow as part of the project's development process for future Codex work, not merely as a requirement of the initial setup.


## Prompt file format

Use `NNN-short-description.md`, with a title and Purpose, Prompt, and Implementation Notes sections. Preserve complete instructions, redacting secrets. Append implementation notes after validation.
