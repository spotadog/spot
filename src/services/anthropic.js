import { normalizeKeywords } from '../profiles/model.js';
import { suggestionSchema, parseSuggestionData, suggestionInstructions } from './suggestion-contract.js';
const invalidResponse = () => new Error('Anthropic returned an invalid suggestion response. Try again.');
export function parseAnthropicSuggestions(body) {
  if (!body || body.type !== 'message' || !Array.isArray(body.content)) throw invalidResponse();
  if (body.stop_reason === 'refusal') throw new Error('No suggestions were returned for this request.');
  if (body.stop_reason !== 'end_turn') throw new Error('The suggestion response was incomplete. Try fewer seeds or another model.');
  if (body.content.some(item => !item || typeof item !== 'object')) throw invalidResponse();
  const texts = body.content.filter(item => item.type === 'text');
  if (texts.length !== 1 || typeof texts[0].text !== 'string' || body.content.some(item => !['text', 'thinking', 'redacted_thinking'].includes(item.type))) throw invalidResponse();
  let parsed;
  try { parsed = JSON.parse(texts[0].text); } catch { throw invalidResponse(); }
  return parseSuggestionData(parsed);
}
export async function suggestKeywords({ apiKey, seeds, model }, fetcher = fetch) {
  if (!apiKey) throw new Error('Add an Anthropic API key in Settings first.');
  const keywords = normalizeKeywords(seeds);
  if (!keywords.length || keywords.length > 20) throw new Error('Enter 1–20 seed keywords, one per line.');
  // Anthropic cannot enforce maxItems. Keep the full contract in the system prompt
  // and validate it locally, removing only that unsupported native constraint.
  const schema = structuredClone(suggestionSchema);
  const limit = schema.properties.suggestions.maxItems;
  delete schema.properties.suggestions.maxItems;
  schema.properties.suggestions.description += ` At most ${limit} items.`;
  let response;
  try {
    response = await fetcher('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal: AbortSignal.timeout(25000),
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true', 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, max_tokens: 1000, stream: false,
        system: suggestionInstructions,
        messages: [{ role: 'user', content: JSON.stringify(keywords) }],
        output_config: { format: { type: 'json_schema', schema } }
      })
    });
  } catch { throw new Error('Could not reach Anthropic or the request timed out. Try again.'); }
  if (!response.ok) {
    const errors = {
      400: 'Anthropic rejected the request. Choose a model supporting structured JSON in Settings or reduce the seed keywords.',
      401: 'Anthropic rejected the API key. Update it in Settings.',
      403: 'Your Anthropic account cannot access this model. Check permissions or choose another model.',
      404: 'Anthropic could not find this model. Choose an available model in Settings.',
      413: 'Anthropic input limit reached. Use fewer or shorter seed keywords.',
      429: 'Anthropic rate or quota limit reached. Check API billing or try later.',
      529: 'Anthropic is temporarily overloaded. Try again later.'
    };
    throw new Error(errors[response.status] ?? 'Anthropic request failed. Try later or check the model in Settings.');
  }
  let body;
  try { body = await response.json(); } catch { throw invalidResponse(); }
  const suggestions = parseAnthropicSuggestions(body);
  return suggestions.filter(s => !keywords.some(k => k.toLowerCase() === s.toLowerCase()));
}
