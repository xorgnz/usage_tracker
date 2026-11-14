import { ExactDecimal } from './ExactDecimal';
import { CalculationKind, CalculationUnit, UsageCalculation } from './UsageCalculation';
import { TokenQuantityState } from './TokenQuantity';
import type { UsageAccountingResult } from './UsageAccounting';
import { UsageCategory, UsageLevel, type UsageContribution } from './UsageContribution';
import type { UsageCostTerm } from './UsageEstimation';
import { UsageIdentity } from './UsageIdentity';
import type { UsageRateCatalog } from './UsageRate';
import { UsageTokenCalculations } from './UsageTokenCalculations';

/** Prices the accounting expression without treating subdivisions as additional usage. */
export class UsageCostCalculations
{
    private readonly catalog: UsageRateCatalog;

    constructor(catalog: UsageRateCatalog)
    {
        this.catalog = catalog;
    }

    compose(contribution: UsageContribution, tokens: UsageCalculation, accounting: UsageAccountingResult): UsageCostTerm[]
    {
        // Preserve unresolved allocations and expose their priced shared total as evidence only.
        if (tokens.sharedTotal !== null)
        {
            const shared = this.compose(contribution, tokens.sharedTotal, accounting);
            return [this.term(contribution, tokens, UsageCalculation.sum(CalculationUnit.USD, shared.map(term => term.calculation)))];
        }

        // Accounting determines whether missing totals can use breakdowns or measured blocks.
        if (tokens.kind === CalculationKind.Sum)
        {
            const breakdown = accounting.breakdowns.find(candidate => candidate.total === contribution);
            const candidates = breakdown?.components ?? accounting.contributions.filter(candidate =>
                candidate.attribution.level === UsageLevel.Substep && candidate.category === contribution.category
                && contribution.observations.some(source => source.conversation.filePath === candidate.source.conversation.filePath
                    && source.lineNumber === candidate.source.lineNumber));
            return tokens.operands.flatMap((operand, index) => this.compose(candidates[index] ?? contribution, operand, accounting));
        }

        // Cache durations have different prices. Price supported known portions and retain the remainder.
        if (contribution.category === UsageCategory.CacheWrite && contribution.detail === null
            && contribution.quantity.state === TokenQuantityState.Known && tokens.kind === CalculationKind.Known)
        {
            const breakdown = accounting.breakdowns.find(candidate => candidate.total === contribution);
            const known = breakdown?.components.filter(component => component.quantity.state === TokenQuantityState.Known) ?? [];
            const measured = known.reduce((sum, component) => sum + BigInt(component.quantity.count!), 0n);
            const total = BigInt(contribution.quantity.count!);
            const conflictingComplete = breakdown?.exhaustive === true && known.length === breakdown.components.length && measured !== total;
            if (known.length > 0 && measured <= total && !conflictingComplete)
            {
                const terms = known.map(component => this.term(component, new UsageTokenCalculations().contribution(component, [])));
                if (measured < total)
                {
                    terms.push(this.term(contribution, UsageCalculation.known(String(total - measured), CalculationUnit.Tokens, contribution.observations)));
                }
                return terms;
            }
        }
        return [this.term(contribution, tokens)];
    }

    private term(contribution: UsageContribution, tokens: UsageCalculation, sharedTotal: UsageCalculation | null = null): UsageCostTerm
    {
        const pricing = this.catalog.resolve(contribution);
        const rate = pricing.rate === null
            ? UsageCalculation.missing({
                id: JSON.stringify([UsageIdentity.contribution(contribution), 'price', contribution.model, contribution.timestamp, pricing.unresolved]),
                unit: CalculationUnit.USDPerToken,
                reason: pricing.unresolved,
                sources: contribution.observations
            })
            : UsageCalculation.known(
                ExactDecimal.parse(pricing.rate.usdAmount).divideByInteger(BigInt(pricing.rate.tokenUnit)).toString(),
                CalculationUnit.USDPerToken,
                contribution.observations,
                [pricing.rate.id]
            );
        return { contribution, pricing, tokens, calculation: UsageCalculation.product(tokens, rate), sharedTotal };
    }
}
