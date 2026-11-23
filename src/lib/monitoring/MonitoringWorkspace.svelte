<script lang="ts">
    import { SessionDiscoveryStatus } from '../sessions/SessionDiscoveryViewModel';
    import type { MonitoringResponseViewModel, MonitoringSessionSummaryViewModel } from './MonitoringViewModel';
    import MonitoringSessionCard from './MonitoringSessionCard.svelte';

    let { initial }: { initial: MonitoringResponseViewModel } = $props();
    let refreshed = $state.raw<MonitoringResponseViewModel | null>(null);
    let snapshot = $derived(refreshed && (refreshed.sourceKey !== initial.sourceKey || refreshed.generation >= initial.generation) ? refreshed : initial);
    let expanded = $state<string[]>([]);
    let explanations = $state<string[]>([]);
    let loading = $state(false);
    let failure = $state(false);
    let selectionChanged = false;
    let projects = $derived(groupProjects(snapshot.sessions));
    let orphans = $derived(snapshot.sessions.filter(session => session.orphan).sort(byRecentUpdate));
    let children = $derived(groupChildren(snapshot.sessions));
    let details = $derived(new Map(snapshot.details.map(detail => [detail.sessionKey, detail])));
    let calculations = $derived(new Map(snapshot.calculations.map(calculation => [calculation.id, calculation])));

    function byRecentUpdate(left: MonitoringSessionSummaryViewModel, right: MonitoringSessionSummaryViewModel): number
    {
        return right.modifiedAt.localeCompare(left.modifiedAt) || left.filename.localeCompare(right.filename) || left.key.localeCompare(right.key);
    }

    function groupProjects(sessions: readonly MonitoringSessionSummaryViewModel[]): [string, MonitoringSessionSummaryViewModel[]][]
    {
        const groups = Map.groupBy(sessions.filter(session => session.parentKey === null && !session.orphan), session => session.projectPath);
        return [...groups].sort(([left], [right]) => left.localeCompare(right)).map(([path, members]) => [path, members.sort(byRecentUpdate)]);
    }

    function groupChildren(sessions: readonly MonitoringSessionSummaryViewModel[]): Map<string | null, MonitoringSessionSummaryViewModel[]>
    {
        const groups = Map.groupBy(sessions.filter(session => session.parentKey !== null), session => session.parentKey);
        for (const members of groups.values())
        {
            members.sort(byRecentUpdate);
        }
        return groups;
    }

    function toggle(id: string, ids: string[]): string[]
    {
        return ids.includes(id) ? ids.filter(candidate => candidate !== id) : [...ids, id];
    }

    function toggleActivity(key: string): void
    {
        expanded = toggle(key, expanded);
        requestSelection(expanded.includes(key) && !details.has(key));
    }

    function toggleExplanation(id: string): void
    {
        explanations = toggle(id, explanations);
        requestSelection(explanations.includes(id) && !calculations.has(id));
    }

    function requestSelection(needsData: boolean): void
    {
        if (loading)
        {
            selectionChanged = true;
        }
        else if (needsData)
        {
            void refresh();
        }
    }

    async function refresh(): Promise<void>
    {
        if (loading)
        {
            return;
        }

        loading = true;
        try
        {
            do
            {
                selectionChanged = false;
                const response = await fetch('/monitoring/refresh', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ expandedSessionKeys: expanded, explanationIds: explanations })
                });
                if (!response.ok)
                {
                    throw new Error('Monitoring refresh failed.');
                }

                const next = await response.json() as MonitoringResponseViewModel;
                if (next.sourceKey !== snapshot.sourceKey)
                {
                    expanded = [];
                    explanations = [];
                    selectionChanged = false;
                }
                refreshed = next;
                failure = false;
            }
            while (selectionChanged);
        }
        catch
        {
            failure = true;
        }
        finally
        {
            loading = false;
        }
    }
</script>

{#snippet card(session: MonitoringSessionSummaryViewModel)}
    <MonitoringSessionCard
        {session}
        expanded={expanded.includes(session.key)}
        detail={details.get(session.key)}
        {calculations}
        openExplanations={explanations}
        {loading}
        transportFailed={failure}
        onToggleActivity={() => toggleActivity(session.key)}
        onToggleExplanation={toggleExplanation}
    />
{/snippet}

<section aria-labelledby="monitoring-sessions">
    <div class="toolbar">
        <h2 id="monitoring-sessions">Sessions <span>{snapshot.sessions.length}</span></h2>
        <button type="button" onclick={refresh} disabled={loading}>Refresh</button>
    </div>
    <div class="status" role="status">{loading ? 'Refreshing session data…' : ''}</div>

    {#if failure || snapshot.freshness.stale || snapshot.status === SessionDiscoveryStatus.Failed}
        <div class="notice warning" role="alert">
            <strong>{failure ? 'Refresh failed' : snapshot.status === SessionDiscoveryStatus.Failed ? 'Session discovery failed' : 'Some sessions could not be refreshed'}</strong>
            {#if snapshot.freshness.lastSuccessfulAt}
                <p>Last successful refresh <time datetime={snapshot.freshness.lastSuccessfulAt}>{snapshot.freshness.lastSuccessfulAt}</time>.</p>
            {:else}
                <p>There is no successful refresh yet.</p>
            {/if}
            {#if !failure && snapshot.freshness.issues.length}
                <ul>
                    {#each new Set(snapshot.freshness.issues.map(issue => issue.message)) as message}
                        <li>{message}</li>
                    {/each}
                </ul>
            {/if}
        </div>
    {:else if snapshot.status === SessionDiscoveryStatus.Partial}
        <p class="notice warning">Session data is partial. Available metadata and usage are shown below.</p>
    {/if}

    {#if snapshot.sessions.length === 0}
        <p class="notice">{snapshot.status === SessionDiscoveryStatus.Complete ? 'No session files were found in the local session directory.' : 'No sessions are available to display.'}</p>
    {/if}

    {#each projects as [project, sessions] (project)}
        <section class="project">
            <h3>{project}</h3>
            <ul class="session-list">
                {#each sessions as session (session.key)}
                    <li>
                        {@render card(session)}
                        {#if children.has(session.key)}
                            <div class="subagents">
                                <h4>Subagents</h4>
                                <ul class="session-list">
                                    {#each children.get(session.key) ?? [] as child (child.key)}
                                        <li>{@render card(child)}</li>
                                    {/each}
                                </ul>
                            </div>
                        {/if}
                    </li>
                {/each}
            </ul>
        </section>
    {/each}

    {#if orphans.length}
        <section class="project">
            <h3>Subagents without an available parent</h3>
            <ul class="session-list">
                {#each orphans as session (session.key)}
                    <li>{@render card(session)}</li>
                {/each}
            </ul>
        </section>
    {/if}
</section>

<style>
    .toolbar
    {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
    }

    h2
    {
        margin: 0;
        font-size: 1.125rem;
    }

    h2 span
    {
        margin-left: 0.35rem;
        color: #5c6879;
        font-size: 0.875rem;
        font-weight: 500;
    }

    button
    {
        min-height: 2.75rem;
        padding: 0.5rem 1rem;
        border: 1px solid #a8bde4;
        border-radius: 0.375rem;
        background: #e8effc;
        color: #174d9b;
        font: inherit;
        cursor: pointer;
    }

    button:disabled
    {
        cursor: wait;
        opacity: 0.65;
    }

    .status
    {
        min-height: 1.5rem;
        margin: 0.25rem 0;
        color: #5c6879;
        font-size: 0.875rem;
    }

    .notice
    {
        padding: 0.875rem 1rem;
        border: 1px solid #dce1e8;
        border-radius: 0.5rem;
        background: white;
        overflow-wrap: anywhere;
    }

    .warning
    {
        border-color: #dfc380;
        background: #fff8e8;
        color: #65480f;
    }

    .warning p, .warning ul
    {
        margin: 0.35rem 0 0;
    }

    .project
    {
        margin-top: 1.5rem;
    }

    h3, h4
    {
        margin: 0 0 0.625rem;
        color: #304259;
        font-size: 0.9rem;
        overflow-wrap: anywhere;
    }

    .session-list
    {
        display: grid;
        gap: 0.875rem;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .subagents
    {
        margin: 0.75rem 0 0 0.75rem;
        padding-left: 0.875rem;
        border-left: 2px solid #dce1e8;
    }
</style>
