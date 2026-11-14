import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { CollectionConfig } from 'payload'

const cmsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const configuredMediaDir = process.env.MEDIA_DIR
const staticDir = configuredMediaDir
  ? path.isAbsolute(configuredMediaDir)
    ? configuredMediaDir
    : path.resolve(cmsRoot, configuredMediaDir)
  : path.join(cmsRoot, 'media')

export const Media: CollectionConfig = {
  slug: 'media',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
  ],
  upload: {
    staticDir,
  },
}
