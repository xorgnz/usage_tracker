import type { BigIntStats } from 'node:fs';
import { open, stat, type FileHandle } from 'node:fs/promises';
import { SessionWarningCode, type SessionWarning } from '../../sessions/SessionDiscoveryViewModel';
import {
    SessionFileChange,
    type IncrementalSessionReader,
    type IncrementalSessionReadResult,
    type SessionFileCheckpoint,
    type SessionFileRevision,
    type TrackedSessionFile
} from './IncrementalSessionRead';
import type { SessionFile } from './SessionFile';
import type { SessionRecord } from './SessionReadResult';

class SessionRevisionChanged extends Error {}

/** Reads bounded file revisions and publishes only after checking the open handle and path. */
export class IncrementalSessionJsonlReader implements IncrementalSessionReader
{
    private static readonly chunkSize = 64 * 1024;
    private static readonly checkpointSize = 4096;

    async advance(file: SessionFile, previous: TrackedSessionFile | null): Promise<IncrementalSessionReadResult>
    {
        const attemptedAt = new Date();
        const retained = previous?.filePath === file.path ? previous : null;
        try
        {
            try
            {
                return await this.readAttempt(file.path, retained, attemptedAt);
            }
            catch (error)
            {
                if (!(error instanceof SessionRevisionChanged))
                {
                    throw error;
                }

                // Reopen the path so a replaced file is reassessed from its current identity.
                return await this.readAttempt(file.path, retained, attemptedAt);
            }
        }
        catch (error)
        {
            const missing = error instanceof Error && 'code' in error && (error.code === 'ENOENT' || error.code === 'ENOTDIR');
            const message = missing ? 'Session file is no longer available at its discovered path.'
                : error instanceof SessionRevisionChanged ? 'Session file changed during both read attempts.'
                    : 'Cannot read the session file.';
            return { snapshot: retained, change: SessionFileChange.Failed, attemptedAt,
                warnings: [{ code: SessionWarningCode.FileAccess, path: file.path, message }] };
        }
    }

    private async readAttempt(path: string, previous: TrackedSessionFile | null, attemptedAt: Date): Promise<IncrementalSessionReadResult>
    {
        const handle = await open(path, 'r');
        try
        {
            const revision = this.revision(await handle.stat({ bigint: true }));
            const sameFile = previous !== null && this.sameIdentity(revision, previous.revision);
            const unchanged = sameFile && this.sameRevision(revision, previous.revision);
            const grew = sameFile && revision.sizeBytes > previous.readOffsetBytes;
            const matches = (unchanged || grew) && await this.matchesCheckpoints(handle, previous.checkpoints);

            if (unchanged && matches)
            {
                await this.confirmRevision(handle, path, revision);
                return { snapshot: previous, change: SessionFileChange.Unchanged, attemptedAt, warnings: [] };
            }

            const append = grew && matches;
            const base = append ? previous : null;
            const snapshot = await this.readRecords(handle, path, revision, base, (previous?.generation ?? 0) + 1);
            await this.confirmRevision(handle, path, revision);
            const change = previous === null ? SessionFileChange.Initial : append ? SessionFileChange.Appended : SessionFileChange.Rebuilt;
            return { snapshot, change, attemptedAt, warnings: [] };
        }
        finally
        {
            await handle.close();
        }
    }

    private async readRecords(
        handle: FileHandle,
        path: string,
        revision: SessionFileRevision,
        base: TrackedSessionFile | null,
        generation: number
    ): Promise<TrackedSessionFile>
    {
        const records: SessionRecord[] = [...(base?.records ?? [])];
        const warnings: SessionWarning[] = [...(base?.warnings ?? [])];
        const fragments = base && base.trailingBytes.length > 0 ? [base.trailingBytes] : [];
        let nextLineNumber = base?.nextLineNumber ?? 1;
        let completeOffsetBytes = base?.completeOffsetBytes ?? 0;
        const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

        // Keep bytes across chunks and decode only once the entire physical line has arrived.
        for (let offset = base?.readOffsetBytes ?? 0; offset < revision.sizeBytes;)
        {
            const chunk = await this.readRange(handle, offset, Math.min(IncrementalSessionJsonlReader.chunkSize, revision.sizeBytes - offset));
            let start = 0;
            for (let end = chunk.indexOf(10); end !== -1; end = chunk.indexOf(10, start))
            {
                fragments.push(chunk.subarray(start, end));
                const lineNumber = nextLineNumber++;
                try
                {
                    const bytes = fragments.length === 1 ? fragments[0] : Buffer.concat(fragments);
                    const value: unknown = JSON.parse(decoder.decode(bytes));
                    records.push({ lineNumber, value });
                }
                catch
                {
                    warnings.push({ code: SessionWarningCode.MalformedRecord, path, lineNumber,
                        message: `Skipping malformed JSONL record at line ${lineNumber}.` });
                }
                fragments.length = 0;
                start = end + 1;
                completeOffsetBytes = offset + start;
            }
            if (start < chunk.length)
            {
                fragments.push(chunk.subarray(start));
            }
            offset += chunk.length;
        }

        const checkpoints = await this.captureCheckpoints(handle, revision.sizeBytes);
        return {
            filePath: path, generation, revision, records, warnings, nextLineNumber, completeOffsetBytes, checkpoints,
            readOffsetBytes: revision.sizeBytes, trailingBytes: Buffer.concat(fragments), lastSuccessfulReadAt: new Date()
        };
    }

    private async captureCheckpoints(handle: FileHandle, size: number): Promise<SessionFileCheckpoint[]>
    {
        const length = Math.min(size, IncrementalSessionJsonlReader.checkpointSize);
        const last = size - length;
        const offsets = size === 0 ? [] : [...new Set([0, Math.floor(last / 2), last])];
        return Promise.all(offsets.map(async offsetBytes => ({ offsetBytes, bytes: await this.readRange(handle, offsetBytes, length) })));
    }

    private async matchesCheckpoints(handle: FileHandle, checkpoints: readonly SessionFileCheckpoint[]): Promise<boolean>
    {
        for (const checkpoint of checkpoints)
        {
            const current = await this.readRange(handle, checkpoint.offsetBytes, checkpoint.bytes.length);
            if (!current.equals(checkpoint.bytes))
            {
                return false;
            }
        }
        return true;
    }

    private async readRange(handle: FileHandle, position: number, length: number): Promise<Buffer>
    {
        const buffer = Buffer.alloc(length);
        for (let consumed = 0; consumed < length;)
        {
            const { bytesRead } = await handle.read(buffer, consumed, length - consumed, position + consumed);
            if (bytesRead === 0)
            {
                throw new SessionRevisionChanged();
            }
            consumed += bytesRead;
        }
        return buffer;
    }

    private async confirmRevision(handle: FileHandle, path: string, expected: SessionFileRevision): Promise<void>
    {
        const current = this.revision(await handle.stat({ bigint: true }));
        const named = this.revision(await stat(path, { bigint: true }));
        if (!this.sameRevision(expected, current) || !this.sameRevision(expected, named))
        {
            throw new SessionRevisionChanged();
        }
    }

    private revision(stats: BigIntStats): SessionFileRevision
    {
        if (!stats.isFile() || stats.size > BigInt(Number.MAX_SAFE_INTEGER))
        {
            throw new Error('Expected a regular file with a supported byte size.');
        }

        return {
            deviceId: String(stats.dev), fileId: String(stats.ino), sizeBytes: Number(stats.size),
            modifiedAt: stats.mtime, changedAt: stats.ctime, modifiedAtNs: stats.mtimeNs, changedAtNs: stats.ctimeNs
        };
    }

    private sameIdentity(left: SessionFileRevision, right: SessionFileRevision): boolean
    {
        return left.deviceId === right.deviceId && left.fileId === right.fileId;
    }

    private sameRevision(left: SessionFileRevision, right: SessionFileRevision): boolean
    {
        return this.sameIdentity(left, right) && left.sizeBytes === right.sizeBytes
            && left.modifiedAtNs === right.modifiedAtNs && left.changedAtNs === right.changedAtNs;
    }
}
