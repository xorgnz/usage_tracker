import assert from 'node:assert/strict';
import { appendFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';
import { MonitoringTokenCategory, type MonitoringResponseViewModel, type MonitoringSelection } from '../src/lib/monitoring/MonitoringViewModel';
import { ApplicationConfig } from '../src/lib/server/config/ApplicationConfig';
import { ConversationFixture as C } from './support/ConversationFixture';
import { MonitoringFixture as M } from './support/MonitoringFixture';
import { SessionFixture } from './support/SessionFixture';

type RefreshHandler = (event: { request: Request }) => Promise<Response>;

// SvelteKit checks generated route types in npm run check. Load the handlers at runtime for these transport tests.
const pageModule = '../src/routes/+page.server.ts';
const refreshModule = '../src/routes/monitoring/refresh/+server.ts';
const { load }: { load: () => Promise<{ monitoring: MonitoringResponseViewModel }> } = await import(pageModule);
const { POST }: { POST: RefreshHandler } = await import(refreshModule);

function post(body: unknown): Promise<Response>
{
    const request = new Request('http://localhost/monitoring/refresh', { method: 'POST', body: JSON.stringify(body) });
    return POST({ request });
}

test('refresh transport rejects malformed, oversized and path-like selections before loading a source', async () =>
{
    for (const body of [
        undefined, null, {}, { expandedSessionKeys: ['/tmp/session.jsonl'], explanationIds: [] },
        { expandedSessionKeys: [], explanationIds: [22] },
        { expandedSessionKeys: Array.from({ length: 2001 }, () => 'a'.repeat(43)), explanationIds: [] }
    ])
    {
        await assert.rejects(async () => post(body), { status: 400 });
    }
});

test('page and refresh handlers share incremental parent/subagent state and deliver only requested details', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());

    // Load real configuration from the temporary root, without changing the process cwd or project .env.
    await writeFile(join(fixture.root, '.env'), 'CLAUDE_DIRECTORY=.\n');
    const configuration = await ApplicationConfig.load(fixture.root);
    context.mock.method(ApplicationConfig, 'load', async () => configuration);
    await fixture.write('project', 'parent.jsonl', C.jsonl([C.user(), M.response('parent')]));
    const childPath = await fixture.write('project', 'parent/subagents/agent-child.jsonl', C.jsonl([C.user(), M.response('child')]));

    const initial = await load();
    assert.ok(initial);
    const first = initial.monitoring;
    const parent = first.sessions.find(session => session.agentId === null);
    const child = first.sessions.find(session => session.agentId === 'child');
    assert.ok(parent?.combinedUsage);
    assert.equal(child?.parentKey, parent.key);
    assert.deepEqual(first.details, []);
    assert.deepEqual(first.calculations, []);

    const tokens = (snapshot: MonitoringResponseViewModel) => snapshot.sessions.find(row => row.key === parent.key)
        ?.combinedUsage?.categories.find(category => category.category === MonitoringTokenCategory.Output)?.tokens.knownSubtotal;
    assert.equal(tokens(first), '1800');
    const explanationId = parent.combinedUsage.cost.explanationId;
    const selection: MonitoringSelection = {
        expandedSessionKeys: [parent.key, parent.key, 'z'.repeat(43)],
        explanationIds: [explanationId, explanationId, `${'z'.repeat(43)}.own.cost`]
    };

    const appended = C.jsonl([M.response('child-next')]);
    await appendFile(childPath, appended.slice(0, -1));
    const deferred = await (await post(selection)).json() as MonitoringResponseViewModel;
    assert.equal(tokens(deferred), '1800');
    assert.ok(deferred.calculations[0].nodes.some(node => node.unknown?.reason.includes('deferred-trailing-record')));

    await appendFile(childPath, '\n');
    const response = await post(selection);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.text();
    const updated = JSON.parse(body) as MonitoringResponseViewModel;
    assert.equal(updated.sourceKey, first.sourceKey);
    assert.equal(updated.generation, first.generation + 2);
    assert.equal(tokens(updated), '2700');
    assert.equal(updated.sessions.length, 2);
    assert.deepEqual(updated.details.map(detail => detail.sessionKey), [parent.key]);
    assert.equal(updated.details[0].generation, parent.generation);
    assert.equal(updated.sessions.find(row => row.key === parent.key)?.generation, updated.generation);
    assert.deepEqual(updated.calculations.map(graph => graph.id), [explanationId]);
    assert.ok(!body.includes(C.secret));
    assert.ok(!body.includes('recordId'));

    const unchanged = await (await post({ expandedSessionKeys: [], explanationIds: [] })).json() as MonitoringResponseViewModel;
    assert.equal(tokens(unchanged), '2700');
    assert.deepEqual(unchanged.details, []);
    assert.deepEqual(unchanged.calculations, []);
});
