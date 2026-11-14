import fs from 'node:fs'
import path from 'node:path'

interface DrizzleSnapshot {
  version: string | number
  [key: string]: unknown
}

interface DrizzleKitApi {
  generateDrizzleJson(schema: unknown): Promise<DrizzleSnapshot>
  generateMigration(before: DrizzleSnapshot, after: DrizzleSnapshot): Promise<string[]>
  upSnapshot?: (snapshot: DrizzleSnapshot) => DrizzleSnapshot
}

interface DrizzleMigrationAdapter {
  defaultDrizzleSnapshot: DrizzleSnapshot
  destroy?: () => Promise<void>
  migrationDir: string
  requireDrizzleKit(): DrizzleKitApi
  schema: unknown
}

// Force in-memory initialization before payload.config evaluates DATABASE_URL at import time.
;(process.env as Record<string, string>).NODE_ENV = 'development'
process.env.PAYLOAD_MIGRATING = 'true'
process.env.DATABASE_URL = 'file::memory:'
process.env.PAYLOAD_SECRET ||= 'migration-check'

const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config.js')

const payload = await getPayload({ config: await config })
const adapter = payload.db as unknown as DrizzleMigrationAdapter

try {
  const dir = adapter.migrationDir
  const { generateDrizzleJson, generateMigration, upSnapshot } = adapter.requireDrizzleKit()
  const drizzleJsonAfter = await generateDrizzleJson(adapter.schema)

  const latestSnapshot = fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((file) => file.endsWith('.json'))
        .sort()
        .reverse()[0]
    : undefined

  let drizzleJsonBefore = adapter.defaultDrizzleSnapshot
  if (latestSnapshot) {
    drizzleJsonBefore = JSON.parse(
      fs.readFileSync(path.join(dir, latestSnapshot), 'utf8'),
    ) as DrizzleSnapshot
    if (upSnapshot && drizzleJsonBefore.version < drizzleJsonAfter.version) {
      drizzleJsonBefore = upSnapshot(drizzleJsonBefore)
    }
  }

  const statements = await generateMigration(drizzleJsonBefore, drizzleJsonAfter)
  if (statements.length > 0) {
    console.error(
      [
        'Error: Unmigrated Payload schema changes detected.',
        'Run "pnpm migrate:create" and commit apps/cms/src/migrations/ before committing or deploying.',
      ].join('\n'),
    )
    process.exitCode = 1
  } else {
    console.log('✔ Payload migrations are up to date.')
  }
} finally {
  if (typeof adapter.destroy === 'function') {
    await adapter.destroy()
  }
}
process.exit(process.exitCode ?? 0)
