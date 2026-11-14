# GraphQL Usage in SvelteKit (`src/lib/gql`)

Typed GraphQL client and Svelte 5 Runes query helper wired to Payload CMS at `/_/api/graphql`.

## Files

| File                                   | Purpose                                                                                                    |
| :------------------------------------- | :--------------------------------------------------------------------------------------------------------- |
| [`client.ts`](./client.ts)             | Exports `api(fetch?, options?)` wrapping the generated `graphql-request` SDK (`getSdk`).                   |
| [`query.svelte.ts`](./query.svelte.ts) | Exports `useQuery(...)` (Svelte 5 `$state` + stale-while-revalidate cache) and `clearQueryCache(prefix?)`. |
| [`queries/`](./queries)                | Put your `.gql` operations here (any `src/**/*.gql` file is picked up by Codegen).                         |
| [`generated.ts`](./generated.ts)       | Auto-generated types and SDK from `pnpm generate` — do not edit manually.                                  |

---

## 1. Add Queries & Regenerate Types

1. Create a `.gql` file under [`queries/`](./queries) (or anywhere in `apps/web/src/`), e.g. `src/lib/gql/queries/Posts.gql`:

   ```graphql
   query Posts($limit: Int) {
   	Posts(limit: $limit) {
   		docs {
   			id
   			title
   		}
   	}
   }
   ```

2. Make sure `pnpm dev` is running (so Payload's GraphQL endpoint is live), then run from the monorepo root:

   ```bash
   pnpm generate
   ```

   [`../../../codegen.ts`](../../../codegen.ts) reads `.env` and fetches the schema from `GRAPHQL_SCHEMA_URL` (or `http://127.0.0.1:${PORT:-3000}/_/api/graphql`), writing updated TypeScript types and SDK methods to [`generated.ts`](./generated.ts).

---

## 2. Server-Side Usage (`+page.server.ts` / `+page.ts`)

Pass SvelteKit's `fetch` to `api(fetch)` so cookies, relative endpoints, and SSR requests behave cleanly:

```ts
import { api } from '#lib/gql/client.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const data = await api(fetch).Posts({ limit: 10 });
	return { data };
};
```

- By default, `api()` uses `PUBLIC_GRAPHQL_ENDPOINT` (`/_/api/graphql` from [`../../env.ts`](../../env.ts)).
- In the browser, relative paths resolve against `window.location.origin`.
- On the server, relative paths resolve against `process.env.CMS_URL` or `http://127.0.0.1:${process.env.PORT || '3000'}`.
- Override per call via `api(fetch, { endpoint, headers })` (for example, forwarding an auth token).

---

## 3. Client-Side Usage with Svelte 5 Runes (`useQuery`)

Use `useQuery(key, queryFn, options?)` from [`query.svelte.ts`](./query.svelte.ts) in `.svelte` components for reactive `data`, `error`, and `loading` state with stale-while-revalidate caching:

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { api } from '#lib/gql/client.ts';
	import { useQuery } from '#lib/gql/query.svelte.ts';

	const posts = useQuery('posts', api().Posts, { ttlMs: 5 * 60_000 });

	onMount(() => {
		void posts.execute({ limit: 10 });
	});
</script>

{#if posts.loading && !posts.data}
	<p>Loading…</p>
{:else if posts.error}
	<p>{posts.error.message}</p>
{:else if posts.data}
	<pre>{JSON.stringify(posts.data, null, 2)}</pre>
{/if}
```

### `useQuery` Behavior

- **Return object:** `{ data, error, loading, execute, reset }`
- **`execute(vars?, forceRefresh?)`:**
  - Within `ttlMs` (default `5 * 60_000` / 5 minutes): returns cached data immediately with no network request.
  - Past `ttlMs`: sets `data` to the stale cache immediately and revalidates in the background (`loading` stays `false` when cached data exists).
  - Pass `forceRefresh = true` (e.g. `posts.execute({ limit: 10 }, true)`) to bypass cache and show `loading = true`.
  - Race-safe: out-of-order responses from earlier `execute()` calls are ignored.
- **`reset()`:** Clears `data`, `error`, and `loading` for this hook instance (without clearing the shared module cache).

---

## 4. Mutations & Cache Invalidation

Call mutations through `api()` directly, then invalidate matching cache keys with `clearQueryCache(prefix?)`:

```ts
import { api } from '#lib/gql/client.ts';
import { clearQueryCache } from '#lib/gql/query.svelte.ts';

await api(fetch, {
	headers: { Authorization: `JWT ${token}` }
}).CreatePost({ title: 'Hello' });

// Clear all cached entries whose key starts with 'posts' (or omit prefix to clear all)
clearQueryCache('posts');
```
