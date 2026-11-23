<script lang="ts">
    import { MonitoringTokenCategory, type MonitoringAmountViewModel, type MonitoringCalculationViewModel, type MonitoringUsageViewModel } from './MonitoringViewModel';
    import MonitoringExplanation from './MonitoringExplanation.svelte';

    interface Props
    {
        label: string;
        amount: MonitoringUsageViewModel | null;
        calculations: ReadonlyMap<string, MonitoringCalculationViewModel>;
        openExplanations: readonly string[];
        loading: boolean;
        transportFailed: boolean;
        onToggle: (id: string) => void;
    }

    let { label, amount, calculations, openExplanations, loading, transportFailed, onToggle }: Props = $props();
    const labels: Record<MonitoringTokenCategory, string> = {
        [MonitoringTokenCategory.Input]: 'Input',
        [MonitoringTokenCategory.Output]: 'Output',
        [MonitoringTokenCategory.CacheRead]: 'Cache read',
        [MonitoringTokenCategory.CacheWrite]: 'Cache write'
    };
</script>

{#snippet value(metric: MonitoringAmountViewModel, label: string, currency = false)}
    {@const open = openExplanations.includes(metric.explanationId)}
    {@const graph = calculations.get(metric.explanationId)}
    <div class="value">
        <span>
            {#if metric.unresolvedTermCount && metric.knownSubtotal === '0'}
                <strong>Unknown</strong>
            {:else}
                <strong>{currency ? '$' : ''}{metric.knownSubtotal}</strong>{metric.unresolvedTermCount ? ' + unknown' : ''}
            {/if}
        </span>
        {#if metric.unresolvedTermCount || currency}
            <button type="button" aria-expanded={open} aria-label={`${open ? 'Hide' : 'Explain'} ${label}`} onclick={() => onToggle(metric.explanationId)}>
                {open ? 'Hide' : 'Explain'}
            </button>
        {/if}
        {#if open}
            {#if graph}
                <MonitoringExplanation {graph} />
            {:else if loading}
                <span role="status">Loading explanation…</span>
            {:else}
                <span>{transportFailed ? 'Could not load the explanation. Use Refresh to retry.' : 'Explanation unavailable.'}</span>
            {/if}
        {/if}
    </div>
{/snippet}

<div class="totals">
    <div class="heading">
        <strong>{label}</strong>
        {#if amount}
            <div class="estimate">
                <span>Estimated cost (USD)</span>
                {@render value(amount.cost, `${label} estimated cost`, true)}
            </div>
        {/if}
    </div>
    {#if amount}
        <dl>
            {#each amount.categories as category (category.category)}
                <div>
                    <dt>{labels[category.category]} tokens</dt>
                    <dd>{@render value(category.tokens, `${label} ${labels[category.category].toLowerCase()} tokens`)}</dd>
                </div>
            {/each}
        </dl>
    {:else}
        <p>Usage unavailable</p>
    {/if}
</div>

<style>
    .totals
    {
        padding: 0.625rem 0.75rem;
        border: 1px solid #dce1e8;
        border-radius: 0.375rem;
        background: #ffffffed;
        font-size: 0.875rem;
    }

    .heading
    {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem 1.25rem;
        justify-content: space-between;
    }

    .estimate
    {
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
        gap: 0.35rem 0.5rem;
    }

    dl
    {
        display: grid;
        gap: 0.5rem 0.875rem;
        grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr));
        margin: 0.5rem 0 0;
    }

    dt
    {
        color: #435469;
    }

    dd, p
    {
        margin: 0.2rem 0 0;
    }

    .value
    {
        font-variant-numeric: tabular-nums;
        overflow-wrap: anywhere;
    }

    button
    {
        padding: 0.15rem 0.35rem;
        border: 0;
        background: transparent;
        color: #174d9b;
        font: inherit;
        text-decoration: underline;
        cursor: pointer;
    }
</style>
