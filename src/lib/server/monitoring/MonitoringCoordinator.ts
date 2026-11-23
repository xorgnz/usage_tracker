import { isAbsolute, relative, resolve, sep } from 'node:path';
import { SessionDiscoveryStatus, SessionWarningCode, type SessionWarning } from '../../sessions/SessionDiscoveryViewModel';
import { ConversationParser } from '../conversations/ConversationParser';
import { ConversationRecord } from '../conversations/ConversationRecord';
import { ConversationSource } from '../conversations/ConversationSource';
import { IncrementalSessionJsonlReader } from '../sessions/IncrementalSessionJsonlReader';
import { SessionFileChange, type IncrementalSessionReader } from '../sessions/IncrementalSessionRead';
import { SessionFileDAO } from '../sessions/SessionFileDAO';
import type { SessionDiscoveryResult } from '../sessions/SessionDiscoveryResult';
import type { SessionFile } from '../sessions/SessionFile';
import { MonitoringFamilyEstimator } from './MonitoringFamilyEstimator';
import { MonitoringSessionIdentity } from './MonitoringSessionIdentity';
import { MonitoringIssueKind, type MonitoringIssue, type MonitoringSessionState, type MonitoringSnapshot, type MonitoringUpdater } from './MonitoringSnapshot';

/** Publishes one request-driven monitoring snapshot per refresh of a configured source. */
export class MonitoringCoordinator implements MonitoringUpdater
{
    private static readonly sources = new Map<string, MonitoringCoordinator>();

    readonly sourceDirectory: string;
    private readonly files: Pick<SessionFileDAO, 'discover'>;
    private readonly reader: IncrementalSessionReader;
    private readonly parser = new ConversationParser();
    private readonly estimator = new MonitoringFamilyEstimator();
    private published: MonitoringSnapshot | null = null;
    private pending: Promise<MonitoringSnapshot> | null = null;

    static forSource(sourceDirectory: string): MonitoringCoordinator
    {
        const key = resolve(sourceDirectory);
        const existing = this.sources.get(key);
        if (existing !== undefined)
        {
            return existing;
        }

        const coordinator = new MonitoringCoordinator(key);
        this.sources.set(key, coordinator);
        return coordinator;
    }

    constructor(sourceDirectory: string, files?: Pick<SessionFileDAO, 'discover'>, reader: IncrementalSessionReader = new IncrementalSessionJsonlReader())
    {
        this.sourceDirectory = resolve(sourceDirectory);
        this.files = files ?? new SessionFileDAO(this.sourceDirectory);
        this.reader = reader;
    }

    refresh(): Promise<MonitoringSnapshot>
    {
        return this.pending ??= this.update().then(snapshot =>
        {
            this.published = snapshot;
            return snapshot;
        }).finally(() =>
        {
            this.pending = null;
        });
    }

    private async update(): Promise<MonitoringSnapshot>
    {
        const lastAttemptedAt = new Date();
        const prior = this.published;
        const generation = (prior?.generation ?? 0) + 1;
        const discovery = await this.discover();
        if (discovery.status === SessionDiscoveryStatus.Failed)
        {
            const issues = this.discoveryIssues(discovery.warnings);
            const freshness = { lastAttemptedAt, lastSuccessfulAt: prior?.freshness.lastSuccessfulAt ?? null, stale: true, issues };
            return {
                sourceDirectory: this.sourceDirectory, generation, status: discovery.status, freshness, warnings: discovery.warnings,
                sessions: (prior?.sessions ?? []).map(session => ({
                    ...session, freshness: { ...session.freshness, lastAttemptedAt, stale: true,
                        issues: [...session.freshness.issues.filter(issue => issue.sessionKey !== null), ...issues] }
                })),
                families: (prior?.families ?? []).map(family => ({
                    ...family, freshness: { ...family.freshness, lastAttemptedAt, stale: true,
                        issues: [...family.freshness.issues.filter(issue => issue.sessionKey !== null), ...issues] }
                }))
            };
        }

        const previous = new Map(prior?.sessions.map(session => [session.identity.key, session]));
        const sessions = new Map<string, MonitoringSessionState>();
        const discoveryWarnings = [...discovery.warnings];
        const files = [...discovery.sessions.flatMap(file => [file, ...file.subagents]), ...discovery.orphanSubagents];
        for (const file of files)
        {
            let identity: MonitoringSessionIdentity;
            try
            {
                identity = this.identity(file);
            }
            catch
            {
                discoveryWarnings.push({ code: SessionWarningCode.FileAccess, path: file.path, message: 'Session file has an invalid identity.' });
                continue;
            }
            if (!sessions.has(identity.key))
            {
                sessions.set(identity.key, await this.advance(file, identity, previous.get(identity.key), generation, lastAttemptedAt));
            }
        }

        // An inaccessible subtree may hide old files. Confirmed removals are dropped.
        for (const [key, session] of previous)
        {
            const warnings = discoveryWarnings.filter(warning => this.blocksDiscovery(warning, session.file.path));
            if (!sessions.has(key) && warnings.length > 0)
            {
                const issues = this.discoveryIssues(warnings, key);
                sessions.set(key, {
                    ...session, generation, freshness: { lastAttemptedAt, lastSuccessfulAt: session.freshness.lastSuccessfulAt, stale: true, issues }
                });
            }
        }

        const related = this.associate(sessions, generation);
        const families = this.estimator.build(related, prior?.families ?? [], discoveryWarnings, generation, lastAttemptedAt);
        const warnings = [...discoveryWarnings, ...related.flatMap(session => session.conversation?.warnings ?? [])];
        const issues = [...this.discoveryIssues(discoveryWarnings), ...families.flatMap(family => family.freshness.issues)];
        const stale = issues.length > 0;
        const status = stale || warnings.length > 0 ? SessionDiscoveryStatus.Partial : discovery.status;
        return {
            sourceDirectory: this.sourceDirectory, generation, status, sessions: related, families, warnings,
            freshness: { lastAttemptedAt, lastSuccessfulAt: stale ? prior?.freshness.lastSuccessfulAt ?? null : new Date(), stale, issues }
        };
    }

    private async discover(): Promise<SessionDiscoveryResult>
    {
        try
        {
            return await this.files.discover();
        }
        catch
        {
            return { status: SessionDiscoveryStatus.Failed, sessions: [], orphanSubagents: [],
                warnings: [{ code: SessionWarningCode.DirectoryAccess, path: this.sourceDirectory, message: 'Cannot discover session files.' }] };
        }
    }

    private async advance(
        file: SessionFile,
        identity: MonitoringSessionIdentity,
        previous: MonitoringSessionState | undefined,
        generation: number,
        lastAttemptedAt: Date
    ): Promise<MonitoringSessionState>
    {
        const read = await this.reader.advance(file, previous?.tracked ?? null).catch(() => ({
            snapshot: previous?.tracked ?? null, change: SessionFileChange.Failed, attemptedAt: lastAttemptedAt,
            warnings: [{ code: SessionWarningCode.FileAccess, path: file.path, message: 'Cannot read the session file.' }]
        }));
        const tracked = read.snapshot;
        let parsed = previous?.conversation?.parsed ?? null;
        let parsedFileGeneration = previous?.parsedFileGeneration ?? null;
        const issues: MonitoringIssue[] = [];
        if (read.change === SessionFileChange.Failed)
        {
            issues.push({ kind: MonitoringIssueKind.Read, sessionKey: identity.key, message: read.warnings[0]?.message ?? 'Cannot read the session file.' });
        }
        else if (tracked !== null && (parsed === null || tracked.generation !== parsedFileGeneration))
        {
            try
            {
                const records = tracked.records.map(record => new ConversationRecord(
                    new ConversationSource(identity.conversation, record.lineNumber),
                    record.value
                ));
                parsed = this.parser.parse(identity.conversation, records);
                parsedFileGeneration = tracked.generation;
            }
            catch
            {
                issues.push({ kind: MonitoringIssueKind.Interpretation, sessionKey: identity.key, message: 'Cannot interpret the session records.' });
            }
        }

        const stale = issues.length > 0;
        const warnings = [...(tracked?.warnings ?? []), ...read.warnings];
        const parentKey = previous?.parentKey ?? null;
        const orphan = previous?.orphan ?? false;
        const changed = previous === undefined || tracked !== previous.tracked || parsed !== previous.conversation?.parsed
            || stale !== previous.conversation?.readFailed || JSON.stringify(warnings) !== JSON.stringify(previous.conversation?.warnings);
        return {
            file, identity, tracked, parsedFileGeneration, parentKey, orphan, generation: changed ? generation : previous.generation,
            conversation: { file, parsed, readFailed: stale, deferredTrailingRecord: (tracked?.trailingBytes.length ?? 0) > 0, warnings, orphan },
            sourceUpdatedAt: tracked?.revision.modifiedAt ?? previous?.sourceUpdatedAt ?? file.modifiedAt,
            freshness: { lastAttemptedAt, lastSuccessfulAt: stale ? previous?.freshness.lastSuccessfulAt ?? null : new Date(), stale, issues }
        };
    }

    private associate(sessions: ReadonlyMap<string, MonitoringSessionState>, generation: number): MonitoringSessionState[]
    {
        const parents = new Map<string, string>();
        for (const [key, { file }] of sessions)
        {
            if (file.agentId === null)
            {
                parents.set(JSON.stringify([file.projectDirectory, file.sessionId]), key);
            }
        }
        return [...sessions.values()].map(session =>
        {
            const { file } = session;
            const parentKey = file.parentSessionId === null ? null : parents.get(JSON.stringify([file.projectDirectory, file.parentSessionId])) ?? null;
            const orphan = file.agentId !== null && parentKey === null;
            if (parentKey === session.parentKey && orphan === session.orphan)
            {
                return session;
            }
            const conversation = session.conversation === null ? null : { ...session.conversation, orphan };
            return { ...session, parentKey, orphan, conversation, generation };
        });
    }

    private blocksDiscovery(warning: SessionWarning, path: string): boolean
    {
        if (warning.code === SessionWarningCode.FileAccess)
        {
            return relative(warning.path, path) === '';
        }

        const descendant = relative(warning.path, path);
        return warning.code === SessionWarningCode.DirectoryAccess && !isAbsolute(descendant) && descendant !== '..' && !descendant.startsWith('..' + sep);
    }

    private discoveryIssues(warnings: readonly SessionWarning[], sessionKey: string | null = null): MonitoringIssue[]
    {
        return warnings.filter(warning => warning.code !== SessionWarningCode.MissingParent)
            .map(warning => ({ kind: MonitoringIssueKind.Discovery, sessionKey, message: warning.message }));
    }

    private identity(file: SessionFile): MonitoringSessionIdentity
    {
        return new MonitoringSessionIdentity(this.sourceDirectory, {
            projectDirectory: file.projectDirectory, sessionId: file.sessionId, agentId: file.agentId, filePath: file.path
        });
    }
}
