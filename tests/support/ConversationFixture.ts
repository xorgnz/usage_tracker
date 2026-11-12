import type { ConversationParseResult } from '../../src/lib/server/conversations/Conversation';
import { ConversationParser } from '../../src/lib/server/conversations/ConversationParser';
import { ConversationRecord } from '../../src/lib/server/conversations/ConversationRecord';
import { ConversationSource, type ConversationIdentity } from '../../src/lib/server/conversations/ConversationSource';

/** Synthetic transcript vocabulary shared by parser and disposable-file service tests. */
export class ConversationFixture
{
    static readonly early = '2026-01-01T00:00:00.000Z';
    static readonly middle = '2026-01-01T00:00:01.000Z';
    static readonly late = '2026-01-01T00:00:02.000Z';
    static readonly secret = 'PRIVATE_CONVERSATION_SENTINEL';

    static identity(projectDirectory = '/synthetic/project', agentId: string | null = null): ConversationIdentity
    {
        return { projectDirectory, sessionId: 'session', agentId, filePath: `${projectDirectory}/${agentId ?? 'session'}.jsonl` };
    }

    static user(timestamp: unknown = this.early, uuid = 'user')
    {
        return {
            type: 'user', uuid, timestamp, promptSource: 'typed', turnOrigin: 'human',
            message: { role: 'user', content: this.secret }
        };
    }

    static assistant(content: unknown = [this.text()], timestamp: unknown = this.middle, stopReason: string | null = 'end_turn', uuid = 'assistant')
    {
        return {
            type: 'assistant', uuid, parentUuid: 'user', timestamp, requestId: 'request', apiBlockIndex: 0,
            message: {
                role: 'assistant', id: 'response', model: 'synthetic-model', content, stop_reason: stopReason,
                usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 30, cache_creation_input_tokens: 40 }
            }
        };
    }

    static text(text = this.secret)
    {
        return { type: 'text', text };
    }

    static call(id = 'call')
    {
        return { type: 'tool_use', id, name: 'Agent', input: { prompt: this.secret }, caller: { type: 'direct' } };
    }

    static result(id = 'call', agentId: string | null = null, timestamp: unknown = this.late)
    {
        return {
            type: 'user', uuid: `result-${id}`, timestamp, sourceToolAssistantUUID: 'assistant',
            toolUseResult: { agentId },
            message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: [this.text()], is_error: false }] }
        };
    }

    static parse(values: readonly unknown[], identity = this.identity()): ConversationParseResult
    {
        const records = values.map((value, index) => new ConversationRecord(new ConversationSource(identity, index + 1), value));
        return new ConversationParser().parse(identity, records);
    }

    static jsonl(values: readonly unknown[]): string
    {
        return values.map(value => JSON.stringify(value)).join('\n') + '\n';
    }
}
