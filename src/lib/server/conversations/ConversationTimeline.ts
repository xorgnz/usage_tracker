import type { ConversationRecord } from './ConversationRecord';
import { ConversationDiagnosticCode, type ConversationDiagnostic } from './ConversationDiagnostic';

/** Orders whole records so content blocks can never be split or reordered. */
export class ConversationTimeline
{
    order(records: readonly ConversationRecord[], diagnostics: ConversationDiagnostic[]): readonly ConversationRecord[]
    {
        const sourceOrder = [...records].sort((left, right) => left.source.lineNumber - right.source.lineNumber);
        const times = new Map<ConversationRecord, number>();

        // Missing timestamps retain their source-order slots; only dated slots are permuted.
        for (const record of sourceOrder)
        {
            const value = record.value;
            if (typeof value === 'object' && value !== null && 'timestamp' in value && typeof value.timestamp === 'string')
            {
                const time = Date.parse(value.timestamp);
                if (Number.isFinite(time))
                {
                    times.set(record, time);
                }
            }
        }
        const dated = sourceOrder.filter(record => times.has(record));
        const sorted = [...dated].sort((left, right) => times.get(left)! - times.get(right)! || left.source.lineNumber - right.source.lineNumber);
        const changed = dated.filter((record, index) => record !== sorted[index]);
        if (changed.length > 0)
        {
            diagnostics.push({
                code: ConversationDiagnosticCode.TimestampOrderMismatch,
                sources: changed.map(record => record.source),
                message: 'Timestamp order differs from file order.'
            });
        }

        let index = 0;
        return sourceOrder.map(record => times.has(record) ? sorted[index++] : record);
    }
}
