import type { SessionWarning } from '../../sessions/SessionDiscoveryViewModel';
import type { SessionFile } from './SessionFile';
import type { SessionRecord } from './SessionReadResult';

/** Observed filesystem identity and revision, distinct from transcript/session identity. */
export interface SessionFileRevision
{
    readonly deviceId: string;
    readonly fileId: string;
    readonly sizeBytes: number;
    readonly modifiedAt: Date;
    readonly changedAt: Date;
}

/** Retained comparison bytes; the reader owns checkpoint selection and validation policy. */
export interface SessionFileCheckpoint
{
    readonly offsetBytes: number;
    readonly bytes: Uint8Array;
}

/** A successful file snapshot; offsets describe bytes, never decoded character counts. */
export interface TrackedSessionFile
{
    readonly filePath: string;
    readonly generation: number;
    readonly revision: SessionFileRevision;
    readonly readOffsetBytes: number;
    readonly completeOffsetBytes: number;
    readonly nextLineNumber: number;
    readonly trailingBytes: Uint8Array;
    readonly checkpoints: readonly SessionFileCheckpoint[];
    readonly records: readonly SessionRecord[];
    readonly warnings: readonly SessionWarning[];
    readonly lastSuccessfulReadAt: Date;
}

export enum SessionFileChange
{
    Initial = 'initial',
    Unchanged = 'unchanged',
    Appended = 'appended',
    Rebuilt = 'rebuilt',
    Failed = 'failed'
}

/** Failed attempts retain the previous successful snapshot, or null before any successful read. */
export interface IncrementalSessionReadResult
{
    readonly snapshot: TrackedSessionFile | null;
    readonly change: SessionFileChange;
    readonly attemptedAt: Date;
    readonly warnings: readonly SessionWarning[];
}

/** File access owns retained records and recovery; it does not parse conversations or price usage. */
export interface IncrementalSessionReader
{
    advance(file: SessionFile, previous: TrackedSessionFile | null): Promise<IncrementalSessionReadResult>;
}
