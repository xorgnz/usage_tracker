import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { SessionDiscoveryStatus, type SessionFileViewModel } from '../../sessions/SessionDiscoveryViewModel';
import type { SessionListViewModel, SessionProjectViewModel } from '../../sessions/SessionListViewModel';
import type {
    MonitoringActivityKind, MonitoringAmountViewModel, MonitoringCalculationUnit, MonitoringCalculationViewModel, MonitoringFreshnessViewModel,
    MonitoringIssueViewModel, MonitoringResponseViewModel, MonitoringSelection, MonitoringSessionDetailViewModel, MonitoringTokenCategory,
    MonitoringUsageViewModel
} from '../../monitoring/MonitoringViewModel';
import type { Conversation } from '../conversations/Conversation';
import type { CalculationEvaluation } from '../usage/UsageCalculation';
import { UsageLevel, UsageScope } from '../usage/UsageContribution';
import type { UsageCostGroup } from '../usage/UsageEstimation';
import { MonitoringCalculationProjection } from './MonitoringCalculationProjection';
import type { MonitoringProjection } from './MonitoringProjection';
import {
    MonitoringIssueKind,
    type MonitoringFreshness,
    type MonitoringIssue,
    type MonitoringSessionState,
    type MonitoringSnapshot
} from './MonitoringSnapshot';

/** Projects a single publication into monitoring data and the current page's metadata list. */
export class MonitoringSnapshotProjection implements MonitoringProjection
{
    private readonly snapshot: MonitoringSnapshot;
    private readonly keys: ReadonlyMap<string, string>;
    private readonly fileKeys: ReadonlyMap<string, string>;
    private readonly sessions: ReadonlyMap<string, MonitoringSessionState>;
    private readonly projects = new Map<string, string>();

    constructor(snapshot: MonitoringSnapshot)
    {
        this.snapshot = snapshot;
        const keys = new Map(snapshot.sessions.map(session => [session.identity.key, this.key(session.identity.key)]));
        this.keys = keys;
        this.fileKeys = new Map(snapshot.sessions.map(session => [session.file.path, keys.get(session.identity.key)!]));
        this.sessions = new Map(snapshot.sessions.map(session => [session.identity.key, session]));
    }

    project(selection: MonitoringSelection): MonitoringResponseViewModel
    {
        const snapshot = this.snapshot;
        const expanded = new Set(selection.expandedSessionKeys);
        const selected = new Set(selection.explanationIds);
        const calculations: MonitoringCalculationViewModel[] = [];
        const details: MonitoringSessionDetailViewModel[] = [];
        const families = new Map(snapshot.families.flatMap(family => family.memberKeys.map(member => [member, family] as const)));
        const sessions = snapshot.sessions.map(session =>
        {
            const key = this.keys.get(session.identity.key)!;
            const family = families.get(session.identity.key);
            const groups = family?.estimation?.costs.filter(group =>
                group.attribution.level === UsageLevel.Session && group.attribution.conversation.filePath === session.file.path
            ) ?? [];
            const conversation = session.conversation?.parsed?.conversation;
            const own = conversation && groups.find(group => group.attribution.scope === UsageScope.Own);
            const hasFamilyData = family?.estimation?.source.conversations.some(entry => entry.parsed !== null);
            const combined = session.file.agentId === null && hasFamilyData
                ? groups.find(group => group.attribution.scope === UsageScope.IncludingSubagents)
                : undefined;
            const usesFamilyFreshness = family?.root.key === session.identity.key
                || family?.freshness.issues.some(issue => issue.kind === MonitoringIssueKind.Estimation);
            const freshness = usesFamilyFreshness && family ? family.freshness : session.freshness;
            const activity = conversation === undefined ? null : this.latestActivity(conversation);
            if (expanded.has(key) && conversation !== undefined)
            {
                const models = [...new Set(conversation.messages.flatMap(message => message.model === null ? [] : [message.model]))].sort();
                details.push({
                    sessionKey: key, generation: session.generation, models, messageCount: conversation.messages.length,
                    turnCount: conversation.turns.length, latestActivityAt: activity?.timestamp ?? null, latestActivityKind: activity?.kind ?? null,
                    chronologyUncertain: activity?.uncertain ?? false, issues: [
                        ...this.issues(freshness.issues),
                        ...(session.conversation?.parsed?.diagnostics ?? []).map(diagnostic => ({
                            code: diagnostic.code, sessionKey: key, message: diagnostic.message
                        }))
                    ]
                });
            }

            const { file } = session;
            return {
                key, sessionId: file.sessionId, agentId: file.agentId, parentKey: this.browserKey(session.parentKey),
                orphan: session.orphan, filename: file.filename, projectPath: this.projectPath(session), sizeBytes: file.sizeBytes,
                createdAt: file.createdAt.toISOString(), modifiedAt: file.modifiedAt.toISOString(),
                generation: usesFamilyFreshness && family ? Math.max(session.generation, family.generation) : session.generation,
                sourceUpdatedAt: session.sourceUpdatedAt?.toISOString() ?? null, latestActivityAt: activity?.timestamp ?? null,
                ownUsage: this.usage(key, own, selected, calculations), combinedUsage: this.usage(key, combined, selected, calculations),
                freshness: this.freshness(freshness)
            };
        });
        return {
            sourceKey: this.key(snapshot.sourceDirectory), generation: snapshot.generation, status: snapshot.status,
            freshness: this.freshness(snapshot.freshness), sessions, details, calculations
        };
    }

    /** Keeps the existing page usable until it switches to monitoring view models. */
    sessionList(): SessionListViewModel
    {
        const { snapshot } = this;
        const projects = new Map<string, SessionProjectViewModel>();
        const rows = new Map<string, SessionFileViewModel>();
        const orphanSubagents: SessionFileViewModel[] = [];
        for (const session of snapshot.sessions)
        {
            const { file } = session;
            rows.set(session.identity.key, {
                sessionId: file.sessionId, agentId: file.agentId, parentSessionId: file.parentSessionId,
                projectDirectory: file.projectDirectory, filename: file.filename, path: file.path, sizeBytes: file.sizeBytes,
                createdAt: file.createdAt.toISOString(), modifiedAt: file.modifiedAt.toISOString(), subagents: []
            });
        }
        for (const session of snapshot.sessions)
        {
            const row = rows.get(session.identity.key)!;
            const parent = session.parentKey === null ? undefined : rows.get(session.parentKey);
            if (parent !== undefined)
            {
                parent.subagents.push(row);
            }
            else if (session.orphan)
            {
                orphanSubagents.push(row);
            }
            else
            {
                const projectPath = this.projectPath(session);
                const project = projects.get(projectPath) ?? { projectPath, sessions: [] };
                project.sessions.push(row);
                projects.set(projectPath, project);
            }
        }

        const sort = (left: SessionFileViewModel, right: SessionFileViewModel) =>
            right.modifiedAt.localeCompare(left.modifiedAt) || left.path.localeCompare(right.path);
        for (const project of projects.values())
        {
            project.sessions.sort(sort);
            project.sessions.forEach(session => session.subagents.sort(sort));
        }
        return {
            status: snapshot.status, empty: snapshot.status === SessionDiscoveryStatus.Complete && rows.size === 0,
            projects: [...projects.values()].sort((left, right) => left.projectPath.localeCompare(right.projectPath)),
            orphanSubagents: orphanSubagents.sort(sort), warnings: snapshot.warnings.map(warning => ({ ...warning }))
        };
    }

    private usage(
        key: string,
        group: UsageCostGroup | undefined,
        selected: ReadonlySet<string>,
        calculations: MonitoringCalculationViewModel[]
    ): MonitoringUsageViewModel | null
    {
        if (group === undefined)
        {
            return null;
        }

        const amount = (name: string, evaluation: CalculationEvaluation): MonitoringAmountViewModel =>
        {
            const explanationId = `${key}.${group.attribution.scope}.${name}`;
            if (selected.has(explanationId))
            {
                calculations.push(new MonitoringCalculationProjection(this.fileKeys, group.terms).project(explanationId, evaluation));
            }
            return {
                explanationId, knownSubtotal: evaluation.knownSubtotal, unit: evaluation.calculation.unit as string as MonitoringCalculationUnit,
                unresolvedTermCount: evaluation.unresolvedTerms.length
            };
        };
        return {
            cost: amount('cost', group.evaluation),
            categories: group.categories.map(category => ({
                category: category.category as string as MonitoringTokenCategory,
                tokens: amount(`${category.category}-tokens`, category.tokens),
                cost: amount(`${category.category}-cost`, category.evaluation)
            }))
        };
    }

    private projectPath(session: MonitoringSessionState): string
    {
        const root = (session.parentKey === null ? undefined : this.sessions.get(session.parentKey)) ?? session;
        const retained = this.projects.get(root.identity.key);
        if (retained !== undefined)
        {
            return retained;
        }

        // Project labels come from the retained read, using the existing metadata fallback.
        let project = basename(root.file.projectDirectory);
        for (const { value } of root.tracked?.records ?? [])
        {
            if (typeof value === 'object' && value !== null && 'cwd' in value && typeof value.cwd === 'string' && value.cwd.trim() !== '')
            {
                project = value.cwd;
                break;
            }
        }
        this.projects.set(root.identity.key, project);
        return project;
    }

    private latestActivity(conversation: Conversation): MonitoringLatestActivity
    {
        let time = Number.NEGATIVE_INFINITY;
        let kind: MonitoringActivityKind | null = null;
        let uncertain = false;
        for (const message of conversation.messages)
        {
            const instant = message.timestamp === null ? NaN : Date.parse(message.timestamp);
            if (instant > time)
            {
                time = instant;
            }
            uncertain ||= !Number.isFinite(instant);
        }
        for (const step of [...conversation.turns.flatMap(turn => turn.substeps), ...conversation.unattachedActivity])
        {
            const instant = step.timestamp === null ? NaN : Date.parse(step.timestamp);
            if (instant >= time)
            {
                time = instant;
                kind = step.kind as string as MonitoringActivityKind;
            }
            uncertain ||= step.chronologyUncertain || !Number.isFinite(instant);
        }
        return { timestamp: Number.isFinite(time) ? new Date(time).toISOString() : null, kind, uncertain };
    }

    private freshness(freshness: MonitoringFreshness): MonitoringFreshnessViewModel
    {
        return {
            lastAttemptedAt: freshness.lastAttemptedAt.toISOString(), lastSuccessfulAt: freshness.lastSuccessfulAt?.toISOString() ?? null,
            stale: freshness.stale, issues: this.issues(freshness.issues)
        };
    }

    private issues(issues: readonly MonitoringIssue[]): MonitoringIssueViewModel[]
    {
        return issues.map(issue => ({ code: issue.kind, sessionKey: this.browserKey(issue.sessionKey), message: issue.message }));
    }

    private browserKey(key: string | null): string | null
    {
        return key === null ? null : this.keys.get(key) ?? null;
    }

    private key(identity: string): string
    {
        return createHash('sha256').update(identity).digest('base64url');
    }
}

interface MonitoringLatestActivity
{
    readonly timestamp: string | null;
    readonly kind: MonitoringActivityKind | null;
    readonly uncertain: boolean;
}
