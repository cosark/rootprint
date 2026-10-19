import { format, getUnixTime, isValid, parse, parseISO } from 'date-fns';

import { timeZone } from '#lib/stores/time-zone.svelte.js';

const ISO_LAYOUT = 'yyyy-MM-dd HH:mm:ss.SSS';

/** `pattern` must be a substring of ISO_LAYOUT: UTC mode slices it out of toISOString(). */
export function formatInZone(d: Date | number, pattern: string): string {
	const start = ISO_LAYOUT.indexOf(pattern);
	if (start < 0) throw new Error(`formatInZone: '${pattern}' is not part of ${ISO_LAYOUT}`);
	if (!timeZone.utc) return format(d, pattern);
	return new Date(d)
		.toISOString()
		.replace('T', ' ')
		.slice(start, start + pattern.length);
}

/** "YYYY-MM-DD HH:MM:SS.SSS" from an ISO string or epoch milliseconds — log and span timestamps. */
export function formatTimestamp(input: string | number): string {
	const d = typeof input === 'string' ? parseISO(input) : new Date(input);
	return isValid(d) ? formatInZone(d, 'yyyy-MM-dd HH:mm:ss.SSS') : '—';
}

/** "YYYY-MM-DD HH:MM:SS" — second precision, used in the activity tables. */
export function formatActivityTimestamp(iso: string): string {
	const d = parseISO(iso);
	return isValid(d) ? formatInZone(d, 'yyyy-MM-dd HH:mm:ss') : '—';
}

const AGE_UNITS = [
	['y', 365 * 86_400],
	['mo', 30 * 86_400],
	['d', 86_400],
	['h', 3600],
	['m', 60]
] as const;

/** "just now", "4m ago", "in 6mo" — compact for dense tables. */
export function formatRelativeTime(input: string | Date): string {
	const d = typeof input === 'string' ? parseISO(input) : input;
	if (!isValid(d)) return '—';
	const seconds = (Date.now() - d.getTime()) / 1000;
	const abs = Math.abs(seconds);
	const unit = AGE_UNITS.find(([, size]) => abs >= size);
	if (!unit) return 'just now';
	const n = `${Math.floor(abs / unit[1])}${unit[0]}`;
	return seconds < 0 ? `in ${n}` : `${n} ago`;
}

/** "June 10, 2026" — locale-aware, date only. */
export function formatDate(input: string | Date): string {
	const d = typeof input === 'string' ? parseISO(input) : input;
	if (!isValid(d)) return '—';
	return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/** "YYYY-MM-DD HH:MM" */
export function formatDateTime(input: string | Date): string {
	const d = typeof input === 'string' ? parseISO(input) : input;
	return isValid(d) ? formatInZone(d, 'yyyy-MM-dd HH:mm') : '—';
}

const RANGE_TIME = /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/;

/** Accepts H:MM, HH:MM and HH:MM:SS; both zones share one grammar so switching never changes validity. */
export function parseRangeDateTime(dateStr: string, timeStr: string): number | null {
	const m = RANGE_TIME.exec(timeStr);
	if (!m) return null;
	const time = `${m[1].padStart(2, '0')}:${m[2]}:${m[3] ?? '00'}`;
	if (timeZone.utc) {
		const ms = Date.parse(`${dateStr}T${time}Z`);
		return Number.isNaN(ms) ? null : ms / 1000;
	}
	const d = parse(`${dateStr} ${time}`, 'yyyy-MM-dd HH:mm:ss', new Date());
	return isValid(d) ? getUnixTime(d) : null;
}

/** `stepMs` is the gap between ticks: below a minute, `HH:mm` would repeat on neighbouring ticks. */
export function formatTickDate(d: Date | number, spanMs: number, stepMs: number): string {
	if (stepMs < 60_000) return formatInZone(d, 'HH:mm:ss');
	const oneDay = 24 * 60 * 60 * 1000;
	return spanMs <= oneDay ? formatInZone(d, 'HH:mm') : formatInZone(d, 'MM-dd HH:mm');
}

export function formatTooltipDate(d: Date | number): string {
	return formatInZone(d, 'yyyy-MM-dd HH:mm:ss');
}
