import { ConversationDiagnosticCode, type ConversationDiagnostic } from './ConversationDiagnostic';
import { ConversationMessageRole, ConversationUserOrigin, type ConversationMessage } from './ConversationMessage';
import type { ConversationRecord } from './ConversationRecord';
import { ConversationSource } from './ConversationSource';
import { ConversationActivityStatus, ConversationSubstepKind, type ConversationSubstep } from './ConversationSubstep';

/** Owns tolerant interpretation and diagnostics for one retained source record. */
export class ConversationRecordInterpreter
{
    message: ConversationMessage | null = null;
    readonly substeps: ConversationSubstep[] = [];
    readonly diagnostics: ConversationDiagnostic[] = [];
    private readonly record: ConversationRecord;
    private timestamp: string | null = null;

    constructor(record: ConversationRecord)
    {
        this.record = record;
    }

    interpret(): void
    {
        // Reset per-record output so repeated interpretation cannot accumulate duplicates.
        this.message = null;
        this.substeps.length = 0;
        this.diagnostics.length = 0;
        this.timestamp = null;
        const value = this.record.value;
        if (!ConversationRecordInterpreter.isObject(value))
        {
            this.unknownRecord(value);
            return;
        }

        // Only transcript envelopes are messages; embedded request copies remain raw.
        if (value.type !== 'user' && value.type !== 'assistant' && value.type !== 'system')
        {
            this.unknownRecord(value);
            return;
        }

        this.timestamp = this.readTimestamp(value.timestamp);
        if (value.type === 'system')
        {
            this.addSubstep(ConversationSubstepKind.SystemEvent, value, this.record.source);
            if (value.subtype !== 'turn_duration' && value.subtype !== 'local_command')
            {
                this.report(ConversationDiagnosticCode.UnknownContent, 'System event subtype is not interpreted.', this.record.source);
            }
            return;
        }

        if (!ConversationRecordInterpreter.isObject(value.message))
        {
            this.report(ConversationDiagnosticCode.InvalidField, 'Message envelope is missing or invalid.', this.record.source);
            this.addSubstep(ConversationSubstepKind.Unknown, value, this.record.source);
            return;
        }

        const message = value.message;
        const role = value.type === 'user' ? ConversationMessageRole.User : ConversationMessageRole.Assistant;
        if (message.role !== value.type)
        {
            this.report(ConversationDiagnosticCode.InvalidField, 'Message role differs from the transcript envelope.', this.record.source);
        }

        // Retain usage once per observation, including absent-versus-null distinction.
        this.message = {
            source: this.record.source,
            role,
            userOrigin: role === ConversationMessageRole.User ? this.userOrigin(value, message.content) : null,
            recordId: this.optionalString(value, 'uuid'),
            parentRecordId: this.optionalString(value, 'parentUuid'),
            responseId: this.optionalString(message, 'id'),
            requestId: this.optionalString(value, 'requestId'),
            apiBlockIndex: this.readBlockIndex(value.apiBlockIndex),
            timestamp: this.timestamp,
            model: this.optionalString(message, 'model'),
            stopReason: this.optionalString(message, 'stop_reason'),
            usage: message.usage,
            hasUsage: Object.hasOwn(message, 'usage')
        };
        if (this.message.hasUsage && !ConversationRecordInterpreter.isObject(message.usage))
        {
            this.report(ConversationDiagnosticCode.InvalidField, 'Recorded usage is not an object; original value is retained.', this.record.source);
        }

        // Keep array position as block identity; string messages reference the entire record.
        if (typeof message.content === 'string')
        {
            this.addSubstep(ConversationSubstepKind.Text, message.content, this.record.source);
        }
        else if (Array.isArray(message.content))
        {
            message.content.forEach((block: unknown, index: number) => this.interpretBlock(block, index));
        }
        else
        {
            this.report(ConversationDiagnosticCode.InvalidField, 'Message content is neither text nor a block array.', this.record.source);
            this.addSubstep(ConversationSubstepKind.Unknown, message.content, this.record.source);
        }
    }

    private interpretBlock(block: unknown, index: number): void
    {
        const source = new ConversationSource(this.record.source.conversation, this.record.source.lineNumber, index);
        let kind = ConversationSubstepKind.Unknown;
        let valid = true;

        // Preserve complete blocks, including extension fields and nested tool-result payloads.
        if (ConversationRecordInterpreter.isObject(block))
        {
            switch (block.type)
            {
                case 'text':
                    kind = ConversationSubstepKind.Text;
                    valid = typeof block.text === 'string';
                    break;
                case 'thinking':
                    kind = ConversationSubstepKind.Thinking;
                    valid = typeof block.thinking === 'string';
                    break;
                case 'tool_use':
                    kind = ConversationSubstepKind.ToolCall;
                    valid = typeof block.id === 'string' && block.id.length > 0 && typeof block.name === 'string'
                        && block.name.length > 0 && ConversationRecordInterpreter.isObject(block.input);
                    break;
                case 'tool_result':
                    kind = ConversationSubstepKind.ToolResult;
                    valid = typeof block.tool_use_id === 'string' && block.tool_use_id.length > 0 && Object.hasOwn(block, 'content')
                        && (!Object.hasOwn(block, 'is_error') || typeof block.is_error === 'boolean');
                    break;
            }
        }

        if (kind === ConversationSubstepKind.Unknown)
        {
            this.report(ConversationDiagnosticCode.UnknownContent, 'Content block type is not interpreted.', source);
        }
        else if (!valid)
        {
            this.report(ConversationDiagnosticCode.InvalidField, 'Recognized content block has missing or invalid fields.', source);
        }
        this.addSubstep(kind, block, source);
    }

    private userOrigin(record: Record<string, unknown>, content: unknown): ConversationUserOrigin
    {
        // Tool and synthetic evidence takes precedence over an initiating-message label.
        if (Array.isArray(content) && content.some(block => ConversationRecordInterpreter.isObject(block) && block.type === 'tool_result'))
        {
            return ConversationUserOrigin.ToolResult;
        }
        if (record.isMeta === true || record.promptSource === 'system' || record.turnOrigin === 'peer'
            || record.turnOrigin === 'task_notification' || typeof record.sourceToolUseID === 'string')
        {
            return ConversationUserOrigin.Synthetic;
        }
        if (record.turnOrigin === 'human' || record.turnOrigin === 'sdk' || record.promptSource === 'typed' || record.promptSource === 'sdk')
        {
            return ConversationUserOrigin.Initiating;
        }
        this.report(ConversationDiagnosticCode.UncertainUserOrigin, 'User-message origin cannot be established from recorded metadata.', this.record.source);
        return ConversationUserOrigin.Unknown;
    }

    private readTimestamp(value: unknown): string | null
    {
        // Preserve original spelling; invalid or absent timestamps have no invented substitute.
        if (typeof value === 'string' && Number.isFinite(Date.parse(value)))
        {
            return value;
        }
        this.report(ConversationDiagnosticCode.UncertainChronology, 'Record timestamp is missing or invalid.', this.record.source);
        return null;
    }

    private readBlockIndex(value: unknown): number | null
    {
        if (value === undefined || value === null)
        {
            return null;
        }
        if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
        {
            return value;
        }
        this.report(ConversationDiagnosticCode.InvalidField, 'API block index is invalid.', this.record.source);
        return null;
    }

    private optionalString(value: Record<string, unknown>, key: string): string | null
    {
        const field = value[key];
        if (field === undefined || field === null)
        {
            return null;
        }
        if (typeof field === 'string' && field.length > 0)
        {
            return field;
        }
        this.report(ConversationDiagnosticCode.InvalidField, `Invalid ${key} metadata; raw value is retained.`, this.record.source);
        return null;
    }

    private unknownRecord(value: unknown): void
    {
        this.report(ConversationDiagnosticCode.UnknownRecord, 'Record type is not interpreted; raw value is retained.', this.record.source);
        this.addSubstep(ConversationSubstepKind.Unknown, value, this.record.source);
    }

    private addSubstep(kind: ConversationSubstepKind, content: unknown, source: ConversationSource): void
    {
        this.substeps.push({
            source,
            messageSource: this.message?.source ?? null,
            kind,
            timestamp: this.timestamp,
            chronologyUncertain: this.timestamp === null,
            status: ConversationActivityStatus.Unknown,
            content
        });
    }

    private report(code: ConversationDiagnosticCode, message: string, source: ConversationSource): void
    {
        this.diagnostics.push({ code, sources: [source], message });
    }

    private static isObject(value: unknown): value is Record<string, unknown>
    {
        return typeof value === 'object' && value !== null && !Array.isArray(value);
    }
}
