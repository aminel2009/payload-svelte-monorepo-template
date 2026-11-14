import '../src/lib/loadEnv.js'
import { getPayload } from 'payload'
import config from '../src/payload.config.js'

console.log('Checking SQLite database against current Payload collections & schemas...')

process.env.PAYLOAD_FORCE_DRIZZLE_PUSH = 'true'

const payloadConfig = await config
const payload = await getPayload({ config: payloadConfig })
const adapter = payload.db

console.log(
  `✔ Schema check complete (${payload.config.collections.map((c) => c.slug).join(', ')}) — database is in sync.`,
)

if (typeof adapter.destroy === 'function') {
  await adapter.destroy()
}
process.exit(0)
