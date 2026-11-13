import { CalculationUnit, UsageCalculation } from './UsageCalculation';
import { TokenQuantityState, UnknownTokenReason } from './TokenQuantity';
import { type UsageBreakdown, type UsageContribution } from './UsageContribution';
import { UsageIdentity } from './UsageIdentity';

/** Converts measurements to token expressions without adding totals to their subdivisions. */
export class UsageTokenCalculations
{
    contribution(contribution: UsageContribution, breakdowns: readonly UsageBreakdown[], substeps: readonly UsageContribution[] = []): UsageCalculation
    {
        if (contribution.quantity.state === TokenQuantityState.Known)
        {
            return UsageCalculation.known(String(contribution.quantity.count), CalculationUnit.Tokens, contribution.observations);
        }
        if (contribution.quantity.state === TokenQuantityState.NotApplicable)
        {
            return UsageCalculation.known('0', CalculationUnit.Tokens, contribution.observations);
        }
        if (contribution.quantity.reason === UnknownTokenReason.Missing)
        {
            const breakdown = breakdowns.find(candidate => candidate.total === contribution);
            if (breakdown !== undefined)
            {
                const components = breakdown.components.map(component => this.contribution(component, []));
                if (!breakdown.exhaustive)
                {
                    // Partial or unrecognized breakdowns do not establish the remaining category amount.
                    components.push(this.missing(contribution, 'remaining-category-usage'));
                }
                return UsageCalculation.sum(CalculationUnit.Tokens, components);
            }
            const measured = substeps.filter(step => step.category === contribution.category);
            if (measured.some(step => step.quantity.state === TokenQuantityState.Known))
            {
                // A missing response total does not assert that supplied block measurements exhaust it.
                return UsageCalculation.sum(CalculationUnit.Tokens, [
                    ...measured.map(step => this.contribution(step, [])),
                    this.missing(contribution, 'unrecorded-response-remainder')
                ]);
            }
        }
        return this.missing(contribution, contribution.quantity.reason ?? 'missing');
    }

    missing(contribution: UsageContribution, reason: string): UsageCalculation
    {
        return UsageCalculation.missing({
            id: JSON.stringify([UsageIdentity.contribution(contribution), reason]),
            unit: CalculationUnit.Tokens,
            reason,
            sources: contribution.observations
        });
    }
}
