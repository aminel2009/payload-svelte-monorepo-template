<script lang="ts">
	import { api } from '#lib/gql/client.ts';
	import { clearQueryCache, useQuery } from '#lib/gql/query.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const clientQuery = useQuery('example', api().Example);

	const playgroundUrl = $derived(
		data.endpoint.endsWith('/api/graphql') ? `${data.endpoint}-playground` : data.endpoint
	);

	const devCommands = [
		{
			cmd: 'pnpm dev',
			desc: 'Starts both SvelteKit Web (/) and Payload CMS (/_/*) on a single port (default 3000).'
		},
		{
			cmd: 'pnpm generate',
			desc: 'Regenerates Payload types/importmap and introspects GraphQL into src/lib/gql/generated.ts.'
		},
		{
			cmd: 'pnpm check',
			desc: 'Runs TypeScript, svelte-check, ESLint, and Prettier checks across both apps.'
		},
		{
			cmd: 'pnpm db:check',
			desc: 'Checks SQLite schema sync against Payload collections.'
		},
		{
			cmd: 'pnpm db:backup [out]',
			desc: 'Creates a consistent SQLite snapshot in apps/cms/backups/ (or custom path).'
		},
		{
			cmd: 'pnpm db:restore [in]',
			desc: 'Verifies and restores the SQLite DB from [in] (or the latest backup).'
		},
		{
			cmd: 'pnpm db:clear',
			desc: 'Deletes the SQLite database file and -wal/-shm/-journal sidecars.'
		},
		{
			cmd: 'pnpm migrate:create',
			desc: 'Creates a Drizzle SQLite migration in apps/cms/src/migrations/.'
		},
		{
			cmd: 'pnpm build',
			desc: 'Builds Next.js (apps/cms) and SvelteKit Node server (apps/web).'
		},
		{
			cmd: 'pnpm start',
			desc: 'Starts the unified production server on port 3000 (single process entrypoint).'
		}
	];

	const keyFiles = [
		{
			file: 'apps/cms/src/payload.config.ts',
			desc: 'Payload 3 configuration using @payloadcms/db-sqlite (file:./data/payload.db).'
		},
		{
			file: 'apps/web/src/lib/gql/client.ts',
			desc: 'Isomorphic GraphQL SDK client (resolves /_/api/graphql on browser & loopback CMS in SSR).'
		},
		{
			file: 'apps/web/src/lib/gql/query.svelte.ts',
			desc: 'Svelte 5 runes stale-while-revalidate query helper (useQuery & clearQueryCache).'
		},
		{
			file: 'apps/web/src/lib/gql/queries/*.gql',
			desc: 'GraphQL query, mutation, and fragment documents picked up by pnpm generate.'
		},
		{
			file: 'server.mjs',
			desc: 'Unified single-port server for dev & prod (SvelteKit at /, Payload CMS at /_/*).'
		},
		{
			file: 'Dockerfile',
			desc: 'Single-container multi-stage Docker build with persistent /app/data & /app/media volumes.'
		}
	];

	const sampleGqlSnippet = `query Posts($limit: Int) {
	Posts(limit: $limit) {
		docs {
			id
			title
		}
	}
}`;

	const sampleServerSnippet = `import { api } from '#lib/gql/client.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ fetch }) => {
	const posts = await api(fetch).Posts({ limit: 10 });
	return { posts };
};`;

	const sampleClientSnippet = `<script lang="ts">
	import { api } from '#lib/gql/client.ts';
	import { useQuery } from '#lib/gql/query.svelte.ts';

	const posts = useQuery('posts', api().Posts, { ttlMs: 5 * 60_000 });
	posts.execute({ limit: 10 });
${'</'}script>

{#if posts.loading}
	<p>Loading…</p>
{:else if posts.error}
	<p>{posts.error.message}</p>
{:else if posts.data}
	<pre>{JSON.stringify(posts.data, null, 2)}</pre>
{/if}`;
</script>

<svelte:head>
	<title>Payload CMS + SvelteKit Monorepo</title>
</svelte:head>

<div class="min-h-screen bg-black text-white antialiased">
	<div
		class="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-between px-4 py-6 sm:px-11 sm:py-11"
	>
		<div class="flex w-full grow flex-col items-center justify-center">
			<div class="flex items-center justify-center" aria-hidden="true">
				<svg viewBox="0 0 100 100" width="60" height="60" fill="none">
					<rect width="100" height="100" rx="20" fill="#161616" stroke="#333" stroke-width="2" />
					<path
						d="M68.5 26.5C61.8 17 48.4 14.5 38.8 20.8L25.4 29.5C18.6 34 15.2 42.2 16.9 50.2C17.7 54 19.6 57.4 22.4 60C19.8 63.9 19 68.8 20.2 73.5C22.4 82 29.8 88 38.6 88.5C42.9 88.8 47.2 87.6 50.8 85.2L64.2 76.5C71 72 74.4 63.8 72.7 55.8C71.9 52 70 48.6 67.2 46C69.8 42.1 70.6 37.2 69.4 32.5C69.2 30.4 68.9 28.4 68.5 26.5Z"
						stroke="#ff3e00"
						stroke-width="5"
						stroke-linecap="round"
						stroke-linejoin="round"
					/>
					<circle cx="50" cy="53" r="8" fill="#e535ab" />
				</svg>
			</div>

			<h1 class="my-5 text-center text-4xl font-bold tracking-tight sm:my-7 sm:text-5xl">
				Payload CMS + SvelteKit.
			</h1>

			<div class="flex flex-wrap items-center justify-center gap-3">
				<!-- eslint-disable svelte/no-navigation-without-resolve -->
				<a
					class="rounded border border-white bg-white px-2.5 py-1 text-sm font-medium text-black transition hover:opacity-90"
					href="/_/admin"
					rel="noopener noreferrer"
					target="_blank"
				>
					Payload Admin
				</a>
				<a
					class="rounded border border-white bg-black px-2.5 py-1 text-sm text-white transition hover:bg-neutral-900"
					href={playgroundUrl}
					rel="noopener noreferrer"
					target="_blank"
				>
					GraphQL Playground
				</a>
				<!-- eslint-enable svelte/no-navigation-without-resolve -->
				<a
					class="rounded border border-white bg-black px-2.5 py-1 text-sm text-white transition hover:bg-neutral-900"
					href="https://payloadcms.com/docs"
					rel="noopener noreferrer"
					target="_blank"
				>
					Payload Docs
				</a>
				<a
					class="rounded border border-white bg-black px-2.5 py-1 text-sm text-white transition hover:bg-neutral-900"
					href="https://svelte.dev/docs/kit"
					rel="noopener noreferrer"
					target="_blank"
				>
					SvelteKit Docs
				</a>
			</div>

			<section
				class="my-10 w-full max-w-205 rounded-lg border border-neutral-800 bg-neutral-950 p-4 text-[15px] leading-6 sm:p-8"
			>
				<h2 class="mb-3 text-2xl font-semibold">Live GraphQL Connection Check</h2>
				<p class="mt-2 mb-4 text-neutral-400">
					Endpoint configured via
					<code class="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[13px] text-neutral-200"
						>PUBLIC_GRAPHQL_ENDPOINT</code
					>
					in
					<code class="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[13px] text-neutral-200"
						>apps/web/src/env.ts</code
					>:
					<code class="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[13px] text-neutral-200"
						>{data.endpoint}</code
					>
				</p>

				<div class="mb-7 flex flex-col gap-4 md:grid-cols-2">
					<div
						class="flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-900/70 p-4"
					>
						<div class="flex flex-wrap items-center justify-between gap-2">
							<strong
								>1. SSR Load (<code
									class="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[13px] text-neutral-200"
									>+page.server.ts</code
								>)</strong
							>
							{#if data.result}
								<span
									class="rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400"
									>Connected</span
								>
							{:else}
								<span
									class="rounded-full border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-400"
									>Backend Offline</span
								>
							{/if}
						</div>
						<p class="m-0 text-[13.5px] text-neutral-400">
							Executed on the server via
							<code
								class="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[13px] text-neutral-200"
								>api(fetch).Example()</code
							>:
						</p>
						{#if data.result}
							<pre
								class="mt-1 overflow-x-auto rounded-md border border-neutral-800 bg-neutral-950 px-4 py-3 font-mono text-[13px] text-neutral-200"><code
									>{JSON.stringify(data.result, null, 2)}</code
								></pre>
						{:else}
							<pre
								class="mt-1 overflow-x-auto rounded-md border border-amber-500/35 bg-neutral-950 px-4 py-3 font-mono text-[13px] text-amber-300"><code
									>{data.error ?? 'No response'}

Tip: Run "pnpm dev" from the monorepo root and reload this page.</code
								></pre>
						{/if}
					</div>

					<div
						class="flex flex-col gap-2 rounded-md border border-neutral-800 bg-neutral-900/70 p-4"
					>
						<div class="flex flex-wrap items-center justify-between gap-2">
							<strong
								>2. Client SWR Query (<code
									class="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[13px] text-neutral-200"
									>useQuery</code
								>)</strong
							>
							{#if clientQuery.loading}
								<span
									class="rounded-full border border-blue-500/35 bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-400"
									>Loading…</span
								>
							{:else if clientQuery.data}
								<span
									class="rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2 py-0.5 text-xs font-semibold text-emerald-400"
									>Cached</span
								>
							{:else if clientQuery.error}
								<span
									class="rounded-full border border-amber-500/35 bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-400"
									>Error</span
								>
							{:else}
								<span
									class="rounded-full border border-neutral-700 bg-neutral-800 px-2 py-0.5 text-xs font-semibold text-neutral-300"
									>Idle</span
								>
							{/if}
						</div>
						<p class="m-0 text-[13.5px] text-neutral-400">
							Test client-side
							<code
								class="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[13px] text-neutral-200"
								>useQuery('example', api().Example)</code
							>
							with SWR caching:
						</p>
						<div class="my-1 flex flex-wrap gap-2">
							<button
								type="button"
								class="cursor-pointer rounded border border-neutral-600 bg-neutral-100 px-2.5 py-1 text-[13px] font-medium text-black transition hover:opacity-90"
								onclick={() => clientQuery.execute()}
							>
								Execute (SWR)
							</button>
							<button
								type="button"
								class="cursor-pointer rounded border border-neutral-600 bg-neutral-100 px-2.5 py-1 text-[13px] font-medium text-black transition hover:opacity-90"
								onclick={() => clientQuery.execute(undefined, true)}
							>
								Force Refresh
							</button>
							<button
								type="button"
								class="cursor-pointer rounded border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-[13px] font-medium text-neutral-200 transition hover:bg-neutral-700"
								onclick={() => {
									clearQueryCache('example');
									clientQuery.reset();
								}}
							>
								Clear Cache
							</button>
						</div>
						{#if clientQuery.error}
							<pre
								class="mt-1 overflow-x-auto rounded-md border border-amber-500/35 bg-neutral-950 px-4 py-3 font-mono text-[13px] text-amber-300"><code
									>{clientQuery.error.message}</code
								></pre>
						{:else if clientQuery.data}
							<pre
								class="mt-1 overflow-x-auto rounded-md border border-neutral-800 bg-neutral-950 px-4 py-3 font-mono text-[13px] text-neutral-200"><code
									>{JSON.stringify(clientQuery.data, null, 2)}</code
								></pre>
						{:else}
							<pre
								class="mt-1 overflow-x-auto rounded-md border border-neutral-800 bg-neutral-950 px-4 py-3 font-mono text-[13px] text-neutral-300"><code
									>Click "Execute (SWR)" to run the query from the browser.</code
								></pre>
						{/if}
					</div>
				</div>

				<h2 class="mt-7 mb-3 text-2xl font-semibold">Monorepo Guide</h2>
				<p class="mt-2 mb-4 text-neutral-400">
					Lightweight
					<strong class="text-neutral-200">Payload 3 (SQLite) + SvelteKit 3</strong>
					monorepo designed for single-container Docker or pnpm deployments.
				</p>

				<h3 class="mt-7 mb-2.5 text-[17px] font-semibold text-neutral-200">1. Quick Start</h3>
				<pre
					class="my-3 overflow-x-auto rounded-md border border-neutral-800 bg-neutral-900 px-4 py-3.5 font-mono text-[13px] text-neutral-200"><code
						>{`cp .env.example .env   # Configure PAYLOAD_SECRET & DATABASE_URL
pnpm install
pnpm dev               # Unified dev server on :3000 (Web at /, CMS at /_/*)`}</code
					></pre>

				<h3 class="mt-7 mb-2.5 text-[17px] font-semibold text-neutral-200">
					2. Adding &amp; Calling a GraphQL Query
				</h3>
				<ol class="mt-2 mb-4 list-decimal space-y-2.5 pl-5 text-neutral-300">
					<li>
						Create a
						<code
							class="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[13px] text-neutral-200"
							>.gql</code
						>
						file under
						<code
							class="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[13px] text-neutral-200"
							>apps/web/src/</code
						>, e.g.
						<code
							class="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[13px] text-neutral-200"
							>apps/web/src/lib/gql/queries/Posts.gql</code
						>:
						<pre
							class="my-2 overflow-x-auto rounded-md border border-neutral-800 bg-neutral-900 px-4 py-3.5 font-mono text-[13px] text-neutral-200"><code
								>{sampleGqlSnippet}</code
							></pre>
					</li>
					<li>
						With
						<code
							class="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[13px] text-neutral-200"
							>pnpm dev</code
						>
						running, regenerate types &amp; GraphQL SDK from the root:
						<pre
							class="my-2 overflow-x-auto rounded-md border border-neutral-800 bg-neutral-900 px-4 py-3.5 font-mono text-[13px] text-neutral-200"><code
								>pnpm generate</code
							></pre>
					</li>
					<li>
						Call the generated method in a server load function (<code
							class="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[13px] text-neutral-200"
							>+page.server.ts</code
						>):
						<pre
							class="my-2 overflow-x-auto rounded-md border border-neutral-800 bg-neutral-900 px-4 py-3.5 font-mono text-[13px] text-neutral-200"><code
								>{sampleServerSnippet}</code
							></pre>
					</li>
					<li>
						Or call it on the client with stale-while-revalidate caching via
						<code
							class="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[13px] text-neutral-200"
							>useQuery</code
						>:
						<pre
							class="my-2 overflow-x-auto rounded-md border border-neutral-800 bg-neutral-900 px-4 py-3.5 font-mono text-[13px] text-neutral-200"><code
								>{sampleClientSnippet}</code
							></pre>
					</li>
				</ol>

				<h3 class="mt-7 mb-2.5 text-[17px] font-semibold text-neutral-200">3. Root Commands</h3>
				<div class="flex flex-col gap-2">
					{#each devCommands as { cmd, desc } (cmd)}
						<div
							class="grid grid-cols-1 items-baseline gap-1 rounded-md border border-neutral-800 bg-neutral-900/70 px-3 py-2 sm:grid-cols-[220px_1fr] sm:gap-4"
						>
							<code
								class="justify-self-start rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[13px] whitespace-nowrap text-neutral-200"
								>{cmd}</code
							>
							<span class="text-neutral-400">{desc}</span>
						</div>
					{/each}
				</div>

				<h3 class="mt-7 mb-2.5 text-[17px] font-semibold text-neutral-200">
					4. Key Monorepo Files
				</h3>
				<div class="flex flex-col gap-2">
					{#each keyFiles as { file, desc } (file)}
						<div
							class="grid grid-cols-1 items-baseline gap-1 rounded-md border border-neutral-800 bg-neutral-900/70 px-3 py-2 sm:grid-cols-[250px_1fr] sm:gap-4"
						>
							<code
								class="justify-self-start rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[13px] whitespace-nowrap text-neutral-200"
								>{file}</code
							>
							<span class="text-neutral-400">{desc}</span>
						</div>
					{/each}
				</div>
			</section>
		</div>

		<div class="flex flex-col items-center gap-1.5 text-[15px] sm:flex-row sm:gap-2">
			<p class="m-0 text-neutral-400">Update this page by editing</p>
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
			<a class="rounded bg-neutral-800 px-2 py-0.5 text-white no-underline" href={data.fileURL}>
				<code class="font-mono text-[13px]">apps/web/src/routes/+page.svelte</code>
			</a>
		</div>
	</div>
</div>
