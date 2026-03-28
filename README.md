# OllamaConnector — Mendix GenAI SDK Builder

Programmatically creates the **OllamaConnector** module skeleton in a Mendix project using the Mendix Platform SDK + Model SDK.

## What gets created

| Artifact | Status |
|---|---|
| Module `OllamaConnector` | ✅ SDK |
| Constant `Ollama_BaseURL` (`http://localhost:11434`) | ✅ SDK |
| Constant `Ollama_DefaultModel` (`llama3`) | ✅ SDK |
| Entity `OllamaConfiguration` (persistent, 4 attributes) | ✅ SDK |
| Entity `OllamaDeployedModel` → specializes `GenAICommons.DeployedModel` | ✅ SDK |
| Entity `OllamaRequest` (non-persistent, 4 attributes) | ✅ SDK |
| Entity `OllamaMessage` (non-persistent, 3 attributes) | ✅ SDK |
| Entity `OllamaResponse` (non-persistent, 5 attributes) | ✅ SDK |
| Entity `OllamaResponseMessage` (non-persistent, 2 attributes) | ✅ SDK |
| Association `OllamaRequest_OllamaMessage` (1–*) | ✅ SDK |
| Association `OllamaResponse_OllamaResponseMessage` (1–1) | ✅ SDK |
| JSON Structure `JSONStructure_OllamaRequest` | ✅ SDK |
| JSON Structure `JSONStructure_OllamaResponse` | ✅ SDK |
| Export Mapping `ExportMapping_OllamaRequest` (shell) | ✅ SDK |
| Import Mapping `ImportMapping_OllamaResponse` (shell) | ✅ SDK |
| Microflow `ACT_ChatCompletions_WithHistory` (params + signature) | ✅ SDK |
| Microflow `ACT_OllamaConnector_Initialize` (signature) | ✅ SDK |
| Microflow `SUB_HandleOllamaError` (params + signature) | ✅ SDK |
| Mapping element trees (field-level config) | Studio Pro |
| Microflow internal logic (decisions, REST call, loop) | Studio Pro |
| Configuration pages | Studio Pro |

## Prerequisites

- Node.js 18+ and npm
- A Mendix online project (with GenAICommons installed) — needed for the SDK
- `ollama serve` running at `http://localhost:11434`
- `ollama pull llama3` completed

## Setup

```bash
cp settings.yaml.example settings.yaml
# Edit settings.yaml with your Mendix credentials and project ID
npm install
```

Find your project ID in **Mendix Portal → Apps → your app → Settings → General → App ID**.

## Usage

### Step 1 — Create an online working copy

```bash
npm run create:wc
```

This creates a temporary working copy from the `main` branch and saves its ID to `settings.yaml`.

### Step 2 — Build the module

```bash
npm run create
```

The script will:
1. Open the online working copy
2. Create the `OllamaConnector` module with all entities, constants, JSON structures, mapping shells, and microflow signatures
3. Commit the changes to the `main` branch

### Step 3 — Pull in Studio Pro

Open Studio Pro 11.8, pull from Team Server — the `OllamaConnector` module will appear.

## Studio Pro completion steps

### Mappings (Step 4 in plan)

1. Open `ExportMapping_OllamaRequest`
2. Click "Select elements..." → choose `JSONStructure_OllamaRequest`
3. Map root → `OllamaRequest`, messages array → `OllamaMessage` (by association, sort by `SortOrder ASC`)
4. Open `ImportMapping_OllamaResponse`
5. Click "Select elements..." → choose `JSONStructure_OllamaResponse`
6. Map root → `OllamaResponse` (create), nested message → `OllamaResponseMessage` (create)

### ACT_ChatCompletions_WithHistory (Step 5 in plan)

Follow the 12-step plan. Each step is listed in the annotation inside the microflow.

Key implementation notes:
- **Step 8**: `ExportMapping_OllamaRequest` → String result `$RequestJSON`
- **Step 9**: REST call to `$Config/BaseURL + '/api/chat'`, timeout = `$Config/TimeoutSeconds * 1000`
- **Step 11**: Build `GenAICommons.Response`, create associated `GenAICommons.Message` (role=assistant)
- **Step 12**: Return `$CommonsResponse` (change the End event's return expression from `null`)

### SUB_HandleOllamaError (Step 6)

1. Log Message (Error, category `OllamaConnector`): `'Ollama API error. Status: ' + toString($HttpStatus) + ' | Body: ' + $ErrorBody`
2. Error event: `'Ollama request failed (HTTP ' + toString($HttpStatus) + '). See application log for details.'`

### ACT_OllamaConnector_Initialize (Step 7)

Follow 5 steps in the annotation. Critical: step 4 calls `GenAICommons.DeployedModel_SetMicroflow` with Microflow = `'OllamaConnector.ACT_ChatCompletions_WithHistory'` (exact string match required).

### Wire into AfterStartup

App Settings → Runtime → After Startup → call `OllamaConnector.ACT_OllamaConnector_Initialize`.

### Pages (Step 8)

Create `OllamaConfiguration_Overview` (DataGrid) and `OllamaConfiguration_Edit` (Edit form) manually.

## Testing

| Test | Command |
|---|---|
| T3: Ollama connectivity | `curl http://localhost:11434/api/chat -d '{"model":"llama3","messages":[{"role":"user","content":"Hi"}],"stream":false}'` |
| T4: Initialization | Run app, check log for "OllamaConnector initialized" |
| T5: Single turn | Test microflow with user message "What is the capital of France?" |
| T8: ConversationalUI | Wire OllamaDeployedModel to chat widget |
