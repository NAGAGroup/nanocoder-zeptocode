import {exemptTools} from './constants';
import {getToolName, isOptional} from './engine/enforcement-utils';
import type {DagSessionState} from './types';

export function computeActiveTools(
	state: DagSessionState | null,
	allToolNames: string[],
): string[] {
	// No DAG or terminal states: no filtering
	if (!state || state.status === 'complete' || state.status === 'abandoned') {
		return allToolNames;
	}

	if (state.status === 'waiting_step') {
		// Only next_step + exempt tools + any remaining optional items
		const currentNode = state.node_map[state.current_node];
		const remainingOptional: string[] = [];
		if (currentNode) {
			for (let i = state.todo_index; i < currentNode.enforcement.length; i++) {
				const item = currentNode.enforcement[i];
				if (isOptional(item)) {
					remainingOptional.push(getToolName(item));
				}
			}
		}
		// next_step must be first to make it the expected enforcement item
		const allowed = new Set([
			'next_step',
			...exemptTools,
			...remainingOptional,
		]);
		return allToolNames.filter(t => allowed.has(t));
	}

	if (state.status === 'running') {
		const currentNode = state.node_map[state.current_node];
		if (!currentNode) return allToolNames;

		const currentItem = currentNode.enforcement[state.todo_index];
		if (currentItem === undefined) return allToolNames;

		const allowed = new Set(exemptTools);

		if (isOptional(currentItem)) {
			// Optional item: allow the optional tool AND the next mandatory item
			allowed.add(getToolName(currentItem));
			// Find next mandatory
			for (
				let i = state.todo_index + 1;
				i < currentNode.enforcement.length;
				i++
			) {
				const next = currentNode.enforcement[i];
				if (!isOptional(next)) {
					allowed.add(getToolName(next));
					break;
				}
				// If all remaining are optional, add them all
				allowed.add(getToolName(next));
			}
		} else {
			// Mandatory item: allow only this tool
			allowed.add(getToolName(currentItem));
		}

		return allToolNames.filter(t => allowed.has(t));
	}

	return allToolNames;
}
