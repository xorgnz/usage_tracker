<script lang="ts">
    import type { SessionFileViewModel } from './SessionDiscoveryViewModel';

    let { session }: { session: SessionFileViewModel } = $props();
</script>

<p class="filename"><strong>{session.filename}</strong></p>
<dl>
    <dt>Path</dt>
    <dd>{session.path}</dd>
    <dt>Created</dt>
    <dd><time datetime={session.createdAt}>{session.createdAt}</time></dd>
    <dt>Modified</dt>
    <dd><time datetime={session.modifiedAt}>{session.modifiedAt}</time></dd>
    <dt>Size</dt>
    <dd>{session.sizeBytes.toLocaleString('en-US')} bytes</dd>
</dl>

<style>
    .filename
    {
        margin: 0 0 0.5rem;
        overflow-wrap: anywhere;
    }

    dl
    {
        display: grid;
        gap: 0.25rem 0.75rem;
        grid-template-columns: auto minmax(0, 1fr);
        margin: 0;
        font-size: 0.875rem;
    }

    dt
    {
        color: #5c6879;
    }

    dd
    {
        min-width: 0;
        margin: 0;
        overflow-wrap: anywhere;
    }

    @media (max-width: 48rem)
    {
        dl
        {
            grid-template-columns: minmax(0, 1fr);
        }

        dd
        {
            margin-bottom: 0.5rem;
        }
    }
</style>
