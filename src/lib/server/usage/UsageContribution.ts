import type { ConversationIdentity, ConversationSource } from '../conversations/ConversationSource';
import { TokenQuantity, UnknownTokenReason } from './TokenQuantity';

export enum UsageCategory
{
    Input = 'input',
    Output = 'output',
    CacheRead = 'cache-read',
    CacheWrite = 'cache-write'
}

export enum UsageLevel
{
    Substep = 'substep',
    Response = 'response',
    Turn = 'turn',
    Session = 'session'
}

export enum UsageScope
{
    Own = 'own',
    IncludingSubagents = 'including-subagents'
}

/** Identifies a domain result's level independently of where measurements were recorded. */
export interface UsageAttribution
{
    readonly conversation: ConversationIdentity;
    readonly level: UsageLevel;
    readonly scope: UsageScope;
    readonly source: ConversationSource | null;
}

/** Source evidence remains available even when observations cannot be reconciled. */
export interface UsageRecordedValue
{
    readonly source: ConversationSource;
    readonly present: boolean;
    readonly value: unknown;
    readonly usage: unknown;
    readonly hasUsage: boolean;
    readonly model: string | null;
    readonly timestamp: string | null;
    readonly requestId: string | null;
}

/** A category measurement with every source observation retained for later reconciliation. */
export interface UsageContribution
{
    readonly source: ConversationSource;
    readonly observations: readonly ConversationSource[];
    readonly responseId: string | null;
    readonly requestId: string | null;
    readonly model: string | null;
    readonly timestamp: string | null;
    readonly category: UsageCategory;
    readonly detail: string | null;
    readonly attribution: UsageAttribution;
    readonly quantity: TokenQuantity;
    readonly originalValue: unknown;
    readonly recordedValues: readonly UsageRecordedValue[];
    readonly fieldPath: readonly string[];
}

/** A known total and its category subdivisions are alternatives for aggregation, not additive charges. */
export interface UsageBreakdown
{
    readonly total: UsageContribution;
    readonly components: readonly UsageContribution[];
    readonly exhaustive: boolean;
}

/** Unknown allocation is a reference to measured usage, never an independent contribution. */
export class SharedUsageAllocation
{
    readonly substep: ConversationSource;
    readonly total: UsageContribution;
    readonly quantity: TokenQuantity;

    constructor(substep: ConversationSource, total: UsageContribution)
    {
        const owner = substep.conversation;
        const measured = total.source.conversation;

        // An allocation must not silently borrow usage from another project, session, or file.
        if (owner.projectDirectory !== measured.projectDirectory || owner.sessionId !== measured.sessionId
            || owner.agentId !== measured.agentId || owner.filePath !== measured.filePath)
        {
            throw new Error('Shared usage allocation must belong to the measured conversation.');
        }
        this.substep = substep;
        this.total = total;
        this.quantity = TokenQuantity.unknown(UnknownTokenReason.Unallocated);
    }
}
