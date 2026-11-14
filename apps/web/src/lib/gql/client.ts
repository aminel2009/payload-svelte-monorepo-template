import { GraphQLClient } from 'graphql-request';
import { PUBLIC_GRAPHQL_ENDPOINT } from '$app/env/public';
import { getSdk } from './generated.ts';

type ClientConfig = NonNullable<ConstructorParameters<typeof GraphQLClient>[1]>;

export type ApiOptions = {
	endpoint?: string;
	headers?: ClientConfig['headers'];
};

function resolveEndpoint(endpoint: string): string {
	if (/^https?:\/\//i.test(endpoint)) {
		return endpoint;
	}
	if (typeof window !== 'undefined') {
		return new URL(endpoint, window.location.origin).toString();
	}
	const cmsOrigin =
		(typeof process !== 'undefined' &&
			(process.env.CMS_URL || `http://127.0.0.1:${process.env.PORT || '3000'}`)) ||
		'http://127.0.0.1:3000';
	return new URL(endpoint, cmsOrigin).toString();
}

export const api = (fetchFn: typeof fetch = fetch, options: ApiOptions = {}) =>
	getSdk(
		new GraphQLClient(resolveEndpoint(options.endpoint ?? PUBLIC_GRAPHQL_ENDPOINT), {
			fetch: fetchFn,
			headers: options.headers
		})
	);
