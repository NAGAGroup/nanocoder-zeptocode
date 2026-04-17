import * as fs from 'fs';
import * as path from 'path';
import {recompilePlan} from '@/tools/dag/engine/compiler';
import {now, writeState} from '@/tools/dag/engine/state-io';
import {getDagStateDir, readNodePrompt} from '@/tools/dag/path-utils';
import type {DagSessionState} from '@/tools/dag/types';
import type {NanocoderToolExport} from '@/types/core';
import {jsonSchema, tool} from '@/types/core';

const executeActivatePlan = async (args: {
	plan_name: string;
}): Promise<string> => {
	const {plan_name} = args;
	const worktree = process.cwd();

	const result = recompilePlan(plan_name, worktree);
	const {compiledPlanPath, metadata, nodeMap} = result;

	const entryNode = nodeMap[metadata.entry_node_id];
	if (!entryNode) {
		throw new Error(
			`Entry node "${metadata.entry_node_id}" not found in DAG "${plan_name}"`,
		);
	}

	const stateDir = getDagStateDir();
	const statePath = path.join(stateDir, 'state.json');

	const state: DagSessionState = {
		dag_id: metadata.id,
		plan_path: compiledPlanPath,
		plan_name: plan_name,
		status: 'running',
		current_node: metadata.entry_node_id,
		todo_index: 0,
		started_at: now(),
		updated_at: now(),
		decisions: [],
		node_map: nodeMap,
	};

	fs.mkdirSync(stateDir, {recursive: true});
	writeState(statePath, state);

	// Handle zero-enforcement entry node
	if (entryNode.enforcement.length === 0) {
		state.status =
			entryNode.children && entryNode.children.length > 0
				? 'waiting_step'
				: 'complete';
		writeState(statePath, state);
	}

	const entryPrompt = readNodePrompt(entryNode, state);
	return entryPrompt ?? 'Plan execution has begun. Wait for your next step.';
};

export const activatePlanTool: NanocoderToolExport = {
	name: 'activate_plan',
	tool: tool({
		description: 'Activate a project DAG produced by a planning session.',
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
		execute: async args => executeActivatePlan(args),
	}),
};
