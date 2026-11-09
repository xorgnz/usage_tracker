import type { ConversationDiagnostic } from './ConversationDiagnostic';
import type { ConversationMessage } from './ConversationMessage';
import type { ConversationRecord } from './ConversationRecord';
import type { ConversationIdentity, ConversationSource } from './ConversationSource';
import type { ConversationActivityStatus, ConversationRelationship, ConversationSubstep } from './ConversationSubstep';

/** A user-initiated turn; chronological construction belongs to the parser. */
export interface ConversationTurn
{
    readonly initiatingMessage: ConversationSource;
    readonly substeps: readonly ConversationSubstep[];
    readonly status: ConversationActivityStatus;
}

/** Parent membership and an optional evidence-backed invocation link remain separate. */
export interface ConversationParentLink
{
    readonly parent: ConversationIdentity;
    readonly toolInvocation: ConversationSource | null;
}

/** Server domain result, independent of routes, UI projections, file access, and accounting. */
export interface Conversation
{
    readonly identity: ConversationIdentity;
    readonly parent: ConversationParentLink | null;
    readonly records: readonly ConversationRecord[];
    readonly messages: readonly ConversationMessage[];
    readonly turns: readonly ConversationTurn[];
    readonly unattachedActivity: readonly ConversationSubstep[];
    readonly relationships: readonly ConversationRelationship[];
}

/** Parsing findings are distinct from discovery/read failures owned by the service. */
export interface ConversationParseResult
{
    readonly conversation: Conversation;
    readonly diagnostics: readonly ConversationDiagnostic[];
}
