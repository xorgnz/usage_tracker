import { SessionDiscoveryStatus } from '../../src/lib/sessions/SessionDiscoveryViewModel';
import type { ConversationParseResult } from '../../src/lib/server/conversations/Conversation';
import type { ConversationFileResult, ConversationLoadResult } from '../../src/lib/server/conversations/ConversationLoadResult';
import type { ConversationIdentity } from '../../src/lib/server/conversations/ConversationSource';
import { SessionFile } from '../../src/lib/server/sessions/SessionFile';
import { UsageCategory } from '../../src/lib/server/usage/UsageContribution';
import type { UsageRate } from '../../src/lib/server/usage/UsageRate';
import { ConversationFixture as F } from './ConversationFixture';

/** Synthetic usage vocabulary; no real provider prices or private session data. */
export class UsageFixture
{
    static usage(): Record<string, unknown>
    {
        return { input_tokens: 100, output_tokens: 900, cache_read_input_tokens: 30, cache_creation_input_tokens: 40,
            cache_creation: { ephemeral_5m_input_tokens: 10, ephemeral_1h_input_tokens: 30 } };
    }

    static assistant(
        usage: unknown = this.usage(),
        id = 'response',
        timestamp: unknown = F.middle,
        model: string | null = 'synthetic-model',
        content: unknown = [F.text(), F.text()]
    )
    {
        const record = F.assistant(content, timestamp, 'end_turn', `assistant-${id}`);
        return { ...record, requestId: `request-${id}`, message: { ...record.message, id, model, usage } };
    }

    static parse(records: readonly unknown[] = [F.user(), this.assistant()], identity = F.identity()): ConversationParseResult
    {
        return F.parse(records, identity);
    }

    static entry(parsed: ConversationParseResult | null = this.parse(), identity: ConversationIdentity = F.identity()): ConversationFileResult
    {
        const owner = parsed?.conversation.identity ?? identity;
        const file = new SessionFile({ projectDirectory: owner.projectDirectory, sessionId: owner.sessionId, agentId: owner.agentId,
            parentSessionId: owner.agentId === null ? null : owner.sessionId, path: owner.filePath, filename: 'synthetic.jsonl',
            sizeBytes: 1, createdAt: new Date(0), modifiedAt: new Date(0) });
        return { file, parsed, readFailed: parsed === null, deferredTrailingRecord: false, warnings: [], orphan: false };
    }

    static load(entries: readonly ConversationFileResult[] = [this.entry()]): ConversationLoadResult
    {
        return { status: SessionDiscoveryStatus.Complete, empty: entries.length === 0, conversations: entries, warnings: [] };
    }

    static rate(category = UsageCategory.Input, amount = '2', detail: string | null = null, changes: Partial<UsageRate> = {}): UsageRate
    {
        return { id: `synthetic-${category}-${detail}`, model: 'synthetic-model', category, detail, usdAmount: amount, tokenUnit: 1000000,
            effectiveFrom: '2026-01-01T00:00:00Z', effectiveUntil: null, source: 'urn:synthetic:rate',
            assumptions: ['Synthetic schedule for tests.'], ...changes };
    }

    static rates(): UsageRate[]
    {
        return [this.rate(), this.rate(UsageCategory.Output, '3'), this.rate(UsageCategory.CacheRead, '0.2'),
            this.rate(UsageCategory.CacheWrite, '2.5', 'ephemeral_5m_input_tokens'),
            this.rate(UsageCategory.CacheWrite, '4', 'ephemeral_1h_input_tokens')];
    }
}
