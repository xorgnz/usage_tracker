/** File identity remains independent of identifiers repeated inside transcript records. */
export interface ConversationIdentity
{
    readonly projectDirectory: string;
    readonly sessionId: string;
    readonly agentId: string | null;
    readonly filePath: string;
}

/** Identifies a record or content block without depending on timestamps or message ids. */
export class ConversationSource
{
    readonly conversation: Readonly<ConversationIdentity>;
    readonly lineNumber: number;
    readonly blockIndex: number | null;

    constructor(conversation: ConversationIdentity, lineNumber: number, blockIndex: number | null = null)
    {
        // Reject invalid locations before they can become ambiguous relationship targets.
        if (!Number.isSafeInteger(lineNumber) || lineNumber < 1 || (blockIndex !== null && (!Number.isSafeInteger(blockIndex) || blockIndex < 0)))
        {
            throw new Error('Conversation source requires a positive line number and a nonnegative block index.');
        }

        this.conversation = Object.freeze({ ...conversation });
        this.lineNumber = lineNumber;
        this.blockIndex = blockIndex;
    }

    equals(other: ConversationSource): boolean
    {
        // Include the complete file identity, even when transcript identifiers coincide.
        return this.conversation.projectDirectory === other.conversation.projectDirectory
            && this.conversation.sessionId === other.conversation.sessionId
            && this.conversation.agentId === other.conversation.agentId
            && this.conversation.filePath === other.conversation.filePath
            && this.lineNumber === other.lineNumber
            && this.blockIndex === other.blockIndex;
    }
}
