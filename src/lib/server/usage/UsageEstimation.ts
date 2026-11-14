import type { ConversationLoadResult } from '../conversations/ConversationLoadResult';
import type { UsageAccountingResult } from './UsageAccounting';
import type { UsageAttribution, UsageCategory, UsageContribution } from './UsageContribution';
import type { ConversationIdentity } from '../conversations/ConversationSource';
import type { CalculationEvaluation, UsageCalculation } from './UsageCalculation';
import type { UsageRateResolution } from './UsageRate';

/** One traceable pricing term retains its usage even if rate selection cannot succeed. */
export interface UsageCostTerm
{
    readonly contribution: UsageContribution;
    readonly pricing: UsageRateResolution;
    readonly tokens: UsageCalculation;
    readonly calculation: UsageCalculation;
    readonly sharedTotal: UsageCalculation | null;
}

export interface UsageCostCategory
{
    readonly category: UsageCategory;
    readonly tokens: CalculationEvaluation;
    readonly evaluation: CalculationEvaluation;
}

/** Unread/uninterpreted usage is separate from missing prices and internal allocations. */
export interface UsageCoverageGap
{
    readonly id: string;
    readonly conversation: ConversationIdentity | null;
    readonly reasons: readonly string[];
    readonly categories: readonly UsageCostCategory[];
}

export interface UsageCostGroup
{
    readonly attribution: UsageAttribution;
    readonly terms: readonly UsageCostTerm[];
    readonly categories: readonly UsageCostCategory[];
    readonly coverage: readonly UsageCoverageGap[];
    readonly evaluation: CalculationEvaluation;
}

/** Carries upstream access/parse limitations with domain accounting and pricing results. */
export interface UsageEstimationResult
{
    readonly source: ConversationLoadResult;
    readonly accounting: UsageAccountingResult;
    readonly costs: readonly UsageCostGroup[];
    readonly coverage: readonly UsageCoverageGap[];
}

/** Coordinates accounting, rate selection, and arithmetic without moving their rules into the service. */
export interface UsageEstimator
{
    estimate(source: ConversationLoadResult): UsageEstimationResult;
}
