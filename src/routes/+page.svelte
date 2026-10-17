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
        <h2 id="sessions-title">Active sessions</h2>
        <p>Session discovery is not implemented yet.</p>
        <p>Active sessions will appear here when monitoring is available.</p>
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

    @media (max-width: 64rem)
    {
        .monitoring-workspace
        {
            grid-template-columns: 1fr;
        }
    }
</style>
