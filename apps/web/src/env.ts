import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	PUBLIC_GRAPHQL_ENDPOINT: {
		public: true,
		description: 'URL of the GraphQL API used by the generated SDK (relative path or full URL).',
		schema: (value) => value || '/_/api/graphql'
	}
});
