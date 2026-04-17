# PICOCODE: DAG Orchestration System

This is a fork of [Nanocoder](https://github.com/Nano-Collective/nanocoder) that integrates the PicoCode/ZeptoCode DAG orchestration system (originally implemented as an OpenCode plugin). The system enables structured, multi-phase project planning and execution with enforcement-driven tool blocking, branching control flow, and semantic prompts injected at execution time.

**Current Status:** MVP complete. Build and test suite pass (`pnpm run build` and `pnpm run test:all` both exit 0).

---

## How to Author Plans

Plans describe projects as DAGs of phases. Users create plans in two ways:

1. **Via planning session** — Call `plan_session` to start an interactive planning DAG. The model walks through research, drafts a TOML plan, and calls `create_plan` to compile it.
2. **Direct TOML authoring** — Write a `.nanocoder/plans/{plan-name}/` directory with a `plan.jsonl` file (compiled DAG) and optional `prompts/` subdirectory.

### The 8 Phase Types

Plans use TOML syntax with these phase types:

- **`web-search`** — Research external sources to inform decisions and discussions
- **`user-discussion`** — Unstructured conversation with the user (e.g., brainstorming)
- **`user-decision-gate`** — Branch point requiring user preference (exactly 2 children)
- **`agentic-decision-gate`** — Branch point requiring model decision (exactly 2 children)
- **`implement-code`** — Software development task, delegated to a work-item subagent
- **`author-documentation`** — Documentation task, delegated to a documentation-expert subagent
- **`write-notes`** — Checkpoint: store findings, decisions, and context to semantic notes
- **`early-exit`** — Terminal exit when a task is complete, blocked, or needs to pivot

### TOML Format

Each phase is a `[[phases]]` block with required fields:

```toml
[[phases]]
id = "1a-planning"           # unique descriptive ID
type = "web-search"           # phase type (required)
next = ["1b-decide"]          # list of child phase IDs; [] for terminal
# Additional fields depend on phase type
questions = ["What is X?"]    # web-search: research questions
```

**Hard rules:**
1. Every plan has exactly one entry point (a phase not referenced in any other phase's `next` field).
2. Every phase must define `next`. Use `next = []` for leaf/exit phases.
3. Only `agentic-decision-gate` and `user-decision-gate` may have multiple entries in `next`.

### Node Library Components

The node library provides specialized execution nodes and prompts for each phase type. Located at:

```
assets/dag-engine/node-library/{component-type}/
├── prompt.md         # Prompt injected at node execution
└── node-spec.json    # Metadata (component type, enforcement rules)
```

**Key component types:**
- `context-scout`, `external-scout` — research nodes
- `junior-dev-work-item`, `documentation-expert-work-item` — work delegation
- `verify-work-item` — branching verification step
- `user-discussion`, `user-decision-gate`, `decision-gate` — interaction
- `write-notes` — semantic checkpoint
- `commit`, `project-setup`, `autonomous-work` — special actions

Reference `assets/dag-engine/node-library/CATALOGUE.md` for full descriptions.

### Planning Session Workflow

1. **`plan_session`** — Initializes the planning DAG (6 nodes). Model:
   - Calls `choose_plan_name` to name the plan
   - Researches via `external-scout` node
   - Drafts plan in TOML format
   - Calls `create_plan` to compile

2. **`create_plan`** — Compiles TOML to executable JSONL node DAG. Validates:
   - Single entry point
   - All phases have `next` field
   - Branching only at gates
   - External dependency research in `implement-code` phases

3. **`activate_plan`** — Activates a compiled plan from `.nanocoder/plans/{name}/plan.jsonl`. Initializes state and runs first node.

4. **`present_plan_diagram`** — Displays the plan as an ASCII DAG diagram to the user.

---

## State Storage Architecture

DAG state is split between two locations:

### DAG Definitions (Worktree-Relative, Persistent)

Located in `.nanocoder/plans/{plan-name}/`:

```
.nanocoder/plans/my-feature/
├── plan.jsonl              # Compiled node DAG (JSONL lines)
├── prompts/                # Custom prompts (optional)
│   └── custom-prompt.md
```

- **Storage:** User's project worktree (checkable-in)
- **Lifecycle:** Survives across sessions and tool invocations
- **Naming:** Stable — never renamed after creation

### DAG State (App-Data Directory, Ephemeral)

Located in `${getAppDataPath()}/nanocoder-dag-state/{key}/`:

```
~/.local/share/nanocoder/nanocoder-dag-state/
├── pid-{pid}/              # Early session (before autosave)
│   └── state.json
└── session-{uuid}/         # Persistent session (after autosave)
    └── state.json
```

- **Storage:** Platform-specific app data:
  - **Linux:** `~/.local/share/nanocoder`
  - **macOS:** `~/Library/Application Support/nanocoder`
  - **Windows:** `%APPDATA%/nanocoder`
  - **Override:** `NANOCODER_DATA_DIR` env var

### PID-to-SessionID Migration

**Why two keys?** Nanocoder's `currentSessionId` only becomes a UUID after autosave (~30s after first message). Until then, DAG tools need a key. Solution:

1. DAG state begins in `pid-{process.pid}/` (ephemeral)
2. When `useSessionAutosave` fires and assigns a sessionID, `migrateDagStateDirIfNeeded()` (called every turn in `prepareStep`) atomically renames the directory to `session-{uuid}/`
3. On clean exit, a `ShutdownManager` handler removes the directory *only* if still PID-keyed
4. On startup, `cleanupOrphanedPidDirs()` removes any `pid-*` directories whose process no longer exists

This exactly mirrors Nanocoder's session durability contract: no autosave → no persistence.

---

## What Was Added vs. Upstream Nanocoder

### New Directories

- **`source/tools/dag/`** — All DAG tooling (engine, tools, utilities)
  - `engine/` — Framework-agnostic DAG engine (compiler, I/O, enforcement, tree traversal)
  - `{tool-name}-tool.ts` — Individual tool exports
  - `types.ts`, `constants.ts`, `path-utils.ts`, `enforce.ts` — Core utilities
- **`assets/dag-engine/`** — Stable DAG assets
  - `planning/plan-session/` — Global planning DAG template (6 nodes) + prompts
  - `node-library/` — 20 component type directories (prompt.md + node-spec.json each)

### Modified Files

- **`source/tools/index.ts`** — Added `...dagToolExports` to `allToolExports`
- **`source/hooks/useAppInitialization.tsx`** — Calls `cleanupOrphanedPidDirs()` and `registerDagStateCleanup()` on startup
- **`source/app/App.tsx`** — Syncs `currentSessionId` to `setCurrentDagSessionId()` via `useEffect`
- **`source/ai-sdk-client/chat/chat-handler.ts`** — Line ~10: imports and calls `createDagPrepareStepHandler(allToolNames)` instead of bare `createPrepareStepHandler()`

### New Utility Module

- **`source/utils/dag-session-utils.ts`** — Module-level accessor: `setCurrentDagSessionId(id)` and `getCurrentDagSessionId()` (mirrors `setGlobalMessageQueue` pattern for sessionID access from tool `execute()` bodies)

### Intentionally NOT Ported

- **OpenCode hooks pipeline** — `tool.execute.before/after`, `chat.params`, `experimental.session.compacting` replaced by `prepareStep` composition
- **PluginDeps threading** — Replaced by module-level accessors (`getCurrentDagSessionId()`, `getDagStateDir()`) and `process.cwd()`
- **Divergence detection** — `divergence-detection.ts` not ported; `recover_context` returns simplified state report (MVP gap)
- **grepai/qdrant ecosystem** — OpenCode-specific, not ported
- **Subagent definitions** — No custom definitions (junior-dev, documentation-expert, etc.); prompt-level delegation only
- **Compaction handling** — Not implemented (known gap for future work)

---

## The 9 DAG Tools

All registered in `source/tools/dag/index.ts`:

| Tool | Description | When to Call |
|------|-------------|--------------|
| `plan_session` | Start a planning session | User wants guided planning |
| `activate_plan` | Activate a compiled project DAG | After `create_plan` or to resume a saved plan |
| `next_step` | Advance to the next DAG node | When current node is complete |
| `get_branch_options` | Get available branches at a branching node | Model needs to see choices before calling `next_step` with a branch |
| `recover_context` | Recover DAG state after context loss | Session crashed; model needs the current prompt again |
| `exit_plan` | Abandon the current DAG session | User wants to stop execution |
| `create_plan` | Compile a TOML phase plan into an executable DAG | After planning session finalizes a TOML plan |
| `choose_plan_name` | Set the plan name during a planning session | First step of `plan_session` workflow |
| `present_plan_diagram` | Display the plan as an ASCII diagram | After `create_plan` to show user the structure |

All have `needsApproval: false` (no stalling).

---

## Unknown Resolution Status

Migration-plan.md documented 7 architectural unknowns. All are resolved:

### 1. SessionID Access from Tool `execute()`

**Unknown:** Vercel AI SDK tools receive `(args, options)` with no Nanocoder sessionID. How to access it?

**Decision:** Module-level accessor pattern, mirroring `setGlobalMessageQueue` in `source/utils/message-queue.tsx`.

**Implementation:**
- `source/utils/dag-session-utils.ts` exports `setCurrentDagSessionId(id)` and `getCurrentDagSessionId()`
- `App.tsx` calls `setCurrentDagSessionId(appState.currentSessionId)` in a `useEffect`
- All tool `execute()` bodies call `getCurrentDagSessionId()` dynamically (never closures, since ToolManager rebuilds on model switch)

**Status:** ✓ Resolved

### 2. `prepareStep` Patching Strategy

**Unknown:** How to patch `createPrepareStepHandler()` while keeping the fork cleanly mergeable with upstream?

**Decision:** Compose at the call site, not in `streaming-handler.ts`.

**Implementation:**
- `source/tools/dag/dag-prepare-step.ts` exports `createDagPrepareStepHandler(allToolNames)`
- Wraps base handler, runs base message filtering, adds DAG enforcement filtering
- `chat-handler.ts` line ~10 imports and calls `createDagPrepareStepHandler(allToolNames)` instead of bare `createPrepareStepHandler()`
- Only one line changed in `chat-handler.ts` → clean fork diff for upstream rebases

**Status:** ✓ Resolved

### 3. Tool Registry Mutation Across Provider/Model Switches

**Unknown:** If ToolManager rebuilds on model/provider change, closure-captured sessionIDs go stale. Use module-level accessors?

**Decision:** Verified that ToolManager DOES rebuild when model/provider changes (confirmed in `useAppInitialization.tsx` dependencies). All DAG tool `execute()` bodies use dynamic module-level accessor calls rather than closures.

**Status:** ✓ Resolved

### 4. Subagent Integration

**Unknown:** Can Nanocoder's subagent system (explore.md, reviewer.md) work with PicoCode's delegation pattern (junior-dev, documentation-expert)?

**Decision:** MVP uses prompt-level delegation. DAG node prompts instruct the model to call Nanocoder's native `agent` tool with the component type and task. No custom subagent definitions added.

**Status:** ✓ Resolved (MVP-scoped)

**Future:** Custom `junior-dev`, `documentation-expert`, etc. subagent definitions can be added post-MVP.

### 5. Synthetic Message Injection Semantics

**Unknown:** Are `prepareStep`-returned synthetic messages ephemeral (one-turn) or persisted to state/autosave?

**Decision:** `prepareStep`-returned messages are ephemeral. Tool return values are the primary prompt injection mechanism for DAG nodes.

**Status:** ✓ Resolved

### 6. `needsApproval` Interaction with DAG Flow

**Unknown:** If tools require approval before execution, could this stall the DAG mid-node?

**Decision:** All 9 DAG tools have `needsApproval: false`. No stalling risk.

**Status:** ✓ Resolved

### 7. Planning DAG Naming Collision

**Unknown:** Planning DAG definitions move to `.nanocoder/plans/`. When state renames from PID to sessionID, do definition directories rename too?

**Decision:** Stable definition names. Planning DAG copies to `.nanocoder/plans/plan-session/` with a fixed name. Only the state directory key migrates (PID → sessionID).

**Implementation:**
- `plan_session` copies global planning template to `.nanocoder/plans/plan-session/plan.jsonl`
- `create_plan` writes user plans to `.nanocoder/plans/{user-chosen-name}/plan.jsonl`
- State directory renames from `pid-{pid}` to `session-{uuid}` atomically

**Status:** ✓ Resolved

---

## Current Status and Known Limitations

### What Works End-to-End

- Planning sessions run and advance through all 6 planning DAG nodes
- `create_plan` compiles TOML plans to executable JSONL node DAGs
- `activate_plan` loads project plans and runs first node
- `next_step` advances the DAG, including branching via `get_branch_options`
- Enforcement mechanically blocks wrong-phase tool calls (not in `activeTools` schema)
- PID-keyed state directories migrate to sessionID-keyed after autosave fires
- Orphaned PID directories cleaned up on startup
- State removed on clean exit if still PID-keyed

### Known Limitations (MVP Gaps)

1. **Compaction handling not implemented** — `recover_context` returns a simplified state report without context compaction or auto-injection on token loss. Flagged for future work.

2. **Subagent MVP status** — Only prompt-level delegation currently. Custom subagent types (junior-dev, documentation-expert, context-insurgent) are not yet defined in Nanocoder. Fallback: model calls `agent` tool with instructions. Post-MVP: add subagent definitions in `source/subagents/built-in/`.

3. **Divergence detection minimal** — `recover_context` does not detect execution divergence. Simple state report only. Full divergence analysis flagged for future work.

4. **Build and tests pass** — `pnpm run build` and `pnpm run test:all` both exit 0. No known breaking changes to Nanocoder core functionality.

---

## For Maintainers and Forkers

### Key File Organization

- **DAG tools:** `source/tools/dag/{plan-session,activate-plan,next-step,...}-tool.ts`
- **DAG engine:** `source/tools/dag/engine/{compiler,dag-io,dag-tree,state-io,phase-validation,enforcement-utils}.ts`
- **Enforcement:** `source/tools/dag/enforce.ts` (computes `activeTools` via `computeActiveTools()`)
- **State paths:** `source/tools/dag/path-utils.ts` (DAG asset root, state directory migration, cleanup)
- **Integration:** `source/tools/dag/dag-prepare-step.ts` (wraps base `prepareStep` handler)

### Testing DAG Features

```bash
# Build and run tests
pnpm run build
pnpm run test:all

# Manual smoke test: start planning session
pnpm run start
# Type: /plan-session
# Follow prompts through planning DAG
# Call create_plan with a test TOML
# Call activate_plan to run the compiled DAG
```

### Debugging State

State files live in:

```
~/.local/share/nanocoder/nanocoder-dag-state/pid-{pid}/state.json   # Early sessions
~/.local/share/nanocoder/nanocoder-dag-state/session-{uuid}/state.json  # Persistent
```

Readable JSON structure: `DagSessionState` from `source/tools/dag/types.ts`.

### Rebasing Against Upstream

- Fork tracks only one file in `streaming-handler.ts` (no modifications)
- One-line change in `chat-handler.ts` (import and call `createDagPrepareStepHandler`)
- No hooks pipeline or PluginDeps threading to untangle
- New `source/tools/dag/` directory is entirely independent

For upstream rebases, monitor:
- Changes to `createPrepareStepHandler()` signature
- Changes to `ToolManager` or tool registry construction
- Changes to `useAppInitialization` or shutdown handling

---

## References

- **Migration Plan:** [migration-plan.md](migration-plan.md) — Full architectural rationale and decision log
- **Node Library:** [assets/dag-engine/node-library/CATALOGUE.md](assets/dag-engine/node-library/CATALOGUE.md) — Component type reference
- **Type Definitions:** [source/tools/dag/types.ts](source/tools/dag/types.ts) — `PhaseType`, `DagSessionState`, `DagNodeV3`
- **Planning Prompts:** [assets/dag-engine/planning/plan-session/prompts/](assets/dag-engine/planning/plan-session/prompts/) — Planning DAG node prompts
