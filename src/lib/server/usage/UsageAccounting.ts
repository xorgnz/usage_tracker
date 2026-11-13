import type { Conversation } from '../conversations/Conversation';
import type { ConversationSource } from '../conversations/ConversationSource';
import type { SharedUsageAllocation, UsageAttribution, UsageBreakdown, UsageCategory, UsageContribution } from './UsageContribution';
import type { UsageCalculation } from './UsageCalculation';

export enum UsageDiagnosticCode
{
    MissingUsage = 'missing-usage',
    InvalidUsage = 'invalid-usage',
    ConflictingObservations = 'conflicting-observations',
    UnsupportedUsage = 'unsupported-usage',
    InconsistentBreakdown = 'inconsistent-breakdown'
}

export interface UsageDiagnostic
{
    readonly code: UsageDiagnosticCode;
    readonly sources: readonly ConversationSource[];
    readonly message: string;
}

/** A subtotal retains its calculation and explicit membership rather than hiding repeated references. */
export interface UsageCategoryTotal
{
    readonly category: UsageCategory;
    readonly calculation: UsageCalculation;
    readonly contributions: readonly UsageContribution[];
}

export interface UsageAccountingGroup
{
    readonly attribution: UsageAttribution;
    readonly totals: readonly UsageCategoryTotal[];
}

export interface UsageAccountingResult
{
    readonly contributions: readonly UsageContribution[];
    readonly breakdowns: readonly UsageBreakdown[];
    readonly allocations: readonly SharedUsageAllocation[];
    readonly groups: readonly UsageAccountingGroup[];
    readonly diagnostics: readonly UsageDiagnostic[];
}

/** Owns measurement reconciliation and aggregation; accepts actual parsed conversations. */
export interface UsageAccounting
{
    account(conversations: readonly Conversation[]): UsageAccountingResult;
}
