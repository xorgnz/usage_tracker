import type { UsageCategory, UsageContribution } from './UsageContribution';

/** Explicit rate-unit and effective-period metadata accompany every selected price. */
export interface UsageRate
{
    readonly id: string;
    readonly model: string;
    readonly category: UsageCategory;
    readonly detail: string | null;
    readonly usdAmount: string;
    readonly tokenUnit: number;
    readonly effectiveFrom: string;
    readonly effectiveUntil: string | null;
    readonly source: string;
    readonly assumptions: readonly string[];
}

export enum UnresolvedRateReason
{
    MissingModel = 'missing-model',
    MissingTimestamp = 'missing-timestamp',
    MissingRate = 'missing-rate',
    AmbiguousRate = 'ambiguous-rate',
    InvalidRate = 'invalid-rate',
    UnsupportedPricing = 'unsupported-pricing'
}

export interface SelectedUsageRate
{
    readonly rate: UsageRate;
    readonly unresolved: null;
}

export interface UnresolvedUsageRate
{
    readonly rate: null;
    readonly unresolved: UnresolvedRateReason;
    readonly candidates: readonly UsageRate[];
}

export type UsageRateResolution = SelectedUsageRate | UnresolvedUsageRate;

/** Owns dated model/category selection, separate from usage extraction and arithmetic. */
export interface UsageRateCatalog
{
    resolve(contribution: UsageContribution): UsageRateResolution;
}
