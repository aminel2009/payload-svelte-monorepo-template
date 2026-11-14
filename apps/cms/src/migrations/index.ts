import * as migration_20261113_085253_initial from './20261113_085253_initial'

export const migrations = [
  {
    up: migration_20261113_085253_initial.up,
    down: migration_20261113_085253_initial.down,
    name: '20261113_085253_initial',
  },
]
