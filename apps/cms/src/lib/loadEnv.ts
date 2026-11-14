import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const libDir = path.dirname(fileURLToPath(import.meta.url))
const cmsRoot = path.resolve(libDir, '../..')
const monorepoRoot = path.resolve(cmsRoot, '../..')

for (const envPath of [path.join(cmsRoot, '.env'), path.join(monorepoRoot, '.env')]) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
  }
}
