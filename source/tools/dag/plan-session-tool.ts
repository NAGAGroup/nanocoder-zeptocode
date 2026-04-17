import * as fs from 'fs';
import * as path from 'path';
import {readDagV3, writeDagV3} from '@/tools/dag/engine/dag-io';
import {flattenTreeV3} from '@/tools/dag/engine/dag-tree';
import {now, readState, writeState} from '@/tools/dag/engine/state-io';
import {
	getDagStateDir,
	getGlobalPlanningDagPath,
	getPlanDir,
	readNodePrompt,
} from '@/tools/dag/path-utils';
import type {DagSessionState} from '@/tools/dag/types';
import type {NanocoderToolExport} from '@/types/core';
import {jsonSchema, tool} from '@/types/core';

const executePlanSession = async (
	_args: Record<string, never>,
): Promise<string> => {
	const stateDir = getDagStateDir();
	const statePath = path.join(stateDir, 'state.json');

	// IDEMPOTENCY CHECK: If state exists and is running/waiting_step, return early
	const existingState = readState(statePath);
	if (existingState) {
		if (
			existingState.status === 'running' ||
			existingState.status === 'waiting_step'
		) {
			return 'Planning session already active. Use recover_context to resume or exit_plan to abandon.';
		}
	}

	const planName = 'plan-session';
	const planDir = getPlanDir(planName);
	const destPlanPath = path.join(planDir, 'plan.jsonl');

	// Create plan directory
	fs.mkdirSync(planDir, {recursive: true});

	// Copy planning DAG template
	const globalPlanningDagPath = getGlobalPlanningDagPath();
	if (!fs.existsSync(globalPlanningDagPath)) {
		throw new Error(
			`Global planning DAG not found at ${globalPlanningDagPath}`,
		);
	}
	fs.copyFileSync(globalPlanningDagPath, destPlanPath);

	// Copy prompt files
	const promptsSrcDir = path.join(
		path.dirname(globalPlanningDagPath),
		'prompts',
	);
	const promptsDestDir = path.join(planDir, 'prompts');

	if (fs.existsSync(promptsSrcDir)) {
		fs.mkdirSync(promptsDestDir, {recursive: true});
		const promptFiles = fs.readdirSync(promptsSrcDir);
		for (const file of promptFiles) {
			const srcFile = path.join(promptsSrcDir, file);
			const destFile = path.join(promptsDestDir, file);
			if (fs.statSync(srcFile).isFile()) {
				fs.copyFileSync(srcFile, destFile);
			}
		}
	}

	// Read the copied DAG
	const {metadata, nodes} = readDagV3(destPlanPath);

	// Prepend prompts prefix to each node.prompt
	for (const node of nodes) {
		if (!node.prompt.includes('/')) {
			node.prompt = `.nanocoder/plans/${planName}/prompts/${node.prompt}`;
		}
	}

	// Write back the updated DAG
	writeDagV3(destPlanPath, metadata, nodes);

	// Flatten tree
	const nodeMap = flattenTreeV3(metadata, nodes);

	// Get entry node
	const entryNode = nodeMap[metadata.entry_node_id];
	if (!entryNode) {
		throw new Error(`Entry node "${metadata.entry_node_id}" not found in DAG`);
	}

	// Create state
	const state: DagSessionState = {
		dag_id: metadata.id,
		plan_path: destPlanPath,
		status: 'running',
		current_node: metadata.entry_node_id,
		todo_index: 0,
		started_at: now(),
		updated_at: now(),
		decisions: [],
		node_map: nodeMap,
		planning_session_id: planName,
	};

	// Write state
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
	return entryPrompt ?? 'Planning session has begun. Wait for your next step.';
};

export const planSessionTool: NanocoderToolExport = {
	name: 'plan_session',
	tool: tool({
		description:
			'Start a /plan-session planning session. Copies the global planning DAG locally and activates it.',
		inputSchema: jsonSchema<Record<string, never>>({
			type: 'object',
			properties: {},
		}),
		needsApproval: false,
		execute: async args => executePlanSession(args),
	}),
};
