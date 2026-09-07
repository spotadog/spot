import { suggestKeywords as openai } from './openai.js';
import { suggestKeywords as anthropic } from './anthropic.js';
import { validateSelection } from './models.js';
const adapters = { openai, anthropic };
export function suggestKeywords({ provider = 'openai', ...options }, fetcher) {
  validateSelection(provider, options.model);
  return adapters[provider](options, fetcher);
}
