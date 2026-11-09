import type { ConversationSource } from './ConversationSource';

export enum ConversationDiagnosticCode
{
    UnknownRecord = 'unknown-record',
    UnknownContent = 'unknown-content',
    InvalidField = 'invalid-field',
    UncertainUserOrigin = 'uncertain-user-origin',
    UncertainChronology = 'uncertain-chronology',
    TimestampOrderMismatch = 'timestamp-order-mismatch',
    MissingRelationship = 'missing-relationship',
    AmbiguousRelationship = 'ambiguous-relationship',
    IncompleteActivity = 'incomplete-activity'
}

/** Structured findings contain source locations and explanations, never transcript payloads. */
export interface ConversationDiagnostic
{
    readonly code: ConversationDiagnosticCode;
    readonly sources: readonly ConversationSource[];
    readonly message: string;
}
