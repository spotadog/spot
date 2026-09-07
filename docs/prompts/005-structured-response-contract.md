# Prompt 005 — Structured Response Contract

## Purpose

Centralize the keyword suggestion response contract and validate API responses against it.

## Prompt

**Before implementation:** First save this complete prompt in the repository's prompt documentation or prompts directory, following the project's existing prompt-tracking conventions. This must happen before implementation begins so the instruction can be tracked, reused, audited, and used to help reproduce the project later.

## Objective

When implementing the API integration with ChatGPT, use a **classic response-template/response-contract pattern**: the client must include the exact expected response structure with each relevant request so that ChatGPT knows precisely what data format to return.

The application must request a **structured JSON response**, not unstructured prose that the client subsequently attempts to interpret.

## Expected JSON Response Contract

For every ChatGPT API request that expects structured data:

1. Define the JSON structure the application expects to receive.
2. Include that expected structure as part of the request sent to ChatGPT.
3. Explicitly specify all expected attribute/property names.
4. Describe the expected data type and meaning of each property where useful.
5. Clearly distinguish required fields from optional or nullable fields.
6. Specify the expected structure of nested objects and arrays.
7. Instruct ChatGPT to return data conforming to that structure.
8. Do not rely on the model to invent field names or determine the response schema itself.

For example, if the client needs data shaped like:

```json
{
  "status": "success",
  "summary": "Example summary",
  "items": [
    {
      "id": "example-id",
      "name": "Example name",
      "description": "Example description"
    }
  ]
}
```

then the request to ChatGPT should explicitly communicate that this is the expected response shape, including the exact property names and their intended types/semantics.

The example above is illustrative only. Determine the actual schema from the application's existing domain models, API contracts, and consuming code rather than introducing unrelated generic fields.

## Response-Template Pattern

Follow the classic response-template pattern in which the **client provides the expected response format as part of the request**.

The request should effectively communicate:

```text
Return the result as JSON matching the following structure:

{
  "expectedAttribute": "<expected type/value>",
  "anotherAttribute": "<expected type/value>",
  "nestedData": {
    "attribute": "<expected type/value>"
  }
}

Return only data conforming to this response contract.
```

Use the actual attribute names required by the application.

Where the selected ChatGPT/OpenAI API supports native structured-output or JSON-schema enforcement, use the appropriate supported mechanism in addition to clearly defining the application's response contract. Do not depend solely on natural-language instructions when the API provides a stronger schema-enforcement mechanism.

## Parsing and Validation

Treat the response schema as a contract between the client and ChatGPT.

The client implementation must:

* Parse the returned JSON into the application's appropriate typed models/data structures.
* Validate required fields and expected data types before using the data.
* Safely handle missing, null, malformed, or unexpected values.
* Handle invalid JSON or schema violations gracefully rather than crashing or silently accepting corrupted data.
* Avoid fragile parsing of natural-language responses.
* Keep the schema used in the request synchronized with the code responsible for parsing the response.
* Prefer a single authoritative schema/model definition where practical so request schemas and response parsing do not drift apart.

Do not manually extract JSON from surrounding Markdown or conversational prose when the API can be configured to return structured data directly.

## Repository and Existing Architecture

Before modifying the integration:

1. Inspect the repository's relevant documentation, architecture, coding conventions, API integration code, domain models, and existing ChatGPT/OpenAI implementation.
2. Follow existing project patterns unless this requirement explicitly changes them.
3. Identify each API call that expects machine-readable structured information.
4. Determine the response fields actually consumed by the application.
5. Define an explicit response contract for those calls.
6. Update the request and parsing logic accordingly.

Do not unnecessarily redesign unrelated parts of the project.

## Testing and Verification

Add or update tests to verify at minimum:

* The expected JSON structure is supplied with applicable ChatGPT requests.
* Exact expected attribute names are represented in the response contract.
* Valid structured responses parse successfully into usable application data.
* Nested objects and arrays parse correctly where applicable.
* Missing or invalid required fields are handled appropriately.
* Malformed or schema-invalid responses do not cause uncontrolled failures.
* Existing functionality remains compatible after the integration changes.

Where the API supports schema-enforced structured output, verify that the configured schema corresponds to the application's parsing model.

## Acceptance Criteria

The work is complete when every applicable ChatGPT integration that expects structured application data has an explicit JSON response contract supplied by the client, the contract defines the expected structure and attribute names, ChatGPT is instructed/configured to return that structure, and the client can reliably validate and parse the result into usable application data.

The implementation should follow the classic response-template principle: **the client tells ChatGPT what response format it expects instead of receiving arbitrary output and trying to infer its structure afterward.**

**GitHub Flow:** After completing and verifying the requested work, execute the GitHub flow exactly as directed by the GitHub flow documentation in this repository. Locate and follow the repository's existing GitHub flow documentation rather than inventing a new workflow. Complete all applicable steps required by that documentation.


## Implementation Notes

- Saved the complete prompt before implementation and inspected the API service, domain model, consuming worker/UI, existing tests, and product/publication documentation. The keyword suggestion Responses API call is the only structured AI integration.
- Added `src/services/suggestion-contract.js` as the authoritative wire schema, used in request instructions, native strict `text.format`, and schema-driven response validation. Exact required field: `suggestions`, a non-null array of strings, no additional properties. No unrelated status/summary/items fields or nested objects were introduced.
- Preserved the existing prompt target of 20 candidates, 30-item parser ceiling, normalized 120-character keyword limit, deduplication, seed exclusion, and explicit review/approval. The schema describes the domain normalization rule; domain validation remains in the profile model. The small local validator implements only the object/array/string schema subset used here; future schema features require extending validation and tests.
- Hardened malformed envelope, invalid JSON, wrong field/item type, unknown property, missing/null field, and multiple-output handling. Refusals/incomplete responses remain controlled errors. No Markdown/prose JSON extraction, runtime dependencies, storage changes, or UI redesign.
- Verified request/schema parity, valid/empty/boundary arrays, extra/missing/null/wrong-type fields, malformed envelopes/JSON, and preserved review behavior. `npm run check` passed: 14 unit tests, esbuild build, and real MV3 browser suite. Diff whitespace and exact prompt preservation checks passed. No live API request was made; native Chrome docking remains a manual check.
- Confirmed native strict JSON-schema configuration against [official OpenAI Structured Outputs documentation](https://developers.openai.com/api/docs/guides/structured-outputs).
- Publication follows prompt 002 and the implementation log: current main branch, SSH identity, no new branch. GitHub CLI credentials remain invalid; review notes are preserved here and in the commit description using the documented fallback. Next suggested work: live API/native Chrome smoke checks and CI for `npm run check`.
