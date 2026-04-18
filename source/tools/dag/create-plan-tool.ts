import * as fs from 'fs';
import * as path from 'path';
import {compilePlan} from '@/tools/dag/engine/compiler';
import {now, readState, writeState} from '@/tools/dag/engine/state-io';
import {getDagStateDir, getPlanDir} from '@/tools/dag/path-utils';
import type {NanocoderToolExport} from '@/types/core';
import {jsonSchema, tool} from '@/types/core';

// ─── create_plan ──────────────────────────────────────────────────────────

const executeCreatePlan = async (args: {
	plan_name: string;
	toml: string;
}): Promise<string> => {
	const {plan_name, toml} = args;
	const worktree = process.cwd();

	const result = compilePlan(plan_name, toml, worktree);
	return `Plan '${plan_name}' compiled successfully. ${result.phaseCount} phases compiled to ${result.nodeCount} execution nodes. Use present_plan_diagram to present to the user, then activate with /activate-plan ${plan_name}.`;
};

export const createPlanTool: NanocoderToolExport = {
	name: 'create_plan',
	tool: tool({
		description:
			'Compile a TOML phase plan into an executable DAG. Validates the plan, writes it to disk, and compiles it to a node graph ready for activation. Call this after the finalized plan has been reviewed and approved.',
		inputSchema: jsonSchema<{plan_name: string; toml: string}>({
			type: 'object',
			properties: {
				plan_name: {
					type: 'string',
					description: 'The plan name (set by choose_plan_name).',
				},
				toml: {
					type: 'string',
					description: 'The complete finalized plan in TOML format.',
				},
			},
			required: ['plan_name', 'toml'],
		}),
		needsApproval: false,
		execute: async args => executeCreatePlan(args),
	}),
};

// ─── choose_plan_name ─────────────────────────────────────────────────────

const executeChoosePlanName = async (args: {name: string}): Promise<string> => {
	const {name} = args;
	const stateDir = getDagStateDir();
	const statePath = path.join(stateDir, 'state.json');
	const state = readState(statePath);

	if (!state) {
		throw new Error(
			'No active DAG session. choose_plan_name must be called during an active planning session.',
		);
	}
	if (!name || name.trim().length === 0) {
		throw new Error('choose_plan_name: name must not be empty.');
	}

	// Deduplicate: if a directory with this name already exists, increment suffix
	let confirmedName = name.trim();
	let suffix = 2;
	while (fs.existsSync(getPlanDir(confirmedName))) {
		confirmedName = `${name.trim()}-${suffix}`;
		suffix++;
	}

	state.plan_name = confirmedName;
	state.updated_at = now();
	writeState(statePath, state);

	const dedupeNote =
		confirmedName !== name.trim()
			? ` (deduplicated from "${name.trim()}" — directory already existed)`
			: '';
	return `Plan name set to "${confirmedName}"${dedupeNote}. {{PLAN_NAME}} will be substituted in all subsequent planning prompts automatically.`;
};

export const choosePlanNameTool: NanocoderToolExport = {
	name: 'choose_plan_name',
	tool: tool({
		description:
			"Set the execution plan name for this planning session. Substitutes {{PLAN_NAME}} in all remaining node prompts in the current session's node map. Call this during the session-overview node after deciding on a plan name.",
		inputSchema: jsonSchema<{name: string}>({
			type: 'object',
			properties: {
				name: {
					type: 'string',
					description:
						"The name for the execution plan. Descriptive and human-memorable — this is what the user will type into /activate-plan. Lowercase, hyphens only, no spaces (e.g., 'add-auth-flow', 'fix-payment-bug').",
				},
			},
			required: ['name'],
		}),
		needsApproval: false,
		execute: async args => executeChoosePlanName(args),
	}),
};

// ─── present_plan_diagram ─────────────────────────────────────────────────

const executePresentPlanDiagram = async (args: {
	plan_name: string;
}): Promise<string> => {
	const {plan_name} = args;
	const tomlPath = path.join(getPlanDir(plan_name), 'phase-plan.toml');

	if (!fs.existsSync(tomlPath)) {
		throw new Error(
			`Plan '${plan_name}' not found. Create it first with create_plan.`,
		);
	}

	const toml = fs.readFileSync(tomlPath, 'utf-8');

	// Build simple text representation of the plan
	const lines = toml.split('\n');
	const phaseLines: string[] = [];
	for (const line of lines) {
		if (line.includes('id =') || line.includes('type =')) {
			phaseLines.push(line.trim());
		}
	}
	const ascii = 'Phase-based plan:\n' + phaseLines.join('\n');

	const diagramText = `Plan: ${plan_name}\n\n${ascii}`;
	return diagramText;
};

export const presentPlanDiagramTool: NanocoderToolExport = {
	name: 'present_plan_diagram',
	tool: tool({
		description:
			'Render the phase-based plan as an ASCII diagram and inject it into the conversation as a system message for the user to review. Use this after the plan is complete to present it to the user.',
		inputSchema: jsonSchema<{plan_name: string}>({
			type: 'object',
			properties: {
				plan_name: {
					type: 'string',
					description: 'The plan name.',
				},
			},
			required: ['plan_name'],
		}),
		needsApproval: false,
		execute: async args => executePresentPlanDiagram(args),
	}),
};

// ─── get_plan_following_guide ──────────────────────────────────────────────

const PLAN_FOLLOWING_GUIDE = `# Optimized Operational Plan: DAG Orchestration Executor

This plan defines the sequential, verifiable lifecycle for processing each node in the Directed Acyclic Graph (DAG) execution flow, ensuring strict adherence to the orchestration principles and memory persistence requirements.

## ⚙️ Global Constraints & Assumptions

*   **Assumption:** The provided Node Prompt is always the definitive instruction set for the current task.
*   **Assumption:** The DAG structure is trusted and sequential; no work ahead is permitted.
*   **Principle:** The agent is an Orchestrator, not a specialist. All specialized work must be delegated.
*   **Memory Requirement:** Context persistence relies exclusively on Qdrant (\`qdrant-find\` and \`qdrant-store\`).

## 🛣️ Milestones and Stages

### Stage 1: Context Initialization and Preflight Orientation
*   **Goal:** Orient the agent to the current node's purpose and retrieve all relevant historical context before action begins.
*   **Procedure:**
    1.  **Read Node:** Ingest the complete current Node Prompt.
    2.  **Preflight Generation:** Generate and output the required \`[preflight]\` TOML structure.
        *   \`node_goal\`: Restatement of the current node's objective.
        *   \`prior_context_retrieved\`: Summary of findings from Qdrant.
        *   \`approach\`: Detailed, ordered plan for executing the node's instructions.
    3.  **Context Retrieval:** Execute \`qdrant-find\`, using the Plan Name and targeted queries derived from the Node Prompt and previous execution summaries, to ensure context awareness.
    4.  **Context Review:** Internally process the retrieved findings to inform the execution phase.
*   **Input (I/O):** Current Node Prompt.
*   **Output (I/O):** Preflight TOML block; Retrieved Qdrant Context Data.
*   **Acceptance Criteria:** Successful output of the \`[preflight]\` structure AND successful return of context data from Qdrant.

### Stage 2: Execution, Task Completion, and Discovery
*   **Goal:** Execute the precise instructions of the current node, managing all sub-processes, delegating tasks, and handling execution errors.
*   **Procedure:**
    1.  **Instruction Adherence:** Execute the node's instructions strictly. Do not fill gaps or extend scope.
    2.  **Delegation Strategy:** If delegation is required, determine prescriptive vs. non-prescriptive prompting based on historical failure and goal clarity. Delegate the goal-driven prompt to the named subagent.
    3.  **Tool Handling:** If a tool is required:
        *   Check for \`[BLOCKED]\` error message. If received, immediately call the named required tool.
        *   If a tool fails, read the error message, diagnose the failure, correct the tool call parameters, and retry (do not give up).
    4.  **Context Loss Recovery:** If positional context is lost, immediately call \`recover_context\`, followed by targeted \`qdrant-find\` calls to re-establish working understanding.
    5.  **Finding Capture:** After any significant discovery, decision, or delegation outcome (regardless of task completion status), capture the finding as self-contained prose.
*   **Input (I/O):** Node Instructions + Retrieved Context.
*   **Output (I/O):** Task Execution Result / Subagent Response.
*   **Acceptance Criteria:** The specific task defined by the Node Prompt has been fully addressed or delegated, and all operational errors (Tool Failure, Blockage) have been resolved and overcome.

### Stage 3: Persistence and Transition
*   **Goal:** Durable storage of all findings and controlled transition to the next node.
*   **Procedure:**
    1.  **Store Findings:** For every self-contained finding captured in Stage 2, execute \`qdrant-store\` using the Plan Name as the Collection Name. (One call per finding).
    2.  **Transition:** Immediately call \`next_step\` to proceed to the subsequent node in the DAG.
    3.  **Verification:** Confirm the successful initiation of the transition command.
*   **Input (I/O):** Captured Findings; Execution Result.
*   **Output (I/O):** Qdrant Store Confirmation; \`next_step\` command.
*   **Acceptance Criteria:** All significant findings have been durably stored in Qdrant, and the system has successfully requested the next node via \`next_step\`.

## ⚠️ Risks, Checks, and Rollbacks

| Risk Scenario | Verification Check / Trigger | Rollback / Mitigation Strategy |
| :--- | :--- | :--- |
| **Scope Creep / Working Ahead** | Agent attempts to act on anticipated needs of a future node, or executes beyond the current node's instructions. | Immediately halt work. Re-read Node Prompt. Strictly limit actions to the current scope. Transition using \`next_step\`. |
| **Context Drift / Memory Loss** | Task execution fails due to missing constraints, or agent loses track of its position in the DAG. | Trigger Stage 2, Step 4 (Context Loss Recovery). Execute \`recover_context\` immediately. Re-establish state. |
| **Delegation Failure** | Subagent provides a vague or insufficient result that violates a critical constraint. | Do not accept the result. Re-examine the Node Prompt constraints. If failure is recurrent, adjust the prompt to be more prescriptive, per the Delegation Philosophy guidelines. |
| **Tool Failure/Misuse** | Tool call fails, or the agent attempts to call a tool before it has been unlocked. | **Failure:** Read error. Correct call parameters and retry (Stage 2). **Blocked:** Read \`[BLOCKED]\` message. Immediately call the required tool without explanation (Stage 2). |
| **Non-Persistence** | Findings are generated during execution but are not stored before the transition. | Intercept the transition to Stage 3. Force immediate execution of \`qdrant-store\` for all outstanding findings before calling \`next_step\`. |
`;

export const getPlanFollowingGuideTool: NanocoderToolExport = {
	name: 'get_plan_following_guide',
	tool: tool({
		description:
			'Load the plan-following guide — rules and protocols for executing a DAG plan node by node. Call this once at the start of any planning or execution session before calling plan_session or activate_plan.',
		inputSchema: jsonSchema<Record<string, never>>({
			type: 'object',
			properties: {},
		}),
		needsApproval: false,
		execute: async () => PLAN_FOLLOWING_GUIDE,
	}),
};

// ─── get_planning_schema ───────────────────────────────────────────────────

const PLANNING_SCHEMA = `## web-search
Researches external sources. Informs discussion and decision gates. This phase type does *not* satisfy pre-work web search. It is strictly for informing discussion and decisions.
\`\`\`toml
[[phases]]
id = <phase-id>           # unique descriptive identifier (required)
type = "web-search"       # phase type (required)
next = [<child-id>]       # next phase ids (required) -- use [] for leaf/exit phases
questions = ["...", ...]  # research questions (required)
\`\`\`

## user-discussion
Engages the user in open-ended discussion. Linear — no branching.
\`\`\`toml
[[phases]]
id = <phase-id>           # unique descriptive identifier (required)
type = "user-discussion"  # phase type (required)
next = [<child-id>]       # next phase ids (required) -- use [] for leaf/exit phases
topic = "..."             # discussion topic or goal (required)
\`\`\`

## user-decision-gate
Alternative to \`user-discussion\`. Use instead of \`user-discussion\` when branching is necessary.
\`\`\`toml
[[phases]]
id = <phase-id>                         # unique descriptive identifier (required)
type = "user-decision-gate"             # phase type (required)
next = [<branch-a>, <branch-b>, ...]    # branch phase ids (required) -- must have 2 or more
question = "..."                        # question to present to the user (required)
\`\`\`

## agentic-decision-gate
Executor decides between branches based on evidence.
\`\`\`toml
[[phases]]
id = <phase-id>                         # unique descriptive identifier (required)
type = "agentic-decision-gate"          # phase type (required)
next = [<branch-a>, <branch-b>, ...]    # branch phase ids (required) -- must have 2 or more
question = "..."                        # decision question for the executor to answer from evidence (required)
\`\`\`

## implement-code
Researches, implements, verifies, and retries a code goal. Junior-dev handles the full cycle — implementation, running builds/tests, and all triage — in a \`work → [triage] × 5\` chain. Failure after all retries exits the plan.

Provide comprehensive instructions for both work and verification. *Always* include references to pre-work steps in the \`*-instructions\` fields — this provides continuity between steps and gives junior-dev the context to perform its own web searches as it works.

This is especially relevant when working with external dependencies/resources. The instructions should include:

- external dependencies involved
- web searches junior-dev should perform as it works, in addition to the pre-work web research (never assume the orchestrating agent will relay this on its own)

\`\`\`toml
[[phases]]
id = <phase-id>                            # unique descriptive identifier (required)
type = "implement-code"                    # phase type (required)
next = [<child-id>]                        # next phase ids (required) -- use [] for leaf/exit phases
project-survey-topics = ["...", ...]       # codebase areas to survey as a high-level overview before work (optional)
web-search-questions = ["...", ...]        # work-related web research, e.g. user docs, APIs, etc. (optional) -- required if work involves external dependencies
deep-search-questions = ["...", ...]       # codebase search and analysis before work (optional)
pre-work-project-setup-instructions = ["...", ...]  # project setup steps to run before work (optional)
work-instructions = "..."                  # detailed instructions for completing the work (required) -- include references to pre-work steps, external deps, and web searches junior-dev should run
verification-instructions = "..."         # success criteria (required) -- what junior-dev must verify after implementing: compilation, test output, visual checks, API responses, etc.
commit = false                             # commit after successful verify (optional) -- default false
\`\`\`

## author-documentation
Delegates a documentation goal to documentation-expert. Single node, no retry loop. Use for writing, updating, or restructuring docs — not for any code changes.

\`\`\`toml
[[phases]]
id = <phase-id>                            # unique descriptive identifier (required)
type = "author-documentation"             # phase type (required)
next = [<child-id>]                        # next phase ids (required) -- use [] for leaf/exit phases
goal = "..."                               # documentation goal (required) -- what to write, update, or restructure
commit = false                             # commit after completion (optional) -- default false
\`\`\`

## write-notes
Documents findings, decisions, and context. Use as a checkpoint or leaf.
\`\`\`toml
[[phases]]
id = <phase-id>           # unique descriptive identifier (required)
type = "write-notes"      # phase type (required)
next = []                 # next phase ids (required) -- use [] for leaf/exit phases
context = "..."           # what to document (optional)
\`\`\`

## early-exit
A valid planned stopping point. Documents context and hands off to a future session.
\`\`\`toml
[[phases]]
id = <phase-id>           # unique descriptive identifier (required)
type = "early-exit"       # phase type (required)
next = []                 # always a leaf -- early-exit never continues
reason = "..."            # reason for stopping (optional)
\`\`\``;

export const getPlanningSchemaToolExport: NanocoderToolExport = {
	name: 'get_planning_schema',
	tool: tool({
		description:
			'Load the planning schema — phase types, field schemas, and naming conventions for writing executable TOML plans. Call this before drafting a plan with create_plan.',
		inputSchema: jsonSchema<Record<string, never>>({
			type: 'object',
			properties: {},
		}),
		needsApproval: false,
		execute: async () => PLANNING_SCHEMA,
	}),
};
