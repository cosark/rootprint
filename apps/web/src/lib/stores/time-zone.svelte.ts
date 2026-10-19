import { readString, removeKey, writeString } from '#lib/utils/safe-storage.js';

const STORAGE_KEY = 'rootprint:time-zone';

/** Read inside the time formatters, so every caller re-renders when it flips. */
export const timeZone = $state({ utc: readString(STORAGE_KEY) === 'utc' });

export function setUtc(utc: boolean) {
	timeZone.utc = utc;
	if (utc) writeString(STORAGE_KEY, 'utc');
	else removeKey(STORAGE_KEY);
}
