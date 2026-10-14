import type { Context } from 'hono';

import { config } from '../../config.js';
import { badRequest, serviceUnavailable } from '../../utils/http-error.js';

export type ProxyResult = {
	status: number;
	headers: Headers;
	bodyBytes: ArrayBuffer;
};

/** Quickwit reports errors as `{message}` JSON; anything else is surfaced as clipped raw text. */
export function readUpstreamMessage(bodyBytes: ArrayBuffer, fallback: string): string {
	const text = new TextDecoder().decode(bodyBytes);
	if (!text) return fallback;
	try {
		const parsed = JSON.parse(text) as unknown;
		if (
			parsed &&
			typeof parsed === 'object' &&
			'message' in parsed &&
			typeof (parsed as { message: unknown }).message === 'string'
		) {
			return (parsed as { message: string }).message;
		}
	} catch {
		// body was not JSON; fall through to raw text
	}
	return text.length > 512 ? text.slice(0, 512) : text;
}

type ProxyOpts = {
	upstreamUrl: string;
	headers: Record<string, string>;
};

function parseContentLength(header: string | undefined): number | null {
	if (!header) return null;
	const n = Number(header);
	if (!Number.isInteger(n) || n < 0) return null;
	return n;
}

const upstreamUnavailable = (cause: unknown) =>
	serviceUnavailable('Upstream unavailable', 'UPSTREAM_UNAVAILABLE', undefined, cause);

export async function proxyToQuickwit(c: Context, opts: ProxyOpts): Promise<ProxyResult> {
	const reqBody = c.req.raw.body;
	if (!reqBody) throw badRequest('Request body is required', 'EMPTY_BODY');

	// Quickwit answers 200 with num_docs_for_processing: 0 to an empty body, which reads as success.
	if (parseContentLength(c.req.header('content-length')) === 0) {
		throw badRequest('Request body is required', 'EMPTY_BODY');
	}

	let upstream: Response;
	try {
		upstream = await fetch(opts.upstreamUrl, {
			method: 'POST',
			headers: opts.headers,
			body: reqBody,
			duplex: 'half',
			signal: AbortSignal.timeout(config.ingestProxyTimeoutMs)
		} as RequestInit);
	} catch (err) {
		throw upstreamUnavailable(err);
	}

	if (upstream.status >= 500) {
		// Quickwit answers some client faults (an empty OTLP request) with 500; its message says which.
		const detail = await upstream.arrayBuffer().then(
			(bytes) => readUpstreamMessage(bytes, ''),
			() => ''
		);
		throw upstreamUnavailable(
			new Error(`Quickwit returned HTTP ${upstream.status}${detail ? `: ${detail}` : ''}`)
		);
	}
	// The timeout signal stays armed while the body streams, so an abort here must still read as 503.
	let bodyBytes: ArrayBuffer;
	try {
		bodyBytes = await upstream.arrayBuffer();
	} catch (err) {
		throw upstreamUnavailable(err);
	}
	return { status: upstream.status, headers: upstream.headers, bodyBytes };
}
