<script lang="ts">
    import { page } from '$app/state';
    import type { LayoutProps } from './$types';

    let { data, children }: LayoutProps = $props();
</script>

<a class="skip-link" href="#main-content">Skip to content</a>

<div class="shell">
    <aside class="sidebar">
        <p class="brand">Usage Tracker</p>
        <p class="subtitle">Claude Code sessions</p>
        <nav aria-label="Main navigation">
            <a href="/" aria-current={page.url.pathname === '/' ? 'page' : undefined}>Monitoring</a>
            <a href="/analysis" aria-current={page.url.pathname === '/analysis' ? 'page' : undefined}>Analysis</a>
        </nav>
        <p class="foundation-note">Application foundation</p>
    </aside>

    <main id="main-content" tabindex="-1">
        {#if !data.claudeDirectoryAvailable}
            <section class="source-notice" aria-labelledby="source-notice-title">
                <h2 id="source-notice-title">Source folder unavailable</h2>
                <p>{data.claudeDirectoryIssue}</p>
                <p>You can still explore the application shell.</p>
            </section>
        {/if}

        {@render children()}
    </main>
</div>

<style>
    :global(body)
    {
        margin: 0;
        background: #f6f7f9;
        color: #202b3b;
        font-family: system-ui, sans-serif;
        line-height: 1.5;
    }

    :global(*)
    {
        box-sizing: border-box;
    }

    :global(a:focus-visible)
    {
        outline: 3px solid #225cc5;
        outline-offset: 4px;
    }

    .skip-link
    {
        position: absolute;
        top: -5rem;
        left: 1rem;
        z-index: 1;
        padding: 0.75rem;
        background: white;
        color: #174d9b;
    }

    .skip-link:focus
    {
        top: 1rem;
    }

    .shell
    {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 15rem minmax(0, 1fr);
    }

    .sidebar
    {
        padding: 2rem 1.25rem;
        border-right: 1px solid #dce1e8;
        background: white;
    }

    .brand
    {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 700;
    }

    .subtitle
    {
        margin: 0.25rem 0 2rem;
        color: #5c6879;
        font-size: 0.875rem;
    }

    nav
    {
        display: grid;
        gap: 0.5rem;
    }

    nav a
    {
        display: block;
        padding: 0.75rem 1rem;
        border-radius: 0.375rem;
        color: #304259;
        text-decoration: none;
    }

    nav a:hover
    {
        background: #f0f3f8;
    }

    nav a[aria-current='page']
    {
        background: #e8effc;
        color: #174d9b;
        font-weight: 600;
    }

    .foundation-note
    {
        margin: 2rem 0 0;
        color: #5c6879;
        font-size: 0.875rem;
    }

    main
    {
        min-width: 0;
        padding: 2rem;
    }

    .source-notice
    {
        margin: 0 0 2rem;
        padding: 1rem 1.25rem;
        border: 1px solid #dfc380;
        border-radius: 0.5rem;
        background: #fff8e8;
        overflow-wrap: anywhere;
    }

    .source-notice h2
    {
        margin: 0;
        font-size: 1rem;
    }

    .source-notice p
    {
        margin: 0.5rem 0 0;
    }

    @media (max-width: 48rem)
    {
        .shell
        {
            grid-template-columns: 1fr;
        }

        .sidebar
        {
            padding: 1.25rem;
            border-right: 0;
            border-bottom: 1px solid #dce1e8;
        }

        main
        {
            padding: 1.25rem;
        }
    }
</style>
