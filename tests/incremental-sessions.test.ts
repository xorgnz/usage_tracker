import assert from 'node:assert/strict';
import { appendFile, open, rename, writeFile } from 'node:fs/promises';
import { test } from 'node:test';
import { IncrementalSessionJsonlReader } from '../src/lib/server/sessions/IncrementalSessionJsonlReader';
import { SessionFileChange } from '../src/lib/server/sessions/IncrementalSessionRead';
import { SessionFixture } from './support/SessionFixture';

test('incremental reader tracks bytes and line numbers across split UTF-8, CRLF and malformed lines', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    const completed = '{"cwd":"/test"}\r\ninvalid\r\n';
    const file = await fixture.session('project', 'session', completed);
    const reader = new IncrementalSessionJsonlReader();
    const tail = Buffer.from('{"text":"😀"}\r\n');
    await appendFile(file.path, tail.subarray(0, 10));

    const initial = await reader.advance(file, null);
    assert.equal(initial.change, SessionFileChange.Initial);
    assert.ok(initial.snapshot);
    assert.equal(initial.snapshot.completeOffsetBytes, Buffer.byteLength(completed));
    assert.equal(initial.snapshot.readOffsetBytes, Buffer.byteLength(completed) + 10);
    assert.deepEqual(initial.snapshot.trailingBytes, tail.subarray(0, 10));
    assert.equal(initial.snapshot.warnings[0].lineNumber, 2);
    assert.deepEqual(initial.snapshot.records.map(record => record.lineNumber), [1]);

    const unchanged = await reader.advance(file, initial.snapshot);
    assert.equal(unchanged.change, SessionFileChange.Unchanged);
    assert.equal(unchanged.snapshot, initial.snapshot);
    await appendFile(file.path, tail.subarray(10));
    const appended = await reader.advance(file, unchanged.snapshot);
    assert.equal(appended.change, SessionFileChange.Appended);
    assert.ok(appended.snapshot);
    assert.equal(appended.snapshot.readOffsetBytes, Buffer.byteLength(completed) + tail.length);
    assert.equal(appended.snapshot.completeOffsetBytes, appended.snapshot.readOffsetBytes);
    assert.equal(appended.snapshot.nextLineNumber, 4);
    assert.equal(appended.snapshot.trailingBytes.length, 0);
    assert.deepEqual(appended.snapshot.records.at(-1), { lineNumber: 3, value: { text: '😀' } });
});

test('invalidated revisions rebuild on same-size rewrite, contradictory growth, truncation and path replacement', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    const file = await fixture.session('p', 'session', '{"value":1}\n');
    const reader = new IncrementalSessionJsonlReader();
    let snapshot = (await reader.advance(file, null)).snapshot;
    for (const content of ['{"value":2}\n', '{"value":3}\n{"value":4}\n', '{"value":5}\n'])
    {
        await writeFile(file.path, content);
        const changed = await reader.advance(file, snapshot);
        assert.equal(changed.change, SessionFileChange.Rebuilt);
        assert.deepEqual(changed.snapshot?.records.map(record => record.value), content.trim().split('\n').map(line => JSON.parse(line)));
        snapshot = changed.snapshot;
    }

    await rename(file.path, file.path + '.old');
    await writeFile(file.path, '{"value":5}\n{"value":6}\n');
    const replacement = await reader.advance(file, snapshot);
    assert.equal(replacement.change, SessionFileChange.Rebuilt);
    assert.notEqual(replacement.snapshot?.revision.fileId, snapshot?.revision.fileId);
});

test('bounded checkpoint sampling can miss a same-inode prefix rewrite outside its samples during growth', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    const first = JSON.stringify({ text: 'a'.repeat(40000) }) + '\n';
    const file = await fixture.session('p', 'session', first);
    const reader = new IncrementalSessionJsonlReader();
    const original = (await reader.advance(file, null)).snapshot;
    assert.ok(original);

    const gap = original.checkpoints[0].offsetBytes + original.checkpoints[0].bytes.length;
    assert.ok(original.checkpoints.every(point => gap < point.offsetBytes || gap >= point.offsetBytes + point.bytes.length));
    const handle = await open(file.path, 'r+');
    try
    {
        await handle.write(Buffer.from('b'), 0, 1, gap);
    }
    finally
    {
        await handle.close();
    }

    await appendFile(file.path, '{}\n');
    const appended = await reader.advance(file, original);
    assert.equal(appended.change, SessionFileChange.Appended);
    assert.equal(appended.snapshot?.records[0], original.records[0]);
});

test('revision races retry, repeated races and missing files preserve prior state, and a later rebuild recovers', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    const file = await fixture.session('p', 'session', '{}\n');
    const reader = new IncrementalSessionJsonlReader();
    let snapshot = (await reader.advance(file, null)).snapshot;
    const handle = await open(file.path, 'r');
    const prototype = Object.getPrototypeOf(handle);
    const originalStat = handle.stat;
    await handle.close();

    let calls = 0;
    let writesRemaining = 1;
    const mockStat = context.mock.method(prototype, 'stat', async function(this: typeof handle, options: { bigint: true })
    {
        if (++calls % 2 === 0 && writesRemaining > 0)
        {
            writesRemaining--;
            await appendFile(file.path, '{}\n');
        }
        return Reflect.apply(originalStat, this, [options]);
    });

    const retried = await reader.advance(file, snapshot);
    assert.equal(retried.change, SessionFileChange.Appended);
    assert.equal(retried.snapshot?.records.length, 2);
    snapshot = retried.snapshot;
    writesRemaining = 2;
    const raced = await reader.advance(file, snapshot);
    assert.equal(raced.change, SessionFileChange.Failed);
    assert.equal(raced.snapshot, snapshot);
    assert.match(raced.warnings[0].message, /both read attempts/);
    mockStat.mock.restore();

    await fixture.remove(file.path);
    const missing = await reader.advance(file, snapshot);
    assert.equal(missing.change, SessionFileChange.Failed);
    assert.equal(missing.snapshot, snapshot);
    assert.match(missing.warnings[0].message, /no longer available/);
    assert.equal((await reader.advance(file, null)).snapshot, null);
    await writeFile(file.path, '{"recovered":true}\n');
    const recovered = await reader.advance(file, snapshot);
    assert.equal(recovered.change, SessionFileChange.Rebuilt);
    assert.deepEqual(recovered.snapshot?.records[0].value, { recovered: true });
});
