import type { MigrateDownArgs, MigrateUpArgs } from '@payloadcms/db-sqlite'

export const migrations: Array<{
  down: (args: MigrateDownArgs) => Promise<void>
  name: string
  up: (args: MigrateUpArgs) => Promise<void>
}> = []
