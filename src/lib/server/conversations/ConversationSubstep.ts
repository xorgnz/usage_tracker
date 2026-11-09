import type { ConversationSource } from './ConversationSource';

export enum ConversationSubstepKind
{
    Text = 'text',
    Thinking = 'thinking',
    ToolCall = 'tool-call',
    ToolResult = 'tool-result',
    SystemEvent = 'system-event',
    Unknown = 'unknown'
}

export enum ConversationActivityStatus
{
    Complete = 'complete',
    Incomplete = 'incomplete',
    Interrupted = 'interrupted',
    Unknown = 'unknown'
}

/** Usage remains attached to the message source, rather than duplicated on each content block. */
export interface ConversationSubstep
{
    readonly source: ConversationSource;
    readonly messageSource: ConversationSource | null;
    readonly kind: ConversationSubstepKind;
    readonly timestamp: string | null;
    readonly chronologyUncertain: boolean;
    readonly status: ConversationActivityStatus;
    readonly content: unknown;
}

export enum ConversationRelationshipKind
{
    ParentRecord = 'parent-record',
    ToolResult = 'tool-result',
    SourceAssistant = 'source-assistant',
    SourceTool = 'source-tool'
}

/** Retains unresolved identifier evidence without inventing a target. */
export interface ConversationRelationship
{
    readonly kind: ConversationRelationshipKind;
    readonly source: ConversationSource;
    readonly targetId: string;
    readonly candidates: readonly ConversationSource[];
    readonly target: ConversationSource | null;
}
