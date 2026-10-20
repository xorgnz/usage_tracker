import { readFile } from 'node:fs/promises';
import { SessionWarningCode } from '../../sessions/SessionDiscoveryViewModel';
import type { SessionFile } from './SessionFile';
import type { SessionReadResult } from './SessionReadResult';

/** Reads current file contents without interpreting conversation messages or retaining a stale cache. */
export class SessionJsonlReader
{
    async read(session: SessionFile): Promise<SessionReadResult>
    {
        const result: SessionReadResult = { records: [], warnings: [], deferredTrailingRecord: false, failed: false };
        let content: string;

        // Isolate filesystem failures from other session reads, including deletion after discovery.
        try
        {
            content = await readFile(session.path, 'utf8');
        }
        catch (error)
        {
            const detail = error instanceof Error ? error.message : 'Unknown filesystem error';
            result.failed = true;
            result.warnings.push({ code: SessionWarningCode.FileAccess, path: session.path, message: `Cannot read session file: ${detail}` });
            return result;
        }

        // A newline confirms the writer has finished a record, even when its JSON is malformed.
        const lines = content.split('\n');
        const trailingLine = lines.pop() ?? '';

        for (let index = 0; index < lines.length; index++)
        {
            this.readCompletedLine(lines[index], index + 1, session.path, result);
        }

        // A valid final JSON value needs no newline. An unfinished tail is retried on the next full read.
        if (trailingLine.trim().length > 0)
        {
            try
            {
                const value: unknown = JSON.parse(trailingLine);
                result.records.push({ lineNumber: lines.length + 1, value });
            }
            catch
            {
                result.deferredTrailingRecord = true;
            }
        }

        return result;
    }

    private readCompletedLine(line: string, lineNumber: number, path: string, result: SessionReadResult): void
    {
        try
        {
            const value: unknown = JSON.parse(line);
            result.records.push({ lineNumber, value });
        }
        catch
        {
            // Report location without copying potentially sensitive transcript content into diagnostics.
            result.warnings.push({
                code: SessionWarningCode.MalformedRecord,
                path,
                lineNumber,
                message: `Skipping malformed JSONL record at line ${lineNumber}.`
            });
        }
    }
}
