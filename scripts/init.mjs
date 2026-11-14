import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cmsDir = path.join(rootDir, 'apps', 'cms');
const migrationsDir = path.join(cmsDir, 'src', 'migrations');

const EMPTY_MIGRATIONS_INDEX = `import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'

export const migrations: Array<{
  down: (args: MigrateDownArgs) => Promise<void>
  name: string
  up: (args: MigrateUpArgs) => Promise<void>
}> = []
`;

for (const envFile of [path.join(cmsDir, '.env'), path.join(rootDir, '.env')]) {
	if (fs.existsSync(envFile)) {
		try {
			process.loadEnvFile?.(envFile);
		} catch {
			// Ignore unreadable .env files
		}
	}
}

if (process.env.NODE_ENV === 'production') {
	console.error('Error: Refusing to run init when NODE_ENV=production.');
	process.exit(1);
}

function resolveConfiguredDbPath() {
	const rawUrl = process.env.DATABASE_URL;
	if (!rawUrl || !rawUrl.startsWith('file:')) return null;
	const [filePart] = rawUrl.slice('file:'.length).split('?');
	if (!filePart || filePart === ':memory:') return null;
	return path.isAbsolute(filePart) ? filePart : path.resolve(cmsDir, filePart);
}

function displayPath(target) {
	return path.relative(rootDir, target) || target;
}

const dirsToClear = [
	path.join(cmsDir, 'data'),
	path.join(cmsDir, 'media'),
	path.join(cmsDir, 'backups')
].filter((dir) => fs.existsSync(dir));

const configuredDb = resolveConfiguredDbPath();
const customDbFiles = [];
if (configuredDb && !configuredDb.startsWith(path.join(cmsDir, 'data') + path.sep)) {
	for (const candidate of [
		configuredDb,
		`${configuredDb}-wal`,
		`${configuredDb}-shm`,
		`${configuredDb}-journal`,
		path.join(path.dirname(configuredDb), '.payload-secret')
	]) {
		if (fs.existsSync(candidate)) customDbFiles.push(candidate);
	}
}

const migrationFiles = fs.existsSync(migrationsDir)
	? fs
			.readdirSync(migrationsDir, { withFileTypes: true })
			.filter((entry) => entry.isFile() && entry.name !== 'index.ts')
			.map((entry) => path.join(migrationsDir, entry.name))
	: [];

const currentIndex = fs.existsSync(path.join(migrationsDir, 'index.ts'))
	? fs.readFileSync(path.join(migrationsDir, 'index.ts'), 'utf8')
	: '';
const indexNeedsReset = currentIndex !== EMPTY_MIGRATIONS_INDEX;

if (
	dirsToClear.length === 0 &&
	customDbFiles.length === 0 &&
	migrationFiles.length === 0 &&
	!indexNeedsReset
) {
	console.log('Template is already clean.');
	process.exit(0);
}

console.log('The following local state and migrations will be deleted/reset:');
for (const target of [...dirsToClear, ...customDbFiles, ...migrationFiles]) {
	console.log(`  - ${displayPath(target)}`);
}
if (indexNeedsReset) {
	console.log(`  - ${displayPath(path.join(migrationsDir, 'index.ts'))} (reset to empty)`);
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
let confirmed = false;
try {
	const answer = await rl.question('Reset template for blank development? (y/N) ');
	const normalized = answer.trim().toLowerCase();
	confirmed = normalized === 'y' || normalized === 'yes';
} finally {
	rl.close();
}

if (!confirmed) {
	console.log('Aborted.');
	process.exit(0);
}

for (const dir of dirsToClear) {
	fs.rmSync(dir, { recursive: true, force: true });
}
for (const file of [...customDbFiles, ...migrationFiles]) {
	fs.rmSync(file, { force: true });
}

fs.mkdirSync(migrationsDir, { recursive: true });
fs.writeFileSync(path.join(migrationsDir, 'index.ts'), EMPTY_MIGRATIONS_INDEX);

console.log('✔ Template reset for blank development.');
console.log('Next: run "pnpm dev" to start fresh, and "pnpm migrate:create" before deploying.');
