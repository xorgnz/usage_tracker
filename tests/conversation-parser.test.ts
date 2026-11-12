import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ConversationFixture as F } from './support/ConversationFixture';
import { ConversationParser } from '../src/lib/server/conversations/ConversationParser';
import { ConversationRecord } from '../src/lib/server/conversations/ConversationRecord';
import { ConversationSource } from '../src/lib/server/conversations/ConversationSource';
import { ConversationDiagnosticCode as D } from '../src/lib/server/conversations/ConversationDiagnostic';
import {
    ConversationActivityStatus as Status,
    ConversationRelationshipKind as Link,
    ConversationSubstepKind as Kind
} from '../src/lib/server/conversations/ConversationSubstep';
import { ConversationUserOrigin as Origin } from '../src/lib/server/conversations/ConversationMessage';

test('messages retain metadata and one usage observation while blocks retain source order and original payloads', () =>
{
    const blocks = [F.text(), { type: 'thinking', thinking: F.secret, signature: 'signature' }, F.call()];
    const response = F.assistant(blocks, F.middle, 'tool_use');
    const parsed = F.parse([F.user(), response]);
    const message = parsed.conversation.messages[1];
    assert.equal(message.recordId, 'assistant');
    assert.equal(message.parentRecordId, 'user');
    assert.equal(message.responseId, 'response');
    assert.equal(message.requestId, 'request');
    assert.equal(message.apiBlockIndex, 0);
    assert.equal(message.model, 'synthetic-model');
    assert.equal(message.timestamp, F.middle);
    assert.equal(message.hasUsage, true);
    assert.deepEqual(message.usage, response.message.usage);
    const steps = parsed.conversation.turns[0].substeps.slice(1);
    assert.deepEqual(steps.map(step => step.kind), [Kind.Text, Kind.Thinking, Kind.ToolCall]);
    assert.deepEqual(steps.map(step => step.source.blockIndex), [0, 1, 2]);
    assert.deepEqual(steps.map(step => step.content), blocks);
    assert.ok(steps.every(step => step.messageSource?.equals(message.source)));
    assert.ok(steps.every(step => !Object.hasOwn(step, 'usage')));
});

test('tool results, synthetic users, SDK prompts and uncertain user origins have distinct turn behavior', () =>
{
    const synthetic = { ...F.user(F.late, 'synthetic'), isMeta: true };
    const sdk = { ...F.user(F.late, 'sdk'), promptSource: 'sdk', turnOrigin: 'sdk' };
    const uncertain = { type: 'user', timestamp: F.late, message: { role: 'user', content: 'unclassified' } };
    const parsed = F.parse([F.user(), F.assistant([F.call()], F.middle, 'tool_use'), F.result(), synthetic, sdk, uncertain]);
    assert.deepEqual(
        parsed.conversation.messages.map(message => message.userOrigin),
        [Origin.Initiating, null, Origin.ToolResult, Origin.Synthetic, Origin.Initiating, Origin.Unknown]
    );
    assert.equal(parsed.conversation.turns.length, 2);
    assert.deepEqual(parsed.conversation.turns.map(turn => turn.initiatingMessage.lineNumber), [1, 5]);
    assert.ok(parsed.diagnostics.some(diagnostic => diagnostic.code === D.UncertainUserOrigin));
});

test('system events remain ordered activity rather than fabricated user turns or completion evidence', () =>
{
    const events = ['turn_duration', 'local_command', 'future-system'].map(subtype => ({ type: 'system', subtype, timestamp: F.middle, durationMs: 10 }));
    const parsed = F.parse([F.user(), ...events]);
    assert.equal(parsed.conversation.turns.length, 1);
    assert.equal(parsed.conversation.turns[0].status, Status.Incomplete);
    assert.ok(parsed.conversation.turns[0].substeps.slice(1).every(step => step.kind === Kind.SystemEvent));
    assert.ok(parsed.diagnostics.some(diagnostic => diagnostic.code === D.UnknownContent && diagnostic.sources[0].lineNumber === 4));
});

test('timestamps reorder whole messages while ties and content blocks preserve file order', () =>
{
    const values = [F.assistant([F.text('first'), F.text('second')], F.late), F.user(), F.assistant([F.text('tie')], F.late, null, 'tie')];
    const parsed = F.parse(values);
    const steps = parsed.conversation.turns[0].substeps;
    assert.deepEqual(steps.map(step => step.source.lineNumber), [2, 1, 1, 3]);
    assert.deepEqual(steps.map(step => step.source.blockIndex), [null, 0, 1, 0]);
    assert.deepEqual(parsed.conversation.records.map(record => record.value), values);
    const mismatch = parsed.diagnostics.find(diagnostic => diagnostic.code === D.TimestampOrderMismatch)!;
    assert.deepEqual(mismatch.sources.map(source => source.lineNumber), [1, 2]);
    assert.ok(!JSON.stringify(parsed.diagnostics).includes(F.secret));
    assert.deepEqual(F.parse(values), parsed);
});

test('missing and invalid timestamps keep deterministic source slots without breaking dated order', () =>
{
    const values = [F.assistant([F.text()], F.late), F.user(undefined), F.user(F.early, 'known-user'), F.assistant([F.text()], 'bad-date', null, 'bad')];
    // Explicitly omit the timestamp rather than using the fixture default.
    const missing = { ...values[1], timestamp: undefined };
    const parsed = F.parse([values[0], missing, values[2], values[3]]);
    const all = [...parsed.conversation.turns.flatMap(turn => turn.substeps), ...parsed.conversation.unattachedActivity];
    assert.equal(parsed.conversation.turns[0].initiatingMessage.lineNumber, 3);
    assert.deepEqual(parsed.conversation.turns.flatMap(turn => turn.substeps).map(step => step.source.lineNumber), [3, 2, 1, 4]);
    assert.ok(all.filter(step => [2, 4].includes(step.source.lineNumber)).every(step => step.chronologyUncertain));
    assert.equal(parsed.diagnostics.filter(diagnostic => diagnostic.code === D.UncertainChronology).length, 2);
});

test('raw snapshots preserve arbitrary valid JSON and unknown fields without input/output mutation', () =>
{
    const future = { type: 'future', nested: { values: [1, null] } };
    const response = F.assistant([{ type: 'future-block', extension: true }, F.text()]);
    const values = [future, [1, 'two'], null, 42, false, 'text', F.user(), { ...response, futureField: { intact: true } }];
    const before = structuredClone(values);
    const parsed = F.parse(values);
    assert.deepEqual(values, before);
    assert.deepEqual(parsed.conversation.records.map(record => record.value), before);
    future.nested.values.push(9);
    const returned = parsed.conversation.records[0].value as typeof future;
    returned.nested.values.push(8);
    assert.deepEqual(parsed.conversation.records[0].value, before[0]);
    assert.ok(parsed.diagnostics.some(diagnostic => diagnostic.code === D.UnknownRecord));
    assert.ok(parsed.diagnostics.some(diagnostic => diagnostic.code === D.UnknownContent && diagnostic.sources[0].blockIndex === 0));
    assert.equal(parsed.conversation.turns[0].substeps.at(-1)?.kind, Kind.Text);
});

test('malformed recognized content retains usable neighbors and source-located diagnostics', () =>
{
    const response = F.assistant([{ type: 'tool_use', id: 3 }, null, F.text()]);
    const parsed = F.parse([F.user(), response, { type: 'assistant', timestamp: F.late, message: null }]);
    assert.equal(parsed.conversation.records.length, 3);
    assert.ok(parsed.conversation.turns[0].substeps.some(step => step.kind === Kind.Text));
    assert.ok(parsed.diagnostics.some(diagnostic => diagnostic.code === D.InvalidField && diagnostic.sources[0].blockIndex === 0));
    assert.ok(parsed.diagnostics.some(diagnostic => diagnostic.code === D.UnknownContent && diagnostic.sources[0].blockIndex === 1));
    assert.ok(parsed.diagnostics.some(diagnostic => diagnostic.code === D.InvalidField && diagnostic.sources[0].lineNumber === 3));
});

test('absent usage differs from explicit null and repeated response ids retain separate observations', () =>
{
    const first = F.assistant();
    const absent = { ...first, uuid: 'absent', message: { ...first.message } };
    const { usage: ignored, ...withoutUsage } = absent.message;
    void ignored;
    const parsed = F.parse([F.user(), first, { ...absent, message: withoutUsage }, { ...first, uuid: 'null', message: { ...first.message, usage: null } }]);
    assert.equal(parsed.conversation.messages.length, 4);
    assert.deepEqual(parsed.conversation.messages.slice(1).map(message => message.hasUsage), [true, false, true]);
    assert.equal(parsed.conversation.messages[3].usage, null);
    assert.ok(parsed.conversation.messages.slice(1).every(message => message.responseId === 'response'));
    assert.deepEqual(parsed.conversation.messages.slice(1).map(message => message.source.lineNumber), [2, 3, 4]);
});

test('forward tool references resolve independently of chronological presentation and user-role results start no turns', () =>
{
    const parsed = F.parse([F.user(), F.result('call', null, F.middle), F.assistant([F.call()], F.late, 'tool_use')]);
    const link = parsed.conversation.relationships.find(relationship => relationship.kind === Link.ToolResult)!;
    assert.equal(link.source.lineNumber, 2);
    assert.equal(link.target?.lineNumber, 3);
    assert.equal(link.target?.blockIndex, 0);
    assert.equal(parsed.conversation.turns.length, 1);
    assert.deepEqual(parsed.conversation.turns[0].substeps.map(step => step.source.lineNumber), [1, 2, 3]);
});

test('duplicate call ids and missing targets remain unresolved with candidate evidence', () =>
{
    const parsed = F.parse([F.user(), F.assistant([F.call(), F.call()], F.middle, 'tool_use'), F.result(), F.result('absent')]);
    const links = parsed.conversation.relationships.filter(relationship => relationship.kind === Link.ToolResult);
    assert.deepEqual(links.map(link => link.target), [null, null]);
    assert.deepEqual(links.map(link => link.candidates.length), [2, 0]);
    assert.ok(parsed.diagnostics.some(diagnostic => diagnostic.code === D.AmbiguousRelationship));
    assert.ok(parsed.diagnostics.some(diagnostic => diagnostic.code === D.MissingRelationship));
    assert.equal(parsed.conversation.turns[0].status, Status.Incomplete);
});

test('cross-turn tool links and conflicting assistant evidence are retained with diagnostics', () =>
{
    const other = F.assistant([F.text()], F.middle, null, 'other');
    const result = { ...F.result(), sourceToolAssistantUUID: 'other' };
    const parsed = F.parse([F.user(), F.assistant([F.call()], F.middle, 'tool_use'), other, F.user(F.late, 'second'), result]);
    const links = parsed.conversation.relationships;
    assert.equal(links.find(link => link.kind === Link.ToolResult)?.target?.lineNumber, 2);
    assert.equal(links.find(link => link.kind === Link.SourceAssistant)?.target?.lineNumber, 3);
    assert.equal(parsed.conversation.turns[1].substeps.at(-1)?.kind, Kind.ToolResult);
    assert.ok(parsed.diagnostics.some(diagnostic => diagnostic.message.includes('crosses chronological turn')));
    assert.ok(parsed.diagnostics.some(diagnostic => diagnostic.message.includes('references disagree')));
});

test('self and duplicate record references are not arbitrarily resolved', () =>
{
    const user = { ...F.user(), parentUuid: 'user' };
    const parsed = F.parse([user, F.assistant(), { ...F.assistant(), uuid: 'assistant' }, F.result()]);
    const self = parsed.conversation.relationships.find(link => link.source.lineNumber === 1)!;
    assert.equal(self.target, null);
    const assistant = parsed.conversation.relationships.find(link => link.kind === Link.SourceAssistant)!;
    assert.equal(assistant.target, null);
    assert.equal(assistant.candidates.length, 2);
});

test('unattached, interrupted, incomplete and uncertain turns preserve activity without fabricated completion', () =>
{
    const unattached = F.parse([F.assistant()]);
    assert.equal(unattached.conversation.turns.length, 0);
    assert.equal(unattached.conversation.unattachedActivity.length, 1);
    for (const [reason, expected] of [[null, Status.Unknown], ['max_tokens', Status.Incomplete], ['interrupted', Status.Interrupted]] as const)
    {
        const parsed = F.parse([F.user(), F.assistant([F.text()], F.middle, reason), F.user(F.late, 'next')]);
        assert.equal(parsed.conversation.turns[0].status, expected);
        assert.equal(parsed.conversation.turns[1].status, Status.Incomplete);
    }
    const complete = F.parse([F.user(), F.assistant()]);
    assert.equal(complete.conversation.turns[0].status, Status.Complete);
});

test('empty initiating messages still create turns and unmatched tool results remain incomplete', () =>
{
    const empty = { ...F.user(), message: { role: 'user', content: [] } };
    const parsed = F.parse([empty, F.result('missing')]);
    assert.equal(parsed.conversation.turns.length, 1);
    assert.equal(parsed.conversation.turns[0].initiatingMessage.lineNumber, 1);
    assert.equal(parsed.conversation.turns[0].substeps[0].status, Status.Incomplete);
});

test('source identity isolates files/projects and rejects invalid locations or mixed parser input', () =>
{
    const identity = F.identity();
    const source = new ConversationSource(identity, 1);
    assert.ok(!source.equals(new ConversationSource(F.identity('/other'), 1)));
    assert.ok(!source.equals(new ConversationSource(F.identity('/synthetic/project', 'agent'), 1)));
    assert.throws(() => new ConversationSource(identity, 0));
    assert.throws(() => new ConversationSource(identity, 1, -1));
    assert.throws(() => new ConversationRecord(new ConversationSource(identity, 1, 0), {}));
    const record = new ConversationRecord(source, F.user());
    assert.throws(() => new ConversationParser().parse(F.identity('/other'), [record]));
    assert.deepEqual(F.parse([]).conversation.turns, []);
});
