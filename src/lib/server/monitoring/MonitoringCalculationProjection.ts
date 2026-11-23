import {
    MonitoringCalculationKind, MonitoringCalculationUnit, MonitoringTokenCategory,
    type MonitoringCalculationNodeViewModel, type MonitoringCalculationSourceViewModel, type MonitoringCalculationViewModel,
    type MonitoringPricingContextViewModel, type MonitoringRateViewModel
} from '../../monitoring/MonitoringViewModel';
import type { ConversationSource } from '../conversations/ConversationSource';
import type { CalculationEvaluation, UsageCalculation } from '../usage/UsageCalculation';
import type { UsageCostTerm } from '../usage/UsageEstimation';

/** Builds a graph for one requested explanation, with references local to the payload. */
export class MonitoringCalculationProjection
{
    private readonly sessionKeys: ReadonlyMap<string, string>;
    private readonly nodeIds = new Map<UsageCalculation, string>();
    private readonly unknownIds = new Map<string, string>();
    private readonly sources = new Map<string, MonitoringCalculationSourceViewModel>();
    private readonly nodes: MonitoringCalculationNodeViewModel[] = [];
    private readonly rates = new Map<string, MonitoringRateViewModel>();
    private readonly pricing = new Map<string, MonitoringPricingContextViewModel>();

    constructor(sessionKeys: ReadonlyMap<string, string>, terms: readonly UsageCostTerm[])
    {
        this.sessionKeys = sessionKeys;
        for (const { contribution, calculation, pricing } of terms)
        {
            if (pricing.rate !== null)
            {
                const rate = pricing.rate;
                this.rates.set(rate.id, {
                    id: rate.id, model: rate.model, category: rate.category as string as MonitoringTokenCategory,
                    detail: rate.detail, usdAmount: rate.usdAmount, tokenUnit: rate.tokenUnit, effectiveFrom: rate.effectiveFrom,
                    effectiveUntil: rate.effectiveUntil, source: rate.source, assumptions: [...rate.assumptions]
                });
            }
            else
            {
                const unknown = calculation.operands[1]?.unknown;
                if (unknown)
                {
                    this.pricing.set(unknown.id, {
                        model: contribution.model, timestamp: contribution.timestamp,
                        category: contribution.category as string as MonitoringTokenCategory, detail: contribution.detail
                    });
                }
            }
        }
    }

    project(id: string, evaluation: CalculationEvaluation): MonitoringCalculationViewModel
    {
        const rootId = this.visit(evaluation.calculation);
        const unresolvedTermIds = evaluation.unresolvedTerms.map(term => this.visit(term));
        const rateIds = new Set(this.nodes.flatMap(node => node.rateIds));
        return {
            id, rootId, unresolvedTermIds, nodes: this.nodes, sources: [...this.sources.values()],
            rates: [...this.rates.values()].filter(rate => rateIds.has(rate.id))
        };
    }

    private visit(calculation: UsageCalculation): string
    {
        const retained = this.nodeIds.get(calculation);
        if (retained !== undefined)
        {
            return retained;
        }

        const id = String(this.nodeIds.size);
        this.nodeIds.set(calculation, id);
        const unknown = calculation.unknown;
        let unknownView = null;
        if (unknown !== null)
        {
            const unknownId = this.unknownIds.get(unknown.id) ?? String(this.unknownIds.size);
            this.unknownIds.set(unknown.id, unknownId);
            unknownView = { id: unknownId, reason: unknown.reason, sourceIds: this.sourceIds(unknown.sources), pricing: this.pricing.get(unknown.id) ?? null };
        }

        this.nodes.push({
            id, kind: calculation.kind as string as MonitoringCalculationKind, unit: calculation.unit as string as MonitoringCalculationUnit,
            value: calculation.value?.toString() ?? null, unknown: unknownView, operandIds: calculation.operands.map(operand => this.visit(operand)),
            sharedTotalId: calculation.sharedTotal === null ? null : this.visit(calculation.sharedTotal),
            sourceIds: this.sourceIds(calculation.sources), rateIds: [...calculation.rateIds]
        });
        return id;
    }

    private sourceIds(sources: readonly ConversationSource[]): string[]
    {
        const ids = new Set<string>();
        for (const source of sources)
        {
            const sessionKey = this.sessionKeys.get(source.conversation.filePath);
            if (sessionKey === undefined)
            {
                continue;
            }

            const key = JSON.stringify([sessionKey, source.lineNumber, source.blockIndex]);
            let view = this.sources.get(key);
            if (view === undefined)
            {
                view = { id: String(this.sources.size), sessionKey, lineNumber: source.lineNumber, blockIndex: source.blockIndex };
                this.sources.set(key, view);
            }
            ids.add(view.id);
        }
        return [...ids];
    }
}
