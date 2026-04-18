/**
 * DAG prompt injection queue.
 *
 * DAG tools (next_step, plan_session, activate_plan) call enqueueDagPrompt()
 * with the node's prompt text. The conversation loop drains this queue and
 * injects the prompt as a user-role message before the next LLM turn, which
 * gives it the same priority as a real user message rather than a tool result.
 */

let pendingPrompt: string | null = null;

export function enqueueDagPrompt(prompt: string): void {
	pendingPrompt = prompt;
}

export function drainDagPrompt(): string | null {
	const p = pendingPrompt;
	pendingPrompt = null;
	return p;
}
