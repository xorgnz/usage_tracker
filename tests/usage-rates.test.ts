import assert from 'node:assert/strict';
import test from 'node:test';
import { DatedUsageRateCatalog, UsageRateIssueKind as Issue } from '../src/lib/server/usage/DatedUsageRateCatalog';
import { TokenUsageAccounting } from '../src/lib/server/usage/TokenUsageAccounting';
import { UsageCategory as Category } from '../src/lib/server/usage/UsageContribution';
import { UnresolvedRateReason as Reason } from '../src/lib/server/usage/UsageRate';
import { UsageFixture as U } from './support/UsageFixture';

const input = new TokenUsageAccounting().account([U.parse().conversation]).contributions[0];
const old = U.rate(Category.Input, '1', null, { id: 'old', effectiveUntil: '2026-02-01T00:00:00Z' });
const next = U.rate(Category.Input, '2', null, { id: 'new', effectiveFrom: '2026-02-01T00:00:00Z' });

test('dated prices select start-inclusive end-exclusive periods and preserve immutable evidence', () =>
{
    const catalog = new DatedUsageRateCatalog([old, next]);
    assert.deepEqual(catalog.issues, []);
    for (const [timestamp, expected] of [
        ['2026-01-31T23:59:59.999Z', 'old'],
        ['2026-02-01T00:00:00Z', 'new'],
        ['2026-02-01T00:00:00.001Z', 'new'],
        ['2026-01-31T19:00:00-05:00', 'new']
    ])
    {
        const resolution = catalog.resolve({ ...input, timestamp });
        assert.equal(resolution.rate?.id, expected);
        assert.equal(resolution.rate?.source, 'urn:synthetic:rate');
        assert.deepEqual(resolution.rate?.assumptions, ['Synthetic schedule for tests.']);
        assert.equal(resolution.rate?.tokenUnit, 1000000);
        assert.ok(Object.isFrozen(resolution.rate));
        assert.ok(Object.isFrozen(resolution.rate?.assumptions));
    }
});

test('rate gaps and overlaps are explicit without blocking unaffected periods or categories', () =>
{
    const gap = new DatedUsageRateCatalog([old, { ...next, effectiveFrom: '2026-02-02T00:00:00Z' }]);
    const lookup = { ...input, timestamp: '2026-02-01T00:00:00Z' };
    assert.ok(gap.issues.some(issue => issue.kind === Issue.Gap));
    assert.equal(gap.resolve(lookup).unresolved, Reason.MissingRate);
    const overlap = new DatedUsageRateCatalog([{ ...old, effectiveUntil: '2026-02-02T00:00:00Z' }, next, U.rate(Category.Output)]);
    assert.ok(overlap.issues.some(issue => issue.kind === Issue.Overlap));
    const ambiguous = overlap.resolve(lookup);
    assert.equal(ambiguous.unresolved, Reason.AmbiguousRate);
    assert.equal(ambiguous.rate, null);
    if (ambiguous.rate === null)
    {
        assert.equal(ambiguous.candidates.length, 2);
    }
    assert.equal(overlap.resolve({ ...lookup, timestamp: '2026-02-03T00:00:00Z' }).rate?.id, 'new');
    assert.ok(overlap.resolve({ ...lookup, category: Category.Output }).rate);
});

test('invalid rates, duplicate identities and nonterminating units stay unresolved in affected lookups', () =>
{
    for (const changed of [{ usdAmount: '-1' }, { tokenUnit: 0 }, { tokenUnit: 3, usdAmount: '1' },
        { effectiveFrom: '2026-02-30T00:00:00Z' }, { effectiveUntil: '2025-01-01T00:00:00Z' }])
    {
        const catalog = new DatedUsageRateCatalog([U.rate(Category.Input, '2', null, changed), U.rate(Category.Output)]);
        assert.ok(catalog.issues.some(issue => issue.kind === Issue.Invalid));
        assert.equal(catalog.resolve(input).unresolved, Reason.InvalidRate);
        assert.ok(catalog.resolve({ ...input, category: Category.Output }).rate);
    }
    const duplicate = new DatedUsageRateCatalog([old, { ...next, id: old.id }]);
    assert.equal(duplicate.resolve(input).unresolved, Reason.InvalidRate);
});

test('missing model, invalid or unzoned time and unsupported identity never choose a fallback price', () =>
{
    const catalog = new DatedUsageRateCatalog([old, next]);
    assert.equal(catalog.resolve({ ...input, model: null }).unresolved, Reason.MissingModel);
    assert.equal(catalog.resolve({ ...input, model: 'synthetic-model-alias' }).unresolved, Reason.MissingRate);
    for (const timestamp of [null, 'bad', '2026-02-30T00:00:00Z', '2026-01-01T00:00:00'])
    {
        assert.equal(catalog.resolve({ ...input, timestamp }).unresolved, Reason.MissingTimestamp);
    }
    assert.equal(catalog.resolve({ ...input, timestamp: '2025-12-31T23:59:59Z' }).unresolved, Reason.MissingRate);
});

test('cache duration and explicit service tier, speed or geography remain pricing dependencies', () =>
{
    const catalog = new DatedUsageRateCatalog(U.rates());
    const measured = new TokenUsageAccounting().account([U.parse().conversation]);
    const cache = measured.contributions.find(value => value.category === Category.CacheWrite)!;
    assert.equal(catalog.resolve(cache).unresolved, Reason.UnsupportedPricing);
    assert.deepEqual(measured.breakdowns[0].components.map(value => catalog.resolve(value).rate?.usdAmount), ['2.5', '4']);
    for (const usage of [{ service_tier: 'priority' }, { speed: 'fast' }, { inference_geo: 'us' }])
    {
        const contribution = { ...input, recordedValues: input.recordedValues.map(value => ({ ...value, usage })) };
        assert.equal(catalog.resolve(contribution).unresolved, Reason.UnsupportedPricing);
    }
});

test('initial catalog validates and unsupported historical cache data stays unresolved', () =>
{
    const catalog = new DatedUsageRateCatalog();
    assert.deepEqual(catalog.issues, []);
    assert.equal(catalog.resolve({ ...input, model: 'claude-opus-5-5', timestamp: '2026-10-01T00:00:00Z',
        category: Category.CacheRead }).unresolved, Reason.MissingRate);
    const selected = catalog.resolve({ ...input, model: 'claude-opus-5-5', timestamp: '2026-11-10T00:00:00Z' });
    assert.ok(selected.rate);
    assert.match(selected.rate!.source, /^https:\/\//);
    assert.ok(selected.rate!.assumptions.length > 0);
});
