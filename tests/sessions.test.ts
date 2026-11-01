import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { basename, join } from 'node:path';
import { SessionFixture } from './support/SessionFixture';
import { SessionFileDAO } from '../src/lib/server/sessions/SessionFileDAO';
import { SessionJsonlReader } from '../src/lib/server/sessions/SessionJsonlReader';
import { SessionListService } from '../src/lib/server/sessions/SessionListService';
import { SessionDiscoveryStatus, SessionWarningCode } from '../src/lib/sessions/SessionDiscoveryViewModel';

test('discovery groups original paths, orders by mtime, nests agents and exposes only file metadata', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    const old = await fixture.write('encoded-one', 'old.jsonl', '{"cwd":""}\n{"cwd":"/work/original","secret":"private transcript"}\n');
    const recent = await fixture.write('encoded-two', 'recent.jsonl');
    await fixture.write('encoded-one', 'old/subagents/agent-first.jsonl');
    await fixture.write('encoded-one', 'old/subagents/nested/agent-second.jsonl');
    await fixture.write('encoded-one', 'ignored.txt');
    await fixture.write('encoded-one', 'old/subagents/ignored.jsonl');
    await fixture.write('encoded-fallback', 'fallback.jsonl', '{"message":{"cwd":"/not-top-level"}}\n');
    await fixture.write('encoded-two', 'same-project.jsonl', '{"cwd":"/work/original"}\n');
    await fixture.modified(old, '2025-01-01T00:00:00.000Z');
    await fixture.modified(recent, '2025-02-01T00:00:00.000Z');
    const sibling = join(fixture.root, 'projects', 'encoded-two', 'same-project.jsonl');
    await fixture.modified(sibling, '2025-03-01T00:00:00.000Z');

    const list = await new SessionListService(fixture.root).load();
    assert.equal(list.status, SessionDiscoveryStatus.Complete);
    assert.equal(list.empty, false);
    const original = list.projects.find(project => project.projectPath === '/work/original')!;
    assert.deepEqual(original.sessions.map(session => session.sessionId), ['same-project', 'old']);
    const parent = original.sessions[1];
    assert.equal(parent.path, old);
    assert.equal(parent.filename, 'old.jsonl');
    assert.equal(parent.sizeBytes, (await fs.stat(old)).size);
    assert.equal(parent.modifiedAt, '2025-01-01T00:00:00.000Z');
    assert.equal(parent.createdAt, (await fs.stat(old)).birthtime.toISOString());
    assert.deepEqual(parent.subagents.map(agent => agent.agentId).sort(), ['first', 'second']);
    assert.ok(parent.subagents.every(agent => agent.parentSessionId === 'old'));
    assert.ok(list.projects.some(project => project.projectPath === 'encoded-fallback'));
    assert.ok(!JSON.stringify(list).includes('private transcript'));
    assert.ok(!JSON.stringify(list).includes('records'));
});

test('same session IDs in different projects retain their own subagents; missing parents retain orphan metadata', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());

    for (const project of ['one', 'two'])
    {
        await fixture.write(project, 'same.jsonl');
        await fixture.write(project, `same/subagents/agent-${project}.jsonl`);
    }

    await fixture.write('one', 'missing/subagents/agent-orphan.jsonl');
    const result = await new SessionFileDAO(fixture.root).discover();
    assert.equal(result.status, SessionDiscoveryStatus.Partial);
    assert.equal(result.sessions.length, 2);

    for (const parent of result.sessions)
    {
        assert.equal(parent.subagents.length, 1);
        assert.equal(parent.subagents[0].agentId, basename(parent.projectDirectory));
    }

    assert.equal(result.orphanSubagents[0].parentSessionId, 'missing');
    assert.ok(result.warnings.some(warning => warning.code === SessionWarningCode.MissingParent));
});

test('successful empty source differs from missing source and partial orphan-only results', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    const service = new SessionListService(fixture.root);
    const empty = await service.load();
    assert.equal(empty.status, SessionDiscoveryStatus.Complete);
    assert.equal(empty.empty, true);
    await fixture.write('project', 'missing/subagents/agent-orphan.jsonl');
    const partial = await service.load();
    assert.equal(partial.status, SessionDiscoveryStatus.Partial);
    assert.equal(partial.empty, false);
    assert.equal(partial.orphanSubagents.length, 1);
    await fixture.remove(join(fixture.root, 'projects'));
    const failed = await service.load();
    assert.equal(failed.status, SessionDiscoveryStatus.Failed);
    assert.equal(failed.empty, false);
    assert.equal(failed.warnings[0].code, SessionWarningCode.DirectoryAccess);
});

test('JSONL preserves valid CRLF records around malformed lines with safe warning locations', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    const session = await fixture.session('project', 'records', '{"cwd":"/work"}\r\nprivate malformed content\r\n42\r\nnull');
    const result = await new SessionJsonlReader().read(session);
    assert.equal(result.failed, false);
    assert.equal(result.deferredTrailingRecord, false);
    assert.deepEqual(result.records, [{ lineNumber: 1, value: { cwd: '/work' } }, { lineNumber: 3, value: 42 }, { lineNumber: 4, value: null }]);
    assert.equal(result.warnings.length, 1);
    assert.equal(result.warnings[0].code, SessionWarningCode.MalformedRecord);
    assert.equal(result.warnings[0].lineNumber, 2);
    assert.equal(result.warnings[0].path, session.path);
    assert.ok(!result.warnings[0].message.includes('private'));
    const list = await new SessionListService(fixture.root).load();
    assert.equal(list.status, SessionDiscoveryStatus.Partial);
    assert.equal(list.projects[0].projectPath, '/work');
    assert.equal(list.warnings[0].lineNumber, 2);
});

test('incomplete tail is deferred and reread after completion; empty readable file is successful', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    const session = await fixture.session('project', 'tail', '{"ready":true}\n{"next":');
    const reader = new SessionJsonlReader();
    const first = await reader.read(session);
    assert.equal(first.records.length, 1);
    assert.equal(first.deferredTrailingRecord, true);
    assert.deepEqual(first.warnings, []);
    await fs.appendFile(session.path, 'true}\n');
    const second = await reader.read(session);
    assert.equal(second.records.length, 2);
    assert.deepEqual(second.records[1].value, { next: true });
    assert.equal(second.deferredTrailingRecord, false);
    const empty = await fixture.session('project', 'empty', '');
    assert.deepEqual(await reader.read(empty), { records: [], warnings: [], deferredTrailingRecord: false, failed: false });
});

test('file deleted after discovery fails locally while other sessions remain readable', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    const removed = await fixture.session('project', 'removed');
    const kept = await fixture.session('project', 'kept');
    await fixture.remove(removed.path);
    const reader = new SessionJsonlReader();
    const failure = await reader.read(removed);
    assert.equal(failure.failed, true);
    assert.equal(failure.warnings[0].path, removed.path);
    assert.equal(failure.warnings[0].code, SessionWarningCode.FileAccess);
    assert.equal((await reader.read(kept)).records.length, 1);
});

test('injected access and discovery race failures preserve unaffected sessions', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    const denied = await fixture.session('project', 'denied');
    const vanished = await fixture.session('project', 'vanished');
    await fixture.write('project', 'kept.jsonl');
    const originalStat = fs.stat;
    const originalRead = fs.readFile;
    context.mock.method(fs, 'stat', async function(path: string)
    {
        if (path === vanished.path)
        {
            throw Object.assign(new Error('Injected disappearance'), { code: 'ENOENT' });
        }

        return originalStat(path);
    });
    context.mock.method(fs, 'readFile', async function(path: string, encoding: 'utf8')
    {
        if (path === denied.path)
        {
            throw Object.assign(new Error('Injected permission denial'), { code: 'EACCES' });
        }

        return originalRead(path, encoding);
    });
    syncBuiltinESMExports();
    context.after(() =>
    {
        context.mock.restoreAll();
        syncBuiltinESMExports();
    });
    const list = await new SessionListService(fixture.root).load();
    assert.equal(list.status, SessionDiscoveryStatus.Partial);
    assert.ok(list.projects.some(project => project.sessions.some(session => session.sessionId === 'kept')));
    assert.ok(!list.projects.some(project => project.sessions.some(session => session.sessionId === 'vanished')));
    assert.ok(list.warnings.some(warning => warning.path === denied.path && warning.message.includes('permission denial')));
    assert.ok(list.warnings.some(warning => warning.path === vanished.path && warning.message.includes('disappearance')));
});

test('repeated loads reflect additions, size and timestamp changes, and removals without stale caching', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    const service = new SessionListService(fixture.root);
    assert.equal((await service.load()).empty, true);
    const path = await fixture.write('project', 'new.jsonl');
    const first = (await service.load()).projects[0].sessions[0];
    await fs.appendFile(path, '{"added":true}\n');
    await fixture.modified(path, '2025-06-01T00:00:00.000Z');
    const updated = (await service.load()).projects[0].sessions[0];
    assert.ok(updated.sizeBytes > first.sizeBytes);
    assert.equal(updated.modifiedAt, '2025-06-01T00:00:00.000Z');
    await fixture.remove(path);
    assert.equal((await service.load()).empty, true);
});
