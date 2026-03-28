/**
 * Creates all domain model entities for the OllamaConnector module.
 *
 * Entities:
 *   Persistent:
 *     - OllamaConfiguration
 *     - OllamaDeployedModel  (generalizes GenAICommons.DeployedModel)
 *   Non-Persistent (JSON serialization helpers):
 *     - OllamaRequest
 *     - OllamaMessage
 *     - OllamaResponse
 *     - OllamaResponseMessage
 */
import {
  domainmodels,
  IModel,
} from 'mendixmodelsdk';

// ─── Layout constants (positions for the visual canvas) ───────────────────────
const POS = {
  OllamaConfiguration:   { x: 100,  y: 100 },
  OllamaDeployedModel:   { x: 550,  y: 100 },
  OllamaRequest:         { x: 100,  y: 350 },
  OllamaMessage:         { x: 550,  y: 350 },
  OllamaResponse:        { x: 100,  y: 600 },
  OllamaResponseMessage: { x: 550,  y: 600 },
};

export function buildDomainModel(
  model: IModel,
  dm: domainmodels.DomainModel,
): {
  ollamaConfiguration:   domainmodels.Entity;
  ollamaDeployedModel:   domainmodels.Entity;
  ollamaRequest:         domainmodels.Entity;
  ollamaMessage:         domainmodels.Entity;
  ollamaResponse:        domainmodels.Entity;
  ollamaResponseMessage: domainmodels.Entity;
} {

  // ── 1. OllamaConfiguration (persistent) ─────────────────────────────────
  const ollamaConfiguration = domainmodels.Entity.createIn(dm);
  ollamaConfiguration.name = 'OllamaConfiguration';
  ollamaConfiguration.location = { x: POS.OllamaConfiguration.x, y: POS.OllamaConfiguration.y };
  const cfgGen = domainmodels.NoGeneralization.createIn(ollamaConfiguration);
  cfgGen.persistable = true;

  addStringAttr(ollamaConfiguration, 'Name',           200,  'Default');
  addStringAttr(ollamaConfiguration, 'BaseURL',         -1,   '');
  addIntegerAttr(ollamaConfiguration, 'TimeoutSeconds',  120);
  addBooleanAttr(ollamaConfiguration, 'IsActive',        true);

  // ── 2. OllamaDeployedModel (persistent, specializes GenAICommons.DeployedModel) ──
  const ollamaDeployedModel = domainmodels.Entity.createIn(dm);
  ollamaDeployedModel.name = 'OllamaDeployedModel';
  ollamaDeployedModel.location = { x: POS.OllamaDeployedModel.x, y: POS.OllamaDeployedModel.y };

  const genEntity = model.findEntityByQualifiedName('GenAICommons.DeployedModel');
  if (genEntity) {
    const deployedModelGen = domainmodels.Generalization.createIn(ollamaDeployedModel);
    deployedModelGen.generalization = genEntity;
  } else {
    console.warn('  ⚠️  GenAICommons.DeployedModel not found — OllamaDeployedModel created without generalization.');
    console.warn('     Set the generalization manually in Studio Pro after installing GenAICommons.');
    const deployedModelGen = domainmodels.NoGeneralization.createIn(ollamaDeployedModel);
    deployedModelGen.persistable = true;
  }

  // ── 3. OllamaRequest (non-persistent, for JSON export) ───────────────────
  const ollamaRequest = domainmodels.Entity.createIn(dm);
  ollamaRequest.name = 'OllamaRequest';
  ollamaRequest.location = { x: POS.OllamaRequest.x, y: POS.OllamaRequest.y };
  const reqGen = domainmodels.NoGeneralization.createIn(ollamaRequest);
  reqGen.persistable = false;

  addStringAttr(ollamaRequest, 'model',        200, '');
  addBooleanAttr(ollamaRequest, 'stream',       false);
  addDecimalAttr(ollamaRequest, 'temperature');
  addIntegerAttr(ollamaRequest, 'num_predict',  0);

  // ── 4. OllamaMessage (non-persistent, for JSON export) ───────────────────
  const ollamaMessage = domainmodels.Entity.createIn(dm);
  ollamaMessage.name = 'OllamaMessage';
  ollamaMessage.location = { x: POS.OllamaMessage.x, y: POS.OllamaMessage.y };
  const msgGen = domainmodels.NoGeneralization.createIn(ollamaMessage);
  msgGen.persistable = false;

  addStringAttr(ollamaMessage, 'role',      50,  '');
  addStringAttr(ollamaMessage, 'content',   -1,  '');
  addIntegerAttr(ollamaMessage, 'SortOrder', 0);

  // ── 5. OllamaResponse (non-persistent, for JSON import) ──────────────────
  const ollamaResponse = domainmodels.Entity.createIn(dm);
  ollamaResponse.name = 'OllamaResponse';
  ollamaResponse.location = { x: POS.OllamaResponse.x, y: POS.OllamaResponse.y };
  const respGen = domainmodels.NoGeneralization.createIn(ollamaResponse);
  respGen.persistable = false;

  addStringAttr(ollamaResponse, 'model',              200, '');
  addBooleanAttr(ollamaResponse, 'done',               false);
  addIntegerAttr(ollamaResponse, 'prompt_eval_count',  0);
  addIntegerAttr(ollamaResponse, 'eval_count',         0);
  addLongAttr(ollamaResponse,    'total_duration');

  // ── 6. OllamaResponseMessage (non-persistent, for JSON import) ───────────
  const ollamaResponseMessage = domainmodels.Entity.createIn(dm);
  ollamaResponseMessage.name = 'OllamaResponseMessage';
  ollamaResponseMessage.location = { x: POS.OllamaResponseMessage.x, y: POS.OllamaResponseMessage.y };
  const respMsgGen = domainmodels.NoGeneralization.createIn(ollamaResponseMessage);
  respMsgGen.persistable = false;

  addStringAttr(ollamaResponseMessage, 'role',    50, '');
  addStringAttr(ollamaResponseMessage, 'content', -1, '');

  // ── 7. Associations ───────────────────────────────────────────────────────
  // OllamaMessage → OllamaRequest  (many-to-one, OllamaMessage owns)
  // parent = OllamaMessage (the * side, draws the arrow, owns the reference)
  // child  = OllamaRequest (the 1 side, referenced)
  // This makes the association appear in OllamaMessage's Create/Change dialog,
  // allowing multiple OllamaMessages to be associated to one OllamaRequest.
  const reqMsgAssoc = domainmodels.Association.createIn(dm);
  reqMsgAssoc.name   = 'OllamaRequest_OllamaMessage';
  reqMsgAssoc.parent = ollamaMessage;
  reqMsgAssoc.child  = ollamaRequest;
  reqMsgAssoc.type   = domainmodels.AssociationType.Reference;
  reqMsgAssoc.owner  = domainmodels.AssociationOwner.Both;

  // OllamaResponse → OllamaResponseMessage  (one-to-one)
  const respRespMsgAssoc = domainmodels.Association.createIn(dm);
  respRespMsgAssoc.name   = 'OllamaResponse_OllamaResponseMessage';
  respRespMsgAssoc.parent = ollamaResponse;
  respRespMsgAssoc.child  = ollamaResponseMessage;
  respRespMsgAssoc.type   = domainmodels.AssociationType.Reference;
  respRespMsgAssoc.owner  = domainmodels.AssociationOwner.Default;

  return {
    ollamaConfiguration,
    ollamaDeployedModel,
    ollamaRequest,
    ollamaMessage,
    ollamaResponse,
    ollamaResponseMessage,
  };
}

// ─── Attribute helpers ────────────────────────────────────────────────────────
// Domain model attributes use domainmodels.*AttributeType (not datatypes.*)
// Default values use domainmodels.StoredValue

function addStringAttr(
  entity: domainmodels.Entity,
  name: string,
  length: number,   // -1 = unlimited, >0 = specific max length
  defaultValue: string,
): domainmodels.Attribute {
  const attr = domainmodels.Attribute.createIn(entity);
  attr.name = name;
  const type = domainmodels.StringAttributeType.createInAttributeUnderType(attr);
  type.length = length === -1 ? 0 : length; // 0 = unlimited in Mendix SDK
  const sv = domainmodels.StoredValue.createIn(attr);
  sv.defaultValue = defaultValue;
  return attr;
}

function addIntegerAttr(
  entity: domainmodels.Entity,
  name: string,
  defaultValue: number,
): domainmodels.Attribute {
  const attr = domainmodels.Attribute.createIn(entity);
  attr.name = name;
  domainmodels.IntegerAttributeType.createInAttributeUnderType(attr);
  const sv = domainmodels.StoredValue.createIn(attr);
  sv.defaultValue = String(defaultValue);
  return attr;
}

function addLongAttr(
  entity: domainmodels.Entity,
  name: string,
): domainmodels.Attribute {
  const attr = domainmodels.Attribute.createIn(entity);
  attr.name = name;
  domainmodels.LongAttributeType.createInAttributeUnderType(attr);
  const sv = domainmodels.StoredValue.createIn(attr);
  sv.defaultValue = '0';
  return attr;
}

function addDecimalAttr(
  entity: domainmodels.Entity,
  name: string,
): domainmodels.Attribute {
  const attr = domainmodels.Attribute.createIn(entity);
  attr.name = name;
  domainmodels.DecimalAttributeType.createInAttributeUnderType(attr);
  const sv = domainmodels.StoredValue.createIn(attr);
  sv.defaultValue = '0';
  return attr;
}

function addBooleanAttr(
  entity: domainmodels.Entity,
  name: string,
  defaultValue: boolean,
): domainmodels.Attribute {
  const attr = domainmodels.Attribute.createIn(entity);
  attr.name = name;
  domainmodels.BooleanAttributeType.createInAttributeUnderType(attr);
  const sv = domainmodels.StoredValue.createIn(attr);
  sv.defaultValue = String(defaultValue);
  return attr;
}
