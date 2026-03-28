/**
 * Creates the Export and Import mapping document shells for OllamaConnector.
 *
 * ExportMapping_OllamaRequest:
 *   Exports an OllamaRequest (with associated OllamaMessage objects) to the
 *   Ollama /api/chat JSON body format.
 *
 * ImportMapping_OllamaResponse:
 *   Imports the Ollama /api/chat JSON response into an OllamaResponse with a
 *   nested OllamaResponseMessage.
 *
 * NOTE: After running this script, open each mapping in Studio Pro:
 *   1. Click "Select elements..." (or "Edit") in the mapping toolbar
 *   2. Choose the corresponding JSON Structure
 *   3. Studio Pro will build the element tree from the JSON structure
 *   4. Map each element to the correct entity attribute per plan Step 4
 */
import {
  exportmappings,
  importmappings,
  jsonstructures,
  projects,
  domainmodels,
} from 'mendixmodelsdk';

export function buildMappings(
  module: projects.Module,
  requestStructure: jsonstructures.JsonStructure,
  responseStructure: jsonstructures.JsonStructure,
  ollamaRequest: domainmodels.Entity,
  ollamaMessage: domainmodels.Entity,
  ollamaResponse: domainmodels.Entity,
  ollamaResponseMessage: domainmodels.Entity,
): {
  exportMapping: exportmappings.ExportMapping;
  importMapping: importmappings.ImportMapping;
} {

  // ── Export Mapping ─────────────────────────────────────────────────────────
  const exportMapping = exportmappings.ExportMapping.createIn(module);
  exportMapping.name = 'ExportMapping_OllamaRequest';
  exportMapping.parameterName = 'OllamaRequest';

  console.log('  ✓ ExportMapping_OllamaRequest created');

  // ── Import Mapping ─────────────────────────────────────────────────────────
  const importMapping = importmappings.ImportMapping.createIn(module);
  importMapping.name = 'ImportMapping_OllamaResponse';

  console.log('  ✓ ImportMapping_OllamaResponse created');

  console.log('');
  console.log('  ⚠️  MAPPINGS: Open each mapping in Studio Pro and:');
  console.log('     1. Click "Select elements..." in the toolbar');
  console.log('     2. Choose the corresponding JSON Structure document');
  console.log('     3. Studio Pro builds the element tree automatically');
  console.log('     4. Assign entity/attribute mappings per plan Step 4');

  return { exportMapping, importMapping };
}
