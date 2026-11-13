import { ExactDecimal } from './ExactDecimal';
import {
    CalculationKind,
    UsageCalculation,
    type CalculationEvaluation,
    type CalculationUnknown,
    type UsageCalculationEvaluator
} from './UsageCalculation';

/** Evaluates usage arithmetic into exact known amounts and additive unresolved expressions. */
export class UsageCalculationEngine implements UsageCalculationEvaluator
{
    evaluate(calculation: UsageCalculation): CalculationEvaluation
    {
        // Reject identifier collisions even when arithmetic could eliminate a zero-valued branch.
        this.validate(calculation, new Map(), new Set(), 0);
        return this.evaluateNode(calculation);
    }

    private evaluateNode(calculation: UsageCalculation): CalculationEvaluation
    {
        switch (calculation.kind)
        {
            case CalculationKind.Known:
                return this.result(calculation, calculation.value!, []);
            case CalculationKind.Unknown:
                return this.result(calculation, ExactDecimal.parse('0'), [calculation]);
            case CalculationKind.Reference:
            {
                const target = this.evaluateNode(calculation.operands[0]);
                return this.result(calculation, ExactDecimal.parse(target.knownSubtotal), target.unresolvedTerms);
            }
            case CalculationKind.Sum:
            {
                let subtotal = ExactDecimal.parse('0');
                const unresolved: UsageCalculation[] = [];
                for (const operand of calculation.operands)
                {
                    const result = this.evaluateNode(operand);
                    subtotal = subtotal.add(ExactDecimal.parse(result.knownSubtotal));
                    unresolved.push(...result.unresolvedTerms);
                }
                return this.result(calculation, subtotal, unresolved);
            }
            case CalculationKind.Product:
                return this.product(calculation);
        }
    }

    private product(calculation: UsageCalculation): CalculationEvaluation
    {
        const [left, right] = calculation.operands;
        const leftResult = this.evaluateNode(left);
        const rightResult = this.evaluateNode(right);
        const leftKnown = ExactDecimal.parse(leftResult.knownSubtotal);
        const rightKnown = ExactDecimal.parse(rightResult.knownSubtotal);
        const subtotal = leftKnown.multiply(rightKnown);
        const unresolved: UsageCalculation[] = [];

        // (a + x)(b + y) = ab + ay + xb + xy; retain grouped residuals rather than solve variables.
        const leftResidual = leftResult.unresolvedTerms.length === 0 ? null : UsageCalculation.sum(left.unit, leftResult.unresolvedTerms);
        const rightResidual = rightResult.unresolvedTerms.length === 0 ? null : UsageCalculation.sum(right.unit, rightResult.unresolvedTerms);
        if (!leftKnown.isZero() && rightResidual !== null)
        {
            unresolved.push(UsageCalculation.product(UsageCalculation.known(leftKnown.toString(), left.unit, left.sources, left.rateIds), rightResidual));
        }
        if (!rightKnown.isZero() && leftResidual !== null)
        {
            unresolved.push(UsageCalculation.product(leftResidual, UsageCalculation.known(rightKnown.toString(), right.unit, right.sources, right.rateIds)));
        }
        if (leftResidual !== null && rightResidual !== null)
        {
            unresolved.push(UsageCalculation.product(leftResidual, rightResidual));
        }
        return this.result(calculation, subtotal, unresolved);
    }

    private result(calculation: UsageCalculation, known: ExactDecimal, unresolved: readonly UsageCalculation[]): CalculationEvaluation
    {
        const unknowns = new Map<string, CalculationUnknown>();
        const collect = (node: UsageCalculation): void =>
        {
            if (node.unknown !== null)
            {
                unknowns.set(node.unknown.id, node.unknown);
            }
            node.operands.forEach(collect);
        };
        unresolved.forEach(collect);
        return Object.freeze({
            calculation,
            knownSubtotal: known.toString(),
            unresolvedTerms: Object.freeze([...unresolved]),
            unknowns: Object.freeze([...unknowns.values()])
        });
    }

    private validate(
        calculation: UsageCalculation,
        unknowns: Map<string, UsageCalculation>,
        visited: Set<UsageCalculation>,
        depth: number
    ): void
    {
        if (depth > 128 || visited.size >= 10000)
        {
            throw new RangeError('Calculation exceeds supported expression depth or node count.');
        }
        if (visited.has(calculation))
        {
            return;
        }
        visited.add(calculation);
        const unknown = calculation.unknown;
        if (unknown !== null)
        {
            const prior = unknowns.get(unknown.id);
            if (prior !== undefined && (prior.unknown!.unit !== unknown.unit || prior.unknown!.reason !== unknown.reason
                || prior.sharedTotal !== calculation.sharedTotal || prior.sources.length !== calculation.sources.length
                || prior.sources.some((source, index) => !source.equals(calculation.sources[index]))))
            {
                throw new Error('An unknown operand id was reused for different dependency evidence.');
            }
            unknowns.set(unknown.id, calculation);
        }
        for (const operand of calculation.operands)
        {
            this.validate(operand, unknowns, visited, depth + 1);
        }

        // A shared total is provenance/constraint evidence, not an extra arithmetic operand.
        if (calculation.sharedTotal !== null)
        {
            this.validate(calculation.sharedTotal, unknowns, visited, depth + 1);
        }
    }
}
