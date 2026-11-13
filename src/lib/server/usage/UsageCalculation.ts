import type { ConversationSource } from '../conversations/ConversationSource';

export enum CalculationUnit
{
    Tokens = 'tokens',
    USD = 'usd',
    USDPerToken = 'usd-per-token'
}

/** Named missing operands preserve independent identity and source evidence through later evaluation. */
export interface CalculationUnknown
{
    readonly id: string;
    readonly unit: CalculationUnit;
    readonly reason: string;
    readonly sources: readonly ConversationSource[];
}

/** Base domain contract; task 2 supplies concrete arithmetic expression objects. */
export interface UsageCalculation
{
    readonly unit: CalculationUnit;
    readonly sources: readonly ConversationSource[];
}

/** Decimal text avoids committing currency contracts to binary floating-point numbers. */
export interface CalculationEvaluation
{
    readonly calculation: UsageCalculation;
    readonly knownSubtotal: string;
    readonly unknowns: readonly CalculationUnknown[];
}

/** Arithmetic ownership stays independent of accounting, file access, and display formatting. */
export interface UsageCalculationEvaluator
{
    evaluate(calculation: UsageCalculation): CalculationEvaluation;
}
