import type { ConversationIdentity, ConversationSource } from '../conversations/ConversationSource';
import type { UsageContribution } from './UsageContribution';

/** Stable composite identity for accounting, independent of repeated transcript UUIDs. */
export class UsageIdentity
{
    static conversation(identity: ConversationIdentity): string
    {
        return JSON.stringify([identity.projectDirectory, identity.sessionId, identity.agentId, identity.filePath]);
    }

    static source(source: ConversationSource): string
    {
        return JSON.stringify([UsageIdentity.conversation(source.conversation), source.lineNumber, source.blockIndex]);
    }

    static contribution(contribution: UsageContribution): string
    {
        return JSON.stringify([UsageIdentity.source(contribution.source), contribution.category, contribution.detail, contribution.fieldPath]);
    }
}
