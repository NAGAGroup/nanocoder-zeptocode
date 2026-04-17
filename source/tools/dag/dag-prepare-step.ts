import type {LanguageModel, ModelMessage} from 'ai';
import {createPrepareStepHandler} from '@/ai-sdk-client/chat/streaming-handler';
import {getLogger} from '@/utils/logging';
import {computeActiveTools} from './enforce';
import {readState} from './engine/state-io';
import {getStatePath, migrateDagStateDirIfNeeded} from './path-utils';

export function createDagPrepareStepHandler(allToolNames: string[]) {
	const baseHandler = createPrepareStepHandler();
	const logger = getLogger();

	// Return function matches PrepareStepFunction signature
	return async (params: {
		// biome-ignore lint/suspicious/noExplicitAny: StepResult generic constraint, any is safe
		steps: any[];
		stepNumber: number;
		model: LanguageModel;
		messages: ModelMessage[];
		experimental_context: unknown;
	}) => {
		// Migrate PID-keyed state dir to session-keyed when sessionId becomes available
		await migrateDagStateDirIfNeeded();

		// Run base message filtering
		const base = baseHandler({messages: params.messages});

		const statePath = getStatePath();

		// Read current DAG state
		const state = readState(statePath);

		if (!state || state.status === 'complete' || state.status === 'abandoned') {
			return base;
		}

		const activeTools = computeActiveTools(state, allToolNames);

		logger.debug('DAG enforcement active', {
			currentNode: state.current_node,
			status: state.status,
			todoIndex: state.todo_index,
			activeToolCount: activeTools.length,
		});

		return {
			...base,
			activeTools: activeTools as unknown as string[],
		};
	};
}
