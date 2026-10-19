import type { HistogramBucket } from '#lib/types.js';

/** Fills a uniform grid over [startTs, endTs]; sparse buckets render as zeros. */
export function padHistogramBuckets(
	bucketMap: Map<number, { levels: Record<string, number>; count: number }>,
	startTs: number,
	endTs: number,
	intervalSec: number
): HistogramBucket[] {
	if (intervalSec <= 0) return [];
	const sortedKeys = [...bucketMap.keys()].toSorted((a, b) => a - b);

	let gridStart: number;
	if (sortedKeys.length > 0) {
		gridStart = sortedKeys[0];
		while (gridStart - intervalSec >= startTs) {
			gridStart -= intervalSec;
		}
	} else {
		gridStart = Math.floor(startTs / intervalSec) * intervalSec;
	}

	const buckets: HistogramBucket[] = [];
	for (let ts = gridStart; ts <= endTs; ts += intervalSec) {
		const entry = bucketMap.get(ts);
		buckets.push({
			timestamp: ts,
			levels: entry?.levels ?? {},
			count: entry?.count ?? 0
		});
	}

	return buckets;
}
