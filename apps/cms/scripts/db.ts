import '../src/lib/loadEnv.js'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import readline from 'node:readline/promises'
import { fileURLToPath } from 'node:url'

interface LibsqlClient {
  execute(sql: string): Promise<{ rows: Record<string, unknown>[] }>
  close(): void
}

interface LibsqlModule {
  createClient(config: { url: string }): LibsqlClient
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const cmsRoot = path.resolve(scriptDir, '..')
const backupsDir = path.join(cmsRoot, 'backups')
const callerCwd = process.env.INIT_CWD || process.cwd()

function resolveSqlitePath(): string {
  const rawUrl = process.env.DATABASE_URL || 'file:./data/payload.db'
  if (!rawUrl.startsWith('file:')) {
    throw new Error(`Unsupported DATABASE_URL "${rawUrl}". Expected a local "file:" SQLite URL.`)
  }

  const withoutPrefix = rawUrl.slice('file:'.length)
  const [filePart] = withoutPrefix.split('?')
  if (!filePart || filePart === ':memory:') {
    throw new Error('Cannot manage an in-memory SQLite database on disk.')
  }

  return path.isAbsolute(filePart) ? filePart : path.resolve(cmsRoot, filePart)
}

function getLibsql(): LibsqlModule {
  const cmsRequire = createRequire(import.meta.url)
  const adapterRequire = createRequire(cmsRequire.resolve('@payloadcms/db-sqlite'))
  return adapterRequire('@libsql/client') as LibsqlModule
}

function formatTimestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('')
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function displayPath(target: string): string {
  const rel = path.relative(callerCwd, target)
  return rel && !rel.startsWith('..') ? rel : target
}

function resolveUserPath(input: string): string {
  return path.isAbsolute(input) ? input : path.resolve(callerCwd, input)
}

function removeSidecars(dbPath: string): string[] {
  const removed: string[] = []
  for (const suffix of ['-wal', '-shm', '-journal']) {
    const file = `${dbPath}${suffix}`
    if (fs.existsSync(file)) {
      fs.rmSync(file, { force: true })
      removed.push(file)
    }
  }
  return removed
}

function assertNotProduction(action: string): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Refusing to run db:${action} when NODE_ENV=production.`)
  }
}

async function confirmPrompt(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  try {
    const answer = await rl.question(question)
    const normalized = answer.trim().toLowerCase()
    return normalized === 'y' || normalized === 'yes'
  } finally {
    rl.close()
  }
}

async function clearDb(dbPath: string): Promise<void> {
  assertNotProduction('clear')

  const targets = [dbPath, ...['-wal', '-shm', '-journal'].map((suffix) => `${dbPath}${suffix}`)]
  const existing = targets.filter((file) => fs.existsSync(file))
  if (existing.length === 0) {
    console.log(`No SQLite database found at ${displayPath(dbPath)}.`)
    return
  }

  const confirmed = await confirmPrompt(`Delete SQLite database at ${displayPath(dbPath)}? (y/N) `)
  if (!confirmed) {
    console.log('Aborted.')
    return
  }

  for (const file of existing) {
    fs.rmSync(file, { force: true })
    console.log(`Removed ${displayPath(file)}`)
  }
}

async function backupDb(dbPath: string, outArg?: string): Promise<void> {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`SQLite database not found at ${displayPath(dbPath)}.`)
  }

  const ext = path.extname(dbPath) || '.db'
  const baseName = path.basename(dbPath, ext)
  const defaultFileName = `${baseName}-${formatTimestamp()}${ext}`

  let outPath: string
  if (!outArg) {
    outPath = path.join(backupsDir, defaultFileName)
  } else {
    const resolved = resolveUserPath(outArg)
    const isDirTarget =
      outArg.endsWith('/') ||
      outArg.endsWith('\\') ||
      (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory())
    outPath = isDirTarget ? path.join(resolved, defaultFileName) : resolved
  }

  if (fs.existsSync(outPath)) {
    throw new Error(`Backup target already exists: ${displayPath(outPath)}`)
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true })

  const { createClient } = getLibsql()
  const client = createClient({ url: `file:${dbPath}` })
  try {
    const escapedPath = outPath.replace(/'/g, "''")
    await client.execute(`VACUUM INTO '${escapedPath}'`)
  } finally {
    client.close()
  }

  const { size } = fs.statSync(outPath)
  console.log(`✔ Backed up SQLite database to ${displayPath(outPath)} (${formatBytes(size)})`)
}

function findLatestBackup(): string | undefined {
  if (!fs.existsSync(backupsDir)) return undefined

  const files = fs
    .readdirSync(backupsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.db'))
    .map((entry) => {
      const fullPath = path.join(backupsDir, entry.name)
      return { fullPath, mtimeMs: fs.statSync(fullPath).mtimeMs }
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs || b.fullPath.localeCompare(a.fullPath))

  return files[0]?.fullPath
}

async function restoreDb(dbPath: string, inArg?: string): Promise<void> {
  assertNotProduction('restore')

  const backupPath = inArg ? resolveUserPath(inArg) : findLatestBackup()
  if (!backupPath) {
    throw new Error(
      `No backup files found in ${displayPath(backupsDir)}. Pass a file path: pnpm db:restore <file>`,
    )
  }

  if (!fs.existsSync(backupPath) || !fs.statSync(backupPath).isFile()) {
    throw new Error(`Backup file not found: ${displayPath(backupPath)}`)
  }

  if (path.resolve(backupPath) === path.resolve(dbPath)) {
    throw new Error('Refusing to restore the live database over itself.')
  }

  const { createClient } = getLibsql()
  const client = createClient({ url: `file:${backupPath}` })
  try {
    const result = await client.execute('PRAGMA quick_check')
    const status = result.rows[0]?.quick_check
    if (status !== 'ok') {
      throw new Error(`Backup integrity check failed: ${String(status ?? 'unknown error')}`)
    }
  } finally {
    client.close()
  }

  if (fs.existsSync(dbPath)) {
    const ext = path.extname(dbPath) || '.db'
    const baseName = path.basename(dbPath, ext)
    const preRestorePath = path.join(
      backupsDir,
      `${baseName}-pre-restore-${formatTimestamp()}${ext}`,
    )
    await backupDb(dbPath, preRestorePath)
  }

  fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  const tempPath = `${dbPath}.restore.tmp`
  try {
    fs.copyFileSync(backupPath, tempPath)
    removeSidecars(dbPath)
    fs.renameSync(tempPath, dbPath)
  } catch (err) {
    fs.rmSync(tempPath, { force: true })
    throw err
  }

  console.log(
    `✔ Restored SQLite database from ${displayPath(backupPath)} -> ${displayPath(dbPath)}`,
  )
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => arg !== '--')
  const [command, target] = args
  const dbPath = resolveSqlitePath()

  switch (command) {
    case 'clear':
      await clearDb(dbPath)
      break
    case 'backup':
      await backupDb(dbPath, target)
      break
    case 'restore':
      await restoreDb(dbPath, target)
      break
    default:
      console.error('Usage: tsx scripts/db.ts <clear|backup [out]|restore [file]>')
      process.exit(1)
  }
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err)
  console.error(`Error: ${message}`)
  process.exit(1)
})
