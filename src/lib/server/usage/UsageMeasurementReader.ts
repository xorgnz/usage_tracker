import type { ConversationSource } from '../conversations/ConversationSource';
import { UsageDiagnosticCode, type UsageDiagnostic } from './UsageAccounting';
import { UsageCategory, type UsageAttribution, type UsageBreakdown, type UsageContribution, type UsageRecordedValue } from './UsageContribution';
import { TokenQuantity, UnknownTokenReason } from './TokenQuantity';

/** A recorded response or block observation, before category reconciliation. */
export interface UsageObservation
{
    readonly source: ConversationSource;
    readonly responseId: string | null;
    readonly requestId: string | null;
    readonly model: string | null;
    readonly timestamp: string | null;
    readonly usage: unknown;
    readonly hasUsage: boolean;
}

export interface UsageMeasurements
{
    readonly contributions: readonly UsageContribution[];
    readonly breakdowns: readonly UsageBreakdown[];
}

/** Reconciles category measurements without choosing latest/max or summing response snapshots. */
export class UsageMeasurementReader
{
    read(observations: readonly UsageObservation[], attribution: UsageAttribution, diagnostics: UsageDiagnostic[]): UsageMeasurements
    {
        const definitions = new Map<UsageCategory, string>([
            [UsageCategory.Input, 'input_tokens'],
            [UsageCategory.Output, 'output_tokens'],
            [UsageCategory.CacheRead, 'cache_read_input_tokens'],
            [UsageCategory.CacheWrite, 'cache_creation_input_tokens']
        ]);
        const contributions: UsageContribution[] = [];
        const breakdowns: UsageBreakdown[] = [];
        for (const [category, field] of definitions)
        {
            const total = this.measure(observations, attribution, category, null, [field], diagnostics);
            contributions.push(total);
            let paths: string[][] = [];
            if (category === UsageCategory.CacheWrite && observations.some(observation => this.object(observation.usage)?.cache_creation !== undefined))
            {
                paths = [['cache_creation', 'ephemeral_5m_input_tokens'], ['cache_creation', 'ephemeral_1h_input_tokens']];
            }
            if (category === UsageCategory.Output && observations.some(observation => this.object(observation.usage)?.output_tokens_details !== undefined
                && this.object(observation.usage)?.output_tokens_details !== null))
            {
                paths = [['output_tokens_details', 'thinking_tokens']];
            }
            if (paths.length > 0)
            {
                const components = paths.map(path => this.measure(observations, attribution, category, path[1], path, diagnostics));
                const knownCacheFields = new Set(['ephemeral_5m_input_tokens', 'ephemeral_1h_input_tokens']);
                const exhaustive = category === UsageCategory.CacheWrite && observations.every(observation =>
                {
                    const details = this.object(this.object(observation.usage)?.cache_creation);
                    return details !== null && Object.keys(details).every(key => knownCacheFields.has(key));
                });
                breakdowns.push({ total, components, exhaustive });
                if (category === UsageCategory.CacheWrite && !exhaustive)
                {
                    diagnostics.push({
                        code: UsageDiagnosticCode.UnsupportedUsage,
                        sources: total.observations,
                        message: 'Cache breakdown contains unsupported or missing structure; its completeness is not assumed.'
                    });
                }
                const known = components.every(component => component.quantity.count !== null);
                if (total.quantity.count !== null && known)
                {
                    const sum = components.reduce((value, component) => value + BigInt(component.quantity.count!), 0n);
                    if ((exhaustive && sum !== BigInt(total.quantity.count)) || sum > BigInt(total.quantity.count))
                    {
                        diagnostics.push({
                            code: UsageDiagnosticCode.InconsistentBreakdown,
                            sources: total.observations,
                            message: 'Recorded total and breakdown disagree.'
                        });
                    }
                }
            }
        }
        return { contributions, breakdowns };
    }

    private measure(
        observations: readonly UsageObservation[],
        attribution: UsageAttribution,
        category: UsageCategory,
        detail: string | null,
        path: readonly string[],
        diagnostics: UsageDiagnostic[]
    ): UsageContribution
    {
        const values: UsageRecordedValue[] = observations.map(observation =>
        {
            let value: unknown = observation.usage;
            let present = observation.hasUsage;
            for (const key of path)
            {
                const object = this.object(value);
                present = present && object !== null && Object.hasOwn(object, key);
                value = present ? object![key] : undefined;
            }
            return {
                source: observation.source, present, value, usage: structuredClone(observation.usage), hasUsage: observation.hasUsage,
                model: observation.model, timestamp: observation.timestamp, requestId: observation.requestId
            };
        });
        const recorded = values.filter(value => value.present);
        const counts = recorded.filter(value => typeof value.value === 'number' && Number.isSafeInteger(value.value) && value.value >= 0);
        const distinct = new Set(counts.map(value => value.value as number));
        const requests = new Set(observations.map(observation => observation.requestId).filter(value => value !== null));
        const invalidEnvelope = observations.some(observation => observation.hasUsage && this.object(observation.usage) === null);
        const conflicting = distinct.size > 1 || requests.size > 1 || (counts.length > 0 && (counts.length !== recorded.length || invalidEnvelope));
        const quantity = conflicting ? TokenQuantity.unknown(UnknownTokenReason.Conflicting)
            : counts.length > 0 ? TokenQuantity.known(counts[0].value as number)
            : TokenQuantity.unknown((recorded.length > 0 || invalidEnvelope) ? UnknownTokenReason.Invalid : UnknownTokenReason.Missing);
        if (quantity.count === null)
        {
            diagnostics.push({
                code: conflicting ? UsageDiagnosticCode.ConflictingObservations
                    : (recorded.length > 0 || invalidEnvelope) ? UsageDiagnosticCode.InvalidUsage : UsageDiagnosticCode.MissingUsage,
                sources: observations.map(observation => observation.source),
                message: 'Usage category is missing, invalid, or conflicting; source observations are retained.'
            });
        }

        // Counts can remain known even when model/time evidence cannot identify a price.
        const models = new Set(observations.map(observation => observation.model).filter(value => value !== null));
        const times = observations.filter(observation => observation.timestamp !== null && Number.isFinite(Date.parse(observation.timestamp)));
        const instants = new Set(times.map(observation => Date.parse(observation.timestamp!)));
        if (models.size > 1 || instants.size > 1)
        {
            diagnostics.push({
                code: UsageDiagnosticCode.ConflictingObservations,
                sources: observations.map(observation => observation.source),
                message: 'Response observations disagree on model or timestamp; affected pricing metadata remains unresolved.'
            });
        }
        return {
            source: observations[0].source,
            observations: observations.map(observation => observation.source),
            responseId: observations[0].responseId,
            requestId: requests.size === 1 ? [...requests][0] : null,
            model: models.size === 1 ? [...models][0] : null,
            timestamp: instants.size === 1 ? times[0].timestamp : null,
            category, detail, attribution, quantity,
            originalValue: structuredClone(values[0].value),
            recordedValues: values,
            fieldPath: [...path]
        };
    }

    private object(value: unknown): Record<string, unknown> | null
    {
        return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
    }
}
