import { normalizeKeywords } from '../profiles/model.js';

// Authoritative wire contract: no optional/nullable fields or invented metadata.
export const suggestionSchema = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      description: 'Related keyword or short phrase candidates for user review; an empty array means no candidates.',
      maxItems: 30,
      items: { type: 'string', description: 'A keyword or short phrase, at most 120 characters after whitespace normalization.' }
    }
  },
  required: ['suggestions'],
  additionalProperties: false
};

// Only the object/array/string subset used by this contract is needed here.
// Read field names, required fields, item types and bounds from the request schema.
function matchesSchema(value, schema) {
  switch (schema.type) {
    case 'object':
      return value !== null && typeof value === 'object' && !Array.isArray(value)
        && schema.required.every(key => Object.hasOwn(value, key))
        && Object.keys(value).every(key => Object.hasOwn(schema.properties, key)
          ? matchesSchema(value[key], schema.properties[key]) : schema.additionalProperties !== false);
    case 'array':
      return Array.isArray(value) && value.length <= schema.maxItems
        && value.every(item => matchesSchema(item, schema.items));
    case 'string': return typeof value === 'string';
    default: return false;
  }
}

/** Parse the wire object into the string[] consumed by the review UI. */
export function parseSuggestionData(value) {
  if (!matchesSchema(value, suggestionSchema)) throw new Error('The API returned invalid suggestions.');
  // Apply existing domain limits, whitespace cleanup and case-insensitive deduplication.
  try { return normalizeKeywords(value.suggestions); }
  catch { throw new Error('The API returned invalid suggestions.'); }
}
