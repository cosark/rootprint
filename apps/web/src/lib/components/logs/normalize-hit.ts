import { epochToMs } from 'api/time';
import { getUnixTime, isValid, parseISO } from 'date-fns';

import type { FieldConfig, LogHit } from '#lib/types.js';
import { getByPath } from './get-by-path';

export function normalizeHit(raw: Record<string, unknown>, index: number, fc: FieldConfig): LogHit {
	return {
		key: String(index),
		timestamp: coerceIso(getByPath(raw, fc.timestampField)),
		level: String(getByPath(raw, fc.levelField) ?? '').toLowerCase(),
		message: String(getByPath(raw, fc.messageField) ?? ''),
		raw
	};
}

/** A raw hit's timestamp as epoch seconds; NaN when missing or unparseable. */
export function hitTimestampSeconds(raw: Record<string, unknown>, fc: FieldConfig): number {
	const parsed = parseISO(coerceIso(getByPath(raw, fc.timestampField)));
	return isValid(parsed) ? getUnixTime(parsed) : NaN;
}

function coerceIso(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number') {
		const ms = epochToMs(value);
		if (!Number.isFinite(ms) || Math.abs(ms) > 8.64e15) return '';
		return new Date(ms).toISOString();
	}
	return '';
}
