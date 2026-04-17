import * as path from 'path';
import {now, readState, writeState} from '@/tools/dag/engine/state-io';
import {getDagStateDir} from '@/tools/dag/path-utils';
import type {NanocoderToolExport} from '@/types/core';
import {jsonSchema, tool} from '@/types/core';

const executeExitPlan = async (
	_args: Record<string, never>,
): Promise<string> => {
	const stateDir = getDagStateDir();
	const statePath = path.join(stateDir, 'state.json');
	const state = readState(statePath);

	if (!state) return 'No active DAG session found. Nothing to exit.';
	if (state.status === 'complete') {
		return `DAG session "${state.dag_id}" is already complete. Nothing to abandon.`;
	}
	if (state.status === 'abandoned') {
		return `DAG session "${state.dag_id}" is already abandoned. Call recover_context() to resume it.`;
	}

	state.status = 'abandoned';
	state.updated_at = now();
	writeState(statePath, state);

	return (
		`DAG session "${state.dag_id}" has been abandoned. ` +
		`State saved at node "${state.current_node}". ` +
		`Call recover_context() to resume from where you left off.`
	);
};

export const exitPlanTool: NanocoderToolExport = {
	name: 'exit_plan',
	tool: tool({
		description:
			"Abandon the current DAG session. Sets status to 'abandoned' and saves state. Use when a session needs to be exited due to a bug, user cancellation, or scope change.",
		inputSchema: jsonSchema<Record<string, never>>({
			type: 'object',
			properties: {},
		}),
		needsApproval: false,
		execute: async args => executeExitPlan(args),
	}),
};
