import {fileURLToPath} from 'node:url';
import * as path from 'path';

// Resolve asset root relative to this file's install location, not process.cwd().
// From dist/tools/dag/constants.js → up three levels → install root → assets/dag-engine/
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const DAG_ASSET_ROOT = path.resolve(
	__dirname,
	'..',
	'..',
	'..',
	'assets',
	'dag-engine',
);

// Tools that bypass DAG blocking regardless of current node's enforcement sequence.
export const exemptTools = [
	'ask_user',
	'qdrant-store',
	'qdrant-find',
	'recover_context',
	'next_step',
	'exit_plan',
];
