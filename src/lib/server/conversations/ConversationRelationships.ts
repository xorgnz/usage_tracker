import type { ConversationRecord } from './ConversationRecord';
import type { ConversationSource } from './ConversationSource';
import { ConversationDiagnosticCode, type ConversationDiagnostic } from './ConversationDiagnostic';
import { ConversationRelationshipKind, ConversationSubstepKind, type ConversationRelationship, type ConversationSubstep } from './ConversationSubstep';

/** Resolves explicit identifiers within a single parser-validated conversation. */
export class ConversationRelationships
{
    resolve(records: readonly ConversationRecord[], activity: readonly ConversationSubstep[], diagnostics: ConversationDiagnostic[]): ConversationRelationship[]
    {
        const recordIds = new Map<string, ConversationSource[]>();
        const toolIds = new Map<string, ConversationSource[]>();
        const assistantIds = new Map<string, ConversationSource[]>();
        const relationships: ConversationRelationship[] = [];

        // Index all candidates before resolving forward references; duplicates remain ambiguous.
        for (const record of records)
        {
            const value = record.value;
            this.index(recordIds, this.field(value, 'uuid'), record.source);
            if (this.field(value, 'type') === 'assistant')
            {
                this.index(assistantIds, this.field(value, 'uuid'), record.source);
            }
        }
        for (const step of activity)
        {
            if (step.kind === ConversationSubstepKind.ToolCall)
            {
                this.index(toolIds, this.field(step.content, 'id'), step.source);
            }
        }

        for (const record of records)
        {
            const value = record.value;
            this.link(relationships, recordIds, record.source, this.field(value, 'parentUuid'), ConversationRelationshipKind.ParentRecord, diagnostics);
            this.link(
                relationships,
                assistantIds,
                record.source,
                this.field(value, 'sourceToolAssistantUUID'),
                ConversationRelationshipKind.SourceAssistant,
                diagnostics
            );
            this.link(relationships, toolIds, record.source, this.field(value, 'sourceToolUseID'), ConversationRelationshipKind.SourceTool, diagnostics);
        }
        for (const step of activity)
        {
            if (step.kind === ConversationSubstepKind.ToolResult)
            {
                const id = this.field(step.content, 'tool_use_id');
                this.link(relationships, toolIds, step.source, id, ConversationRelationshipKind.ToolResult, diagnostics);
                if (id === null)
                {
                    diagnostics.push({
                        code: ConversationDiagnosticCode.MissingRelationship,
                        sources: [step.source],
                        message: 'Tool result has no usable call identifier.'
                    });
                }
            }
        }
        return relationships;
    }

    private field(value: unknown, key: string): string | null
    {
        if (typeof value !== 'object' || value === null || Array.isArray(value))
        {
            return null;
        }
        const field = (value as Record<string, unknown>)[key];
        return typeof field === 'string' && field.length > 0 ? field : null;
    }

    private index(index: Map<string, ConversationSource[]>, id: string | null, source: ConversationSource): void
    {
        if (id !== null)
        {
            const candidates = index.get(id) ?? [];
            candidates.push(source);
            index.set(id, candidates);
        }
    }

    private link(
        relationships: ConversationRelationship[],
        index: Map<string, ConversationSource[]>,
        source: ConversationSource,
        id: string | null,
        kind: ConversationRelationshipKind,
        diagnostics: ConversationDiagnostic[]
    ): void
    {
        if (id === null)
        {
            return;
        }
        const candidates = index.get(id) ?? [];
        const target = candidates.length === 1 && !candidates[0].equals(source) ? candidates[0] : null;
        relationships.push({ source, targetId: id, kind, candidates: [...candidates], target });
        if (target === null)
        {
            diagnostics.push({
                code: candidates.length === 0 ? ConversationDiagnosticCode.MissingRelationship : ConversationDiagnosticCode.AmbiguousRelationship,
                sources: [source, ...candidates],
                message: 'Explicit relationship has no unique usable target.'
            });
        }
    }
}
