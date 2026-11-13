import type { ConversationLoadResult } from '../conversations/ConversationLoadResult';
import type { UsageAccountingResult } from './UsageAccounting';
import type { UsageAttribution, UsageContribution } from './UsageContribution';
import type { CalculationEvaluation, UsageCalculation } from './UsageCalculation';
import type { UsageRateResolution } from './UsageRate';

/** One traceable pricing term retains its usage even if rate selection cannot succeed. */
export interface UsageCostTerm
{
    readonly contribution: UsageContribution;
    readonly pricing: UsageRateResolution;
    readonly calculation: UsageCalculation;
}

export interface UsageCostGroup
{
    readonly attribution: UsageAttribution;
    readonly terms: readonly UsageCostTerm[];
    readonly evaluation: CalculationEvaluation;
}

/** Carries upstream access/parse limitations with domain accounting and pricing results. */
export interface UsageEstimationResult
{
    readonly source: ConversationLoadResult;
    readonly accounting: UsageAccountingResult;
    readonly costs: readonly UsageCostGroup[];
}

/** Coordinates accounting, rate selection, and arithmetic without moving their rules into the service. */
export interface UsageEstimator
{
    estimate(source: ConversationLoadResult): UsageEstimationResult;
}
