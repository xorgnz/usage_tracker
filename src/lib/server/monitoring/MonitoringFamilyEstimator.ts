import { isAbsolute, relative, resolve, sep } from 'node:path';
import { SessionDiscoveryStatus, SessionWarningCode, type SessionWarning } from '../../sessions/SessionDiscoveryViewModel';
import type { ConversationFileResult } from '../conversations/ConversationLoadResult';
import { ConversationSubagentLinker } from '../conversations/ConversationSubagentLinker';
import { UsageEstimationService } from '../usage/UsageEstimationService';
import { MonitoringIssueKind, type MonitoringFamilyState, type MonitoringSessionState } from './MonitoringSnapshot';

/** Reconciles family membership and supplies canonical conversation snapshots to the usage estimator. */
export class MonitoringFamilyEstimator
{
    private readonly linker = new ConversationSubagentLinker();
    private readonly estimator = new UsageEstimationService();

    build(
        sessions: readonly MonitoringSessionState[],
        previous: readonly MonitoringFamilyState[],
        discoveryWarnings: readonly SessionWarning[],
        generation: number,
        lastAttemptedAt: Date
    ): MonitoringFamilyState[]
    {
        const groups = new Map<string, MonitoringSessionState[]>();
        const byKey = new Map(sessions.map(session => [session.identity.key, session]));
        const prior = new Map(previous.map(family => [family.root.key, family]));
        for (const session of sessions)
        {
            const key = session.parentKey ?? session.identity.key;
            const members = groups.get(key) ?? [];
            members.push(session);
            groups.set(key, members);
        }
        return [...groups].map(([key, members]) => this.estimate(byKey.get(key)!, members, prior.get(key), discoveryWarnings, generation, lastAttemptedAt));
    }

    private estimate(
        root: MonitoringSessionState,
        members: readonly MonitoringSessionState[],
        previous: MonitoringFamilyState | undefined,
        discoveryWarnings: readonly SessionWarning[],
        generation: number,
        lastAttemptedAt: Date
    ): MonitoringFamilyState
    {
        const memberKeys = members.map(member => member.identity.key).sort();
        const sameMembers = previous !== undefined && JSON.stringify(memberKeys) === JSON.stringify(previous.memberKeys);
        const localWarnings = discoveryWarnings.filter(warning => this.affectsFamily(warning, root, members));
        const issues = members.flatMap(member => member.freshness.issues);
        issues.push(...localWarnings.map(warning => ({ kind: MonitoringIssueKind.Discovery, sessionKey: root.identity.key, message: warning.message })));
        const stale = issues.length > 0;
        const warnings = [...localWarnings, ...members.flatMap(member => member.conversation?.warnings ?? [])];
        const previousEstimate = sameMembers ? previous.estimation : null;
        const mayReuse = previousEstimate !== null && members.every(member => member.generation <= previous!.generation)
            && !previous!.freshness.issues.some(issue => issue.kind === MonitoringIssueKind.Estimation)
            && stale === previous!.freshness.stale && JSON.stringify(warnings) === JSON.stringify(previousEstimate.source.warnings);
        const lastSuccessfulAt = sameMembers ? previous.freshness.lastSuccessfulAt : null;

        try
        {
            // Link fresh copies so reading a new parent cannot mutate a previously published family.
            const estimation = mayReuse ? previousEstimate : this.estimator.estimate({
                status: stale || warnings.length > 0 ? SessionDiscoveryStatus.Partial : SessionDiscoveryStatus.Complete,
                empty: false, conversations: members.map(member => this.link(member, root)), warnings
            });
            return {
                root: root.identity, memberKeys, generation: mayReuse ? previous!.generation : generation, estimation,
                freshness: { lastAttemptedAt, lastSuccessfulAt: stale ? lastSuccessfulAt : new Date(), stale, issues }
            };
        }
        catch
        {
            issues.push({ kind: MonitoringIssueKind.Estimation, sessionKey: root.identity.key, message: 'Cannot estimate session family usage.' });
            return {
                root: root.identity, memberKeys, generation: previousEstimate === null ? generation : previous!.generation, estimation: previousEstimate,
                freshness: { lastAttemptedAt, lastSuccessfulAt, stale: true, issues }
            };
        }
    }

    private link(member: MonitoringSessionState, root: MonitoringSessionState): ConversationFileResult
    {
        const retained = member.conversation;
        const parsed = retained?.parsed ?? null;
        const warnings = retained?.warnings ?? [];
        const current = {
            file: member.file, parsed, orphan: member.orphan, warnings,
            readFailed: member.freshness.stale, deferredTrailingRecord: retained?.deferredTrailingRecord ?? false
        };
        if (parsed === null || member.parentKey === null)
        {
            return current;
        }

        const parent = root.conversation?.parsed?.conversation;
        const diagnostics = [...parsed.diagnostics];
        const link = parent === undefined ? { parent: root.identity.conversation, toolInvocation: null }
            : this.linker.link(parent, parsed.conversation, diagnostics);
        return { ...current, parsed: { conversation: { ...parsed.conversation, parent: link }, diagnostics } };
    }

    private affectsFamily(warning: SessionWarning, root: MonitoringSessionState, members: readonly MonitoringSessionState[]): boolean
    {
        if (warning.code === SessionWarningCode.MissingParent)
        {
            return false;
        }

        if (warning.code === SessionWarningCode.FileAccess && members.some(member => relative(warning.path, member.file.path) === ''))
        {
            return true;
        }

        // Warnings under a session's subagent directory can hide previously unseen members.
        const children = resolve(root.file.projectDirectory, root.file.sessionId, 'subagents');
        return this.within(children, warning.path)
            || (warning.code === SessionWarningCode.DirectoryAccess && this.within(warning.path, children));
    }

    private within(directory: string, path: string): boolean
    {
        const descendant = relative(directory, path);
        return !isAbsolute(descendant) && descendant !== '..' && !descendant.startsWith('..' + sep);
    }
}
