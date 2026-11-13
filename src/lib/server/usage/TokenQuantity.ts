export enum TokenQuantityState
{
    Known = 'known',
    Unknown = 'unknown',
    NotApplicable = 'not-applicable'
}

export enum UnknownTokenReason
{
    Missing = 'missing',
    Invalid = 'invalid',
    Conflicting = 'conflicting',
    Unallocated = 'unallocated'
}

/** Distinguishes measured zero, missing counts, and non-applicability supported by evidence. */
export class TokenQuantity
{
    readonly state: TokenQuantityState;
    readonly count: number | null;
    readonly reason: UnknownTokenReason | null;
    readonly evidence: string | null;

    private constructor(state: TokenQuantityState, count: number | null, reason: UnknownTokenReason | null, evidence: string | null)
    {
        this.state = state;
        this.count = count;
        this.reason = reason;
        this.evidence = evidence;
    }

    static known(count: number): TokenQuantity
    {
        // Do not accept rounded, fractional, or negative observations as precise token counts.
        if (!Number.isSafeInteger(count) || count < 0)
        {
            throw new Error('Known token count must be a nonnegative safe integer.');
        }
        return new TokenQuantity(TokenQuantityState.Known, count, null, null);
    }

    static unknown(reason: UnknownTokenReason): TokenQuantity
    {
        return new TokenQuantity(TokenQuantityState.Unknown, null, reason, null);
    }

    static notApplicable(evidence: string): TokenQuantity
    {
        if (evidence.trim().length === 0)
        {
            throw new Error('Non-applicable token quantities require supporting evidence.');
        }
        return new TokenQuantity(TokenQuantityState.NotApplicable, null, null, evidence);
    }
}
