import type { ConversationIdentity } from '../conversations/ConversationSource';

/** Full source/file identity for internal state; transport keys are resolved separately. */
export class MonitoringSessionIdentity
{
    readonly sourceDirectory: string;
    readonly conversation: Readonly<ConversationIdentity>;
    readonly key: string;

    constructor(sourceDirectory: string, conversation: ConversationIdentity)
    {
        // Require a resolved configured source; filesystem normalization belongs to its owner.
        if (sourceDirectory.trim().length === 0 || conversation.projectDirectory.trim().length === 0
            || conversation.sessionId.trim().length === 0 || conversation.filePath.trim().length === 0
            || (conversation.agentId !== null && conversation.agentId.trim().length === 0))
        {
            throw new Error('Monitoring identity requires a configured source and complete conversation/file identity.');
        }
        this.sourceDirectory = sourceDirectory;
        this.conversation = Object.freeze({ ...conversation });
        this.key = JSON.stringify([sourceDirectory, conversation.projectDirectory, conversation.sessionId, conversation.agentId, conversation.filePath]);
        Object.freeze(this);
    }

    equals(other: MonitoringSessionIdentity): boolean
    {
        return this.key === other.key;
    }
}
