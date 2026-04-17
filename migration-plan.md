# Port PicoCode/ZeptoCode DAG orchestration to a Nanocoder fork

## Goal

Produce a working MVP fork of [Nanocoder](https://github.com/Nano-Collective/nanocoder) that hosts the existing PicoCode DAG orchestration system (currently implemented as an OpenCode plugin at [CodeAccelerate-PicoCode](https://github.com/NAGAGroup/CodeAccelerate-PicoCode)). The DAG engine, node library, phase expander, and planning/project DAG concepts must function end-to-end: planning sessions run, project plans compile, `next_step` advances nodes, branching works, prompts from the node library get injected at the right moments, and enforcement mechanically prevents the model from calling wrong-phase tools.

## Scope and philosophy

- MVP. Working end-to-end beats complete. Don't gold-plate.
- Use this as a cleanup opportunity on the OpenCode plugin code. A lot of cruft accumulated there (hook pipelines, `PluginDeps` threading, `setDagActiveThisTurn` flag, divergence detection, grepai lifecycle, etc.). Nanocoder's primitives make most of it unnecessary. Delete rather than port when possible.
- **Ignore compaction** for this port. Don't implement anything for it. It's a known gap that will be addressed later.
- Keep the user-visible phase-type interface (8 phase types) stable. Planning prompts, node library prompts, and TOML plan format should not change. The planner model's mental model stays identical.

## Architectural findings (verified)

### How Nanocoder gives you what you need

The three primitives the DAG needs are all available in Nanocoder:

1. **Add tools**: Entries in `source/tools/index.ts` → `allToolExports: NanocoderToolExport[]`. Shape is `{name, tool, formatter?, validator?, streamingFormatter?, readOnly?}` where `tool` is a Vercel AI SDK `tool({description, inputSchema, needsApproval, execute})`. Tool exports get fed to `ToolManager` which wraps them in a `ToolRegistry`.

2. **Block tools dynamically**: Vercel AI SDK exposes `prepareStep` — Nanocoder uses it at `source/ai-sdk-client/chat/streaming-handler.ts` (`createPrepareStepHandler()`). `prepareStep` runs before every model step in the agentic loop and can return `{activeTools: string[]}` to filter the tool set the model sees *for that step only*. **Blocked tools literally aren't in the schema the model sees** — no throwing required, no wasted context. This replaces the entire `tool.execute.before` enforcement pipeline in the OpenCode plugin.

3. **Inject prompts**: Two mechanisms:
   - **Tool return value** — goes back to the model as a tool-result message on the next turn. Fine for most cases (e.g., `next_step` returning the next node's prompt).
   - **Synthetic message injection** — `prepareStep` can also return a modified `messages` array, adding synthetic `user`-role or `system`-role messages. The nudge pattern at `source/hooks/chat-handler/conversation/conversation-loop.tsx:~620` shows them doing exactly this for empty-response recovery. Prefer this over tool-return when the injection needs to happen on a turn where no tool ran, or where a `user`-role message has better prompt priors than a `tool` result (relevant for Qwen-family models which weight these roles differently).

### Architecture decisions

- **Drop all OpenCode hooks.** Everything (`tool.execute.before`, `tool.execute.after`, `chat.params`, `experimental.session.compacting`) gets replaced by one composed `prepareStep` handler + tool execute() bodies. No `beforeHook`/`afterHook` pipelines, no `sessionHooks`, no `createSessionHooks`. Delete `modules/hooks/` entirely.
- **Drop `PluginDeps` threading.** Tools access what they need directly via module-level utilities (path resolution, state I/O). No more `deps.client`, `deps.resolveWorktree`, `deps.dagActiveThisTurn`, `deps.pluginCtx`.
- **The DAG engine, compiler, phase expander, enforcement utils, and node library are framework-agnostic** — they read/write JSONL and state files and manipulate graphs. Copy these across essentially unchanged: `dag_engine/compiler.ts`, `dag_engine/phase-validation.ts`, `dag_engine/enforcement-utils.ts`, `phase-expander.ts`, `dag-tree.ts`, `dag-io.ts`, `state-io.ts`, `path-utils.ts`, `types.ts`. The node library (markdown prompts) is a pure on-disk asset — copy as-is.

### Storage split (new in this port)

- **DAG definitions (in-worktree):** `./.nanocoder/plans/{plan_name}/` — project artifacts, checkable-in, survives across sessions. This mirrors the current `.opencode/session-plans/` layout.
- **DAG state (ephemeral):** `${getAppDataPath()}/nanocoder-dag-state/{key}/` — process- or session-scoped. Matches where Nanocoder stores its own session state.

### State key strategy (important)

Nanocoder's `currentSessionId` (in `useAppState.tsx:124`) starts as `null` and only becomes a real UUID after `useSessionAutosave` debounces a save, which may not happen before the first tool call of a fresh conversation. Strategy:

1. DAG state directory is keyed by **PID** when no sessionID is available (`nanocoder-dag-state/pid-{pid}/`).
2. When autosave later assigns a sessionID, rename the directory (`fs.rename` is atomic within a filesystem) to `nanocoder-dag-state/session-{uuid}/`. Do the check inside `prepareStep` so migration happens within one turn of autosave firing.
3. Register a shutdown handler via `getShutdownManager()` (pattern visible in `source/tools/tool-manager.ts:22`) that removes the directory on exit *only* if it's still PID-keyed. If it's sessionID-keyed, autosave is keeping it alive.
4. On startup, scan for orphaned `pid-*` directories and remove any whose PID is no longer running (check via `process.kill(pid, 0)` which throws `ESRCH` for dead PIDs).

This exactly mirrors Nanocoder's own session durability contract: no autosave → no persistence.

### Tools to migrate (~7)

From the current PicoCode plugin:

- `plan_session` — starts a planning session; copies globally-installed planning DAG, initializes state
- `activate_plan` — activates a project DAG from `create_plan`; initializes state
- `next_step` — advances the DAG state machine; handles branching, terminal exits, passthrough nodes
- `create_plan` — compiles a phase-level TOML plan into a node DAG JSONL
- `recover_context` — returns current node, todo progress, decisions, and the node's prompt
- `exit_plan` — abandons current DAG session (sets status=abandoned)
- `get_branch_options` — returns valid `next_step` branches at a branching node

Each translates to a `NanocoderToolExport`. The `args` schemas convert from `tool.schema.string()` (OpenCode Zod-like) to `jsonSchema<T>({...})` (Vercel AI SDK core tool). The execute bodies are largely unchanged but read state from module-level utilities rather than `deps`.

### Enforcement integration

Write a `computeActiveTools(state)` function that, given the DAG state, returns the allowlist of tool names for the current step:

- If no active DAG or status is `complete`/`abandoned`: return the full tool list (no filtering).
- If status is `running`: return `[current_enforcement_item, ...exempt_tools]`. If the current item is `optional:<tool>`, also include the next mandatory item so the model can skip.
- If status is `waiting_step`: return `['next_step', ...exempt_tools, ...any_remaining_optional_items]`.

Compose this into nanocoder's existing `prepareStep` by wrapping `createPrepareStepHandler()` so their message-filtering logic still runs:

```ts
// Sketch
const baseHandler = createPrepareStepHandler();
const composedHandler = (params) => {
  const base = baseHandler(params);
  const state = readDagState();
  if (!state || state.status === 'complete' || state.status === 'abandoned') return base;
  return {
    ...base,
    activeTools: computeActiveTools(state),
  };
};
```

### Cleanup opportunities to take

Since cleanup is welcome, consider doing these during the port:

- Flatten `modules/hooks/tool-before-hooks/` and `modules/hooks/tool-after-hooks/` — gone entirely.
- Delete `divergence-detection.ts` unless a minimal version is trivially needed for `recover_context`. The elaborate divergence detection and recovery suggestions can come back later; MVP doesn't need it.
- Delete `grepai-tools.ts` and `grepai-lifecycle.ts` unless qdrant integration is desired in the MVP (probably not — it's an OpenCode-ecosystem concern).
- Simplify `exemptTools` in `constants.ts` — Nanocoder doesn't have OpenCode's `skill`, `qdrant_*`, or `question` tools. The real exempt set is just `next_step`, `exit_plan`, `recover_context`, and possibly `ask_user` (Nanocoder's equivalent of `question`).
- Collapse `modules/tools/*-tools.ts` factory pattern into individual tool files under a new `source/tools/dag/` directory (matching Nanocoder's per-tool-file convention). No `createPlanningTools(deps)` factory — each tool is a standalone `NanocoderToolExport`.
- Remove `client.session.prompt` calls. The equivalent is `addToMessageQueue(<Component/>)` from `source/utils/message-queue.tsx` for UI display, or tool return value for model-visible injection.

## Unknowns — investigate, don't assume

These are the open questions where the answer will shape the implementation. Resolve each by reading Nanocoder source and testing behavior before committing to a design:

1. **SessionID access from tool execute()**. Vercel AI SDK tools receive `(args, options)` where `options` is the AI SDK tool call context — it does not carry a Nanocoder sessionID. Options to investigate:
   - A module-level accessor (`getCurrentSessionId()`) set by a React effect at mount, same pattern as `setGlobalMessageQueue` in `source/utils/message-queue.tsx`. Simplest.
   - Patch Nanocoder to thread sessionID through `prepareStep` params and have `prepareStep` write to a module-level current-session var on each step. Also fine.
   - Don't bother — state path resolver uses PID unless a sessionID file pointer is explicitly present (written by a React effect when `currentSessionId` changes).
   Pick one and commit to it; all three work.

2. **prepareStep patching strategy for a fork.** The current `createPrepareStepHandler()` is Nanocoder's own function. For a clean fork that can track upstream, wrap it rather than replace it. Determine the least-invasive patch point — probably modifying the `handleChat` caller in `source/ai-sdk-client/chat/chat-handler.ts:156-161` to compose a user-supplied handler with theirs, OR just editing `streaming-handler.ts` directly and accepting a merge conflict on upstream rebases.

3. **Tool registry mutation across provider/model switches.** `ToolManager` is constructed once in `App.tsx` (check). If switching providers or models rebuilds the tool registry, any closure-captured sessionID or state references in tool execute bodies will go stale. Verify by searching for `new ToolManager` and `ToolRegistry.fromToolExports` call sites. If it rebuilds, prefer module-level accessors over closures.

4. **Subagent integration.** Nanocoder has `source/subagents/`. Unknown whether it's compatible with PicoCode's delegation pattern (junior-dev, verify-work-item subagent, documentation-expert, etc.) or whether those need to be invoked as ordinary tool calls via `source/tools/agent-tool.tsx`. Read `source/subagents/` and `agent-tool.tsx` before deciding. Fallback: treat every subagent delegation as a prompt-level instruction that the executing model fulfills by calling nanocoder's native agent/task tool.

5. **Synthetic message injection semantics.** The nudge pattern in `conversation-loop.tsx` uses `setMessages` (React state) and re-enters the conversation loop. `prepareStep` returning a modified `messages` array is a different mechanism — verify that injected `user`-role messages persist into conversation history (and therefore into autosave) rather than being one-step-ephemeral. If they're ephemeral, you'll also need to push them into React state via a message queue similar to `setGlobalMessageQueue`.

6. **`needsApproval` interaction with DAG flow.** Tools marked `needsApproval: true` in Nanocoder require user confirmation before execution. This could stall the DAG mid-node. Unknown how approval flow interacts with `prepareStep` filtering. Probably safe for DAG tools to all be `needsApproval: false` since they're internal state-machine operations, but verify.

7. **Planning DAG naming collision.** Currently planning DAGs are named `plan-session-{sessionID}` and live in `.opencode/session-plans/`. With PID-or-sessionID keying, the naming rule needs to be stable across the rename. Decide whether to rename planning DAG directories too, or only the state directory. Simpler: planning DAG *state* lives under the state directory, planning DAG *definition* is copied under the plan directory with a stable name derived at creation time and never changed.

## Success criteria

- `plan_session` runs end-to-end in the fork: a new planning session starts, the planning DAG state initializes, `recover_context` returns the first node prompt.
- `next_step` advances through a multi-node planning DAG, including at least one branching node (via `get_branch_options`).
- `create_plan` compiles a hand-written TOML phase plan into a JSONL node DAG on disk.
- `activate_plan` loads the compiled DAG and runs at least through a full `implement-code` phase expansion — pre-work nodes, work node, verify node, and one triage→verify cycle.
- Enforcement actually blocks wrong-phase tool calls: attempting to call a non-exempt tool that isn't the current enforcement item results in the tool not being available to the model (not in `activeTools`), observable in logs.
- The DAG state directory is correctly PID-keyed during the first turn of a new conversation, renamed to sessionID-keyed when autosave fires, and removed on clean exit when still PID-keyed.
- Orphaned PID-keyed state directories from prior crashed runs are cleaned up on startup.

## Out of scope for this MVP

- Compaction handling / `recover_context` auto-injection on context loss.
- Divergence detection beyond the minimum needed for `recover_context` to report state.
- `skill`, `qdrant_*`, or any OpenCode-ecosystem-specific tool equivalents.
- Upstream contribution PRs — land the fork first, think about upstreaming after it works.
- Subagent implementation beyond verifying delegation can reach nanocoder's native agent mechanism.

## Deliverables

- A fork of `Nano-Collective/nanocoder` with the DAG system integrated as native tools.
- A short `PICOCODE.md` in the fork root documenting: how to author plans, how state storage works, what was added/changed vs. upstream, and the current status of each item in the Unknowns section (resolved → describe, unresolved → note).
- The fork builds (`pnpm run build`), tests pass (`pnpm run test:all`), and a manual smoke test following the success criteria above passes.
