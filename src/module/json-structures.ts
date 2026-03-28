/**
 * Creates the two JSON Structure documents for the OllamaConnector module.
 *
 * JSONStructure_OllamaRequest:
 *   Used by the export mapping to serialise OllamaRequest → JSON body.
 *
 * JSONStructure_OllamaResponse:
 *   Used by the import mapping to parse the Ollama /api/chat JSON response.
 */
import { jsonstructures, projects } from 'mendixmodelsdk';

const REQUEST_JSON = JSON.stringify({
  model: 'llama3',
  messages: [
    {
      role: 'user',
      content: 'Hello',
    },
  ],
  stream: false,
  temperature: 0.7,
  num_predict: 1000,
}, null, 2);

const RESPONSE_JSON = JSON.stringify({
  model: 'llama3',
  message: {
    role: 'assistant',
    content: 'Hello there!',
  },
  done: true,
  total_duration: 5432156789,
  prompt_eval_count: 26,
  eval_count: 97,
}, null, 2);

export function buildJsonStructures(module: projects.Module): {
  requestStructure: jsonstructures.JsonStructure;
  responseStructure: jsonstructures.JsonStructure;
} {
  const requestStructure = jsonstructures.JsonStructure.createIn(module);
  requestStructure.name = 'JSONStructure_OllamaRequest';
  requestStructure.jsonSnippet = REQUEST_JSON;

  const responseStructure = jsonstructures.JsonStructure.createIn(module);
  responseStructure.name = 'JSONStructure_OllamaResponse';
  responseStructure.jsonSnippet = RESPONSE_JSON;

  console.log('  ✓ JSON Structures created: JSONStructure_OllamaRequest, JSONStructure_OllamaResponse');
  return { requestStructure, responseStructure };
}
