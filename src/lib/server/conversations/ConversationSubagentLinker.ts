import type { Conversation, ConversationParentLink } from './Conversation';
import { ConversationDiagnosticCode, type ConversationDiagnostic } from './ConversationDiagnostic';
import type { ConversationSource } from './ConversationSource';
import { ConversationRelationshipKind } from './ConversationSubstep';

/** Interprets explicit parent tool-result evidence without guessing from names, text, or timing. */
export class ConversationSubagentLinker
{
    link(parent: Conversation, child: Conversation, diagnostics: ConversationDiagnostic[]): ConversationParentLink
    {
        const candidates: ConversationSource[] = [];
        const evidence: ConversationSource[] = [];
        let unresolved = false;

        // The caller supplies a discovered parent; preserve project/session isolation defensively.
        if (parent.identity.projectDirectory !== child.identity.projectDirectory || parent.identity.sessionId !== child.identity.sessionId
            || parent.identity.agentId !== null || child.identity.agentId === null)
        {
            throw new Error('Subagent and parent conversation identities do not match.');
        }

        for (const record of parent.records)
        {
            const value = record.value;
            if (!this.isObject(value) || value.type !== 'user' || !this.isObject(value.toolUseResult)
                || value.toolUseResult.agentId !== child.identity.agentId)
            {
                continue;
            }
            evidence.push(record.source);
            const links = parent.relationships.filter(link => link.kind === ConversationRelationshipKind.ToolResult
                && link.source.lineNumber === record.source.lineNumber);
            if (links.length !== 1 || links[0].target === null)
            {
                unresolved = true;
                continue;
            }
            const target = links[0].target;
            if (!candidates.some(candidate => candidate.equals(target)))
            {
                candidates.push(target);
            }
        }

        // Multiple observations of the same invocation agree; distinct invocations remain ambiguous.
        const toolInvocation = !unresolved && candidates.length === 1 ? candidates[0] : null;
        if (evidence.length > 0 && toolInvocation === null)
        {
            diagnostics.push({
                code: ConversationDiagnosticCode.AmbiguousRelationship,
                sources: [...evidence, ...candidates],
                message: 'Subagent evidence does not identify one resolved parent tool invocation; retaining session-level association.'
            });
        }
        return { parent: parent.identity, toolInvocation };
    }

    private isObject(value: unknown): value is Record<string, unknown>
    {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }
}
