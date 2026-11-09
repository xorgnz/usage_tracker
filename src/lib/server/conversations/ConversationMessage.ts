import type { ConversationSource } from './ConversationSource';

export enum ConversationMessageRole
{
    User = 'user',
    Assistant = 'assistant'
}

export enum ConversationUserOrigin
{
    Initiating = 'initiating',
    ToolResult = 'tool-result',
    Synthetic = 'synthetic',
    Unknown = 'unknown'
}

/** One source message observation; repeated response ids do not collapse source records. */
export interface ConversationMessage
{
    readonly source: ConversationSource;
    readonly role: ConversationMessageRole;
    readonly userOrigin: ConversationUserOrigin | null;
    readonly recordId: string | null;
    readonly parentRecordId: string | null;
    readonly responseId: string | null;
    readonly requestId: string | null;
    readonly apiBlockIndex: number | null;
    readonly timestamp: string | null;
    readonly model: string | null;
    readonly stopReason: string | null;
    readonly usage: unknown;
    readonly hasUsage: boolean;
}
