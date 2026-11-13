import { ExactDecimal } from './ExactDecimal';
import { initialUsageRates } from './InitialUsageRates';
import { UsageCategory, type UsageContribution } from './UsageContribution';
import { UnresolvedRateReason, type UsageRate, type UsageRateCatalog, type UsageRateResolution } from './UsageRate';

export enum UsageRateIssueKind
{
    Invalid = 'invalid',
    Overlap = 'overlap',
    Gap = 'gap'
}

export interface UsageRateIssue
{
    readonly kind: UsageRateIssueKind;
    readonly rateIds: readonly string[];
    readonly message: string;
}

/** Owns effective-date validation/selection, isolating bad rows to their matching price key and period. */
export class DatedUsageRateCatalog implements UsageRateCatalog
{
    readonly issues: readonly UsageRateIssue[];
    private readonly rates: readonly UsageRate[];
    private readonly invalid: Set<UsageRate>;

    constructor(rates: readonly UsageRate[] = initialUsageRates)
    {
        this.rates = rates.map(rate =>
        {
            const copy = structuredClone(rate);
            return Object.freeze({ ...copy, assumptions: Array.isArray(copy.assumptions) ? Object.freeze([...copy.assumptions]) : copy.assumptions });
        });
        this.invalid = new Set();
        const issues: UsageRateIssue[] = [];
        const ids = new Map<string, UsageRate[]>();
        for (const rate of this.rates)
        {
            const matching = ids.get(rate.id) ?? [];
            matching.push(rate);
            ids.set(rate.id, matching);
            if (!this.valid(rate))
            {
                this.invalid.add(rate);
                issues.push({
                    kind: UsageRateIssueKind.Invalid,
                    rateIds: [rate.id],
                    message: 'Invalid rate fields, date interval, or numeric representation.'
                });
            }
        }
        for (const matching of ids.values())
        {
            if (matching.length > 1)
            {
                matching.forEach(rate => this.invalid.add(rate));
                issues.push({ kind: UsageRateIssueKind.Invalid, rateIds: matching.map(rate => rate.id), message: 'Rate IDs must be unique.' });
            }
        }

        // Issues describe the whole catalog; selection below still uses the actual usage instant.
        const partitions = new Map<string, UsageRate[]>();
        for (const rate of this.rates.filter(rate => !this.invalid.has(rate)))
        {
            const key = JSON.stringify([rate.model, rate.category, rate.detail]);
            const group = partitions.get(key) ?? [];
            group.push(rate);
            partitions.set(key, group);
        }
        for (const group of partitions.values())
        {
            const ordered = [...group].sort((left, right) => this.instant(left.effectiveFrom)! - this.instant(right.effectiveFrom)!);
            let covering = ordered[0];
            for (const next of ordered.slice(1))
            {
                const end = covering.effectiveUntil === null ? Infinity : this.instant(covering.effectiveUntil)!;
                const start = this.instant(next.effectiveFrom)!;
                if (start !== end)
                {
                    issues.push({
                        kind: start < end ? UsageRateIssueKind.Overlap : UsageRateIssueKind.Gap,
                        rateIds: [covering.id, next.id],
                        message: start < end ? 'Effective intervals overlap.' : 'Effective intervals leave a coverage gap.'
                    });
                }
                const nextEnd = next.effectiveUntil === null ? Infinity : this.instant(next.effectiveUntil)!;
                if (nextEnd > end)
                {
                    covering = next;
                }
            }
        }
        this.issues = Object.freeze(issues.map(issue => Object.freeze({ ...issue, rateIds: Object.freeze([...issue.rateIds]) })));
    }

    resolve(contribution: UsageContribution): UsageRateResolution
    {
        if (contribution.model === null || contribution.model.trim().length === 0)
        {
            return { rate: null, unresolved: UnresolvedRateReason.MissingModel, candidates: [] };
        }
        const time = this.instant(contribution.timestamp);
        if (time === null)
        {
            return { rate: null, unresolved: UnresolvedRateReason.MissingTimestamp, candidates: [] };
        }
        const matching = this.rates.filter(rate => rate.model === contribution.model && rate.category === contribution.category
            && rate.detail === contribution.detail);
        if (!this.standardGlobal(contribution) || (contribution.category === UsageCategory.CacheWrite && contribution.detail === null))
        {
            return { rate: null, unresolved: UnresolvedRateReason.UnsupportedPricing, candidates: matching };
        }
        const active = matching.filter(rate =>
        {
            const start = this.instant(rate.effectiveFrom);
            const end = rate.effectiveUntil === null ? Infinity : this.instant(rate.effectiveUntil);
            // An invalid date cannot prove an entry is outside the requested interval.
            return start === null || end === null || end <= start || (start <= time && time < end);
        });
        if (active.some(rate => this.invalid.has(rate)))
        {
            return { rate: null, unresolved: UnresolvedRateReason.InvalidRate, candidates: active };
        }
        if (active.length > 1)
        {
            return { rate: null, unresolved: UnresolvedRateReason.AmbiguousRate, candidates: active };
        }
        return active.length === 1 ? { rate: active[0], unresolved: null }
            : { rate: null, unresolved: UnresolvedRateReason.MissingRate, candidates: matching };
    }

    private valid(rate: UsageRate): boolean
    {
        const start = this.instant(rate.effectiveFrom);
        const end = rate.effectiveUntil === null ? Infinity : this.instant(rate.effectiveUntil);
        if (typeof rate.id !== 'string' || rate.id.trim().length === 0 || typeof rate.model !== 'string' || rate.model.trim().length === 0
            || !Object.values(UsageCategory).includes(rate.category)
            || !(rate.detail === null || (typeof rate.detail === 'string' && rate.detail.trim().length > 0))
            || start === null || end === null || end <= start || !Number.isSafeInteger(rate.tokenUnit) || rate.tokenUnit <= 0
            || typeof rate.source !== 'string' || rate.source.trim().length === 0
            || !Array.isArray(rate.assumptions) || !rate.assumptions.every(assumption => typeof assumption === 'string'))
        {
            return false;
        }
        try
        {
            ExactDecimal.parse(rate.usdAmount).divideByInteger(BigInt(rate.tokenUnit));
            return true;
        }
        catch
        {
            return false;
        }
    }

    private standardGlobal(contribution: UsageContribution): boolean
    {
        // Missing routing metadata uses the table's explicit baseline assumption; contradictory metadata does not.
        return contribution.recordedValues.every(record =>
        {
            if (typeof record.usage !== 'object' || record.usage === null || Array.isArray(record.usage))
            {
                return true;
            }
            const usage = record.usage as Record<string, unknown>;
            return [undefined, null, 'standard'].includes(usage.service_tier as string | null | undefined)
                && [undefined, null, 'standard'].includes(usage.speed as string | null | undefined)
                && [undefined, null, 'global'].includes(usage.inference_geo as string | null | undefined);
        });
    }

    private instant(value: string | null): number | null
    {
        if (typeof value !== 'string')
        {
            return null;
        }
        const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.exec(value);
        if (match === null || Number(match[4]) > 23 || Number(match[5]) > 59 || Number(match[6]) > 59)
        {
            return null;
        }
        const date = new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`);
        const time = Date.parse(value);
        return Number.isFinite(time) && date.getUTCFullYear() === Number(match[1]) && date.getUTCMonth() + 1 === Number(match[2])
            && date.getUTCDate() === Number(match[3]) ? time : null;
    }
}
