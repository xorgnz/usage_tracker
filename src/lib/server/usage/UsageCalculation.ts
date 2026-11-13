import type { ConversationSource } from '../conversations/ConversationSource';
import { ExactDecimal } from './ExactDecimal';

export enum CalculationUnit
{
    Scalar = 'scalar',
    Tokens = 'tokens',
    USD = 'usd',
    USDPerToken = 'usd-per-token'
}

export enum CalculationKind
{
    Known = 'known',
    Unknown = 'unknown',
    Sum = 'sum',
    Product = 'product',
    Reference = 'reference'
}

/** IDs must be scoped by the caller to the actual source/model/category dependency. */
export interface CalculationUnknown
{
    readonly id: string;
    readonly unit: CalculationUnit;
    readonly reason: string;
    readonly sources: readonly ConversationSource[];
}

/** Immutable usage/cost expression; references retain identity without inventing allocations. */
export class UsageCalculation
{
    readonly kind: CalculationKind;
    readonly unit: CalculationUnit;
    readonly sources: readonly ConversationSource[];
    readonly rateIds: readonly string[];
    readonly operands: readonly UsageCalculation[];
    readonly value: ExactDecimal | null;
    readonly unknown: CalculationUnknown | null;
    readonly sharedTotal: UsageCalculation | null;

    private constructor(
        kind: CalculationKind,
        unit: CalculationUnit,
        sources: readonly ConversationSource[],
        rateIds: readonly string[],
        operands: readonly UsageCalculation[],
        value: ExactDecimal | null,
        unknown: CalculationUnknown | null,
        sharedTotal: UsageCalculation | null
    )
    {
        this.kind = kind;
        this.unit = unit;
        this.sources = Object.freeze([...sources]);
        this.rateIds = Object.freeze([...rateIds]);
        this.operands = Object.freeze([...operands]);
        this.value = value;
        this.unknown = unknown;
        this.sharedTotal = sharedTotal;
        Object.freeze(this);
    }

    static known(value: string, unit: CalculationUnit, sources: readonly ConversationSource[] = [], rateIds: readonly string[] = []): UsageCalculation
    {
        return new UsageCalculation(CalculationKind.Known, unit, sources, rateIds, [], ExactDecimal.parse(value), null, null);
    }

    static missing(unknown: CalculationUnknown, sharedTotal: UsageCalculation | null = null): UsageCalculation
    {
        if (unknown.id.trim().length === 0 || unknown.reason.trim().length === 0)
        {
            throw new Error('Unknown operands require an identity and reason.');
        }
        if (sharedTotal !== null && sharedTotal.unit !== unknown.unit)
        {
            throw new Error('An allocation and its shared total must have the same unit.');
        }
        const retained = Object.freeze({ ...unknown, sources: Object.freeze([...unknown.sources]) });
        return new UsageCalculation(CalculationKind.Unknown, unknown.unit, retained.sources, [], [], null, retained, sharedTotal);
    }

    static sum(unit: CalculationUnit, operands: readonly UsageCalculation[]): UsageCalculation
    {
        if (operands.some(operand => operand.unit !== unit))
        {
            throw new Error('A sum requires matching units.');
        }
        return new UsageCalculation(
            CalculationKind.Sum,
            unit,
            operands.flatMap(operand => operand.sources),
            [...new Set(operands.flatMap(operand => operand.rateIds))],
            operands,
            null,
            null,
            null
        );
    }

    static product(left: UsageCalculation, right: UsageCalculation): UsageCalculation
    {
        let unit: CalculationUnit;
        if (left.unit === CalculationUnit.Scalar)
        {
            unit = right.unit;
        }
        else if (right.unit === CalculationUnit.Scalar)
        {
            unit = left.unit;
        }
        else if ((left.unit === CalculationUnit.Tokens && right.unit === CalculationUnit.USDPerToken)
            || (right.unit === CalculationUnit.Tokens && left.unit === CalculationUnit.USDPerToken))
        {
            unit = CalculationUnit.USD;
        }
        else
        {
            throw new Error('Unsupported unit multiplication for usage/cost calculations.');
        }
        return new UsageCalculation(
            CalculationKind.Product,
            unit,
            [...left.sources, ...right.sources],
            [...new Set([...left.rateIds, ...right.rateIds])],
            [left, right],
            null,
            null,
            null
        );
    }

    static reference(target: UsageCalculation): UsageCalculation
    {
        return new UsageCalculation(CalculationKind.Reference, target.unit, target.sources, target.rateIds, [target], null, null, null);
    }
}

/** Full expression plus an additive decomposition: knownSubtotal + sum(unresolvedTerms). */
export interface CalculationEvaluation
{
    readonly calculation: UsageCalculation;
    readonly knownSubtotal: string;
    readonly unresolvedTerms: readonly UsageCalculation[];
    readonly unknowns: readonly CalculationUnknown[];
}

/** Arithmetic ownership stays independent of accounting, file access, and display formatting. */
export interface UsageCalculationEvaluator
{
    evaluate(calculation: UsageCalculation): CalculationEvaluation;
}
