import * as path from 'path';
import {readDagV3} from '@/tools/dag/engine/dag-io';
import {allRemainingOptional} from '@/tools/dag/engine/enforcement-utils';
import {now, readState, writeState} from '@/tools/dag/engine/state-io';
import {getDagStateDir, readNodePrompt} from '@/tools/dag/path-utils';
import type {NanocoderToolExport} from '@/types/core';
import {jsonSchema, tool} from '@/types/core';

const executeNextStep = async (args: {next?: string}): Promise<string> => {
	const stateDir = getDagStateDir();
	const statePath = path.join(stateDir, 'state.json');
	const state = readState(statePath);

	if (!state) return 'No active DAG session.';
	if (state.status === 'complete')
		return `DAG session "${state.dag_id}" is already complete.`;

	const currentNode = state.node_map[state.current_node];

	// Enforcement check
	const canProceed =
		state.status === 'waiting_step' ||
		(currentNode
			? allRemainingOptional(currentNode.enforcement, state.todo_index)
			: true);

	if (!canProceed) {
		const remaining = currentNode
			? currentNode.enforcement.length - state.todo_index
			: 0;
		const nextExpected = currentNode
			? (currentNode.enforcement[state.todo_index] ?? 'none')
			: 'unknown';
		throw new Error(
			`Cannot call next_step — node "${state.current_node}" still has ${remaining} enforcement item(s) pending. ` +
				`Next expected tool: "${nextExpected}". Call "${nextExpected}" to continue, ` +
				`then call next_step when all enforcement items are complete.`,
		);
	}

	const node = state.node_map[state.current_node];
	if (!node) return `Current node "${state.current_node}" not found in DAG.`;

	const children = node.children ?? [];

	// Branch validation
	if (children.length > 1) {
		if (!args.next) {
			throw new Error(
				`[BRANCH REQUIRED] Node "${state.current_node}" has multiple children.\n` +
					`Call next_step with the next parameter. Valid options: [${children.join(', ')}].`,
			);
		}
		if (!children.includes(args.next)) {
			throw new Error(
				`Invalid branch "${args.next}". Valid options: [${children.join(', ')}]`,
			);
		}
	}

	// Terminal — end session
	if (children.length === 0) {
		state.status = 'complete';
		state.updated_at = now();
		writeState(statePath, state);

		const isPlanningSession = state.dag_id.startsWith('plan-session');
		if (isPlanningSession) {
			return (
				`Node "${node.id}" complete. DAG session "${state.dag_id}" finished.\n\n` +
				`PLANNING SESSION COMPLETE. Do NOT continue executing tasks. ` +
				`Present the final plan to the user by calling present_plan_diagram with the plan name, then ` +
				`present a summary of what was produced. ` +
				`If a project plan was written, tell the user they can activate it with /activate-plan {plan-name}.`
			);
		} else {
			return (
				`Node "${node.id}" complete. DAG session "${state.dag_id}" finished.\n\n` +
				`EXECUTION COMPLETE. Do NOT continue executing tasks. ` +
				`Present a summary to the user of what was accomplished, any deferred items, and known limitations.`
			);
		}
	}

	// Branching — record decision
	if (children.length > 1) {
		state.decisions.push({
			node_id: state.current_node,
			timestamp: now(),
			summary: `Chose branch "${args.next}"`,
		});
	}

	// Advance to next node
	const nextId = children.length === 1 ? children[0] : args.next!;
	const nextNode = state.node_map[nextId];
	if (!nextNode) throw new Error(`Next node "${nextId}" not found in DAG`);

	state.current_node = nextId;
	state.todo_index = 0;
	state.status = 'running';
	state.updated_at = now();
	writeState(statePath, state);

	// Handle zero-enforcement nodes (passthrough)
	if (nextNode.enforcement.length === 0) {
		const nextChildren = nextNode.children ?? [];
		state.status = nextChildren.length > 0 ? 'waiting_step' : 'complete';
		writeState(statePath, state);
	}

	// Build status message with next node's prompt
	const {metadata} = readDagV3(state.plan_path);
	const isFromEntryNode = node.id === metadata.entry_node_id;

	let result = '';
	if (!isFromEntryNode) result += `You have just completed "${node.id}". `;

	const nextNodePrompt = readNodePrompt(nextNode, state);
	if (nextNodePrompt) {
		result += nextNodePrompt;
	} else {
		result += `Please wait for your next task.`;
	}

	return result;
};

export const nextStepTool: NanocoderToolExport = {
	name: 'next_step',
	tool: tool({
		description:
			"Call this after completing a node's todos to advance to the next node. Required on every node. Pass { next } to choose a branch; omit for linear advance or session completion.",
		inputSchema: jsonSchema<{next?: string}>({
			type: 'object',
			properties: {
				next: {
					type: 'string',
					description:
						'The node ID of the branch to take (required for branching nodes, omit for linear advance).',
				},
			},
		}),
		needsApproval: false,
		execute: async args => executeNextStep(args),
	}),
};
