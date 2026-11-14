import { withPayload } from '@payloadcms/next/withPayload'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)
const monorepoRoot = path.resolve(dirname, '../..')

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/_',
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingExcludes: {
    '*': ['./data/**', './media/**', './backups/**'],
  },
  images: {
    localPatterns: [
      {
        pathname: '/_/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: monorepoRoot,
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
