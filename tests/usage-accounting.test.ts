import assert from 'node:assert/strict';
import test from 'node:test';
import { TokenUsageAccounting } from '../src/lib/server/usage/TokenUsageAccounting';
import { UsageCalculationEngine } from '../src/lib/server/usage/UsageCalculationEngine';
import { UsageCategory as Category, UsageLevel as Level, UsageScope as Scope, SharedUsageAllocation } from '../src/lib/server/usage/UsageContribution';
import { UnknownTokenReason } from '../src/lib/server/usage/TokenQuantity';
import { UsageDiagnosticCode as Diagnostic } from '../src/lib/server/usage/UsageAccounting';
import { ConversationSource } from '../src/lib/server/conversations/ConversationSource';
import { ConversationFixture as F } from './support/ConversationFixture';
import { UsageFixture as U } from './support/UsageFixture';

const accounting = new TokenUsageAccounting();
const engine = new UsageCalculationEngine();

test('all four categories retain counts, raw values, field paths, model, timestamp and response source identity', () =>
{
    const parsed = U.parse();
    const result = accounting.account([parsed.conversation]);
    assert.deepEqual(result.contributions.map(value => value.quantity.count), [100, 900, 30, 40]);
    assert.deepEqual(result.contributions.map(value => value.category), Object.values(Category));
    const input = result.contributions[0];
    assert.equal(input.model, 'synthetic-model');
    assert.equal(input.timestamp, F.middle);
    assert.equal(input.responseId, 'response');
    assert.equal(input.requestId, 'request-response');
    assert.equal(input.source.lineNumber, 2);
    assert.equal(input.attribution.level, Level.Response);
    assert.deepEqual(input.fieldPath, ['input_tokens']);
    assert.deepEqual(input.recordedValues[0].usage, U.usage());
    assert.equal(input.recordedValues[0].present, true);
    assert.equal(input.source.conversation.filePath, parsed.conversation.identity.filePath);
    const breakdown = result.breakdowns[0];
    assert.deepEqual(breakdown.components.map(value => [value.detail, value.quantity.count]),
        [['ephemeral_5m_input_tokens', 10], ['ephemeral_1h_input_tokens', 30]]);
    assert.equal(breakdown.exhaustive, true);
});

test('explicit zero, missing fields, invalid counts and invalid envelopes produce distinct evidence', () =>
{
    const usage = { input_tokens: 0, output_tokens: -1, cache_read_input_tokens: '3' };
    const result = accounting.account([U.parse([F.user(), U.assistant(usage)]).conversation]);
    assert.equal(result.contributions[0].quantity.count, 0);
    assert.equal(result.contributions[1].quantity.reason, UnknownTokenReason.Invalid);
    assert.equal(result.contributions[2].quantity.reason, UnknownTokenReason.Invalid);
    assert.equal(result.contributions[3].quantity.reason, UnknownTokenReason.Missing);
    assert.equal(result.contributions[3].recordedValues[0].present, false);
    const invalid = accounting.account([U.parse([F.user(), U.assistant(null)]).conversation]);
    assert.ok(invalid.contributions.every(value => value.quantity.reason === UnknownTokenReason.Invalid));
    assert.ok(invalid.contributions.every(value => value.recordedValues[0].hasUsage));
});

test('repeated identical response observations count once at response, turn and session levels', () =>
{
    const first = U.assistant();
    const second = { ...U.assistant(), uuid: 'second-observation' };
    const conversation = U.parse([F.user(), first, second]).conversation;
    const result = accounting.account([conversation, conversation]);
    assert.equal(result.contributions.length, 4);
    assert.equal(result.contributions[1].observations.length, 2);
    for (const level of [Level.Response, Level.Turn, Level.Session])
    {
        const group = result.groups.find(group => group.attribution.level === level && group.attribution.scope === Scope.Own)!;
        assert.equal(engine.evaluate(group.totals.find(total => total.category === Category.Output)!.calculation).knownSubtotal, '900');
    }
    assert.throws(() => accounting.account([conversation, { ...conversation }]));
});

test('conflicting counts and price metadata preserve unaffected fields and original observations', () =>
{
    const changed = U.assistant({ ...U.usage(), output_tokens: 901 }, 'response', F.late, 'other-model');
    const result = accounting.account([U.parse([F.user(), U.assistant(), changed]).conversation]);
    const [input, output] = result.contributions;
    assert.equal(input.quantity.count, 100);
    assert.equal(input.model, null);
    assert.equal(input.timestamp, null);
    assert.equal(output.quantity.reason, UnknownTokenReason.Conflicting);
    assert.deepEqual(output.recordedValues.map(value => value.value), [900, 901]);
    assert.ok(result.diagnostics.some(diagnostic => diagnostic.code === Diagnostic.ConflictingObservations));
});

test('known response total stays known while individual substeps link unknown allocations to it', () =>
{
    const result = accounting.account([U.parse().conversation]);
    const output = result.contributions.find(value => value.category === Category.Output)!;
    const allocations = result.allocations.filter(value => value.total === output);
    assert.equal(allocations.length, 2);
    for (const allocation of allocations)
    {
        assert.equal(allocation.quantity.reason, UnknownTokenReason.Unallocated);
        const step = result.groups.find(group => group.attribution.source?.equals(allocation.substep))!;
        const expression = step.totals.find(total => total.category === Category.Output)!.calculation;
        assert.equal(engine.evaluate(expression).unknowns.length, 1);
        assert.equal(engine.evaluate(expression.sharedTotal!).knownSubtotal, '900');
    }
    assert.throws(() => new SharedUsageAllocation(new ConversationSource(F.identity('/different'), 2, 0), output));
});

test('measured blocks supply their own views without adding their counts to a known response total', () =>
{
    const content = [{ ...F.text(), usage: { input_tokens: 1, output_tokens: 50, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } }];
    const result = accounting.account([U.parse([F.user(), U.assistant(U.usage(), 'response', F.middle, 'synthetic-model', content)]).conversation]);
    const step = result.groups.find(group => group.attribution.level === Level.Substep
        && group.totals.some(total => total.contributions.length > 0))!;
    assert.equal(engine.evaluate(step.totals.find(total => total.category === Category.Output)!.calculation).knownSubtotal, '50');
    const session = result.groups.find(group => group.attribution.level === Level.Session)!;
    assert.equal(engine.evaluate(session.totals.find(total => total.category === Category.Output)!.calculation).knownSubtotal, '900');
});

test('missing totals retain known breakdowns and genuine unknown remainders without double counting subdivisions', () =>
{
    const usage = { input_tokens: 100, output_tokens_details: { thinking_tokens: 20 },
        cache_creation: { ephemeral_5m_input_tokens: 10, ephemeral_1h_input_tokens: 30 } };
    const result = accounting.account([U.parse([F.user(), U.assistant(usage)]).conversation]);
    const session = result.groups.find(group => group.attribution.level === Level.Session)!;
    const cache = engine.evaluate(session.totals.find(total => total.category === Category.CacheWrite)!.calculation);
    assert.equal(cache.knownSubtotal, '40');
    assert.equal(cache.unknowns.length, 0);
    const output = engine.evaluate(session.totals.find(total => total.category === Category.Output)!.calculation);
    assert.equal(output.knownSubtotal, '20');
    assert.equal(output.unknowns.length, 1);
    const second = U.assistant({ output_tokens: 10 }, 'second', F.late);
    const mixed = accounting.account([U.parse([F.user(), U.assistant(), second]).conversation]);
    const total = mixed.groups.find(group => group.attribution.level === Level.Session)!.totals.find(total => total.category === Category.Input)!;
    assert.equal(engine.evaluate(total.calculation).knownSubtotal, '100');
    assert.equal(engine.evaluate(total.calculation).unknowns.length, 1);
});

test('cross-turn response observations leave turn allocations unknown but preserve a single session total', () =>
{
    const records = [F.user(), U.assistant(), F.user(F.late, 'next-user'),
        { ...U.assistant(U.usage(), 'response', '2026-01-01T00:00:03Z'), parentUuid: 'next-user' }];
    const result = accounting.account([U.parse(records).conversation]);
    const turns = result.groups.filter(group => group.attribution.level === Level.Turn);
    assert.equal(turns.length, 2);
    assert.ok(turns.every(group => engine.evaluate(group.totals[1].calculation).unknowns.length === 1));
    assert.equal(engine.evaluate(result.groups.find(group => group.attribution.level === Level.Session)!.totals[1].calculation).knownSubtotal, '900');
});

test('parent, child and combined membership is deduplicated and isolated across identical IDs in different projects', () =>
{
    const conversations = ['/one', '/two'].flatMap(project =>
    {
        const parent = U.parse(undefined, F.identity(project)).conversation;
        const child = { ...U.parse(undefined, F.identity(project, 'child')).conversation,
            parent: { parent: parent.identity, toolInvocation: null } };
        return [parent, child, child];
    });
    const result = accounting.account(conversations);
    const sessions = result.groups.filter(group => group.attribution.level === Level.Session);
    assert.equal(sessions.length, 8);
    for (const group of sessions)
    {
        const expected = group.attribution.conversation.agentId === null && group.attribution.scope === Scope.IncludingSubagents ? '1800' : '900';
        assert.equal(engine.evaluate(group.totals[1].calculation).knownSubtotal, expected);
        assert.ok(group.totals[1].contributions.every(value =>
            value.source.conversation.projectDirectory === group.attribution.conversation.projectDirectory));
    }
});

test('missing response totals use measured blocks plus an unknown remainder rather than claiming block completeness', () =>
{
    const content = [{ ...F.text(), usage: { input_tokens: 7, output_tokens: 50 } }];
    const parsed = U.parse([F.user(), U.assistant({}, 'response', F.middle, 'synthetic-model', content)]);
    const result = accounting.account([parsed.conversation]);
    const session = result.groups.find(group => group.attribution.level === Level.Session)!;
    const output = engine.evaluate(session.totals[1].calculation);
    assert.equal(output.knownSubtotal, '50');
    assert.equal(output.unknowns.length, 1);
    assert.equal(output.unknowns[0].reason, 'unrecorded-response-remainder');
});

test('same project and agent IDs in separate sessions cannot share contribution or parent membership', () =>
{
    const one = F.identity('/same-project');
    const two = { ...one, sessionId: 'other-session', filePath: '/same-project/other-session.jsonl' };
    const childIdentity = { ...two, agentId: 'child', filePath: '/same-project/other-session/child.jsonl' };
    const first = U.parse(undefined, one).conversation;
    const second = U.parse(undefined, two).conversation;
    const child = { ...U.parse(undefined, childIdentity).conversation, parent: { parent: second.identity, toolInvocation: null } };
    const result = accounting.account([first, second, child, child]);
    const combined = result.groups.filter(group => group.attribution.level === Level.Session
        && group.attribution.scope === Scope.IncludingSubagents && group.attribution.conversation.agentId === null);
    assert.deepEqual(combined.map(group => engine.evaluate(group.totals[1].calculation).knownSubtotal), ['900', '1800']);
    assert.ok(combined[1].totals[1].contributions.every(value => value.source.conversation.sessionId === 'other-session'));
});
