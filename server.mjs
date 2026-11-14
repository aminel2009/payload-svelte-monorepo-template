import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const cmsDir = path.join(rootDir, 'apps', 'cms');
const webDir = path.join(rootDir, 'apps', 'web');

const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

if (!isDev && !process.env.NODE_ENV) {
	process.env.NODE_ENV = 'production';
}
process.env.NODE_OPTIONS ||= '--no-deprecation';

for (const envFile of [path.join(cmsDir, '.env'), path.join(rootDir, '.env')]) {
	if (fs.existsSync(envFile)) {
		try {
			process.loadEnvFile?.(envFile);
		} catch {
			// .env files are optional in container/PaaS environments
		}
	}
}

const port = Number(process.env.PORT || 3000);
const host = process.env.HOSTNAME || undefined;
process.env.PORT = String(port);

// Resolve relative SQLite and media paths against apps/cms/ so dev, start, and CLI scripts
// (pnpm migrate, pnpm db:check) always use the exact same database and media directory.
function resolveCmsPaths() {
	let dbFilePath = null;
	const rawDbUrl = process.env.DATABASE_URL || 'file:./data/payload.db';
	if (rawDbUrl.startsWith('file:')) {
		const withoutPrefix = rawDbUrl.slice('file:'.length);
		const [filePart, queryPart] = withoutPrefix.split('?');
		if (filePart && filePart !== ':memory:') {
			dbFilePath = path.isAbsolute(filePart) ? filePart : path.resolve(cmsDir, filePart);
			fs.mkdirSync(path.dirname(dbFilePath), { recursive: true });
			process.env.DATABASE_URL = `file:${dbFilePath}${queryPart ? `?${queryPart}` : ''}`;
		}
	}
	if (!process.env.MEDIA_DIR) {
		process.env.MEDIA_DIR = path.join(cmsDir, 'media');
	} else if (!path.isAbsolute(process.env.MEDIA_DIR)) {
		process.env.MEDIA_DIR = path.resolve(cmsDir, process.env.MEDIA_DIR);
	}
	return dbFilePath;
}

function ensurePayloadSecret(dbFilePath) {
	const configured = process.env.PAYLOAD_SECRET?.trim();
	if (configured && configured !== 'YOUR_SECRET_HERE') {
		return;
	}

	if (!dbFilePath) {
		process.env.PAYLOAD_SECRET = crypto.randomBytes(32).toString('hex');
		return;
	}

	const secretPath = path.join(path.dirname(dbFilePath), '.payload-secret');
	if (fs.existsSync(secretPath)) {
		const existing = fs.readFileSync(secretPath, 'utf8').trim();
		if (existing) {
			process.env.PAYLOAD_SECRET = existing;
			return;
		}
	}

	const generated = crypto.randomBytes(32).toString('hex');
	fs.writeFileSync(secretPath, `${generated}\n`, { mode: 0o600 });
	process.env.PAYLOAD_SECRET = generated;
}

const dbFilePath = resolveCmsPaths();
const dbExisted = dbFilePath ? fs.existsSync(dbFilePath) : false;
ensurePayloadSecret(dbFilePath);

function isCmsRequest(rawUrl = '/') {
	const pathname = rawUrl.split('?', 1)[0];
	return pathname === '/_' || pathname.startsWith('/_/');
}

let handleWeb;
let handleNext;
let handleNextUpgrade;
let viteServer;

const server = http.createServer(async (req, res) => {
	try {
		if (isCmsRequest(req.url)) {
			await handleNext(req, res);
		} else {
			handleWeb(req, res);
		}
	} catch (err) {
		console.error(err);
		if (!res.headersSent) {
			res.writeHead(500, { 'Content-Type': 'text/plain' });
			res.end('Internal Server Error');
		}
	}
});

const cmsRequire = createRequire(path.join(cmsDir, 'package.json'));
const requiredServerFilesPath = path.join(cmsDir, '.next', 'required-server-files.json');
let prodNextConfig;
if (!isDev && fs.existsSync(requiredServerFilesPath)) {
	prodNextConfig = JSON.parse(fs.readFileSync(requiredServerFilesPath, 'utf8')).config;
	process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(prodNextConfig);
}

const next = cmsRequire('next');

const nextApp = next({
	dev: isDev,
	dir: cmsDir,
	hostname: host || 'localhost',
	port,
	...(prodNextConfig ? { conf: prodNextConfig } : {}),
	...(isDev ? { turbopack: true } : {}),
});

await nextApp.prepare();
handleNext = nextApp.getRequestHandler();
handleNextUpgrade = isDev ? nextApp.getUpgradeHandler() : null;

if (isDev) {
	const webRequire = createRequire(path.join(webDir, 'package.json'));
	const { createServer: createViteServer } = await import(
		pathToFileURL(webRequire.resolve('vite')).href
	);
	process.chdir(webDir);
	viteServer = await createViteServer({
		root: webDir,
		configFile: path.join(webDir, 'vite.config.ts'),
		appType: 'custom',
		server: {
			middlewareMode: true,
			ws: { server },
		},
	});
	handleWeb = viteServer.middlewares;

	server.on('upgrade', (req, socket, head) => {
		if (isCmsRequest(req.url) && handleNextUpgrade) {
			handleNextUpgrade(req, socket, head);
		}
	});
} else {
	const webHandlerPath = path.join(webDir, 'build', 'handler.js');
	if (!fs.existsSync(webHandlerPath)) {
		console.error('apps/web/build/handler.js not found. Run "pnpm build" first.');
		process.exit(1);
	}
	const { handler } = await import(pathToFileURL(webHandlerPath).href);
	handleWeb = handler;
}

const listenArgs = host ? [port, host] : [port];
server.listen(...listenArgs, () => {
	const displayHost = host && host !== '0.0.0.0' && host !== '::' ? host : 'localhost';
	console.log(
		`Ready on http://${displayHost}:${port} (Web: /, CMS: /_/admin, mode: ${isDev ? 'development' : 'production'})`
	);
	if (dbFilePath) {
		console.log(`SQLite: ${dbFilePath} (${dbExisted ? 'existing' : 'new'})`);
	}
});

async function shutdown(signal) {
	server.close();
	await viteServer?.close?.();
	await nextApp.close?.();
	process.exit(signal === 'SIGINT' || signal === 'SIGTERM' ? 0 : 1);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
