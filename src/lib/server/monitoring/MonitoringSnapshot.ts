import type { SessionDiscoveryStatus, SessionWarning } from '../../sessions/SessionDiscoveryViewModel';
import type { ConversationFileResult } from '../conversations/ConversationLoadResult';
import type { TrackedSessionFile } from '../sessions/IncrementalSessionRead';
import type { SessionFile } from '../sessions/SessionFile';
import type { UsageEstimationResult } from '../usage/UsageEstimation';
import type { MonitoringSessionIdentity } from './MonitoringSessionIdentity';

export enum MonitoringIssueKind
{
    Discovery = 'discovery',
    Read = 'read',
    Interpretation = 'interpretation',
    Estimation = 'estimation'
}

/** A null session key scopes the issue to the whole configured source. */
export interface MonitoringIssue
{
    readonly kind: MonitoringIssueKind;
    readonly sessionKey: string | null;
    readonly message: string;
}

/** Failed attempts must not advance the last successful refresh time. */
export interface MonitoringFreshness
{
    readonly lastAttemptedAt: Date;
    readonly lastSuccessfulAt: Date | null;
    readonly stale: boolean;
    readonly issues: readonly MonitoringIssue[];
}

/** Published session data; retained read/parse values can survive a failed newer attempt. */
export interface MonitoringSessionState
{
    readonly identity: MonitoringSessionIdentity;
    readonly file: SessionFile;
    readonly parentKey: string | null;
    readonly orphan: boolean;
    readonly tracked: TrackedSessionFile | null;
    readonly conversation: ConversationFileResult | null;
    readonly generation: number;
    readonly sourceUpdatedAt: Date | null;
    readonly freshness: MonitoringFreshness;
}

/** One independent parent/subagent family, or an orphan, with explicit computed membership. */
export interface MonitoringFamilyState
{
    readonly root: MonitoringSessionIdentity;
    readonly memberKeys: readonly string[];
    readonly generation: number;
    readonly estimation: UsageEstimationResult | null;
    readonly freshness: MonitoringFreshness;
}

/** Coherent server-only publication; mutable working state is not exposed through this boundary. */
export interface MonitoringSnapshot
{
    readonly sourceDirectory: string;
    readonly generation: number;
    readonly status: SessionDiscoveryStatus;
    readonly sessions: readonly MonitoringSessionState[];
    readonly families: readonly MonitoringFamilyState[];
    readonly freshness: MonitoringFreshness;
    readonly warnings: readonly SessionWarning[];
}

/** Bound to one configured source; refresh advances every discovered session, regardless of expansion. */
export interface MonitoringUpdater
{
    readonly sourceDirectory: string;
    refresh(): Promise<MonitoringSnapshot>;
}
