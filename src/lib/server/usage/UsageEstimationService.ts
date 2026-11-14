import type { ConversationLoadResult } from '../conversations/ConversationLoadResult';
import type { UsageAccounting, UsageAccountingGroup, UsageAccountingResult } from './UsageAccounting';
import { CalculationKind, CalculationUnit, UsageCalculation } from './UsageCalculation';
import { UsageCalculationEngine } from './UsageCalculationEngine';
import { UsageCategory, UsageLevel, UsageScope } from './UsageContribution';
import { UsageCostCalculations } from './UsageCostCalculations';
import { UsageCoverage } from './UsageCoverage';
import { DatedUsageRateCatalog } from './DatedUsageRateCatalog';
import type { UsageCostGroup, UsageCostTerm, UsageCoverageGap, UsageEstimationResult, UsageEstimator } from './UsageEstimation';
import { UsageIdentity } from './UsageIdentity';
import type { UsageRateCatalog } from './UsageRate';
import { TokenUsageAccounting } from './TokenUsageAccounting';

/** Coordinates existing conversation outputs, accounting, dated pricing, and exact evaluation. */
export class UsageEstimationService implements UsageEstimator
{
    private readonly accounting: UsageAccounting;
    private readonly costs: UsageCostCalculations;
    private readonly engine: UsageCalculationEngine;

    constructor(accounting: UsageAccounting = new TokenUsageAccounting(), catalog: UsageRateCatalog = new DatedUsageRateCatalog())
    {
        this.accounting = accounting;
        this.costs = new UsageCostCalculations(catalog);
        this.engine = new UsageCalculationEngine();
    }

    estimate(source: ConversationLoadResult): UsageEstimationResult
    {
        const accounting = this.accounting.account(source.conversations.flatMap(entry => entry.parsed === null ? [] : [entry.parsed.conversation]));
        const coverage = new UsageCoverage().inspect(source);
        const groups = [...accounting.groups];

        // Failed reads still have a file identity and need explicit session results, rather than disappearing.
        for (const gap of coverage)
        {
            if (gap.conversation !== null && !groups.some(group => UsageIdentity.conversation(group.attribution.conversation)
                === UsageIdentity.conversation(gap.conversation!)))
            {
                for (const scope of [UsageScope.Own, UsageScope.IncludingSubagents])
                {
                    const attribution = { conversation: gap.conversation, level: UsageLevel.Session, scope, source: null };
                    const members = this.membership({ attribution, totals: [] }, source);
                    const included = accounting.groups.filter(group => group.attribution.level === UsageLevel.Session
                        && group.attribution.scope === UsageScope.Own && members.has(UsageIdentity.conversation(group.attribution.conversation)));
                    const totals = Object.values(UsageCategory).map(category =>
                    {
                        const children = included.flatMap(group => group.totals.filter(total => total.category === category));
                        return { category, contributions: children.flatMap(total => total.contributions),
                            calculation: UsageCalculation.sum(CalculationUnit.Tokens, children.flatMap(total => total.calculation.operands)) };
                    });
                    groups.push({ attribution, totals });
                }
            }
        }
        const costs = groups.map(group => this.group(group, accounting, this.membershipGaps(group, coverage, source)));
        return { source, accounting, costs, coverage };
    }

    private group(group: UsageAccountingGroup, accounting: UsageAccountingResult, coverage: readonly UsageCoverageGap[]): UsageCostGroup
    {
        const terms: UsageCostTerm[] = [];
        const categories = Object.values(UsageCategory).map(category =>
        {
            const total = group.totals.find(candidate => candidate.category === category);
            const categoryTerms: UsageCostTerm[] = [];
            if (total !== undefined)
            {
                // Aggregate operands already follow accounting's canonical contribution membership.
                if (total.contributions.length > 0)
                {
                    total.contributions.forEach((contribution, index) =>
                    {
                        const tokens = total.calculation.kind === CalculationKind.Sum ? total.calculation.operands[index] : total.calculation;
                        categoryTerms.push(...this.costs.compose(contribution, tokens, accounting));
                    });
                }
                else
                {
                    const allocation = accounting.allocations.find(candidate => candidate.total.category === category
                        && group.attribution.source?.equals(candidate.substep));
                    if (allocation !== undefined)
                    {
                        categoryTerms.push(...this.costs.compose(allocation.total, total.calculation, accounting));
                    }
                }
            }
            terms.push(...categoryTerms);
            const missing = coverage.map(gap => gap.categories.find(candidate => candidate.category === category)!);
            const costOperands = categoryTerms.map(term => term.calculation);
            if (total !== undefined && categoryTerms.length === 0 && total.calculation.kind !== CalculationKind.Sum)
            {
                // Unmeasured activity has no invented model, timestamp, or contribution.
                const rate = UsageCalculation.missing({
                    id: JSON.stringify([UsageIdentity.conversation(group.attribution.conversation), group.attribution.source?.lineNumber,
                        group.attribution.source?.blockIndex, category, 'unmeasured-price']),
                    unit: CalculationUnit.USDPerToken, reason: 'No pricing context for unmeasured activity.', sources: total.calculation.sources
                });
                costOperands.push(UsageCalculation.product(total.calculation, rate));
            }
            return {
                category,
                tokens: this.engine.evaluate(UsageCalculation.sum(CalculationUnit.Tokens,
                    [...(total === undefined ? [] : [total.calculation]), ...missing.map(gap => gap.tokens.calculation)])),
                evaluation: this.engine.evaluate(UsageCalculation.sum(CalculationUnit.USD,
                    [...costOperands, ...missing.map(gap => gap.evaluation.calculation)]))
            };
        });
        return { attribution: group.attribution, terms, categories, coverage,
            evaluation: this.engine.evaluate(UsageCalculation.sum(CalculationUnit.USD, categories.map(category => category.evaluation.calculation))) };
    }

    private membershipGaps(group: UsageAccountingGroup, coverage: readonly UsageCoverageGap[], source: ConversationLoadResult): UsageCoverageGap[]
    {
        if (group.attribution.level !== UsageLevel.Session)
        {
            return [];
        }
        const members = this.membership(group, source);
        return coverage.filter(gap => gap.conversation !== null && members.has(UsageIdentity.conversation(gap.conversation)));
    }

    private membership(group: UsageAccountingGroup, source: ConversationLoadResult): Set<string>
    {
        const members = new Set([UsageIdentity.conversation(group.attribution.conversation)]);
        if (group.attribution.scope === UsageScope.IncludingSubagents)
        {
            let changed = true;
            while (changed)
            {
                changed = false;
                for (const entry of source.conversations)
                {
                    const parent = entry.parsed?.conversation.parent?.parent;
                    const parentEntry = source.conversations.find(candidate => candidate.file.subagents.some(child => child.path === entry.file.path));
                    const parentKey = parent === undefined ? parentEntry === undefined ? null : UsageIdentity.conversation({
                        projectDirectory: parentEntry.file.projectDirectory, sessionId: parentEntry.file.sessionId,
                        agentId: parentEntry.file.agentId, filePath: parentEntry.file.path
                    }) : UsageIdentity.conversation(parent);
                    const key = UsageIdentity.conversation({ projectDirectory: entry.file.projectDirectory, sessionId: entry.file.sessionId,
                        agentId: entry.file.agentId, filePath: entry.file.path });
                    if (parentKey !== null && members.has(parentKey) && !members.has(key))
                    {
                        members.add(key);
                        changed = true;
                    }
                }
            }
        }
        return members;
    }
}
