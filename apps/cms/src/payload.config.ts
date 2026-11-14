import './lib/loadEnv'
import { sqliteAdapter } from '@payloadcms/db-sqlite'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import fs from 'fs'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { migrations } from './migrations'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const cmsRoot = path.resolve(dirname, '..')

function resolveDatabaseUrl(rawUrl: string): string {
  if (!rawUrl.startsWith('file:')) return rawUrl

  const withoutPrefix = rawUrl.slice('file:'.length)
  const [filePart, queryPart] = withoutPrefix.split('?')
  if (!filePart || filePart === ':memory:') return rawUrl

  const resolvedPath = path.isAbsolute(filePart) ? filePart : path.resolve(cmsRoot, filePart)
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true })

  return `file:${resolvedPath}${queryPart ? `?${queryPart}` : ''}`
}

const databaseUrl = resolveDatabaseUrl(process.env.DATABASE_URL || 'file:./data/payload.db')

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media],
  editor: lexicalEditor(),
  secret:
    process.env.PAYLOAD_SECRET ||
    (process.env.NODE_ENV !== 'production' ? 'dev-secret-change-in-production' : ''),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: sqliteAdapter({
    busyTimeout: 5000,
    prodMigrations: migrations,
    client: {
      url: databaseUrl,
      ...(process.env.DATABASE_AUTH_TOKEN ? { authToken: process.env.DATABASE_AUTH_TOKEN } : {}),
    },
  }),
  sharp,
  plugins: [],
})
