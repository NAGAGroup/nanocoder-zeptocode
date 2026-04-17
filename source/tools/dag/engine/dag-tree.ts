import type {DagMetadataV3, DagNodeV3, FlatNode} from '../types';

// ─── Validation (retained for reference — no longer called at runtime) ────────

function _validateDagV3_unused(
	metadata: DagMetadataV3,
	nodes: DagNodeV3[],
): void {
	// Protected nodes are internal plumbing — never expose them in agent-facing error messages.
	const PROTECTED_IDS = new Set([
		'execution-kickoff',
		'plan-success',
		'plan-fail',
	]);
	const workNodes = nodes.filter(n => !PROTECTED_IDS.has(n.id));

	// Duplicate IDs
	const ids = new Set<string>();
	const duplicates: string[] = [];
	for (const node of nodes) {
		if (ids.has(node.id)) duplicates.push(node.id);
		else ids.add(node.id);
	}
	if (duplicates.length > 0) {
		throw new Error(`Duplicate node IDs in DAG: ${duplicates.join(', ')}`);
	}

	const nodeMap: Record<string, DagNodeV3> = {};
	for (const node of nodes) nodeMap[node.id] = node;

	// Check all child references exist (skip protected node references — they are internal plumbing)
	for (const node of workNodes) {
		for (const childId of node.children ?? []) {
			if (!PROTECTED_IDS.has(childId) && !nodeMap[childId]) {
				throw new Error(
					`Node "${node.id}" references child "${childId}" which does not exist`,
				);
			}
		}
	}

	// Entry point check — execution-kickoff must have exactly one work node child
	const kickoff = nodes.find(n => n.id === 'execution-kickoff');
	const effectiveEntryId = kickoff?.children?.[0];
	if (
		!effectiveEntryId ||
		PROTECTED_IDS.has(effectiveEntryId) ||
		!nodeMap[effectiveEntryId]
	) {
		throw new Error(
			`No entry point has been set. Call \`set_entry_point\` with the first work node to resolve.`,
		);
	}

	// Reachability check (BFS from effective entry, work nodes only)
	const reachable = new Set<string>();
	const queue = [effectiveEntryId];
	while (queue.length > 0) {
		const id = queue.shift()!;
		if (reachable.has(id)) continue;
		reachable.add(id);
		for (const childId of nodeMap[id]?.children ?? []) {
			if (!PROTECTED_IDS.has(childId) && !reachable.has(childId))
				queue.push(childId);
		}
	}
	const unreachableWork = workNodes.filter(n => !reachable.has(n.id));
	if (unreachableWork.length > 0) {
		throw new Error(
			`Unreachable nodes (no path from entry): ${unreachableWork.map(n => n.id).join(', ')}. ` +
				`Connect them via \`connect_nodes\` or remove them with \`delete_node\`.`,
		);
	}

	// Leaf node check — work node leaves that are neither wired to an exit point nor connected onward
	const allExits = new Set<string>();
	for (const n of workNodes) {
		for (const childId of n.children ?? []) {
			if (childId === 'plan-success' || childId === 'plan-fail')
				allExits.add(n.id);
		}
	}
	const unsetLeaves = workNodes.filter(
		n =>
			(!n.children ||
				n.children.filter(c => !PROTECTED_IDS.has(c)).length === 0) &&
			!allExits.has(n.id),
	);
	if (unsetLeaves.length > 0) {
		throw new Error(
			`The following leaf nodes are not connected or marked as exit points: ${unsetLeaves.map(n => n.id).join(', ')}. ` +
				`Connect them to another DAG node via \`connect_nodes\` or mark them as exit points via \`set_exit_point\`.`,
		);
	}

	// Branching limit: no work node may have more than 2 non-protected children
	const overBranched = workNodes.filter(
		n => (n.children ?? []).filter(c => !PROTECTED_IDS.has(c)).length > 2,
	);
	if (overBranched.length > 0) {
		const details = overBranched
			.map(n => {
				const visibleChildren = n.children!.filter(c => !PROTECTED_IDS.has(c));
				return `"${n.id}" has ${visibleChildren.length} children: [${visibleChildren.join(', ')}]`;
			})
			.join('; ');
		throw new Error(
			`Branching limit violated — nodes may have at most 2 children. ${details}. ` +
				`Decision gates and verify nodes must have exactly 2 children. ` +
				`Decompose wider branches into nested binary decisions.`,
		);
	}

	// Parallel work prevention — only branching types may have multiple children
	const BRANCHING_COMPONENTS = new Set([
		'verify-work-item',
		'decision-gate',
		'user-decision-gate',
	]);
	const illegalBranching = workNodes.filter(n => {
		const visibleChildren = (n.children ?? []).filter(
			c => !PROTECTED_IDS.has(c),
		);
		if (visibleChildren.length < 2) return false;
		return !n.component || !BRANCHING_COMPONENTS.has(n.component);
	});
	if (illegalBranching.length > 0) {
		const details = illegalBranching
			.map(n => {
				const visibleChildren = (n.children ?? []).filter(
					c => !PROTECTED_IDS.has(c),
				);
				return `"${n.id}" (${n.component ?? 'unknown type'}) has ${visibleChildren.length} children: [${visibleChildren.join(', ')}]`;
			})
			.join('; ');
		throw new Error(
			`Parallel work detected — only decision-gate, user-decision-gate, and verify-work-item may have multiple children. ${details}. ` +
				`Branches represent mutually exclusive routing paths, not parallel execution.`,
		);
	}

	// Cycle detection (DFS on work nodes only, skip protected)
	const visited = new Set<string>();
	const recStack = new Set<string>();
	function hasCycle(nodeId: string): boolean {
		if (PROTECTED_IDS.has(nodeId)) return false;
		if (recStack.has(nodeId)) return true;
		if (visited.has(nodeId)) return false;
		visited.add(nodeId);
		recStack.add(nodeId);
		for (const childId of nodeMap[nodeId]?.children ?? []) {
			if (!PROTECTED_IDS.has(childId) && hasCycle(childId)) return true;
		}
		recStack.delete(nodeId);
		return false;
	}
	if (hasCycle(effectiveEntryId)) {
		throw new Error('DAG contains a cycle (circular dependency detected)');
	}

	// Binary branching enforcement: verify, decision-gate, and user-decision-gate must have exactly 2 children
	const BINARY_COMPONENTS = new Set([
		'verify-work-item',
		'decision-gate',
		'user-decision-gate',
	]);
	const underBranched = workNodes.filter(n => {
		if (!n.component || !BINARY_COMPONENTS.has(n.component)) return false;
		const visibleChildren = (n.children ?? []).filter(
			c => !PROTECTED_IDS.has(c),
		);
		return visibleChildren.length !== 2;
	});
	if (underBranched.length > 0) {
		const details = underBranched
			.map(n => {
				const visibleChildren = (n.children ?? []).filter(
					c => !PROTECTED_IDS.has(c),
				);
				return `"${n.id}" (${n.component}) has ${visibleChildren.length} children — needs exactly 2`;
			})
			.join('; ');
		throw new Error(
			`Binary branching violated — verify, decision-gate, and user-decision-gate nodes must have exactly 2 children. ${details}.`,
		);
	}
}

// ─── Flatten ──────────────────────────────────────────────────────────────────

export function flattenTreeV3(
	metadata: DagMetadataV3,
	nodes: DagNodeV3[],
): Record<string, FlatNode> {
	const map: Record<string, FlatNode> = {};
	for (const node of nodes) {
		if (map[node.id]) {
			throw new Error(`DAG validation error: duplicate node id "${node.id}".`);
		}
		const flat: FlatNode = {
			id: node.id,
			prompt: node.prompt,
			enforcement: node.enforcement,
		};
		if (node.children && node.children.length > 0)
			flat.children = node.children;
		if (node.inject && Object.keys(node.inject).length > 0)
			flat.inject = node.inject;
		map[node.id] = flat;
	}
	return map;
}
