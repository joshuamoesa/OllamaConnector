/**
 * create-module.ts
 *
 * Mendix Platform SDK script that builds the OllamaConnector module in a
 * Mendix online working copy.
 *
 * Usage:
 *   npm run create              — use existing working copy from settings.yaml
 *   npm run create:wc           — create a fresh working copy first, then build
 *
 * What this script creates:
 *   ✓  Module: OllamaConnector
 *   ✓  Constants: Ollama_BaseURL, Ollama_DefaultModel
 *   ✓  Domain Model: 6 entities with attributes, associations, generalizations
 *   ✓  JSON Structures: JSONStructure_OllamaRequest, JSONStructure_OllamaResponse
 *   ✓  Mapping shells: ExportMapping_OllamaRequest, ImportMapping_OllamaResponse
 *   ✓  Microflow signatures: ACT_ChatCompletions_WithHistory,
 *                            ACT_OllamaConnector_Initialize,
 *                            SUB_HandleOllamaError
 *
 * What you must complete in Studio Pro afterwards:
 *   1. Mapping element trees — open each mapping, click "Select elements",
 *      choose the JSON structure, then assign entity/attribute mappings.
 *   2. Microflow logic — follow Steps 5–7 in the plan document.
 *   3. Pages — OllamaConfiguration_Overview and OllamaConfiguration_Edit.
 *   4. Wire ACT_OllamaConnector_Initialize into your AfterStartup microflow.
 */

import { MendixPlatformClient, setPlatformConfig, OnlineWorkingCopy } from 'mendixplatformsdk';
import { IModel, projects, domainmodels } from 'mendixmodelsdk';
import { loadSettings, saveSettings } from './settings';
import { buildDomainModel } from './module/domain-model';
import { buildConstants } from './module/constants';
import { buildJsonStructures } from './module/json-structures';
import { buildMappings } from './module/mappings';
import { buildMicroflows } from './module/microflows';

const MODULE_NAME = 'OllamaConnector';

async function main() {
  const createWC = process.argv.includes('--createwc');
  const settings = loadSettings();

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  OllamaConnector — Mendix SDK Module Builder`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Project : ${settings.project.name} (${settings.project.id})`);

  setPlatformConfig({ mendixToken: settings.credentials.apikey });
  const client = new MendixPlatformClient();
  const app    = client.getApp(settings.project.id);

  let workingCopy: OnlineWorkingCopy;

  if (!settings.project.id) {
    console.error('');
    console.error('  ERROR: project.id is empty in settings.yaml.');
    console.error('  Find it in Mendix Portal → Apps → your app → Settings → General → App ID.');
    process.exit(1);
  }

  if (createWC) {
    console.log('  Creating new online working copy from main branch...');
    workingCopy = await app.createTemporaryWorkingCopy('main');
    settings.workingcopy.current = workingCopy.workingCopyId;
    saveSettings(settings);
    console.log(`  Working copy: ${workingCopy.workingCopyId}`);
  } else {
    if (!settings.workingcopy.current || settings.workingcopy.current.includes('xxxx')) {
      console.error('');
      console.error('  ERROR: No working copy ID in settings.yaml.');
      console.error('  Run: npm run create:wc   to create one automatically.');
      process.exit(1);
    }
    console.log(`  Using working copy: ${settings.workingcopy.current}`);
    workingCopy = app.getOnlineWorkingCopy(settings.workingcopy.current);
  }

  console.log('  Opening model...');
  const model = await workingCopy.openModel();

  // ── Guard: delete existing module if present ─────────────────────────────
  const existingModule = model.allModules().find(m => m.name === MODULE_NAME);
  if (existingModule) {
    console.log(`\n  ℹ️  Module '${MODULE_NAME}' already exists — deleting before recreating...`);
    existingModule.delete();
  }

  // ── Create the module ────────────────────────────────────────────────────
  console.log(`\n  Creating module '${MODULE_NAME}'...`);
  const project = model.allProjects()[0];
  const module  = projects.Module.createIn(project);
  module.name   = MODULE_NAME;

  console.log('\n  Building constants...');
  buildConstants(module);

  console.log('\n  Building domain model...');
  const domainModel = domainmodels.DomainModel.createIn(module);
  const {
    ollamaConfiguration,
    ollamaDeployedModel,
    ollamaRequest,
    ollamaMessage,
    ollamaResponse,
    ollamaResponseMessage,
  } = buildDomainModel(model, domainModel);
  console.log('  ✓ Domain model built: 6 entities, 2 associations');

  console.log('\n  Building JSON structures...');
  const { requestStructure, responseStructure } = buildJsonStructures(module);

  console.log('\n  Building mapping shells...');
  buildMappings(
    module,
    requestStructure,
    responseStructure,
    ollamaRequest,
    ollamaMessage,
    ollamaResponse,
    ollamaResponseMessage,
  );

  console.log('\n  Building microflow signatures...');
  buildMicroflows(model, module);

  // ── Commit ───────────────────────────────────────────────────────────────
  console.log('\n  Committing changes to working copy...');
  await model.flushChanges();
  await workingCopy.commitToRepository('main', {
    commitMessage: `Add OllamaConnector module (SDK-generated skeleton)`,
  });

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅  OllamaConnector module committed to repository.');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('  NEXT STEPS in Studio Pro:');
  console.log('  1. Pull latest changes from the repository.');
  console.log('  2. Open ExportMapping_OllamaRequest → select elements → map fields.');
  console.log('  3. Open ImportMapping_OllamaResponse → select elements → map fields.');
  console.log('  4. Open ACT_ChatCompletions_WithHistory → implement Steps 1–12 from plan.');
  console.log('  5. Open ACT_OllamaConnector_Initialize → implement Steps 1–5 from plan.');
  console.log('  6. Open SUB_HandleOllamaError → add Log + Error event.');
  console.log('  7. Create OllamaConfiguration_Overview and OllamaConfiguration_Edit pages.');
  console.log('  8. Wire ACT_OllamaConnector_Initialize into your AfterStartup microflow.');
  console.log('  9. Run the app and verify T4–T8 from the testing plan.');
  console.log('');
}

main().catch(err => {
  console.error('\n  ERROR:', err.message || err);
  process.exit(1);
});
