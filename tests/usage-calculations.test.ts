import assert from 'node:assert/strict';
import test from 'node:test';
import { ExactDecimal as Decimal } from '../src/lib/server/usage/ExactDecimal';
import { CalculationUnit as Unit, UsageCalculation as Calc } from '../src/lib/server/usage/UsageCalculation';
import { UsageCalculationEngine } from '../src/lib/server/usage/UsageCalculationEngine';
import { TokenQuantity, TokenQuantityState, UnknownTokenReason } from '../src/lib/server/usage/TokenQuantity';
import { UsageTokenCalculations } from '../src/lib/server/usage/UsageTokenCalculations';
import { TokenUsageAccounting } from '../src/lib/server/usage/TokenUsageAccounting';
import { UsageFixture as U } from './support/UsageFixture';

const engine = new UsageCalculationEngine();

test('exact decimals preserve small prices, large integers, repeated sums and terminating conversions', () =>
{
    assert.equal(Decimal.parse('0.1').add(Decimal.parse('0.2')).toString(), '0.3');
    assert.equal(Decimal.parse('9007199254740993').add(Decimal.parse('1')).toString(), '9007199254740994');
    assert.equal(Decimal.parse('3').divideByInteger(1000000n).multiply(Decimal.parse('1200')).toString(), '0.0036');
    assert.equal(Decimal.parse('0').divideByInteger(3n).toString(), '0');
    let sum = Decimal.parse('0');
    for (let index = 0; index < 127; index++)
    {
        sum = sum.add(Decimal.parse('0.0000002'));
    }
    assert.equal(sum.toString(), '0.0000254');
});

test('numeric validation rejects approximation, unsupported scale and invalid token observations', () =>
{
    for (const value of ['-1', '1e3', 'NaN', '.2'])
    {
        assert.throws(() => Decimal.parse(value));
    }
    assert.throws(() => Decimal.parse('1').divideByInteger(3n));
    assert.throws(() => Decimal.parse('1').divideByInteger(0n));
    assert.throws(() => Decimal.parse(`0.${'0'.repeat(1000)}1`));
    for (const value of [-1, 0.1, Number.MAX_SAFE_INTEGER + 1, NaN])
    {
        assert.throws(() => TokenQuantity.known(value));
    }
    assert.throws(() => TokenQuantity.notApplicable(' '));
});

test('zero, missing and evidenced non-applicability remain distinct while token arithmetic can use zero', () =>
{
    const known = TokenQuantity.known(0);
    const missing = TokenQuantity.unknown(UnknownTokenReason.Missing);
    const absent = TokenQuantity.notApplicable('Synthetic operation has no output category.');
    assert.equal(known.state, TokenQuantityState.Known);
    assert.equal(missing.state, TokenQuantityState.Unknown);
    assert.equal(absent.state, TokenQuantityState.NotApplicable);
    assert.ok(absent.evidence);
    const contribution = new TokenUsageAccounting().account([U.parse().conversation]).contributions[0];
    assert.equal(engine.evaluate(new UsageTokenCalculations().contribution({ ...contribution, quantity: absent }, [])).knownSubtotal, '0');
});

test('partial cost retains known subtotal, token operand, missing price identity, units and provenance', () =>
{
    const rate = Calc.missing({ id: 'input-price', unit: Unit.USDPerToken, reason: 'missing-rate', sources: [] });
    const product = Calc.product(Calc.known('1200', Unit.Tokens), rate);
    const expression = Calc.sum(Unit.USD, [Calc.known('0.42', Unit.USD, [], ['known-price']), product]);
    const result = engine.evaluate(expression);
    assert.equal(result.calculation, expression);
    assert.equal(result.knownSubtotal, '0.42');
    assert.equal(result.unresolvedTerms.length, 1);
    assert.equal(result.unresolvedTerms[0].unit, Unit.USD);
    assert.deepEqual(result.unknowns.map(unknown => unknown.id), ['input-price']);
    assert.equal(product.operands[0].value?.toString(), '1200');
    assert.deepEqual(expression.rateIds, ['known-price']);
});

test('partial products distribute uncertainty without conflating unknowns or losing arithmetic multiplicity', () =>
{
    const x = Calc.missing({ id: 'x', unit: Unit.Scalar, reason: 'missing-x', sources: [] });
    const y = Calc.missing({ id: 'y', unit: Unit.Scalar, reason: 'missing-y', sources: [] });
    const left = Calc.sum(Unit.Scalar, [Calc.known('2', Unit.Scalar), x]);
    const right = Calc.sum(Unit.Scalar, [Calc.known('3', Unit.Scalar), y]);
    const result = engine.evaluate(Calc.product(left, right));
    assert.equal(result.knownSubtotal, '6');
    assert.equal(result.unresolvedTerms.length, 3);
    assert.deepEqual(result.unknowns.map(unknown => unknown.id).sort(), ['x', 'y']);
    const repeated = engine.evaluate(Calc.sum(Unit.Scalar, [x, Calc.reference(x), Calc.known('2', Unit.Scalar), Calc.known('2', Unit.Scalar)]));
    assert.equal(repeated.knownSubtotal, '4');
    assert.equal(repeated.unknowns.length, 1);
    assert.equal(repeated.unresolvedTerms.length, 2);
});

test('allocation references retain a shared total without assigning it or adding it to unknown usage', () =>
{
    const shared = Calc.known('900', Unit.Tokens);
    const allocation = Calc.missing({ id: 'allocation', unit: Unit.Tokens, reason: 'unallocated', sources: [] }, shared);
    const result = engine.evaluate(allocation);
    assert.equal(result.knownSubtotal, '0');
    assert.equal(result.unknowns.length, 1);
    assert.equal(allocation.sharedTotal, shared);
    assert.equal(engine.evaluate(Calc.reference(shared)).knownSubtotal, '900');
    assert.throws(() => Calc.missing({ id: 'bad', unit: Unit.USD, reason: 'bad', sources: [] }, shared));
});

test('unit mismatches and conflicting unknown identities fail rather than producing misleading amounts', () =>
{
    assert.throws(() => Calc.sum(Unit.Tokens, [Calc.known('1', Unit.USD)]));
    assert.throws(() => Calc.product(Calc.known('1', Unit.USD), Calc.known('2', Unit.Tokens)));
    const first = Calc.missing({ id: 'same', unit: Unit.Tokens, reason: 'first', sources: [] });
    const second = Calc.missing({ id: 'same', unit: Unit.Tokens, reason: 'second', sources: [] });
    assert.throws(() => engine.evaluate(Calc.sum(Unit.Tokens, [first, second])));
    const zero = engine.evaluate(Calc.product(first, Calc.known('0', Unit.Scalar)));
    assert.equal(zero.knownSubtotal, '0');
    assert.equal(zero.unresolvedTerms.length, 0);
    assert.equal(zero.calculation.operands[0], first);
});
