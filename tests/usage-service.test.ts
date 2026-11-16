import assert from 'node:assert/strict';
import test from 'node:test';
import { SessionDiscoveryStatus as Access, SessionWarningCode as Warning } from '../src/lib/sessions/SessionDiscoveryViewModel';
import { ConversationService } from '../src/lib/server/conversations/ConversationService';
import { UsageEstimationService } from '../src/lib/server/usage/UsageEstimationService';
import { DatedUsageRateCatalog } from '../src/lib/server/usage/DatedUsageRateCatalog';
import { TokenUsageAccounting } from '../src/lib/server/usage/TokenUsageAccounting';
import { UsageCategory as Category, UsageLevel as Level, UsageScope as Scope } from '../src/lib/server/usage/UsageContribution';
import { UsageCalculationEngine } from '../src/lib/server/usage/UsageCalculationEngine';
import { UsageFixture as U } from './support/UsageFixture';
import { ConversationFixture as F } from './support/ConversationFixture';
import { SessionFixture } from './support/SessionFixture';

const estimator = new UsageEstimationService(new TokenUsageAccounting(), new DatedUsageRateCatalog(U.rates()));

test('service composes exact category costs and rate evidence while preserving its original source snapshot', () =>
{
    const source = U.load();
    const snapshot = structuredClone(source.conversations[0].parsed!.conversation.records.map(record => record.value));
    const result = estimator.estimate(source);
    assert.equal(result.source, source);
    assert.deepEqual(source.conversations[0].parsed!.conversation.records.map(record => record.value), snapshot);
    const group = result.costs.find(group => group.attribution.level === Level.Session && group.attribution.scope === Scope.Own)!;
    assert.equal(group.evaluation.knownSubtotal, '0.003051');
    assert.equal(group.evaluation.unknowns.length, 0);
    assert.deepEqual(group.categories.map(category => category.tokens.knownSubtotal), ['100', '900', '30', '40']);
    const cache = group.terms.filter(term => term.contribution.category === Category.CacheWrite);
    assert.deepEqual(cache.map(term => term.tokens.value?.toString()), ['10', '30']);
    assert.deepEqual(cache.map(term => term.pricing.rate?.usdAmount), ['2.5', '4']);
    assert.ok(cache.every(term => term.calculation.rateIds.includes(term.pricing.rate!.id)));
    assert.ok(cache.every(term => term.pricing.rate?.assumptions.length));
    assert.ok(result.costs.some(group => group.attribution.level === Level.Turn));
});

test('unknown input price preserves other costs and known counts while shared substeps retain priced evidence', () =>
{
    const service = new UsageEstimationService(
        new TokenUsageAccounting(),
        new DatedUsageRateCatalog(U.rates().filter(rate => rate.category !== Category.Input))
    );
    const result = service.estimate(U.load());
    const group = result.costs.find(group => group.attribution.level === Level.Response)!;
    assert.equal(group.evaluation.knownSubtotal, '0.002851');
    assert.equal(group.evaluation.unknowns.length, 1);
    assert.equal(group.evaluation.unknowns[0].reason, 'missing-rate');
    assert.equal(group.categories[0].tokens.knownSubtotal, '100');
    assert.equal(group.categories[0].tokens.unknowns.length, 0);
    const step = result.costs.find(group => group.attribution.level === Level.Substep && group.terms.length > 0)!;
    const output = step.terms.find(term => term.contribution.category === Category.Output)!;
    const engine = new UsageCalculationEngine();
    assert.equal(engine.evaluate(output.tokens.sharedTotal!).knownSubtotal, '900');
    assert.equal(engine.evaluate(output.sharedTotal!).knownSubtotal, '0.0027');
    assert.equal(engine.evaluate(output.tokens).unknowns.length, 1);
    assert.equal(step.evaluation.knownSubtotal, '0');
});

test('dated per-response pricing precedes aggregation and repeated small costs remain exact', () =>
{
    const before = U.rate(Category.Input, '0.1', null, { id: 'before', effectiveUntil: '2026-02-01T00:00:00Z' });
    const after = U.rate(Category.Input, '0.2', null, { id: 'after', effectiveFrom: '2026-02-01T00:00:00Z' });
    const service = new UsageEstimationService(new TokenUsageAccounting(), new DatedUsageRateCatalog([before, after]));
    const times = ['2026-01-31T23:59:59.999Z', '2026-02-01T00:00:00Z', '2026-02-01T00:00:00.001Z'];
    const usage = { input_tokens: 1, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
    const parsed = U.parse([F.user(), ...times.map((time, index) => U.assistant(usage, String(index), time))]);
    const result = service.estimate(U.load([U.entry(parsed)]));
    const responses = result.costs.filter(group => group.attribution.level === Level.Response);
    assert.deepEqual(responses.map(group => group.terms[0].pricing.rate?.id), ['before', 'after', 'after']);
    assert.equal(result.costs.find(group => group.attribution.level === Level.Session)!.evaluation.knownSubtotal, '0.0000005');
    const repeated = U.parse([F.user(), ...Array.from({ length: 127 }, (_, index) => U.assistant(usage, String(index), times[1]))]);
    const total = service.estimate(U.load([U.entry(repeated)])).costs.find(group => group.attribution.level === Level.Session)!;
    assert.equal(total.evaluation.knownSubtotal, '0.0000254');
    assert.equal(total.categories[0].tokens.knownSubtotal, '127');
});

test('cache-write pricing uses known portions plus symbolic remainder and rejects contradictory complete breakdowns', () =>
{
    const partial = { ...U.usage(), cache_creation: { ephemeral_5m_input_tokens: 10, future_duration_tokens: 30 } };
    const group = estimator.estimate(U.load([U.entry(U.parse([F.user(), U.assistant(partial)]))])).costs.find(group =>
        group.attribution.level === Level.Response)!;
    assert.equal(group.categories[3].tokens.knownSubtotal, '40');
    assert.equal(group.categories[3].evaluation.knownSubtotal, '0.000025');
    assert.ok(group.categories[3].evaluation.unresolvedTerms.length > 0);
    const conflicting = { ...U.usage(), cache_creation: { ephemeral_5m_input_tokens: 10, ephemeral_1h_input_tokens: 20 } };
    const result = estimator.estimate(U.load([U.entry(U.parse([F.user(), U.assistant(conflicting)]))]));
    const cache = result.costs.find(group => group.attribution.level === Level.Response)!.categories[3];
    assert.equal(cache.tokens.knownSubtotal, '40');
    assert.equal(cache.evaluation.knownSubtotal, '0');
    assert.ok(cache.evaluation.unknowns.length > 0);
    assert.ok(result.accounting.diagnostics.some(diagnostic => diagnostic.code === 'inconsistent-breakdown'));
});

test('failed parent read retains child cost and explicit unknown parent usage with separate own/combined results', () =>
{
    const parent = U.entry(null);
    const child = U.entry(U.parse(undefined, F.identity('/synthetic/project', 'child')));
    parent.file.addSubagent(child.file);
    const source = { ...U.load([parent, child]), status: Access.Partial,
        warnings: [{ code: Warning.FileAccess, path: parent.file.path, message: 'Synthetic failure.' }] };
    const result = estimator.estimate(source);
    const groups = result.costs.filter(group => group.attribution.level === Level.Session && group.attribution.conversation.agentId === null);
    assert.equal(groups.find(group => group.attribution.scope === Scope.Own)!.evaluation.knownSubtotal, '0');
    const combined = groups.find(group => group.attribution.scope === Scope.IncludingSubagents)!;
    assert.equal(combined.evaluation.knownSubtotal, '0.003051');
    assert.equal(combined.coverage.length, 1);
    assert.ok(combined.evaluation.unknowns.length > 0);
    assert.equal(combined.categories[1].tokens.knownSubtotal, '900');
    assert.ok(combined.categories[1].tokens.unknowns.length > 0);
    assert.equal(result.source.warnings, source.warnings);
});

test('complete empty input differs from discovery failure with unassignable unknown coverage', () =>
{
    assert.deepEqual(estimator.estimate(U.load([])).coverage, []);
    const source = { ...U.load([]), status: Access.Failed, empty: false,
        warnings: [{ code: Warning.DirectoryAccess, path: '/synthetic/missing', message: 'Synthetic denial.' }] };
    const result = estimator.estimate(source);
    assert.deepEqual(result.costs, []);
    assert.equal(result.coverage.length, 1);
    assert.equal(result.coverage[0].conversation, null);
    assert.ok(result.coverage[0].categories.every(category => category.tokens.unknowns.length > 0 && category.evaluation.unknowns.length > 0));
});

test('missing model or timestamp produces dependency-specific unknown costs while every known category count survives', () =>
{
    for (const [record, reason] of [
        [U.assistant(U.usage(), 'response', F.middle, null), 'missing-model'],
        [U.assistant(U.usage(), 'response', null), 'missing-timestamp']
    ] as const)
    {
        const result = estimator.estimate(U.load([U.entry(U.parse([F.user(), record]))]));
        const response = result.costs.find(group => group.attribution.level === Level.Response)!;
        assert.deepEqual(response.categories.map(category => category.tokens.knownSubtotal), ['100', '900', '30', '40']);
        assert.ok(response.categories.every(category => category.tokens.unknowns.length === 0));
        assert.ok(response.evaluation.unknowns.every(unknown => unknown.reason === reason));
        assert.ok(response.evaluation.unresolvedTerms.length > 0);
        assert.equal(response.evaluation.knownSubtotal, '0');
    }
});

test('service prices known block operands when the enclosing response amount is missing', () =>
{
    const content = [{ ...F.text(), usage: { input_tokens: 7, output_tokens: 50 } }];
    const source = U.load([U.entry(U.parse([F.user(), U.assistant({}, 'response', F.middle, 'synthetic-model', content)]))]);
    const response = estimator.estimate(source).costs.find(group => group.attribution.level === Level.Response)!;
    assert.equal(response.categories[1].tokens.knownSubtotal, '50');
    assert.equal(response.categories[1].evaluation.knownSubtotal, '0.00015');
    assert.ok(response.categories[1].evaluation.unresolvedTerms.length > 0);
    assert.equal(response.categories[0].evaluation.knownSubtotal, '0.000014');
});

test('actual ConversationService output preserves parent links, parser diagnostics, malformed records and deferred tails', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    const records = [F.user(), U.assistant(), { type: 'future-record', payload: 'synthetic' }];
    await fixture.write('project', 'session.jsonl', F.jsonl(records) + 'malformed\n{"unfinished":');
    await fixture.write('project', 'session/subagents/agent-child.jsonl', F.jsonl([F.user(), U.assistant()]));
    const loaded = await new ConversationService(fixture.root).load();
    const result = estimator.estimate(loaded);
    assert.equal(result.source, loaded);
    const parent = loaded.conversations.find(entry => entry.file.agentId === null)!;
    assert.equal(parent.deferredTrailingRecord, true);
    assert.ok(parent.warnings.some(warning => warning.code === Warning.MalformedRecord));
    assert.ok(parent.parsed!.diagnostics.some(diagnostic => diagnostic.code === 'unknown-record'));
    const child = loaded.conversations.find(entry => entry.file.agentId !== null)!;
    assert.equal(child.parsed!.conversation.parent?.parent.filePath, parent.file.path);
    const combined = result.costs.find(group => group.attribution.level === Level.Session
        && group.attribution.scope === Scope.IncludingSubagents && group.attribution.conversation.agentId === null)!;
    assert.equal(combined.evaluation.knownSubtotal, '0.006102');
    assert.ok(combined.evaluation.unresolvedTerms.length > 0);
    assert.deepEqual(combined.coverage[0].reasons, ['deferred-trailing-record', 'skipped-malformed-record']);
    assert.equal(result.accounting.contributions.length, 8);
});
