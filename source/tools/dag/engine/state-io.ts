import * as fs from 'fs';
import * as path from 'path';
import type {DagSessionState} from '../types';
import {allRemainingOptional, getToolName} from './enforcement-utils';

export function writeState(statePath: string, state: DagSessionState): void {
	fs.mkdirSync(path.dirname(statePath), {recursive: true});
	fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

export function readState(statePath: string): DagSessionState | null {
	if (!fs.existsSync(statePath)) return null;
	return JSON.parse(fs.readFileSync(statePath, 'utf-8')) as DagSessionState;
}

export function now(): string {
	return new Date().toISOString();
}

/**
 * Advance todo_index past the current enforcement item matching toolName,
 * then transition to waiting_step if all remaining items are optional or done.
 * Call this at the end of every tool execute() body that appears in an enforcement array.
 */
export function advanceEnforcement(statePath: string, toolName: string): void {
	const state = readState(statePath);
	if (!state || state.status !== 'running') return;

	const node = state.node_map[state.current_node];
	if (!node) return;

	const {enforcement} = node;
	const idx = state.todo_index;

	// Find the current item — must match the calling tool (bare name, ignoring optional: prefix)
	if (idx >= enforcement.length) return;
	const currentItem = enforcement[idx];
	if (getToolName(currentItem) !== toolName) return;

	// Advance past this item
	state.todo_index = idx + 1;
	state.updated_at = now();

	// If all remaining items are optional (or we've exhausted the list), move to waiting_step
	if (allRemainingOptional(enforcement, state.todo_index)) {
		state.status = 'waiting_step';
	}

	writeState(statePath, state);
}
