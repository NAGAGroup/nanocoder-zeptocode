import {access, readdir, rename, rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import * as fs from 'fs';
import * as path from 'path';
import {getAppDataPath} from '@/config/paths';
import {getCurrentDagSessionId} from '@/utils/dag-session-utils';
import {getShutdownManager} from '@/utils/shutdown';

// DAG Asset Structure:
// assets/dag-engine/planning/plan-session/plan.jsonl  — global planning DAG template
// assets/dag-engine/planning/plan-session/prompts/    — planning phase prompts
// assets/dag-engine/node-library/                     — component library (20 types)
//
// Runtime resolution: resolved relative to this file's location in dist/,
// so assets are found at the ZeptoCode install root regardless of process.cwd().
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// From dist/tools/dag/ → up three levels → install root → assets/dag-engine/
const DAG_ASSET_ROOT = path.resolve(
	__dirname,
	'..',
	'..',
	'..',
	'assets',
	'dag-engine',
);

function expandPath(p: string): string {
	if (p.startsWith('~/')) {
		const home = process.env.HOME || process.env.USERPROFILE || '';
		return path.join(home, p.slice(2));
	}
	return p;
}

export function readPrompt(
	promptPath: string,
	worktree: string,
	sessionPath?: string,
	vars?: {
		plan_name?: string;
		planning_session_id?: string;
		inject?: Record<string, string>;
	},
): string {
	const expanded = expandPath(promptPath);
	let content: string;
	if (path.isAbsolute(expanded)) {
		content = fs.readFileSync(expanded, 'utf-8');
	} else {
		content = fs.readFileSync(path.join(worktree, expanded), 'utf-8');
	}
	if (sessionPath) {
		content = content.replaceAll('{{SESSION_PATH}}', sessionPath);
		content = content.replaceAll(
			'{{SESSION_NAME}}',
			path.basename(sessionPath),
		);
	}
	if (vars?.plan_name) {
		content = content.replaceAll('{{PLAN_NAME}}', vars.plan_name);
	}
	if (vars?.planning_session_id) {
		content = content.replaceAll(
			'{{PLANNING_SESSION_ID}}',
			vars.planning_session_id,
		);
	}
	if (vars?.inject) {
		for (const [key, value] of Object.entries(vars.inject)) {
			content = content.replaceAll(`{{${key}}}`, value);
		}
	}
	return content;
}

export function getDagStateDir(): string {
	const sessionId = getCurrentDagSessionId();
	const base = path.join(getAppDataPath(), 'nanocoder-dag-state');
	if (sessionId) {
		return path.join(base, `session-${sessionId}`);
	}
	return path.join(base, `pid-${process.pid}`);
}

export function getStatePath(): string {
	return path.join(getDagStateDir(), 'state.json');
}

export async function migrateDagStateDirIfNeeded(): Promise<void> {
	const sessionId = getCurrentDagSessionId();
	if (!sessionId) return; // No session ID yet, nothing to migrate

	const base = path.join(getAppDataPath(), 'nanocoder-dag-state');
	const pidDir = path.join(base, `pid-${process.pid}`);
	const sessionDir = path.join(base, `session-${sessionId}`);

	// If already session-keyed, nothing to do
	try {
		await access(sessionDir);
		return; // Session dir already exists
	} catch {
		// Session dir doesn't exist yet — check if pid dir exists
	}

	try {
		await access(pidDir);
		// PID dir exists and session dir doesn't — rename atomically
		await rename(pidDir, sessionDir);
	} catch {
		// PID dir doesn't exist either — nothing to migrate
	}
}

function isPidAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch (err) {
		// ESRCH = no such process (dead), EPERM = no permission (alive)
		return (err as NodeJS.ErrnoException).code !== 'ESRCH';
	}
}

export async function cleanupOrphanedPidDirs(): Promise<void> {
	const base = path.join(getAppDataPath(), 'nanocoder-dag-state');

	let entries: string[];
	try {
		entries = await readdir(base);
	} catch {
		return; // Directory doesn't exist yet — nothing to clean
	}

	for (const entry of entries) {
		const match = entry.match(/^pid-(\d+)$/);
		if (!match) continue; // Not a PID-keyed directory

		const pid = parseInt(match[1], 10);
		if (pid === process.pid) continue; // Never remove our own directory

		if (!isPidAlive(pid)) {
			const dirPath = path.join(base, entry);
			try {
				await rm(dirPath, {recursive: true, force: true});
			} catch {
				// Ignore errors — best-effort cleanup
			}
		}
	}
}

export function registerDagStateCleanup(): void {
	getShutdownManager().register({
		name: 'dag-state-cleanup',
		priority: 50,
		handler: async () => {
			const sessionId = getCurrentDagSessionId();
			// Only remove if still PID-keyed — if session-keyed, autosave keeps it
			if (!sessionId) {
				const pidDir = path.join(
					getAppDataPath(),
					'nanocoder-dag-state',
					`pid-${process.pid}`,
				);
				try {
					await rm(pidDir, {recursive: true, force: true});
				} catch {
					// Ignore errors — best-effort cleanup
				}
			}
		},
	});
}

export function getPlanDir(planName: string): string {
	return path.join(process.cwd(), '.nanocoder', 'plans', planName);
}

export function getNodeLibraryDir(): string {
	return path.join(DAG_ASSET_ROOT, 'node-library');
}

export function getGlobalPlanningDagPath(): string {
	return path.join(DAG_ASSET_ROOT, 'planning', 'plan-session', 'plan.jsonl');
}

export function getGlobalPlanningPromptsDir(): string {
	return path.join(DAG_ASSET_ROOT, 'planning', 'plan-session', 'prompts');
}

/**
 * Read and return the prompt for a given DAG node, with all placeholders substituted.
 * Returns null if the node has no prompt or the file cannot be read.
 */
export function readNodePrompt(
	node: {prompt?: string; inject?: Record<string, string>},
	state: {plan_name?: string; planning_session_id?: string; dag_id?: string},
): string | null {
	if (!node.prompt) return null;
	try {
		const sessionPath = getPlanDir(
			state.planning_session_id ?? state.dag_id ?? 'plan-session',
		);
		return readPrompt(node.prompt, process.cwd(), sessionPath, {
			plan_name: state.plan_name,
			planning_session_id: state.planning_session_id,
			inject: node.inject,
		});
	} catch {
		return null;
	}
}
