<script lang="ts">
	import { tick } from 'svelte';
	import { Check, ChevronDown, Search } from 'lucide-svelte';

	let {
		services,
		value,
		onChange
	}: {
		services: string[];
		value: string | null;
		onChange: (service: string) => void;
	} = $props();

	const dd = $props.id();
	let panelEl = $state<HTMLDivElement | null>(null);
	let searchEl = $state<HTMLInputElement | null>(null);
	let query = $state('');
	let open = $state(false);

	const options = $derived.by(() => {
		const names = value !== null && !services.includes(value) ? [value, ...services] : services;
		return [
			{ value: '', label: 'All services' },
			...names.map((name) => ({ value: name, label: name }))
		];
	});
	const filtered = $derived.by(() => {
		const normalized = query.trim().toLowerCase();
		return normalized === ''
			? options
			: options.filter((option) => option.label.toLowerCase().includes(normalized));
	});
	const label = $derived(value ?? 'All services');

	function close() {
		panelEl?.togglePopover(false);
	}

	function choose(next: string) {
		close();
		onChange(next);
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && query.trim() !== '' && filtered[0]) choose(filtered[0].value);
	}

	function onToggle(event: Event) {
		open = (event as ToggleEvent).newState === 'open';
		if (!open) return;
		query = '';
		void tick().then(() => searchEl?.focus());
	}
</script>

<div class="grid w-fit min-w-0 gap-1.5">
	<span id={`${dd}-label`} class="sr-only">Service</span>
	<button
		type="button"
		popovertarget={dd}
		style="anchor-name:--{dd}"
		class="border-base-content/20 bg-base-100 hover:bg-base-200 flex h-8 w-64 cursor-pointer items-center justify-between gap-2 rounded border px-2 text-xs"
		aria-labelledby={`${dd}-label`}
		aria-haspopup="listbox"
		aria-expanded={open}
	>
		<span class="truncate">{label}</span>
		<ChevronDown class="text-muted size-3 shrink-0" aria-hidden="true" />
	</button>
</div>

<div
	bind:this={panelEl}
	popover
	id={dd}
	style="position-anchor:--{dd}"
	ontoggle={onToggle}
	class="dropdown border-line rounded-box bg-base-100 mt-1 w-64 border shadow-lg"
>
	<div class="border-line border-b p-2">
		<label class="input input-sm w-full">
			<Search class="text-muted size-3.5" aria-hidden="true" />
			<input
				bind:this={searchEl}
				bind:value={query}
				type="search"
				placeholder="Search services…"
				aria-label="Search services"
				onkeydown={onKeydown}
			/>
		</label>
	</div>
	<div role="listbox" aria-label="Services" class="max-h-64 overflow-y-auto py-1">
		{#if filtered.length === 0}
			<p class="text-subtle px-3 py-6 text-center text-xs">No matching services.</p>
		{:else}
			{#each filtered as option (option.value)}
				<button
					type="button"
					role="option"
					aria-selected={option.value === (value ?? '')}
					class="hover:bg-base-200 flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left text-xs"
					onclick={() => choose(option.value)}
				>
					<span class="truncate">{option.label}</span>
					{#if option.value === (value ?? '')}
						<Check class="size-3.5 shrink-0" aria-hidden="true" />
					{/if}
				</button>
			{/each}
		{/if}
	</div>
</div>
