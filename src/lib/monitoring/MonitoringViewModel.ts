import type { SessionDiscoveryStatus } from '../sessions/SessionDiscoveryViewModel';

export enum MonitoringTokenCategory
{
    Input = 'input',
    Output = 'output',
    CacheRead = 'cache-read',
    CacheWrite = 'cache-write'
}

export enum MonitoringCalculationUnit
{
    Scalar = 'scalar',
    Tokens = 'tokens',
    USD = 'usd',
    USDPerToken = 'usd-per-token'
}

export enum MonitoringCalculationKind
{
    Known = 'known',
    Unknown = 'unknown',
    Sum = 'sum',
    Product = 'product',
    Reference = 'reference'
}

export enum MonitoringActivityKind
{
    Text = 'text',
    Thinking = 'thinking',
    ToolCall = 'tool-call',
    ToolResult = 'tool-result',
    SystemEvent = 'system-event',
    Unknown = 'unknown'
}

/** Compact aggregate; explanatory graphs are delivered only when requested. */
export interface MonitoringAmountViewModel
{
    readonly knownSubtotal: string;
    readonly unit: MonitoringCalculationUnit;
    readonly unresolvedTermCount: number;
    readonly explanationId: string;
}

export interface MonitoringCategoryViewModel
{
    readonly category: MonitoringTokenCategory;
    readonly tokens: MonitoringAmountViewModel;
    readonly cost: MonitoringAmountViewModel;
}

export interface MonitoringUsageViewModel
{
    readonly categories: readonly MonitoringCategoryViewModel[];
    readonly cost: MonitoringAmountViewModel;
}

/** Safe display metadata only; no original record values or transcript text. */
export interface MonitoringIssueViewModel
{
    readonly code: string;
    readonly sessionKey: string | null;
    readonly message: string;
}

/** Dates cross the browser boundary explicitly as ISO text rather than Date instances. */
export interface MonitoringFreshnessViewModel
{
    readonly lastAttemptedAt: string;
    readonly lastSuccessfulAt: string | null;
    readonly stale: boolean;
    readonly issues: readonly MonitoringIssueViewModel[];
}

/** All discovered sessions get a row even when no successful usage snapshot exists yet. */
export interface MonitoringSessionSummaryViewModel
{
    readonly key: string;
    readonly sessionId: string;
    readonly agentId: string | null;
    readonly parentKey: string | null;
    readonly orphan: boolean;
    readonly projectPath: string;
    readonly filename: string;
    readonly sizeBytes: number;
    readonly createdAt: string;
    readonly modifiedAt: string;
    readonly generation: number;
    readonly sourceUpdatedAt: string | null;
    readonly latestActivityAt: string | null;
    readonly ownUsage: MonitoringUsageViewModel | null;
    readonly combinedUsage: MonitoringUsageViewModel | null;
    readonly freshness: MonitoringFreshnessViewModel;
}

/** Expanded activity summary, not a conversation/step inspection payload. */
export interface MonitoringSessionDetailViewModel
{
    readonly sessionKey: string;
    readonly generation: number;
    readonly models: readonly string[];
    readonly messageCount: number;
    readonly turnCount: number;
    readonly latestActivityKind: MonitoringActivityKind | null;
    readonly latestActivityAt: string | null;
    readonly chronologyUncertain: boolean;
    readonly issues: readonly MonitoringIssueViewModel[];
}

export interface MonitoringCalculationSourceViewModel
{
    readonly id: string;
    readonly sessionKey: string;
    readonly lineNumber: number;
    readonly blockIndex: number | null;
}

export interface MonitoringUnknownViewModel
{
    readonly id: string;
    readonly reason: string;
    readonly sourceIds: readonly string[];
    readonly pricing: MonitoringPricingContextViewModel | null;
}

/** Known pricing context remains explanatory data even when no dated rate could be selected. */
export interface MonitoringPricingContextViewModel
{
    readonly model: string | null;
    readonly timestamp: string | null;
    readonly category: MonitoringTokenCategory;
    readonly detail: string | null;
}

/** Referenced nodes preserve shared-total identity without recursively duplicating graphs. */
export interface MonitoringCalculationNodeViewModel
{
    readonly id: string;
    readonly kind: MonitoringCalculationKind;
    readonly unit: MonitoringCalculationUnit;
    readonly value: string | null;
    readonly unknown: MonitoringUnknownViewModel | null;
    readonly operandIds: readonly string[];
    readonly sharedTotalId: string | null;
    readonly sourceIds: readonly string[];
    readonly rateIds: readonly string[];
}

export interface MonitoringRateViewModel
{
    readonly id: string;
    readonly model: string;
    readonly category: MonitoringTokenCategory;
    readonly detail: string | null;
    readonly usdAmount: string;
    readonly tokenUnit: number;
    readonly effectiveFrom: string;
    readonly effectiveUntil: string | null;
    readonly source: string;
    readonly assumptions: readonly string[];
}

/** Selected explanation graph and evidence, scoped to the same response generation as its summary. */
export interface MonitoringCalculationViewModel
{
    readonly id: string;
    readonly rootId: string;
    readonly unresolvedTermIds: readonly string[];
    readonly nodes: readonly MonitoringCalculationNodeViewModel[];
    readonly sources: readonly MonitoringCalculationSourceViewModel[];
    readonly rates: readonly MonitoringRateViewModel[];
}

/** Parsed request selection; keys must resolve inside the configured source, not to arbitrary paths. */
export interface MonitoringSelection
{
    readonly expandedSessionKeys: readonly string[];
    readonly explanationIds: readonly string[];
}

/** One wire publication: summaries for everyone, details/explanations only for the requested selection. */
export interface MonitoringResponseViewModel
{
    readonly sourceKey: string;
    readonly generation: number;
    readonly status: SessionDiscoveryStatus;
    readonly freshness: MonitoringFreshnessViewModel;
    readonly sessions: readonly MonitoringSessionSummaryViewModel[];
    readonly details: readonly MonitoringSessionDetailViewModel[];
    readonly calculations: readonly MonitoringCalculationViewModel[];
}
