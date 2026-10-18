<script lang="ts">
	import { fromUnixTime } from 'date-fns';
	import { ChevronDown } from 'lucide-svelte';

	import {
		formatTimeRangeLabel,
		PRESET_LABELS,
		PRESET_OPTIONS,
		resolveWindow,
		type Preset
	} from '#lib/utils/time-range.js';
	import { formatInZone, parseRangeDateTime } from '#lib/utils/time.js';
	import { timeZone } from '#lib/stores/time-zone.svelte.js';
	import type { TimeRange } from '#lib/types.js';

	let {
		value,
		onChange
	}: {
		value: TimeRange;
		onChange: (next: TimeRange) => void;
	} = $props();

	const label = $derived(formatTimeRangeLabel(value));

	const dd = $props.id();
	let panelEl = $state<HTMLDivElement | null>(null);

	function close() {
		panelEl?.togglePopover(false);
	}

	function selectPreset(preset: Preset) {
		onChange({ type: 'relative', preset });
		close();
	}

	let dateStart = $state('');
	let timeStart = $state('');
	let dateEnd = $state('');
	let timeEnd = $state('');

	function seedDraft(v: TimeRange) {
		const { startTs: startSec, endTs: endSec } = resolveWindow(v);
		// A relative window ends at "now"; its seconds would turn a plain re-apply into a seconds range.
		const timePattern = (sec: number) =>
			v.type === 'absolute' && sec % 60 !== 0 ? 'HH:mm:ss' : 'HH:mm';
		dateStart = formatInZone(fromUnixTime(startSec), 'yyyy-MM-dd');
		timeStart = formatInZone(fromUnixTime(startSec), timePattern(startSec));
		dateEnd = formatInZone(fromUnixTime(endSec), 'yyyy-MM-dd');
		timeEnd = formatInZone(fromUnixTime(endSec), timePattern(endSec));
	}

	function onToggle(e: Event) {
		if ((e as ToggleEvent).newState === 'open') seedDraft(value);
	}

	const draft = $derived.by((): { range: TimeRange | null; error: string } => {
		const start = parseRangeDateTime(dateStart, timeStart);
		const end = parseRangeDateTime(dateEnd, timeEnd);
		if (start === null || end === null) {
			return { range: null, error: 'Enter a date and a time as HH:MM or HH:MM:SS' };
		}
		if (end <= start) return { range: null, error: 'End must be after start' };
		return { range: { type: 'absolute', start, end }, error: '' };
	});

	function apply() {
		if (!draft.range) return;
		onChange(draft.range);
		close();
	}
</script>

<button
	type="button"
	popovertarget={dd}
	style="anchor-name:--{dd}"
	title={timeZone.utc ? `${label} (UTC)` : label}
	class="border-base-content/20 bg-base-100 hover:bg-base-200 text-ui focus-visible:border-base-content flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded border px-2 select-none"
>
	<span>{label}</span>
	{#if timeZone.utc}
		<span class="text-muted shrink-0">UTC</span>
	{/if}
	<ChevronDown class="text-muted size-3 shrink-0" aria-hidden="true" />
</button>

<div
	bind:this={panelEl}
	popover
	id={dd}
	style="position-anchor:--{dd}"
	ontoggle={onToggle}
	class="dropdown dropdown-end border-line rounded-box bg-base-100 mt-1 flex border shadow-lg"
>
	<div class="border-line flex w-44 flex-col border-r p-3">
		<p class="section-label mb-2">Ranges</p>
		{#each PRESET_OPTIONS as preset (preset)}
			{@const active = value.type === 'relative' && value.preset === preset}
			<button
				type="button"
				class="-mx-3 flex items-baseline justify-between gap-2 px-3 py-1.5 text-left text-xs transition-colors {active
					? 'bg-base-content text-base-100'
					: 'text-base-content hover:bg-base-200'}"
				onclick={() => selectPreset(preset)}
			>
				<span>{PRESET_LABELS[preset]}</span>
				<span class={[!active && 'text-muted']}>{preset}</span>
			</button>
		{/each}
	</div>

	<form
		class="flex w-72 flex-col p-3"
		onsubmit={(e) => {
			e.preventDefault();
			apply();
		}}
	>
		<p class="section-label mb-2">Absolute range{timeZone.utc ? ' (UTC)' : ''}</p>

		<p class="text-muted mb-1 text-xs">From</p>
		<div class="flex gap-2">
			<input
				type="date"
				class="input input-sm flex-1 font-mono"
				aria-describedby="time-range-error"
				aria-label="From date"
				bind:value={dateStart}
			/>
			<input
				type="text"
				inputmode="numeric"
				placeholder="HH:MM:SS"
				maxlength="8"
				class="input input-sm w-24 font-mono"
				aria-describedby="time-range-error"
				aria-label="From time"
				bind:value={timeStart}
			/>
		</div>

		<p class="text-muted mt-2 mb-1 text-xs">To</p>
		<div class="flex gap-2">
			<input
				type="date"
				class="input input-sm flex-1 font-mono"
				aria-describedby="time-range-error"
				aria-label="To date"
				bind:value={dateEnd}
			/>
			<input
				type="text"
				inputmode="numeric"
				placeholder="HH:MM:SS"
				maxlength="8"
				class="input input-sm w-24 font-mono"
				aria-describedby="time-range-error"
				aria-label="To time"
				bind:value={timeEnd}
			/>
		</div>

		<p id="time-range-error" class="text-error mt-2 min-h-4 text-xs" aria-live="polite">
			{draft.error}
		</p>

		<div class="mt-auto flex justify-end gap-2 pt-3">
			<button type="button" class="btn btn-ghost btn-sm" onclick={close}>Cancel</button>
			<button type="submit" class="btn btn-primary btn-sm" disabled={!draft.range}>Apply</button>
		</div>
	</form>
</div>
