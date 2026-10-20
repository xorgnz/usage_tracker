import type { SessionWarning } from '../../sessions/SessionDiscoveryViewModel';

/** A JSON value and its source location, kept internal until conversation parsing exists. */
export interface SessionRecord
{
    lineNumber: number;
    value: unknown;
}

/** An empty readable file differs from a failed read; deferred tails are not warnings. */
export interface SessionReadResult
{
    records: SessionRecord[];
    warnings: SessionWarning[];
    deferredTrailingRecord: boolean;
    failed: boolean;
}
