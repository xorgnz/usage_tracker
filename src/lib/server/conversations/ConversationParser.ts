import type { ConversationParseResult } from './Conversation';
import type { ConversationDiagnostic } from './ConversationDiagnostic';
import type { ConversationMessage } from './ConversationMessage';
import { ConversationRecord } from './ConversationRecord';
import { ConversationRecordInterpreter } from './ConversationRecordInterpreter';
import type { ConversationIdentity } from './ConversationSource';
import type { ConversationSubstep } from './ConversationSubstep';

/** Interprets supplied record snapshots without filesystem, framework, or console dependencies. */
export class ConversationParser
{
    parse(identity: ConversationIdentity, records: readonly ConversationRecord[]): ConversationParseResult
    {
        const messages: ConversationMessage[] = [];
        const activity: ConversationSubstep[] = [];
        const diagnostics: ConversationDiagnostic[] = [];

        // Preserve input/file order independently of future chronological presentation.
        const retained = [...records];
        for (const record of retained)
        {
            const owner = record.source.conversation;
            if (owner.filePath !== identity.filePath || owner.projectDirectory !== identity.projectDirectory
                || owner.sessionId !== identity.sessionId || owner.agentId !== identity.agentId)
            {
                throw new Error('Parser records must belong to the supplied conversation identity.');
            }

            const interpretation = new ConversationRecordInterpreter(record);
            interpretation.interpret();
            if (interpretation.message !== null)
            {
                messages.push(interpretation.message);
            }
            activity.push(...interpretation.substeps);
            diagnostics.push(...interpretation.diagnostics);
        }

        // Turn construction and relationship resolution are the subsequent parsing stage.
        return {
            conversation: {
                identity: Object.freeze({ ...identity }),
                parent: null,
                records: retained,
                messages,
                turns: [],
                unattachedActivity: activity,
                relationships: []
            },
            diagnostics
        };
    }
}
