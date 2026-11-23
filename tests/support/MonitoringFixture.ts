import { join } from 'node:path';
import { MonitoringCoordinator } from '../../src/lib/server/monitoring/MonitoringCoordinator';
import { SessionFileChange, type TrackedSessionFile } from '../../src/lib/server/sessions/IncrementalSessionRead';
import { SessionFile } from '../../src/lib/server/sessions/SessionFile';
import { SessionDiscoveryStatus } from '../../src/lib/sessions/SessionDiscoveryViewModel';
import { ConversationFixture as C } from './ConversationFixture';
import { UsageFixture as U } from './UsageFixture';

export class MonitoringFixture
{
    readonly root: string;
    readonly date = new Date('2026-10-01T00:00:00Z');
    private static readonly emptyRecords: readonly unknown[] = [];
    readonly records = new Map<string, readonly unknown[]>();
    sessions: SessionFile[] = [];
    orphans: SessionFile[] = [];
    status = SessionDiscoveryStatus.Complete;
    discoveries = 0;

    constructor(root = 'synthetic-monitoring-source')
    {
        this.root = root;
    }

    file(project: string, sessionId = 'parent', agentId: string | null = null, subagents: readonly SessionFile[] = []): SessionFile
    {
        const projectDirectory = join(this.root, 'projects', project);
        const filename = agentId === null ? `${sessionId}.jsonl` : `agent-${agentId}.jsonl`;
        const path = agentId === null ? join(projectDirectory, filename) : join(projectDirectory, sessionId, 'subagents', filename);
        const file = new SessionFile({
            projectDirectory, path, filename, sessionId, agentId, parentSessionId: agentId === null ? null : sessionId,
            sizeBytes: 0, createdAt: this.date, modifiedAt: this.date
        });
        for (const child of subagents) file.addSubagent(child);
        return file;
    }

    static response(id: string, model = 'synthetic-model', output = 900)
    {
        return U.assistant({ ...U.usage(), output_tokens: output }, id, '2026-10-01T00:00:01Z', model);
    }

    coordinator(): MonitoringCoordinator
    {
        const revisions = new WeakMap<TrackedSessionFile, readonly unknown[]>();
        return new MonitoringCoordinator(this.root, { discover: async () =>
        {
            this.discoveries++;
            return { status: this.status, sessions: this.sessions, orphanSubagents: this.orphans, warnings: [] };
        } }, { advance: async (file, previous) =>
        {
            const records = this.records.get(file.path) ?? MonitoringFixture.emptyRecords;
            const unchanged = previous !== null && revisions.get(previous) === records;
            if (unchanged)
            {
                return { snapshot: previous, change: SessionFileChange.Unchanged, attemptedAt: this.date, warnings: [] };
            }

            const bytes = records.length === 0 ? 0 : Buffer.byteLength(C.jsonl(records));
            const snapshot: TrackedSessionFile = {
                filePath: file.path, generation: (previous?.generation ?? 0) + 1,
                revision: { deviceId: 'fixture', fileId: file.path, sizeBytes: bytes, modifiedAt: this.date, changedAt: this.date,
                    modifiedAtNs: 0n, changedAtNs: 0n },
                readOffsetBytes: bytes, completeOffsetBytes: bytes, nextLineNumber: records.length + 1, trailingBytes: new Uint8Array(),
                checkpoints: [], records: records.map((value, index) => ({ value, lineNumber: index + 1 })), warnings: [],
                lastSuccessfulReadAt: this.date
            };
            revisions.set(snapshot, records);
            return { snapshot, change: previous ? SessionFileChange.Rebuilt : SessionFileChange.Initial, attemptedAt: this.date, warnings: [] };
        } });
    }
}
