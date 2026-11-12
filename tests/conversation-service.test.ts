import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { join, basename } from 'node:path';
import { SessionFixture } from './support/SessionFixture';
import { ConversationFixture as F } from './support/ConversationFixture';
import { ConversationServiceHarness } from './support/ConversationServiceHarness';
import { ConversationService } from '../src/lib/server/conversations/ConversationService';
import { SessionFileDAO } from '../src/lib/server/sessions/SessionFileDAO';
import { SessionListService } from '../src/lib/server/sessions/SessionListService';
import { ConversationSubagentLinker } from '../src/lib/server/conversations/ConversationSubagentLinker';
import { SessionDiscoveryStatus as Access, SessionWarningCode as Warning } from '../src/lib/sessions/SessionDiscoveryViewModel';
import { ConversationDiagnosticCode as Diagnostic } from '../src/lib/server/conversations/ConversationDiagnostic';

test('service distinguishes empty discovery, empty readable files, interpretation gaps, and discovery failure', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    const service = new ConversationService(fixture.root);
    const empty = await service.load();
    assert.equal(empty.status, Access.Complete);
    assert.equal(empty.empty, true);
    await fixture.write('project', 'empty.jsonl', '');
    await fixture.write('project', 'unknown.jsonl', F.jsonl([42, null, { type: 'future' }]));
    const loaded = await service.load();
    assert.equal(loaded.empty, false);
    assert.equal(loaded.status, Access.Complete);
    assert.deepEqual(loaded.warnings, []);
    const emptyFile = loaded.conversations.find(result => result.file.filename === 'empty.jsonl')!;
    assert.equal(emptyFile.readFailed, false);
    assert.deepEqual(emptyFile.parsed?.conversation.records, []);
    const unknown = loaded.conversations.find(result => result.file.filename === 'unknown.jsonl')!;
    assert.equal(unknown.parsed?.diagnostics.filter(diagnostic => diagnostic.code === Diagnostic.UnknownRecord).length, 3);
    await fixture.remove(join(fixture.root, 'projects'));
    const failure = await service.load();
    assert.equal(failure.status, Access.Failed);
    assert.equal(failure.empty, false);
    assert.ok(failure.warnings.some(warning => warning.code === Warning.DirectoryAccess));
});

test('parent and subagent usage stay separate with project-safe evidence-based invocation links', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    for (const project of ['one', 'two'])
    {
        await fixture.write(project, 'same.jsonl', F.jsonl([F.user(), F.assistant([F.call()], F.middle, 'tool_use'), F.result('call', 'child')]));
        await fixture.write(project, 'same/subagents/agent-child.jsonl', F.jsonl([F.user(), F.assistant()]));
    }
    const loaded = await new ConversationService(fixture.root).load();
    assert.equal(loaded.conversations.length, 4);
    for (const result of loaded.conversations.filter(result => result.file.agentId !== null))
    {
        const conversation = result.parsed!.conversation;
        assert.equal(conversation.parent?.parent.projectDirectory, result.file.projectDirectory);
        assert.equal(conversation.parent?.parent.sessionId, 'same');
        assert.equal(conversation.parent?.toolInvocation?.lineNumber, 2);
        assert.equal(conversation.parent?.toolInvocation?.blockIndex, 0);
        assert.equal(conversation.messages.length, 2);
        assert.deepEqual(conversation.messages[1].usage, F.assistant().message.usage);
        assert.equal(conversation.records.length, 2);
    }
    const parents = loaded.conversations.filter(result => result.file.agentId === null);
    assert.ok(parents.every(result => result.parsed!.conversation.records.length === 3));
    const metadata = await new SessionListService(fixture.root).load();
    assert.ok(!JSON.stringify(metadata).includes(F.secret));
});

test('subagent linkage uses session fallback for absent, conflicting, or unresolved invocation evidence', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    const service = new ConversationService(fixture.root);
    await fixture.write('project', 'parent/subagents/agent-child.jsonl', F.jsonl([F.user()]));
    const alternatives = [
        [F.user()],
        [F.user(), F.result('missing', 'child')],
        [F.user(), F.assistant([F.call('one'), F.call('two')]), F.result('one', 'child'), F.result('two', 'child')]
    ];
    for (const values of alternatives)
    {
        await fixture.write('project', 'parent.jsonl', F.jsonl(values));
        const loaded = await service.load();
        const child = loaded.conversations.find(result => result.file.agentId === 'child')!;
        assert.equal(child.orphan, false);
        assert.equal(child.parsed!.conversation.parent!.parent.sessionId, 'parent');
        assert.equal(child.parsed!.conversation.parent!.toolInvocation, null);
        if (values.length > 1)
        {
            assert.ok(child.parsed!.diagnostics.some(diagnostic => diagnostic.code === Diagnostic.AmbiguousRelationship));
        }
    }
    const parent = F.parse([F.user()], F.identity('/one')).conversation;
    const child = F.parse([F.user()], F.identity('/two', 'child')).conversation;
    assert.throws(() => new ConversationSubagentLinker().link(parent, child, []));
});

test('malformed records and deferred tails preserve valid data and finish on a later fresh load', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    const service = new ConversationService(fixture.root);
    const content = F.jsonl([F.user()]) + 'not valid json\r\n' + '{"type":"assistant"';
    const path = await fixture.write('project', 'tail.jsonl', content);
    const first = await service.load();
    const initial = first.conversations[0];
    assert.equal(initial.deferredTrailingRecord, true);
    assert.equal(initial.parsed!.conversation.records.length, 1);
    assert.equal(first.status, Access.Partial);
    assert.equal(first.warnings[0].code, Warning.MalformedRecord);
    assert.equal(first.warnings[0].path, path);
    assert.equal(first.warnings[0].lineNumber, 2);
    await fixture.write('project', 'tail.jsonl', F.jsonl([F.user(), F.assistant()]));
    const second = await service.load();
    assert.equal(second.conversations[0].deferredTrailingRecord, false);
    assert.equal(second.conversations[0].parsed!.conversation.records.length, 2);
    assert.equal(second.conversations[0].parsed!.conversation.turns[0].status, 'complete');
    assert.deepEqual(second.warnings, []);
    assert.equal(initial.parsed!.conversation.records.length, 1);
    await fixture.write('project', 'added.jsonl', F.jsonl([F.user()]));
    assert.equal((await service.load()).conversations.length, 2);
    await fixture.remove(path);
    assert.equal((await service.load()).conversations.length, 1);
});

test('orphan subagents retain discovery warnings and missing-parent identity without fabricated conversations', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    await fixture.write('project', 'missing/subagents/agent-orphan.jsonl', F.jsonl([F.user(), F.assistant()]));
    const loaded = await new ConversationService(fixture.root).load();
    assert.equal(loaded.status, Access.Partial);
    assert.equal(loaded.empty, false);
    assert.equal(loaded.conversations.length, 1);
    assert.equal(loaded.conversations[0].orphan, true);
    assert.equal(loaded.conversations[0].file.parentSessionId, 'missing');
    assert.equal(loaded.conversations[0].parsed!.conversation.parent, null);
    assert.ok(loaded.warnings.some(warning => warning.code === Warning.MissingParent));
});

test('a parent deleted between discovery and reading does not suppress its readable subagent or other sessions', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    const parentPath = await fixture.write('project', 'parent.jsonl', F.jsonl([F.user()]));
    await fixture.write('project', 'parent/subagents/agent-child.jsonl', F.jsonl([F.user()]));
    await fixture.write('project', 'kept.jsonl', F.jsonl([F.user()]));
    const discover = SessionFileDAO.prototype.discover;
    context.mock.method(SessionFileDAO.prototype, 'discover', async function(this: SessionFileDAO)
    {
        const discovery = await discover.call(this);
        await fixture.remove(parentPath);
        return discovery;
    });
    const loaded = await new ConversationService(fixture.root).load();
    const parent = loaded.conversations.find(result => result.file.filename === 'parent.jsonl')!;
    assert.equal(parent.readFailed, true);
    assert.equal(parent.parsed, null);
    assert.equal(parent.deferredTrailingRecord, false);
    assert.ok(parent.warnings.some(warning => warning.path === parentPath && warning.code === Warning.FileAccess));
    const child = loaded.conversations.find(result => result.file.agentId === 'child')!;
    assert.equal(child.readFailed, false);
    assert.equal(child.parsed!.conversation.parent!.parent.filePath, parentPath);
    assert.equal(child.parsed!.conversation.parent!.toolInvocation, null);
    assert.ok(loaded.conversations.some(result => result.file.filename === 'kept.jsonl' && result.parsed !== null));
});

test('injected read denial remains local and warnings stay distinct from parser diagnostics', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    const deniedPath = await fixture.write('project', 'denied.jsonl', F.jsonl([F.user()]));
    await fixture.write('project', 'good.jsonl', F.jsonl([F.user()]));
    const original = fs.readFile;
    context.mock.method(fs, 'readFile', async function(path: string, encoding: 'utf8')
    {
        if (path === deniedPath)
        {
            throw Object.assign(new Error('Injected denial'), { code: 'EACCES' });
        }
        return original(path, encoding);
    });
    syncBuiltinESMExports();
    context.after(() =>
    {
        context.mock.restoreAll();
        syncBuiltinESMExports();
    });
    const loaded = await new ConversationService(fixture.root).load();
    assert.equal(loaded.status, Access.Partial);
    assert.equal(loaded.conversations.find(result => result.file.path === deniedPath)!.parsed, null);
    assert.ok(loaded.conversations.find(result => result.file.filename === 'good.jsonl')!.parsed);
    assert.ok(loaded.warnings.some(warning => warning.code === Warning.FileAccess && warning.path === deniedPath));
});

test('ordering warnings use actual service logic only in development and contain locations rather than transcript data', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    const path = await fixture.write('project', 'reordered.jsonl', F.jsonl([F.assistant([F.text()], F.late), F.user()]));
    const warn = context.mock.method(console, 'warn', () => {});
    await new ConversationService(fixture.root).load();
    assert.equal(warn.mock.callCount(), 0);
    for (const development of [true, false])
    {
        warn.mock.resetCalls();
        const Service = await ConversationServiceHarness.load(development);
        const loaded = await new Service(fixture.root).load();
        assert.ok(loaded.conversations[0].parsed!.diagnostics.some(diagnostic => diagnostic.code === Diagnostic.TimestampOrderMismatch));
        assert.equal(warn.mock.callCount(), development ? 1 : 0);
        if (development)
        {
            const args = warn.mock.calls[0].arguments;
            assert.deepEqual(args[1], [{ path, lineNumber: 1 }, { path, lineNumber: 2 }]);
            assert.ok(!JSON.stringify(args).includes(F.secret));
            assert.ok(!JSON.stringify(args).includes('synthetic-model'));
        }
    }
    assert.equal(basename(path), 'reordered.jsonl');
});
