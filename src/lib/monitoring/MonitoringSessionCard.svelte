<script lang="ts">
    import type { MonitoringCalculationViewModel, MonitoringSessionDetailViewModel, MonitoringSessionSummaryViewModel } from './MonitoringViewModel';
    import MonitoringUsage from './MonitoringUsage.svelte';

    interface Props
    {
        session: MonitoringSessionSummaryViewModel;
        expanded: boolean;
        detail: MonitoringSessionDetailViewModel | undefined;
        calculations: ReadonlyMap<string, MonitoringCalculationViewModel>;
        openExplanations: readonly string[];
        loading: boolean;
        transportFailed: boolean;
        onToggleActivity: () => void;
        onToggleExplanation: (id: string) => void;
    }

    let { session, expanded, detail, calculations, openExplanations, loading, transportFailed, onToggleActivity, onToggleExplanation }: Props = $props();
    let stale = $derived(transportFailed || session.freshness.stale);
    let sourceUpdatedAt = $derived(session.sourceUpdatedAt);
    let updateAge = $derived(sourceUpdatedAt === null ? 60000 : Math.max(0, Date.now() - Date.parse(sourceUpdatedAt)));
    let ownLabel = $derived(session.agentId === null ? 'Parent only' : 'Subagent usage');
</script>

<article>
    {#key sourceUpdatedAt}
        {#if updateAge < 60000}
            <div aria-hidden="true" class="recent" style:animation-delay={`-${updateAge}ms`}></div>
        {/if}
    {/key}
    <div class="content">
        <header>
            <div>
                <h4>{session.filename}</h4>
                <p class="identity">{session.agentId === null ? 'Session' : 'Subagent'} <code>{session.agentId ?? session.sessionId}</code></p>
            </div>
            {#if stale}<span class="stale">Stale</span>{/if}
        </header>
        <dl class="timestamps">
            <div>
                <dt>Source updated</dt>
                <dd>{#if session.sourceUpdatedAt}<time datetime={session.sourceUpdatedAt}>{session.sourceUpdatedAt}</time>{:else}Unavailable{/if}</dd>
            </div>
            <div>
                <dt>Latest activity</dt>
                <dd>{#if session.latestActivityAt}<time datetime={session.latestActivityAt}>{session.latestActivityAt}</time>{:else}Unavailable{/if}</dd>
            </div>
        </dl>

        {#if stale}
            <p class="flag">
                {#if session.freshness.lastSuccessfulAt}
                    Last successful refresh <time datetime={session.freshness.lastSuccessfulAt}>{session.freshness.lastSuccessfulAt}</time>.
                {:else}
                    No successful refresh yet.
                {/if}
            </p>
        {/if}
        {#if session.freshness.issues.length}
            <ul class="flag">
                {#each new Set(session.freshness.issues.map(issue => issue.message)) as message}
                    <li>{message}</li>
                {/each}
            </ul>
        {/if}

        <div class="usage">
            <MonitoringUsage label={ownLabel} amount={session.ownUsage} {calculations} {openExplanations} {loading} {transportFailed} onToggle={onToggleExplanation} />
            {#if session.agentId === null}
                <MonitoringUsage
                    label="Parent + subagents"
                    amount={session.combinedUsage}
                    {calculations}
                    {openExplanations}
                    {loading}
                    {transportFailed}
                    onToggle={onToggleExplanation}
                />
            {/if}
        </div>

        <button type="button" aria-expanded={expanded} onclick={onToggleActivity}>{expanded ? 'Hide activity' : 'Show activity'}</button>
        {#if expanded}
            <div class="activity" aria-busy={loading && !detail}>
                {#if detail}
                    <dl>
                        <div><dt>Created</dt><dd><time datetime={session.createdAt}>{session.createdAt}</time></dd></div>
                        <div><dt>File size</dt><dd>{session.sizeBytes.toLocaleString('en-US')} bytes</dd></div>
                        <div><dt>Messages</dt><dd>{detail.messageCount}</dd></div>
                        <div><dt>Turns</dt><dd>{detail.turnCount}</dd></div>
                        <div><dt>Models</dt><dd>{detail.models.join(', ') || 'Unavailable'}</dd></div>
                        {#if detail.latestActivityKind}
                            <div><dt>Latest recorded activity</dt><dd>{detail.latestActivityKind.replaceAll('-', ' ')}</dd></div>
                        {/if}
                    </dl>
                    {#if detail.chronologyUncertain}<p>Some timestamps are missing or ambiguous.</p>{/if}
                    {#if detail.issues.length}
                        <details>
                            <summary>Activity notes</summary>
                            <ul>
                                {#each new Set(detail.issues.map(issue => issue.message)) as message}
                                    <li>{message}</li>
                                {/each}
                            </ul>
                        </details>
                    {/if}
                {:else if loading}
                    <p role="status">Loading activity…</p>
                {:else}
                    <p>{transportFailed ? 'Could not load activity. Use Refresh to retry.' : 'Activity is unavailable.'}</p>
                {/if}
            </div>
        {/if}
    </div>
</article>

<style>
    article
    {
        position: relative;
        overflow: hidden;
        border: 1px solid #dce1e8;
        border-radius: 0.5rem;
        background: white;
        color: #172438;
    }

    .recent
    {
        position: absolute;
        inset: 0;
        background: #ffef00;
        pointer-events: none;
        animation: recency 60s linear both;
    }

    @keyframes recency
    {
        0%, 8.333333% { opacity: 1; }
        100% { opacity: 0; }
    }

    .content
    {
        position: relative;
        padding: 0.875rem 1rem;
    }

    header
    {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.75rem;
    }

    h4, p
    {
        margin: 0;
        overflow-wrap: anywhere;
    }

    h4
    {
        font-size: 1rem;
    }

    .identity, dl, .flag, button
    {
        font-size: 0.875rem;
    }

    .identity
    {
        margin-top: 0.2rem;
    }

    .stale
    {
        padding: 0.2rem 0.5rem;
        border-radius: 0.25rem;
        background: #fff0cd;
        color: #703a00;
        font-size: 0.8rem;
        font-weight: 700;
    }

    dl
    {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem 1.25rem;
        margin: 0.75rem 0;
    }

    dt
    {
        font-weight: 600;
    }

    dd
    {
        margin: 0.15rem 0 0;
        overflow-wrap: anywhere;
    }

    .flag, .activity
    {
        margin: 0.5rem 0;
    }

    .usage
    {
        display: grid;
        gap: 0.625rem;
        margin: 0.75rem 0;
    }

    button
    {
        min-height: 2rem;
        padding: 0.25rem 0.625rem;
        border: 1px solid #a8bde4;
        border-radius: 0.375rem;
        background: #f3f7ff;
        color: #174d9b;
        cursor: pointer;
    }
</style>
