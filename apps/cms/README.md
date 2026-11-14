# Payload CMS 3 Workspace (`cms`)

Payload CMS 3 backend configured with SQLite (`@payloadcms/db-sqlite`), mounted under `/_/*` by the root unified server ([`../../server.mjs`](../../server.mjs)).

- **Admin Panel:** `http://localhost:3000/_/admin`
- **GraphQL Endpoint:** `http://localhost:3000/_/api/graphql`
- **GraphQL Playground:** `http://localhost:3000/_/api/graphql-playground`

---

## SQLite Database Commands

All commands resolve `DATABASE_URL` from root `.env` (or `apps/cms/.env`), defaulting to `file:./data/payload.db`:

| Command                  | Description                                                                                |
| :----------------------- | :----------------------------------------------------------------------------------------- |
| `pnpm db:backup [out]`   | Creates a consistent single-file SQLite snapshot via `VACUUM INTO` (`backups/`).           |
| `pnpm db:restore [file]` | Backs up current DB, runs `PRAGMA quick_check` on `[file]` (or latest), and restores it.   |
| `pnpm db:clear`          | Confirms and deletes the local SQLite database file and `-wal`/`-shm`/`-journal` sidecars. |
| `pnpm db:check`          | Pushes & verifies current Payload collection schemas against the SQLite database.          |

> Stop running `pnpm dev` / `pnpm start` servers before running `pnpm db:clear` or `pnpm db:restore`. `pnpm db:backup` uses SQLite `VACUUM INTO`, which safely produces a self-contained snapshot even with WAL enabled.

---

## Migrations & Types

```bash
pnpm generate:types       # Regenerates src/payload-types.ts
pnpm generate:importmap   # Regenerates src/app/(payload)/admin/importMap.js
pnpm migrate:create       # Creates a new Drizzle SQLite migration in src/migrations/
pnpm migrate              # Applies pending migrations
```

Production startups run `prodMigrations` automatically via [`src/payload.config.ts`](./src/payload.config.ts). Running `pnpm check` or `pnpm build` verifies that `src/migrations/` is up to date with your schemas.

---

## Keeping Dependencies Updated

Run `pnpm update:deps` from the monorepo root to update all dependencies and regenerate types:

```bash
pnpm update:deps
pnpm check
```
