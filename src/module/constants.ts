/**
 * Creates the two constants for the OllamaConnector module:
 *   - Ollama_BaseURL      (String, default: http://localhost:11434)
 *   - Ollama_DefaultModel (String, default: llama3)
 */
import { constants, projects, datatypes } from 'mendixmodelsdk';

export function buildConstants(module: projects.Module): {
  baseURLConst: constants.Constant;
  defaultModelConst: constants.Constant;
} {
  // Ollama_BaseURL
  const baseURLConst = constants.Constant.createIn(module);
  baseURLConst.name = 'Ollama_BaseURL';
  // datatypes.StringType is correct here — constants use the datatypes module
  const baseURLType = datatypes.StringType.create(module.model);
  baseURLConst.type = baseURLType;
  baseURLConst.defaultValue = 'http://localhost:11434';

  // Ollama_DefaultModel
  const defaultModelConst = constants.Constant.createIn(module);
  defaultModelConst.name = 'Ollama_DefaultModel';
  const defaultModelType = datatypes.StringType.create(module.model);
  defaultModelConst.type = defaultModelType;
  defaultModelConst.defaultValue = 'llama3';

  console.log('  ✓ Constants created: Ollama_BaseURL, Ollama_DefaultModel');
  return { baseURLConst, defaultModelConst };
}
