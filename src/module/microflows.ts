/**
 * Creates the three microflows for the OllamaConnector module:
 *
 *   ACT_ChatCompletions_WithHistory  — the core connector microflow
 *   ACT_OllamaConnector_Initialize   — startup registration
 *   SUB_HandleOllamaError            — error handler sub-microflow
 *
 * Each microflow is created with:
 *   - The correct name and parameters
 *   - The correct return type
 *   - Start and End events
 *   - An annotation listing the TODO steps to implement in Studio Pro
 *
 * The detailed logic (decisions, REST call, loops, etc.) must be built in
 * Studio Pro — follow Steps 5–7 in the plan document.
 */
import {
  microflows,
  projects,
  datatypes,
  IModel,
} from 'mendixmodelsdk';

// ─── Public builder ───────────────────────────────────────────────────────────

export function buildMicroflows(model: IModel, module: projects.Module): {
  chatCompletionsMF:  microflows.Microflow;
  initializeMF:       microflows.Microflow;
  handleErrorMF:      microflows.Microflow;
} {

  const chatCompletionsMF = buildChatCompletionsMicroflow(model, module);
  const initializeMF      = buildInitializeMicroflow(model, module);
  const handleErrorMF     = buildHandleErrorMicroflow(model, module);

  console.log('  ✓ Microflows created with correct signatures:');
  console.log('      ACT_ChatCompletions_WithHistory  (DeployedModel, Request → Response)');
  console.log('      ACT_OllamaConnector_Initialize   (no params, no return)');
  console.log('      SUB_HandleOllamaError            (HttpStatus, ErrorBody, BaseURL)');
  console.log('');
  console.log('  ⚠️  MICROFLOWS: Internal logic must be built in Studio Pro.');
  console.log('     Follow Steps 5–7 in the plan document.');

  return { chatCompletionsMF, initializeMF, handleErrorMF };
}

// ─── ACT_ChatCompletions_WithHistory ─────────────────────────────────────────

function buildChatCompletionsMicroflow(
  model: IModel,
  module: projects.Module,
): microflows.Microflow {
  const mf = microflows.Microflow.createIn(module);
  mf.name = 'ACT_ChatCompletions_WithHistory';

  // Return type: GenAICommons.Response (ObjectType), fallback to VoidType
  const responseEntity = model.findEntityByQualifiedName('GenAICommons.Response');
  if (responseEntity) {
    const returnType = datatypes.ObjectType.create(model);
    returnType.entity = responseEntity;
    mf.microflowReturnType = returnType;
  } else {
    console.warn('  ⚠️  GenAICommons.Response not found — return type set to Void. Fix in Studio Pro.');
    mf.microflowReturnType = datatypes.VoidType.create(model);
  }

  const oc = mf.objectCollection;

  // ── Start event ────────────────────────────────────────────────────────
  const start = microflows.StartEvent.createIn(oc);
  start.relativeMiddlePoint = { x: 100, y: 100 };

  // ── Parameter 1: DeployedModel (GenAICommons.DeployedModel) ───────────
  const deployedModelEntity = model.findEntityByQualifiedName('GenAICommons.DeployedModel');
  if (deployedModelEntity) {
    const p1 = microflows.MicroflowParameterObject.createIn(oc);
    p1.name = 'DeployedModel';
    p1.relativeMiddlePoint = { x: 100, y: 200 };
    const p1Type = datatypes.ObjectType.create(model);
    p1Type.entity = deployedModelEntity;
    p1.variableType = p1Type;
  } else {
    console.warn('  ⚠️  GenAICommons.DeployedModel not found — parameter skipped. Add manually in Studio Pro.');
  }

  // ── Parameter 2: Request (GenAICommons.Request) ────────────────────────
  const requestEntity = model.findEntityByQualifiedName('GenAICommons.Request');
  if (requestEntity) {
    const p2 = microflows.MicroflowParameterObject.createIn(oc);
    p2.name = 'Request';
    p2.relativeMiddlePoint = { x: 300, y: 200 };
    const p2Type = datatypes.ObjectType.create(model);
    p2Type.entity = requestEntity;
    p2.variableType = p2Type;
  } else {
    console.warn('  ⚠️  GenAICommons.Request not found — parameter skipped. Add manually in Studio Pro.');
  }

  // ── Annotation: Steps to implement ─────────────────────────────────────
  const ann = microflows.Annotation.createIn(oc);
  ann.relativeMiddlePoint = { x: 550, y: 300 };
  ann.caption = [
    'TODO — implement in Studio Pro (follow plan Step 5):',
    '',
    '1.  Cast DeployedModel → OllamaDeployedModel',
    '2.  Retrieve active OllamaConfiguration',
    '3.  Determine model name',
    '4.  Create OllamaRequest object',
    '5.  Add system prompt message (if present)',
    '6.  Retrieve conversation messages from Request',
    '7.  Loop: convert each GenAICommons.Message → OllamaMessage',
    '8.  Export OllamaRequest to JSON (ExportMapping_OllamaRequest)',
    '9.  Call REST: POST {BaseURL}/api/chat',
    '10. Import response (ImportMapping_OllamaResponse)',
    '11. Build GenAICommons.Response from OllamaResponse',
    '12. Return GenAICommons.Response',
  ].join('\n');

  // ── End event ──────────────────────────────────────────────────────────
  const end = microflows.EndEvent.createIn(oc);
  end.relativeMiddlePoint = { x: 100, y: 500 };
  end.returnValue = 'null'; // placeholder — change to $CommonsResponse

  // ── Wire start → end ───────────────────────────────────────────────────
  const flow = microflows.SequenceFlow.createIn(mf);
  flow.origin      = start;
  flow.destination = end;

  return mf;
}

// ─── ACT_OllamaConnector_Initialize ──────────────────────────────────────────

function buildInitializeMicroflow(
  model: IModel,
  module: projects.Module,
): microflows.Microflow {
  const mf = microflows.Microflow.createIn(module);
  mf.name = 'ACT_OllamaConnector_Initialize';
  mf.microflowReturnType = datatypes.VoidType.create(model);

  const oc = mf.objectCollection;

  const start = microflows.StartEvent.createIn(oc);
  start.relativeMiddlePoint = { x: 100, y: 100 };

  const ann = microflows.Annotation.createIn(oc);
  ann.relativeMiddlePoint = { x: 400, y: 250 };
  ann.caption = [
    'TODO — implement in Studio Pro (follow plan Step 7):',
    '',
    '1. Guard: retrieve OllamaDeployedModel where DisplayName = "Ollama Llama3"',
    '   → if exists: end (already initialized)',
    '',
    '2. Ensure OllamaConfiguration exists',
    '   → if empty: create & commit using constant values',
    '',
    '3. Create OllamaDeployedModel:',
    '   DisplayName = "Ollama Llama3"',
    '   Architecture = "Llama"',
    '   Model = constant Ollama_DefaultModel',
    '   OutputModality = GenAICommons.ENUM_ModelModality.Text',
    '   SupportsSystemPrompt = _True',
    '   SupportsConversationsWithHistory = _True',
    '   SupportsFunctionCalling = _False',
    '   IsActive = true',
    '   → commit',
    '',
    '4. Call Java Action: GenAICommons.DeployedModel_SetMicroflow',
    '   DeployedModel = $NewModel',
    '   Microflow = "OllamaConnector.ACT_ChatCompletions_WithHistory"',
    '',
    '5. Log Info: "OllamaConnector initialized. Model: Ollama Llama3"',
  ].join('\n');

  const end = microflows.EndEvent.createIn(oc);
  end.relativeMiddlePoint = { x: 100, y: 500 };

  const flow = microflows.SequenceFlow.createIn(mf);
  flow.origin      = start;
  flow.destination = end;

  return mf;
}

// ─── SUB_HandleOllamaError ────────────────────────────────────────────────────

function buildHandleErrorMicroflow(
  model: IModel,
  module: projects.Module,
): microflows.Microflow {
  const mf = microflows.Microflow.createIn(module);
  mf.name = 'SUB_HandleOllamaError';
  mf.microflowReturnType = datatypes.VoidType.create(model);

  const oc = mf.objectCollection;

  const start = microflows.StartEvent.createIn(oc);
  start.relativeMiddlePoint = { x: 100, y: 100 };

  // Parameter 1: HttpStatus (Integer)
  const p1 = microflows.MicroflowParameterObject.createIn(oc);
  p1.name = 'HttpStatus';
  p1.relativeMiddlePoint = { x: 100, y: 200 };
  p1.variableType = datatypes.IntegerType.create(model);

  // Parameter 2: ErrorBody (String)
  const p2 = microflows.MicroflowParameterObject.createIn(oc);
  p2.name = 'ErrorBody';
  p2.relativeMiddlePoint = { x: 300, y: 200 };
  p2.variableType = datatypes.StringType.create(model);

  // Parameter 3: BaseURL (String)
  const p3 = microflows.MicroflowParameterObject.createIn(oc);
  p3.name = 'BaseURL';
  p3.relativeMiddlePoint = { x: 500, y: 200 };
  p3.variableType = datatypes.StringType.create(model);

  const ann = microflows.Annotation.createIn(oc);
  ann.relativeMiddlePoint = { x: 400, y: 350 };
  ann.caption = [
    'TODO — implement in Studio Pro (follow plan Step 6):',
    '',
    '1. Log Message (Error level, category "OllamaConnector"):',
    '   "Ollama API error. Status: " + toString($HttpStatus)',
    '   + " | Body: " + $ErrorBody',
    '',
    '2. Error event:',
    '   "Ollama request failed (HTTP " + toString($HttpStatus)',
    '   + "). See application log for details."',
  ].join('\n');

  const end = microflows.EndEvent.createIn(oc);
  end.relativeMiddlePoint = { x: 100, y: 500 };

  const flow = microflows.SequenceFlow.createIn(mf);
  flow.origin      = start;
  flow.destination = end;

  return mf;
}
