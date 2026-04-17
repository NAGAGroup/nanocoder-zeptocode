import * as path from 'path';
import {now, readState, writeState} from '@/tools/dag/engine/state-io';
import {getDagStateDir, getPlanDir, readPrompt} from '@/tools/dag/path-utils';
import type {NanocoderToolExport} from '@/types/core';
import {jsonSchema, tool} from '@/types/core';

const executeRecoverContext = async (
	_args: Record<string, never>,
): Promise<string> => {
	const worktree = process.cwd();
	const stateDir = getDagStateDir();
	const statePath = path.join(stateDir, 'state.json');
	const state = readState(statePath);

	if (!state) return 'No active DAG session found.';

	// Resume abandoned session
	if (state.status === 'abandoned') {
		const node = state.node_map[state.current_node];
		const remaining = node ? node.enforcement.length - state.todo_index : 0;
		state.status = remaining === 0 ? 'waiting_step' : 'running';
		state.updated_at = now();
		writeState(statePath, state);
	}

	const currentNode = state.node_map[state.current_node];
	const sessionPath = getPlanDir(state.planning_session_id ?? state.dag_id);
	const promptText = currentNode
		? readPrompt(currentNode.prompt, worktree, sessionPath, {
				plan_name: state.plan_name,
				planning_session_id: state.planning_session_id,
				inject: currentNode.inject,
			})
		: '(prompt not found)';

	const todoProgress = currentNode
		? currentNode.enforcement
				.map((t, i) => `  ${i < state.todo_index ? '[x]' : '[ ]'} ${t}`)
				.join('\n')
		: '  (no enforcement items)';

	const decisionsLog =
		state.decisions.length > 0
			? state.decisions.map(d => `- [${d.node_id}] ${d.summary}`).join('\n')
			: 'None yet';

	let result = `DAG Session Recovery\n\n`;
	result += `DAG: ${state.dag_id}\n`;
	result += `Status: ${state.status}\n`;
	result += `Started: ${state.started_at}\n\n`;
	result += `Decisions Made:\n${decisionsLog}\n\n`;
	result += `Current Node: ${state.current_node}\n`;
	result += `Todo progress:\n${todoProgress}\n\n`;
	result += `Current Node Prompt:\n\n${promptText}\n`;

	if (currentNode?.children && currentNode.children.length > 1) {
		result += `\nPending Branch Choice: [${currentNode.children.join(', ')}]\n`;
	}

	return result;
};

export const recoverContextTool: NanocoderToolExport = {
	name: 'recover_context',
	tool: tool({
		description:
			'Recover DAG session context after autocompaction or context loss. Returns current node, completed work, and decisions made. Also detects and reports any divergence between session state and DAG structure.',
		inputSchema: jsonSchema<Record<string, never>>({
			type: 'object',
			properties: {},
		}),
		needsApproval: false,
		execute: async args => executeRecoverContext(args),
	}),
};
