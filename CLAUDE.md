# CLAUDE.md — OllamaConnector

Project memory for Claude Code. Updated after every working session.

---

## What this project is

A Mendix Platform SDK generator that programmatically creates a Mendix module skeleton for integrating **Ollama** (open-source LLM) with the **Mendix GenAI Commons** framework.

Running `npm run create` connects to a Mendix online working copy and generates:
- Domain model (6 entities, 2 associations)
- 2 constants
- 2 JSON structures
- 2 mapping shells (export + import)
- 3 microflow stubs with TODO annotations

The generated stubs must be completed manually in Studio Pro.

```
src/
  create-module.ts           ← main orchestrator
  settings.ts                ← YAML config loader
  module/
    domain-model.ts          ← 6 entities + 2 associations
    constants.ts             ← Ollama_BaseURL, Ollama_DefaultModel
    json-structures.ts       ← JSONStructure_OllamaRequest/Response
    mappings.ts              ← ExportMapping / ImportMapping shells
    microflows.ts            ← 3 microflow stubs + TODO annotations
```

### Scripts

| Script | Description |
|--------|-------------|
| `npm run create:wc` | Create a new working copy, save ID to settings.yaml |
| `npm run create` | Generate module in the working copy and commit to main |

---

## GenAI Commons — key entities

| Entity | Role |
|--------|------|
| `GenAICommons.DeployedModel` | Abstract base class for all AI models |
| `GenAICommons.Request` | Wraps user input + conversation history |
| `GenAICommons.Response` | Wraps assistant response + metadata |
| `GenAICommons.Message` | A single conversation turn (role + content) |

### GenAICommons.Message attributes (confirmed in Studio Pro)
- `Content` (String)
- `Role` (Enumeration: `GenAICommons.ENUM_MessageRole`) — values: `user`, `assistant`
- `MessageType` (Enumeration: `GenAICommons.ENUM_MessageType`)
- `ToolCallId` (String)
- Associations: `Message_FileCollection`, `Message_Reference`, `Message_ToolCall`

### GenAICommons.Response attributes (confirmed in Studio Pro)
- `_ID` (String) — internal field, leave empty when creating
- `RequestTokens` (Integer)
- `ResponseTokens` (Integer)
- `TotalTokens` (Integer)
- `DurationMilliseconds` (Integer)
- `StopReason` (String)
- `ResponseText` (String)
- Association: `Response_Message` (1-*) → `GenAICommons.Message` — owned by **Response**

### Retrieving messages from a Request
Use **Retrieve by association** via `$Request/Request_Message` → returns `List of GenAICommons.Message`.

---

## Domain model — entities

### OllamaConfiguration (persistent)
| Attribute | Type | Default |
|-----------|------|---------|
| `Name` | String(200) | "Default" |
| `BaseURL` | String(unlimited) | "" |
| `TimeoutSeconds` | Integer | 120 |
| `IsActive` | Boolean | true |

### OllamaDeployedModel (persistent, specializes GenAICommons.DeployedModel)
Inherits all GenAICommons.DeployedModel attributes including `Model`, `DisplayName`, `IsActive`.
Accessible directly (e.g. `$OllamaDeployedModel/Model`) without traversing the association path.

### Non-persistent entities (JSON serialization helpers)
- `OllamaRequest` — `model`, `stream`, `temperature`, `num_predict`
- `OllamaMessage` — `role`, `content`, `SortOrder`
- `OllamaResponse` — `model`, `done`, `prompt_eval_count`, `eval_count`, `total_duration` (Long, nanoseconds)
- `OllamaResponseMessage` — `role`, `content`

---

## Domain model — known bugs fixed in generator

### OllamaRequest_OllamaMessage association (fixed 2026-03-28)

**Bug**: generated with `parent = ollamaRequest, owner = Default` making OllamaRequest the owner.
This caused:
- Association not appearing in OllamaMessage Create/Change dialog
- Only "Set" available from OllamaRequest (can't add multiple messages)
- Association not appearing in ExportMapping when navigating from OllamaRequest

**Fix in `src/module/domain-model.ts`**:
```typescript
reqMsgAssoc.parent = ollamaMessage;  // OllamaMessage owns the reference
reqMsgAssoc.child  = ollamaRequest;
reqMsgAssoc.owner  = domainmodels.AssociationOwner.Both;  // navigable from both sides
```

**Manual fix in Studio Pro**: delete the association, redraw FROM OllamaMessage TO OllamaRequest,
set Owner to Both (double-click association → Owner dropdown — only available for *-* reference sets;
for 1-* you must redraw in the correct direction).

**Note**: "Add" operation in Change Object is only available for many-to-many (*-*) reference sets.
For 1-* associations, set from the * (child/owner) side using "Set".

---

## Mendix SDK — key findings

### Cast Object activity
- Must directly follow an **Object Type Decision** — cannot be placed freely in the flow
- Object Type Decision checks the runtime type and creates branches per specialization
- After the cast, the variable is typed as the specialization and in scope

### Association ownership rules
- For 1-* associations: the `*` side is the owner by default
- "Add" operation in Change Object is only for *-* reference sets
- "Both" owner option is only available for *-* reference sets
- For 1-* associations, redraw the arrow FROM the `*` (owner) entity TO the `1` entity to control ownership
- Export mappings can navigate associations from both directions once owner is correct

### Export mapping completion
When completing a mapping shell in Studio Pro:
1. Open the mapping → click **Select elements** → choose the JSON structure
2. Studio Pro renders the element tree with dashed placeholder boxes
3. For array elements: the entity goes on the `(0..*)` level, not the `(0..1)` container
4. Drag the entity onto the dashed box → select the association to parent in the dialog
5. Click **Map attributes by name** to auto-match fields
6. The root entity must be set first before Export/Import activities accept the object as parameter

### JSON Structure placeholder entities
The SDK-generated JSON structures create placeholder entities (`Root`, `Messages`, `Message`) in the module.
These are not real domain model entities — delete them from the domain model after completing the mappings.

---

## ACT_ChatCompletions_WithHistory — implementation

The core connector microflow. Parameters: `DeployedModel: GenAICommons.DeployedModel`, `Request: GenAICommons.Request`. Returns: `GenAICommons.Response`.

### Step 1 — Cast DeployedModel → OllamaDeployedModel
- Add **Object Type Decision** on `$DeployedModel`
- On `OllamaDeployedModel` branch: add **Cast** activity → output `OllamaDeployedModel`
- Default branch: error / SUB_HandleOllamaError

### Step 2 — Retrieve active OllamaConfiguration
- Retrieve from database: `OllamaConnector.OllamaConfiguration [IsActive = true()]`, First
- Output: `OllamaConfiguration`
- Guard: if empty → error "No active OllamaConfiguration found"

### Step 3 — Determine model name
- Exclusive Split: `$OllamaDeployedModel/Model != empty and $OllamaDeployedModel/Model != ''`
- true → `ModelName` = `$OllamaDeployedModel/Model`
- false → `ModelName` = `@OllamaConnector.Ollama_DefaultModel`
- Merge branches

### Step 4 — Create OllamaRequest
- Create `OllamaConnector.OllamaRequest`:
  - `model` = `$ModelName`
  - `stream` = `false` (Mendix REST requires complete response, not streaming)
  - `temperature` = `0.7`
  - `num_predict` = `1000`
- Output: `OllamaRequest`

### Step 5 — Add system prompt (if present)
- Exclusive Split: `$Request/SystemPrompt != empty and $Request/SystemPrompt != ''`
- true → Create `OllamaMessage`: `role='system'`, `content=$Request/SystemPrompt`, `SortOrder=0`
  - Associate via Change OllamaRequest → `OllamaRequest_OllamaMessage` Add `$SystemMessage`
- Merge branches

### Step 6 — Retrieve conversation messages
- Retrieve by association: `$Request/Request_Message` → `List of GenAICommons.Message`
- Output: `Messages`

### Step 7 — Loop: convert each Message → OllamaMessage
- Before loop: Create Variable `Counter` = `1` (Integer)
- Loop over `$Messages`, variable: `Message`
- Inside loop:
  - Exclusive Split on role: `$Message/Role = GenAICommons.ENUM_MessageRole.user`
    - true → `RoleString` = `'user'`
    - false → `RoleString` = `'assistant'`
  - Create `OllamaMessage`: `role=$RoleString`, `content=$Message/Content`, `SortOrder=$Counter`
  - Set association via Create dialog: `OllamaRequest_OllamaMessage = $OllamaRequest`
  - Change Variable: `Counter` = `$Counter + 1`

### Step 8 — Export OllamaRequest to JSON
- **Export with mapping**: `ExportMapping_OllamaRequest`, object `$OllamaRequest`
- Output: String variable `RequestBody`
- **Prerequisite**: complete ExportMapping_OllamaRequest first (see mapping notes above)

### Step 9 — Call REST: POST {BaseURL}/api/chat
- **Call REST service**:
  - Location: `$OllamaConfiguration/BaseURL + '/api/chat'`
  - Method: POST
  - Timeout: `$OllamaConfiguration/TimeoutSeconds * 1000` (ms)
  - Request: Custom body = `$RequestBody`, Content-Type header = `'application/json'`
  - Response: Apply import mapping `ImportMapping_OllamaResponse` → output `OllamaResponse`
  - Error handler for non-2xx → SUB_HandleOllamaError

### Step 10 — Import response
Handled automatically by the Call REST service activity (step 9). No separate activity needed.
Guard after REST call: `$OllamaResponse != empty`, else throw error.

### Step 11 — Build GenAICommons.Response
1. Retrieve `OllamaResponseMessage` by association from `$OllamaResponse` via `OllamaResponse_OllamaResponseMessage`
2. Create `GenAICommons.Response`:
   - `RequestTokens` = `$OllamaResponse/prompt_eval_count`
   - `ResponseTokens` = `$OllamaResponse/eval_count`
   - `TotalTokens` = `$OllamaResponse/prompt_eval_count + $OllamaResponse/eval_count`
   - `DurationMilliseconds` = `round($OllamaResponse/total_duration div 1000000)` (nanoseconds → ms, Long → Integer via round())
   - `StopReason` = `'stop'`
   - `ResponseText` = `$OllamaResponseMessage/content`
   - `_ID` = leave empty (internal GenAICommons field)
   - Output: `CommonsResponse`
3. Create `GenAICommons.Message`:
   - `Role` = `GenAICommons.ENUM_MessageRole.assistant`
   - `Content` = `$OllamaResponseMessage/content`
   - `MessageType` = check enum values in expression editor
   - Output: `AssistantMessage`
4. Change `$CommonsResponse` → `Response_Message` = `$AssistantMessage`
   (association owned by Response; set from Response side)

### Step 12 — Return response
- Double-click End event → return value = `$CommonsResponse`

---

## ACT_OllamaConnector_Initialize — implementation

Startup microflow. Call from AfterStartup (App Settings → Runtime → After startup).

### Step 1 — Guard
- Retrieve `OllamaDeployedModel [DisplayName = 'Ollama Llama3']`, First → `ExistingModel`
- If `$ExistingModel != empty` → End (already initialized)

### Step 2 — Ensure OllamaConfiguration exists
- Retrieve `OllamaConfiguration [IsActive = true()]`, First → `OllamaConfiguration`
- If empty → Create `OllamaConfiguration`: `Name='Default'`, `BaseURL=@Ollama_BaseURL`, `TimeoutSeconds=120`, `IsActive=true` → Commit
- Merge branches

### Step 3 — Create OllamaDeployedModel
- Create `OllamaDeployedModel`:
  - `DisplayName` = `'Ollama Llama3'`
  - `Architecture` = `'Llama'`
  - `Model` = `@OllamaConnector.Ollama_DefaultModel`
  - `OutputModality` = `GenAICommons.ENUM_ModelModality.Text`
  - `SupportsSystemPrompt` = `true`
  - `SupportsConversationsWithHistory` = `true`
  - `SupportsFunctionCalling` = `false`
  - `IsActive` = `true`
- Commit → Output: `NewModel`

### Step 4 — Register microflow
- Call Java action `GenAICommons.DeployedModel_SetMicroflow`:
  - `DeployedModel` = `$NewModel`
  - `Microflow` = `'OllamaConnector.ACT_ChatCompletions_WithHistory'` (exact string, typos cause silent failure)

### Step 5 — Log
- Log message: Level=Info, Category=`'OllamaConnector'`, Message=`'OllamaConnector initialized. Model: Ollama Llama3'`

---

## ConversationalUI integration

The OllamaConnector works with the **ConversationalUI** marketplace module via a wrapper microflow pattern. `ACT_ChatCompletions_WithHistory` keeps its original `(DeployedModel, Request) → Response` signature — the ConversationalUI framework calls it indirectly via `ProviderConfig.ActionMicroflow`.

### ProviderConfig

`ConversationalUI.ProviderConfig` is a **ConversationalUI-specific** configuration record. It is **not** part of GenAI Commons and must not be created in `ACT_OllamaConnector_Initialize` (the connector must remain independent of ConversationalUI).

| Attribute | Value |
|-----------|-------|
| `DisplayName` | `'Ollama'` |
| `ActionMicroflow` | `'OllamaConnector.ChatContext_ChatWithHistory_ActionMicroflow_Ollama'` |
| `SystemPrompt` | `''` |
| Association `ProviderConfig_DeployedModel` | `OllamaDeployedModel` |

Create this record in the **app's own AfterStartup microflow**, after calling `OllamaConnector.ACT_OllamaConnector_Initialize`.

### Wrapper microflow: ChatContext_ChatWithHistory_ActionMicroflow_Ollama

The `ProviderConfig.ActionMicroflow` must point to a microflow with signature `ChatContext → Boolean`. Create this in the OllamaConnector module:

```
Parameter: ChatContext (ConversationalUI.ChatContext)
Returns:   Boolean

1. Default Preprocessing (ConversationalUI Java action)
     Input:  ChatContext = $ChatContext
     Output: Request (GenAICommons.Request)
2. Guard: $Request != empty, else return false
3. Retrieve DeployedModel
     Via association: $ChatContext/ChatContext_ProviderConfig_Active/ProviderConfig_DeployedModel
     Output: DeployedModel (GenAICommons.DeployedModel)
4. Call ACT_ChatCompletions_WithHistory(DeployedModel, Request)
     Output: Response (GenAICommons.Response)
5. Guard: $Response != empty, else return false
6. Update Assistant Response (ConversationalUI Java action)
     Input: ChatContext = $ChatContext, Response = $Response
7. Return true
```

### How the framework calls your connector

```
FloatingChatButton
  → ChatContext (created/updated by framework)
    → ChatContext_ExecuteAction (Java action)
      → reads ChatContext_ProviderConfig_Active → ProviderConfig
        → reads ProviderConfig.ActionMicroflow (string)
          → calls ChatContext_ChatWithHistory_ActionMicroflow_Ollama(ChatContext)
            → DefaultPreprocessing → builds GenAICommons.Request
            → ACT_ChatCompletions_WithHistory(DeployedModel, Request)
              → REST call to Ollama → GenAICommons.Response
            → UpdateAssistantResponse → writes reply to ChatContext
            → returns true
```

### Known issue: duplicate user message

`DefaultPreprocessing` already adds the current user prompt as a `GenAICommons.Message` to the `Request`. `ACT_ChatCompletions_WithHistory` Step 6 then retrieves `$Request/Request_Message` and loops over it. This causes the current prompt to appear twice in the message list sent to Ollama. To fix: in `ACT_ChatCompletions_WithHistory`, skip the last message in the loop if it duplicates the current prompt, or adjust `DefaultPreprocessing` parameters to exclude the current turn from history.

---

## Studio Pro — known pitfalls

### Call REST service: URL must be in Expression mode
The **Location** field in Call REST service has two modes: **string constant** and **expression**. If the URL is set as a string constant, Mendix passes the literal text `$OllamaConfiguration/BaseURL + '/api/chat'` to the Java HTTP client, causing:
```
Illegal character in path at index 28: $OllamaConfiguration/BaseURL + '/api/chat'
```
Fix: click the expression toggle (`{...}` icon) next to the Location field and set it to **Expression** mode. Same applies to the Timeout field.

### Ollama API: temperature and num_predict belong in options

Ollama's `/api/chat` endpoint expects `temperature` and `num_predict` inside an `options` object, not at the top level:
```json
{
  "model": "llama3",
  "messages": [...],
  "stream": false,
  "options": {
    "temperature": 0.7,
    "num_predict": 1000
  }
}
```
Top-level placement is silently ignored by Ollama. To fix properly, update `JSONStructure_OllamaRequest` and `ExportMapping_OllamaRequest` to nest these fields under an `options` object.

---

## Known remaining work

- `SUB_HandleOllamaError` — implement error logging and throw
- Complete `ImportMapping_OllamaResponse` (same process as ExportMapping)
- Delete placeholder entities (`Root`, `Messages`, `Message`) from domain model
- Create UI pages: `OllamaConfiguration_Overview`, `OllamaConfiguration_Edit`
- Fix duplicate message bug in `ACT_ChatCompletions_WithHistory` (see ConversationalUI section)
- Fix `temperature` / `num_predict` nesting in `JSONStructure_OllamaRequest`
- Create app-level AfterStartup that calls `ACT_OllamaConnector_Initialize` then creates `ProviderConfig`
