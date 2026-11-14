import fs from 'node:fs';
import path from 'node:path';
import type { CodegenConfig } from '@graphql-codegen/cli';

for (const envPath of [path.resolve('.env'), path.resolve('../../.env')]) {
	if (fs.existsSync(envPath)) {
		try {
			process.loadEnvFile?.(envPath);
		} catch {
			// Ignore unreadable .env files
		}
	}
}

const port = process.env.PORT || '3000';
const publicEndpoint = process.env.PUBLIC_GRAPHQL_ENDPOINT;
const schemaUrl =
	process.env.GRAPHQL_SCHEMA_URL ||
	(publicEndpoint && /^https?:\/\//i.test(publicEndpoint) ? publicEndpoint : null) ||
	`http://127.0.0.1:${port}/_/api/graphql`;

const config: CodegenConfig = {
	schema: schemaUrl,
	documents: ['src/**/*.gql'],
	overwrite: true,
	hooks: { afterAllFileWrite: ['prettier --write'] },
	generates: {
		'src/lib/gql/generated.ts': {
			plugins: ['typescript', 'typescript-operations', 'typescript-graphql-request'],
			config: {
				useTypeImports: true,
				enumsAsTypes: true,
				avoidOptionals: true,
				skipTypename: false,
				rawRequest: false,
				dedupeFragments: true
			}
		}
	}
};

export default config;
