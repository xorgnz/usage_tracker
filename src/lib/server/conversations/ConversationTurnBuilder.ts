import type { ConversationTurn } from './Conversation';
import { ConversationDiagnosticCode, type ConversationDiagnostic } from './ConversationDiagnostic';
import { ConversationMessageRole, ConversationUserOrigin, type ConversationMessage } from './ConversationMessage';
import type { ConversationRecord } from './ConversationRecord';
import type { ConversationSource } from './ConversationSource';
import {
    ConversationActivityStatus,
    ConversationRelationshipKind,
    ConversationSubstepKind,
    type ConversationRelationship,
    type ConversationSubstep
} from './ConversationSubstep';

export interface ConversationTurnResult
{
    readonly turns: readonly ConversationTurn[];
    readonly unattached: readonly ConversationSubstep[];
}

/** Owns chronological turn membership and conservative activity-completion assessment. */
export class ConversationTurnBuilder
{
    build(
        ordered: readonly ConversationRecord[],
        messages: readonly ConversationMessage[],
        activity: readonly ConversationSubstep[],
        relationships: readonly ConversationRelationship[],
        diagnostics: ConversationDiagnostic[]
    ): ConversationTurnResult
    {
        const messageByLine = new Map(messages.map(message => [message.source.lineNumber, message]));
        const stepsByLine = new Map<number, ConversationSubstep[]>();
        const turns: ConversationTurn[] = [];
        const unattached: ConversationSubstep[] = [];
        const membership = new Map<number, number>();
        let initiating: ConversationSource | null = null;
        let current: ConversationSubstep[] = [];
        let turnMessages: ConversationMessage[] = [];

        // Preserve block order from interpretation while assessing explicit completion evidence.
        for (const step of activity)
        {
            const assessed = this.assess(step, messageByLine.get(step.source.lineNumber), relationships, diagnostics);
            const steps = stepsByLine.get(step.source.lineNumber) ?? [];
            steps.push(assessed);
            stepsByLine.set(step.source.lineNumber, steps);
        }

        for (const record of ordered)
        {
            const line = record.source.lineNumber;
            const message = messageByLine.get(line);
            if (message?.userOrigin === ConversationUserOrigin.Initiating)
            {
                if (initiating !== null)
                {
                    turns.push(this.finish(initiating, current, turnMessages, diagnostics));
                }
                initiating = message.source;
                current = [];
                turnMessages = [];
            }

            const steps = stepsByLine.get(line) ?? [];
            if (initiating === null)
            {
                unattached.push(...steps);
            }
            else
            {
                membership.set(line, turns.length);
                current.push(...steps);
                if (message !== undefined)
                {
                    turnMessages.push(message);
                }
            }
        }
        if (initiating !== null)
        {
            turns.push(this.finish(initiating, current, turnMessages, diagnostics));
        }

        // Keep chronological membership visible when explicit tool links cross a turn boundary.
        for (const relationship of relationships)
        {
            if (relationship.target !== null && relationship.kind !== ConversationRelationshipKind.ParentRecord
                && membership.get(relationship.source.lineNumber) !== membership.get(relationship.target.lineNumber))
            {
                diagnostics.push({
                    code: ConversationDiagnosticCode.AmbiguousRelationship,
                    sources: [relationship.source, relationship.target],
                    message: 'Explicit activity link crosses chronological turn membership; both are retained.'
                });
            }
            if (relationship.kind === ConversationRelationshipKind.ToolResult && relationship.target !== null)
            {
                const assistant = relationships.find(link => link.kind === ConversationRelationshipKind.SourceAssistant
                    && link.source.lineNumber === relationship.source.lineNumber);
                if (assistant?.target !== null && assistant?.target !== undefined
                    && assistant.target.lineNumber !== relationship.target.lineNumber)
                {
                    diagnostics.push({
                        code: ConversationDiagnosticCode.AmbiguousRelationship,
                        sources: [relationship.source, relationship.target, assistant.target],
                        message: 'Tool-call and source-assistant references disagree; neither reference is discarded.'
                    });
                }
            }
        }
        return { turns, unattached };
    }

    private assess(
        step: ConversationSubstep,
        message: ConversationMessage | undefined,
        relationships: readonly ConversationRelationship[],
        diagnostics: ConversationDiagnostic[]
    ): ConversationSubstep
    {
        let status = ConversationActivityStatus.Unknown;
        if (step.kind === ConversationSubstepKind.ToolCall)
        {
            const results = relationships.filter(link => link.kind === ConversationRelationshipKind.ToolResult && link.target?.equals(step.source));
            status = results.length === 1 ? ConversationActivityStatus.Complete : ConversationActivityStatus.Incomplete;
            if (results.length !== 1)
            {
                diagnostics.push({
                    code: results.length > 1 ? ConversationDiagnosticCode.AmbiguousRelationship : ConversationDiagnosticCode.IncompleteActivity,
                    sources: [step.source, ...results.map(result => result.source)],
                    message: 'Tool call does not have exactly one resolved result.'
                });
            }
        }
        else if (step.kind === ConversationSubstepKind.ToolResult)
        {
            const link = relationships.find(candidate => candidate.kind === ConversationRelationshipKind.ToolResult && candidate.source.equals(step.source));
            status = link?.target ? ConversationActivityStatus.Complete : ConversationActivityStatus.Incomplete;
        }
        else if (message?.role === ConversationMessageRole.Assistant)
        {
            status = this.responseStatus(message.stopReason);
        }
        return { ...step, status };
    }

    private responseStatus(stopReason: string | null): ConversationActivityStatus
    {
        // A new user prompt alone is not evidence that the preceding response completed.
        switch (stopReason)
        {
            case 'end_turn':
            case 'stop_sequence':
                return ConversationActivityStatus.Complete;
            case 'max_tokens':
            case 'pause_turn':
                return ConversationActivityStatus.Incomplete;
            case 'interrupted':
            case 'cancelled':
                return ConversationActivityStatus.Interrupted;
            default:
                return ConversationActivityStatus.Unknown;
        }
    }

    private finish(
        initiating: ConversationSource,
        substeps: readonly ConversationSubstep[],
        messages: readonly ConversationMessage[],
        diagnostics: ConversationDiagnostic[]
    ): ConversationTurn
    {
        const assistants = messages.filter(message => message.role === ConversationMessageRole.Assistant);
        const last = assistants.at(-1);
        let status = last === undefined ? ConversationActivityStatus.Incomplete : this.responseStatus(last.stopReason);

        // Pending tools prevent a terminal assistant marker from implying a complete turn.
        if (status !== ConversationActivityStatus.Interrupted && substeps.some(step => step.status === ConversationActivityStatus.Incomplete))
        {
            status = ConversationActivityStatus.Incomplete;
        }
        if (last?.stopReason === 'tool_use')
        {
            status = ConversationActivityStatus.Incomplete;
        }
        if (status !== ConversationActivityStatus.Complete)
        {
            diagnostics.push({
                code: ConversationDiagnosticCode.IncompleteActivity,
                sources: [initiating],
                message: 'Turn completion is absent, incomplete, interrupted, or uncertain.'
            });
        }
        return { initiatingMessage: initiating, substeps: [...substeps], status };
    }
}
