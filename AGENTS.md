# Spot a Dog development

Before implementing any development prompt, read `docs/prompt-processing-flow.md`, review relevant previous prompts, and save the complete new prompt to the next sequential `docs/prompts/NNN-description.md`. Never overwrite prior prompts; redact secrets. Save first, implement second. Add implementation notes after testing. Explicit newer instructions supersede historical behavior.

Keep matching independent of UI, storage behind its abstraction, and AI calls in the dedicated service. Run `npm run check` for changes affecting the extension. See README for architecture and manual Chrome checks.
