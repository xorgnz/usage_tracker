/** Test-only replacement for SvelteKit invalidation; resolves or rejects on demand. */
export class RefreshHarness
{
    static calls = 0;
    private static resolvePending: () => void;
    private static rejectPending: (error: Error) => void;

    static invalidate(): Promise<void>
    {
        this.calls++;
        return new Promise<void>((resolve, reject) =>
        {
            this.resolvePending = resolve;
            this.rejectPending = reject;
        });
    }

    static succeed(): void
    {
        this.resolvePending();
    }

    static fail(): void
    {
        this.rejectPending(new Error('Simulated network failure'));
    }
}

// Match the framework export at the test transport boundary.
export function invalidateAll(): Promise<void>
{
    return RefreshHarness.invalidate();
}
