<script lang="ts">
    import { invalidateAll } from '$app/navigation';
    import { SessionDiscoveryStatus } from '../lib/sessions/SessionDiscoveryViewModel';
    import SessionFileMetadata from '../lib/sessions/SessionFileMetadata.svelte';
    import type { PageProps } from './$types';

    let { data }: PageProps = $props();
    let refreshing = $state(false);
    let refreshIssue = $state<string | null>(null);

    async function refresh(): Promise<void>
    {
        // Prevent overlapping requests and keep existing results visible while loading.
        if (refreshing)
        {
            return;
        }

        refreshing = true;
        refreshIssue = null;

        try
        {
            await invalidateAll();
        }
        catch
        {
            refreshIssue = 'Could not refresh sessions. Please try again.';
        }
        finally
        {
            refreshing = false;
        }
    }
</script>

<svelte:head>
    <title>Monitoring | Usage Tracker</title>
    <meta name="description" content="Monitor active Claude Code sessions." />
</svelte:head>

<header>
    <h1>Monitoring</h1>
    <p>Follow active sessions and their latest activity.</p>
</header>

<div class="monitoring-workspace">
    <section aria-labelledby="sessions-title">
        <div class="sessions-heading">
            <h2 id="sessions-title">Sessions</h2>
            <button type="button" onclick={refresh} disabled={refreshing}>Refresh</button>
        </div>
        <p class="refresh-status" role="status">{refreshing ? 'Refreshing sessionsâ€¦' : ''}</p>

        {#if refreshIssue !== null}
            <p role="alert">{refreshIssue}</p>
        {/if}

        <div aria-busy={refreshing}>
            {#if data.sessionList.status === SessionDiscoveryStatus.Failed}
                <p>Session discovery failed. The session directory could not be read. Review the warnings below and try Refresh again.</p>
            {:else if data.sessionList.empty}
                <p>No session files were found in the local session directory.</p>
            {:else if data.sessionList.projects.length === 0 && data.sessionList.orphanSubagents.length === 0}
                <p>No sessions could be listed. Discovery was incomplete; review the warnings below.</p>
            {/if}

            {#if data.sessionList.warnings.length > 0}
                <div class="warnings">
                    <h3>Session warnings</h3>
                    <p>Available session metadata is shown below. Some files or records could not be read.</p>
                    <ul>
                        {#each data.sessionList.warnings as warning}
                            <li>
                                <strong>{warning.path}</strong>
                                {#if warning.lineNumber !== undefined}
                                    <span> â€” line {warning.lineNumber}</span>
                                {/if}
                                <p>{warning.message}</p>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}

            {#each data.sessionList.projects as project (project.projectPath)}
                <div class="project-group">
                    <h3>{project.projectPath}</h3>
                    <ul class="session-list">
                        {#each project.sessions as session (session.path)}
                            <li class="session">
                                <SessionFileMetadata {session} />
                                {#if session.subagents.length > 0}
                                    <h4>Subagents</h4>
                                    <ul class="subagent-list">
                                        {#each session.subagents as subagent (subagent.path)}
                                            <li><SessionFileMetadata session={subagent} /></li>
                                        {/each}
                                    </ul>
                                {/if}
                            </li>
                        {/each}
                    </ul>
                </div>
            {/each}

            {#if data.sessionList.orphanSubagents.length > 0}
                <div class="project-group">
                    <h3>Subagents without an available parent</h3>
                    <ul class="session-list">
                        {#each data.sessionList.orphanSubagents as session (session.path)}
                            <li class="session"><SessionFileMetadata {session} /></li>
                        {/each}
                    </ul>
                </div>
            {/if}
        </div>
    </section>

    <section aria-labelledby="activity-title">
        <h2 id="activity-title">Session activity</h2>
        <p>Live session activity is not implemented yet.</p>
        <p>This area will show the activity of a selected session.</p>
    </section>
</div>

<style>
    header
    {
        margin-bottom: 2rem;
    }

    h1
    {
        margin: 0;
        font-size: 1.75rem;
    }

    header p
    {
        margin: 0.5rem 0 0;
        color: #5c6879;
    }

    .monitoring-workspace
    {
        display: grid;
        gap: 1.5rem;
        grid-template-columns: minmax(14rem, 1fr) minmax(0, 2fr);
    }

    section
    {
        min-width: 0;
        padding: 1.5rem;
        border: 1px solid #dce1e8;
        border-radius: 0.5rem;
        background: white;
    }

    h2
    {
        margin: 0 0 1rem;
        font-size: 1.125rem;
    }

    section p
    {
        color: #5c6879;
    }

    .sessions-heading
    {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.75rem;
        justify-content: space-between;
    }

    .sessions-heading h2
    {
        margin: 0;
    }

    button
    {
        min-height: 2.75rem;
        padding: 0.5rem 1rem;
        border: 1px solid #dce1e8;
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

    button:focus-visible
    {
        outline: 3px solid #225cc5;
        outline-offset: 4px;
    }

    .refresh-status
    {
        min-height: 1.5rem;
        margin: 0.5rem 0;
    }

    .warnings
    {
        margin-bottom: 1rem;
        padding: 1rem;
        border: 1px solid #dfc380;
        border-radius: 0.5rem;
        background: #fff8e8;
        overflow-wrap: anywhere;
    }

    .warnings h3
    {
        margin: 0 0 0.75rem;
        font-size: 1rem;
        overflow-wrap: anywhere;
    }

    .warnings p
    {
        margin: 0.5rem 0;
    }

    .warnings ul
    {
        padding-left: 1rem;
    }

    .project-group
    {
        min-width: 0;
        margin-top: 1.5rem;
    }

    .project-group h3
    {
        margin: 0 0 0.75rem;
        font-size: 1rem;
        overflow-wrap: anywhere;
    }

    .session-list
    {
        display: grid;
        gap: 1rem;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .session
    {
        min-width: 0;
        padding-top: 1rem;
        border-top: 1px solid #dce1e8;
    }

    .session h4
    {
        margin: 1rem 0 0.5rem;
        font-size: 0.875rem;
    }

    .subagent-list
    {
        display: grid;
        gap: 1rem;
        margin: 0;
        padding-left: 1rem;
        border-left: 2px solid #dce1e8;
        list-style: none;
    }

    @media (max-width: 64rem)
    {
        .monitoring-workspace
        {
            grid-template-columns: 1fr;
        }
    }
</style>
