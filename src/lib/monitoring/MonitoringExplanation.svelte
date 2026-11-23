<script lang="ts">
    import { MonitoringCalculationKind as Kind, MonitoringCalculationUnit as Unit, type MonitoringCalculationViewModel } from './MonitoringViewModel';

    let { graph }: { graph: MonitoringCalculationViewModel } = $props();
    let nodes = $derived(new Map(graph.nodes.map(node => [node.id, node])));
    const units: Record<Unit, string> = {
        [Unit.USD]: 'USD',
        [Unit.USDPerToken]: 'USD per token',
        [Unit.Tokens]: 'tokens',
        [Unit.Scalar]: ''
    };
</script>

{#snippet expression(id: string)}
    {@const node = nodes.get(id)}
    {#if !node}
        Unavailable
    {:else if node.kind === Kind.Known}
        {node.value} {units[node.unit]}
    {:else if node.kind === Kind.Unknown}
        <strong>Unknown {units[node.unit]}</strong>
        {#if node.unknown}
            <span>({node.unknown.reason.replaceAll('-', ' ')})</span>
            {#if node.unknown.pricing?.model}<span> · {node.unknown.pricing.model}</span>{/if}
            {#if node.unknown.pricing?.timestamp}<span> · {node.unknown.pricing.timestamp}</span>{/if}
        {/if}
        {#if node.sharedTotalId !== null}
            <span> · shared total {@render expression(node.sharedTotalId)}</span>
        {/if}
    {:else if node.kind === Kind.Reference && node.operandIds[0] !== undefined}
        {@render expression(node.operandIds[0])}
    {:else if node.operandIds.length > 0}
        <span>(</span>{#each node.operandIds as operand, index}{#if index > 0}{node.kind === Kind.Product ? ' × ' : ' + '}{/if}{@render expression(operand)}{/each}<span>)</span>
    {:else}
        0 {units[node.unit]}
    {/if}
{/snippet}

<div class="explanation">
    {#if graph.unresolvedTermIds.length > 0}
        <strong>Unresolved terms</strong>
        <ul>
            {#each graph.unresolvedTermIds as id}
                <li>{@render expression(id)}</li>
            {/each}
        </ul>
    {/if}
    {#if graph.rates.length > 0}
        <strong>Rates used</strong>
        <ul>
            {#each graph.rates as rate (rate.id)}
                <li>
                    {rate.model} · {rate.category}{rate.detail ? ` · ${rate.detail}` : ''} · ${rate.usdAmount} USD per {rate.tokenUnit} tokens
                    <div>Effective {rate.effectiveFrom}{rate.effectiveUntil ? ` to ${rate.effectiveUntil}` : ''}</div>
                    {#each rate.assumptions as assumption}<div>{assumption}</div>{/each}
                </li>
            {/each}
        </ul>
    {:else if !graph.unresolvedTermIds.length}
        {@render expression(graph.rootId)}
    {/if}
</div>

<style>
    .explanation
    {
        margin-top: 0.35rem;
        padding: 0.5rem;
        border: 1px solid #dce1e8;
        border-radius: 0.25rem;
        background: #f5f7fa;
        color: #304259;
    }

    ul
    {
        margin: 0.25rem 0;
        padding-left: 1.1rem;
    }

    li + li
    {
        margin-top: 0.35rem;
    }
</style>
