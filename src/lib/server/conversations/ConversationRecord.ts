import { ConversationSource } from './ConversationSource';

/** Owns an unmodified parsed JSON snapshot, including primitives, arrays, null, and unknown fields. */
export class ConversationRecord
{
    readonly source: ConversationSource;
    private readonly snapshot: unknown;

    constructor(source: ConversationSource, value: unknown)
    {
        // Raw retention is record-level; block references belong to interpreted content.
        if (source.blockIndex !== null)
        {
            throw new Error('A raw conversation record must reference an entire source line.');
        }

        this.source = source;
        this.snapshot = structuredClone(value);
    }

    get value(): unknown
    {
        // Consumers may inspect a copy without mutating the retained source snapshot.
        return structuredClone(this.snapshot);
    }
}
