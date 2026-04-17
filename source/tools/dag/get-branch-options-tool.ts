import * as path from 'path';
import {readState} from '@/tools/dag/engine/state-io';
import {getDagStateDir} from '@/tools/dag/path-utils';
import type {NanocoderToolExport} from '@/types/core';
import {jsonSchema, tool} from '@/types/core';

const executeGetBranchOptions = async (
	_args: Record<string, never>,
): Promise<string> => {
	const stateDir = getDagStateDir();
	const statePath = path.join(stateDir, 'state.json');
	const state = readState(statePath);

	if (!state) return 'No active DAG session.';

	const node = state.node_map[state.current_node];
	if (!node) return `Current node "${state.current_node}" not found in DAG.`;

	const children = node.children ?? [];
	if (children.length !== 2) {
		return `Node "${state.current_node}" is not a branching node — it has ${children.length} child(ren).`;
	}

	return `Branch options for next_step: [${children.join(', ')}]`;
};

export const getBranchOptionsTool: NanocoderToolExport = {
	name: 'get_branch_options',
	tool: tool({
		description:
			'Returns the branch phase options available for next_step at the current branching node. Call this before making a routing decision to know the valid options.',
		inputSchema: jsonSchema<Record<string, never>>({
			type: 'object',
			properties: {},
		}),
		needsApproval: false,
		execute: async args => executeGetBranchOptions(args),
	}),
};
