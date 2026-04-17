// Module-level sessionId accessor — mirrors setGlobalMessageQueue pattern
// from source/utils/message-queue.tsx lines 23-40.
// Wired in App.tsx via useEffect in the implement-session-accessor phase.
let currentDagSessionId: string | null = null;

export function setCurrentDagSessionId(id: string | null): void {
	currentDagSessionId = id;
}

export function getCurrentDagSessionId(): string | null {
	return currentDagSessionId;
}
