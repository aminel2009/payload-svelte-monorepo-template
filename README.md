# Payload CMS 3 + SvelteKit 3 Monorepo Template (SQLite)

Lightweight **pnpm** monorepo combining **Payload CMS 3** (with SQLite via `@payloadcms/db-sqlite`) and **SvelteKit 3** (Svelte 5 Runes, Tailwind CSS v4, typed GraphQL SDK, `@sveltejs/adapter-node`), designed for smaller sites (portfolios, landing pages, micro-apps) that run and deploy cleanly with `pnpm` or in a **single Docker container**.

## Structure

```
.
├── apps/
│   ├── cms/          # Payload 3 + SQLite (mounted at /_/*, no frontend)
│   └── web/          # SvelteKit 3 + Tailwind CSS v4 + GraphQL Codegen (adapter-node)
├── server.mjs        # Unified single-port server (SvelteKit at /, Payload at /_/*)
├── Dockerfile        # Single-container multi-stage build
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## 1. Quick Start (Local Development)

Requires **Node.js ≥ 22.23** (or ≥ 24.22) and **pnpm**. No external database server or Docker container is required for local dev.

```bash
cp .env.example .env   # Set PAYLOAD_SECRET (SQLite defaults to apps/cms/data/payload.db)
pnpm install
pnpm dev               # Starts Web (/) + CMS (/_/*) on one port (:3000)
```

- **Frontend (SvelteKit):** `http://localhost:3000`
- **Payload Admin:** `http://localhost:3000/_/admin`
- **GraphQL Endpoint:** `http://localhost:3000/_/api/graphql`
- **GraphQL Playground:** `http://localhost:3000/_/api/graphql-playground`

> **How single-port routing works:**
> - **Dev (`pnpm dev`) & Production (`pnpm start` / Docker):** `server.mjs` listens on `PORT` (`3000`), routes `/_` and `/_/*` directly to Payload/Next.js, and sends all other requests to Vite (dev) or SvelteKit `adapter-node` (prod).
> - **SSR vs Browser GraphQL:** `apps/web/src/lib/gql/client.ts` automatically resolves `/_/api/graphql` to `window.location.origin` in the browser and `http://127.0.0.1:${PORT}/_/api/graphql` on the server.

---

## 2. Adding Collections & GraphQL Queries

1. Add or edit collections in `apps/cms/src/collections/` and register them in `apps/cms/src/payload.config.ts`.
2. Add `.gql` query/mutation files in `apps/web/src/lib/gql/queries/`.
3. With `pnpm dev` running (so the GraphQL endpoint is live), regenerate Payload types, import maps, and the SvelteKit GraphQL SDK:
   ```bash
   pnpm generate
   ```
4. Before deploying schema changes to production, create a SQLite migration:
   ```bash
   pnpm migrate:create
   ```
   `apps/cms/src/payload.config.ts` wires `prodMigrations` from `apps/cms/src/migrations/`, so pending migrations are automatically applied when the production container starts.

---

## 3. Monorepo Commands

| Command                 | Description                                                                |
| :---------------------- | :------------------------------------------------------------------------- |
| `pnpm dev`              | Starts Web (`/`) and CMS (`/_/*`) together on one port (`:3000`).          |
| `pnpm build`            | Builds Next.js (`apps/cms`) and SvelteKit Node server (`apps/web`).        |
| `pnpm start`            | Starts `server.mjs` (unified single-port production server on `:3000`).    |
| `pnpm generate`         | Regenerates Payload types, import map, and SvelteKit GraphQL SDK.          |
| `pnpm db:backup [out]`  | Creates an atomic SQLite snapshot in `apps/cms/backups/` (or `[out]`).     |
| `pnpm db:restore [in]`  | Verifies and restores the SQLite DB from `[in]` (or the latest backup).    |
| `pnpm db:clear`         | Deletes the local SQLite database file and `-wal`/`-shm`/`-journal` files. |
| `pnpm db:check`         | Checks SQLite schema sync against Payload collections.                     |
| `pnpm migrate:create`   | Creates a new Drizzle SQLite migration in `apps/cms/src/migrations/`.      |
| `pnpm migrate`          | Runs pending migrations manually.                                          |
| `pnpm check`            | Runs TypeScript, `svelte-check`, ESLint, and Prettier checks across apps.  |
| `pnpm format`           | Formats code across both apps with Prettier.                               |
| `pnpm test`             | Runs Payload SQLite integration tests (`vitest`).                          |
| `pnpm update:deps`      | Updates all workspace dependencies and regenerates CMS & SvelteKit types.  |

### SQLite Database Commands

All SQLite commands resolve `DATABASE_URL` from `.env` (defaulting to `apps/cms/data/payload.db`):

```bash
pnpm db:backup                          # Writes apps/cms/backups/payload-YYYYMMDD-HHmmss.db
pnpm db:backup ./snapshots/prod.db      # Writes a custom path or directory using VACUUM INTO
pnpm db:restore                         # Restores the newest .db file in apps/cms/backups/
pnpm db:restore ./snapshots/prod.db     # Verifies PRAGMA quick_check, then replaces the active DB
pnpm db:clear                           # Removes the active SQLite file and -wal/-shm/-journal sidecars
pnpm db:check                           # Syncs & verifies schema against Payload collections
```

> Stop any running `pnpm dev` or `pnpm start` process before running `pnpm db:clear` or `pnpm db:restore`. `pnpm db:backup` uses SQLite `VACUUM INTO`, which creates a consistent single-file snapshot safely even with WAL enabled.

---

## 4. Deployment

### Option A: Single Docker Container / Docker Compose

1. Set a strong `PAYLOAD_SECRET` in `.env` (or your host/Coolify environment variables).
2. Build and start the container:
   ```bash
   docker compose up -d --build
   ```
   Or build and run with Docker directly:
   ```bash
   docker build -t my-site .
   docker run -d -p 3000:3000 \
     -e PAYLOAD_SECRET="replace-with-strong-secret" \
     -v payload_data:/app/data \
     -v payload_media:/app/media \
     my-site
   ```
3. Mount persistent storage at **`/app/data`** (SQLite database) and **`/app/media`** (uploaded media files).
4. Expose port **`3000`**.

### Option B: Node.js / pnpm (VPS, Railway, Render, Fly.io)

- **Build command:**
  ```bash
  pnpm install --frozen-lockfile && pnpm build
  ```
- **Start command:**
  ```bash
  pnpm start
  ```
- Set `PAYLOAD_SECRET` (and optionally `PORT`, `DATABASE_URL`, `MEDIA_DIR`) in your environment variables, and ensure `apps/cms/data` and `apps/cms/media` (or your configured paths) are on persistent storage.
