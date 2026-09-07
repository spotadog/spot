# Prompt 010 — Multi-provider model selection

## Purpose

Add curated model selection and Anthropic support while preserving existing settings and suggestions.

## Prompt

**Before implementation:** First save this complete prompt in the repository's prompt documentation or prompts directory, following the project's existing prompt-tracking conventions. This must happen before implementation begins so the instruction can be tracked, reused, audited, and used to help reproduce the project later.

## Objective

Improve the application's AI model configuration so users can easily choose from multiple supported models through a dropdown instead of having only one default model and manually adding additional models.

Also add full Anthropic Claude support, including API key configuration, Claude model selection, and compatibility with the application's existing AI-powered features.

## Repository Preparation

Before making implementation changes:

1. Locate and read all relevant repository documentation, including architecture notes, contribution guidelines, coding conventions, configuration documentation, provider abstractions, testing instructions, and any existing AI/model integration documentation.
2. Inspect the current implementation for:

   * model configuration;
   * model selection UI;
   * API key/provider configuration;
   * manually added/custom models;
   * existing AI provider abstractions;
   * request/response handling;
   * streaming;
   * tool/function calling;
   * structured output;
   * conversation history;
   * token/context handling;
   * any other features that currently depend on the existing model/provider.
3. Preserve existing behavior and compatibility unless this task explicitly requires changing it.
4. Avoid unrelated refactoring or redesign.

## Model Selection Dropdown

Change the current model-selection experience so users have a proper dropdown containing a useful predefined set of supported models.

The current behavior, where only one model is available by default and users must manually add other models, should no longer be the primary workflow.

Requirements:

* Provide a model dropdown wherever users currently select or configure the active AI model.
* Populate the dropdown with a curated set of supported models for each configured provider.
* Keep support for manually adding custom models if that capability already exists.
* Do not remove existing custom-model functionality unless it is fundamentally incompatible with the new implementation.
* Clearly distinguish models by provider when more than one provider is available.
* Ensure the currently selected model persists according to the application's existing settings/persistence conventions.
* If a previously selected custom model still exists, continue to support it.
* If a stored model is no longer valid or available, handle that state gracefully rather than crashing or silently misconfiguring requests.

The UI should make it immediately obvious which provider and model are currently selected.

## Claude / Anthropic Support

Add Anthropic Claude as a supported AI provider.

Users must be able to:

* add and save their Anthropic API key;
* configure Claude using the same general settings experience used for other providers where appropriate;
* select Claude as a provider;
* choose from a predefined set of supported Claude models through the model dropdown;
* use Claude models with the application's existing AI features.

Use Anthropic's supported API and SDK patterns appropriate to the project's language/framework and existing architecture.

Do not hard-code the implementation around only one Claude model.

## Claude Model Set

Provide a maintained predefined set of Claude models suitable for the capabilities supported by the application.

Use model identifiers that are valid for Anthropic at implementation time and verify them against the current official Anthropic documentation rather than guessing or relying on stale identifiers.

Organize the implementation so the Claude model list can be updated easily in the future.

Where practical, include relevant metadata used by the application, such as:

* display name;
* provider;
* model identifier;
* context/token capabilities;
* supported application features;
* optional capability flags such as streaming, tools, structured output, vision, or reasoning where applicable.

Do not expose models in the dropdown that the application's Claude integration cannot actually use correctly.

## Provider Architecture

Integrate Claude through the application's existing provider/model abstraction where one exists.

Do not scatter provider-specific conditionals throughout unrelated parts of the codebase if a clean provider adapter or service abstraction can be used instead.

The architecture should make it straightforward to support multiple providers and model sets without duplicating application logic.

At minimum, provider-specific implementation should cleanly handle:

* authentication/API keys;
* model identifiers;
* endpoint or SDK invocation;
* request formatting;
* message-role differences;
* system prompts;
* response normalization;
* streaming responses;
* errors;
* provider-specific token/configuration parameters.

Normalize provider responses into the application's existing internal format wherever practical so downstream features do not need to know whether the response came from the existing provider or Claude.

## Existing Features Must Work With Claude

Audit all features that currently use the configured AI model and make them work with Claude wherever Claude supports the required capability.

This includes, where applicable in the repository:

* standard chat/completions;
* streaming output;
* system instructions;
* conversation history;
* regeneration/retry;
* cancellation;
* model switching;
* prompt templates;
* project/context prompts;
* file or context attachments;
* image/vision inputs;
* tool or function calling;
* structured responses;
* JSON output;
* agent workflows;
* code generation;
* code editing;
* token/context limits;
* usage reporting;
* error messages;
* any model-specific settings shown in the UI.

Do not simply make Claude appear in the dropdown while leaving dependent functionality broken.

For functionality that cannot be supported identically because of genuine provider differences, implement a graceful capability-based fallback or clearly disable the unsupported option for incompatible models. Do not let users select combinations that are known to fail.

## API Key Management

Add Anthropic API key configuration following the repository's existing security and secret-management patterns.

Requirements:

* Never commit API keys to source control.
* Never log complete API keys.
* Mask secrets in the UI where appropriate.
* Validate that required credentials exist before sending Claude requests.
* Provide useful errors when a Claude API key is missing, invalid, unauthorized, rate-limited, or otherwise rejected.
* Preserve existing API-key handling for other providers.
* If the application supports environment variables as well as user-configured keys, integrate Anthropic consistently with that existing behavior.
* Use an appropriate Anthropic environment/configuration name such as `ANTHROPIC_API_KEY` where consistent with the repository's conventions.

## Model and Provider State

Treat provider and model as related configuration rather than assuming the model name alone identifies everything.

Ensure persisted settings can correctly represent at least:

* provider;
* selected model;
* provider credentials/configuration;
* optional custom model metadata.

If existing persisted configuration predates multi-provider support, implement a backward-compatible migration or normalization path so current users do not unexpectedly lose their settings.

## User Experience

The resulting configuration flow should be straightforward:

1. User adds/configures an API key for a provider.
2. The provider becomes available.
3. The model dropdown exposes the predefined compatible models for that provider.
4. User selects a model.
5. Existing AI features use that provider/model without requiring additional manual model registration.

If multiple providers are configured, make switching between them clear and predictable.

Do not force users to manually enter standard Claude model identifiers.

## Error Handling

Provide actionable errors for situations including:

* missing Anthropic API key;
* invalid Anthropic API key;
* unsupported model;
* inaccessible model;
* provider request failures;
* rate limits;
* malformed responses;
* context/token-limit errors;
* unsupported application capability for the selected model;
* network failures.

Errors shown to users should be understandable and should not expose sensitive credentials or unnecessary internal implementation details.

## Testing

Add or update automated tests covering the new behavior.

Include tests for, as applicable:

* predefined model dropdown population;
* provider-specific model lists;
* selecting and persisting a different model;
* switching between providers;
* Claude configuration;
* Anthropic API key handling;
* Claude request construction;
* Claude response normalization;
* streaming;
* error normalization;
* backward compatibility with existing saved settings;
* custom/manual models;
* unsupported capability handling;
* features shared between the existing provider and Claude.

Mock external AI-provider requests in automated tests unless the repository explicitly defines a safe integration-test workflow.

Do not require real API keys for the standard test suite.

## Verification

Before considering the work complete:

* run the repository's required formatter;
* run lint/static analysis;
* run type checking where applicable;
* run relevant unit/integration tests;
* run the full test suite when practical;
* build the application;
* manually verify the model/provider settings UI;
* verify a user can choose multiple predefined models without manually adding them;
* verify Claude can be configured with an Anthropic API key;
* verify the predefined Claude models appear correctly;
* verify switching between the existing provider and Claude works;
* verify the application's major AI features behave correctly with Claude or gracefully communicate genuine capability limitations.

Fix regressions introduced by this work.

## Documentation

Update relevant project documentation to explain:

* supported AI providers;
* Anthropic/Claude setup;
* how to provide an Anthropic API key;
* how provider/model selection works;
* predefined versus custom models;
* any provider-specific limitations;
* how developers maintain or extend the predefined model lists.

Do not document secrets or include real credentials.

## Acceptance Criteria

The work is complete when:

* users are no longer limited to one default model in the standard selection experience;
* users can select supported models from a dropdown;
* standard supported models do not require manual entry;
* existing manual/custom-model support remains functional where previously supported;
* Anthropic is available as a provider;
* users can configure an Anthropic API key;
* users can select from a predefined set of valid Claude models;
* the Claude model list is maintainable rather than hard-coded throughout the application;
* existing applicable AI features work correctly with Claude;
* unsupported Claude capabilities are handled gracefully;
* switching between providers and models works reliably;
* existing configurations remain backward compatible;
* secrets are handled securely;
* relevant tests and documentation are updated;
* the application passes the repository's required validation and build workflows.

**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the repository's existing GitHub flow documentation rather than inventing a new workflow. Complete all applicable steps required by that documentation.


## Implementation Notes

- Preserved the complete prompt before implementation. Reviewed architecture, product requirements, previous AI/structured-contract and credential prompts, tests, and prompt 002 publication workflow. Audited all existing AI usage: only non-streaming structured text keyword suggestions exist; no chat, streaming, tools, attachments, agent workflows, usage display or cancellation UI required porting.
- Added centralized curated models (three per provider), provider dispatch and a dedicated Anthropic Messages adapter. Verified identifiers and native JSON support against current official sources linked in README. Anthropic maxItems is removed only from its native schema; the complete shared prompt contract and local validation retain the limit.
- Settings provide provider/model dropdowns, saved selection labels, masked key entry, separate credentials, custom IDs and remembered per-provider models. Legacy OpenAI model/key settings remain intact. Unknown custom IDs remain explicit and provider errors guide recovery without silently substituting a model. Matching, profiles and transfer formats remain unchanged.
- Credentials and settings save together in one serialized Chrome storage write. Removing a credential overwrites its value with an empty string in that same write; unrelated credentials remain unchanged. UI state exposes only credential presence, and scanner projections exclude settings/credentials.
- Validation passed: npm run check (55 unit tests, build and real MV3 browser suite), node --check on 28 JavaScript files, git diff --check and exact prompt preservation. Browser tests exercise both provider catalogs, saved/reloaded model choices, custom models, Anthropic key setup/removal, switching, missing-key errors and mocked Claude approval into positive and negative lists. Visually inspected Claude and custom-model settings screenshots. An initial new browser test attempted to reset a hidden review control; moved that action into the visible review phase and reran the full suite successfully.
- No formatter, linter or separate type checker is configured. No live API calls were made. Account-specific model access, billing and live provider behavior remain manual smoke checks; native Chrome docking remains the existing manual check. The app retains its 25-second request deadline and 1000-output-token budget; incomplete responses are reported for retry/model change.
- GitHub flow: current main branch, no new branch, existing SSH identity per prompt 002. GitHub CLI authentication is invalid; preserve request, changes, validation, issues and next steps in this file, the implementation log and commit description as the documented fallback for standalone comments.
- Suggested next work: live smoke tests using user-owned keys for both providers and CI for npm run check.
