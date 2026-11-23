import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { compile } from 'svelte/compiler';
import { render } from 'svelte/server';
import { MonitoringRefreshController, type MonitoringRefreshState } from '../src/lib/monitoring/MonitoringRefreshController';
import type { MonitoringResponseViewModel, MonitoringSelection } from '../src/lib/monitoring/MonitoringViewModel';
import MonitoringSessionCard from '../src/lib/monitoring/MonitoringSessionCard.svelte';
import MonitoringWorkspace from '../src/lib/monitoring/MonitoringWorkspace.svelte';
import { MonitoringSnapshotProjection } from '../src/lib/server/monitoring/MonitoringSnapshotProjection';
import { SessionDiscoveryStatus } from '../src/lib/sessions/SessionDiscoveryViewModel';
import { ConversationFixture as C } from './support/ConversationFixture';
import { MonitoringFixture as M } from './support/MonitoringFixture';

class TestVisibility extends EventTarget
{
    hidden = false;

    setHidden(hidden: boolean): void
    {
        this.hidden = hidden;
        this.dispatchEvent(new Event('visibilitychange'));
    }
}

class PendingSnapshot
{
    resolve!: (snapshot: MonitoringResponseViewModel) => void;
    reject!: (error: Error) => void;
    readonly promise = new Promise<MonitoringResponseViewModel>((resolve, reject) =>
    {
        this.resolve = resolve;
        this.reject = reject;
    });
}

async function browserSnapshots()
{
    const fixture = new M();
    const file = fixture.file('project');
    fixture.sessions = [file];
    fixture.records.set(file.path, [C.user(), M.response('known', 'claude-sonnet-5'), M.response('unknown')]);
    const coordinator = fixture.coordinator();
    const snapshot = await coordinator.refresh();
    const projection = new MonitoringSnapshotProjection(snapshot);
    const initial = projection.project({ expandedSessionKeys: [], explanationIds: [] });
    const session = initial.sessions[0];
    assert.ok(session.ownUsage);
    const explanationId = session.ownUsage.cost.explanationId;
    const selected = projection.project({ expandedSessionKeys: [session.key], explanationIds: [explanationId] });
    return { fixture, coordinator, initial, selected, session, explanationId };
}

test('controlled refresh clock honors visibility, coalesces triggers and handles stale replies, retries and disposal', async context =>
{
    const { initial, selected, session, explanationId } = await browserSnapshots();
    context.mock.timers.enable({ apis: ['setTimeout'] });
    const page = new TestVisibility();
    const requests: {
        selection: MonitoringSelection;
        signal: AbortSignal;
        response: PendingSnapshot;
    }[] = [];
    const states: MonitoringRefreshState[] = [];
    const current = () => states.at(-1)!;
    const controller = new MonitoringRefreshController(page as unknown as Document, initial, (selection, signal) =>
    {
        const response = new PendingSnapshot();
        requests.push({ selection, signal, response });
        return response.promise;
    }, state => states.push(state));
    context.after(() => controller.dispose());

    context.mock.timers.tick(4999);
    assert.equal(requests.length, 0);
    page.setHidden(true);
    context.mock.timers.tick(20000);
    assert.equal(requests.length, 0);
    page.setHidden(false);
    assert.equal(requests.length, 1);
    requests[0].response.resolve({ ...initial, generation: 2 });
    await requests[0].response.promise;
    context.mock.timers.tick(4999);
    assert.equal(requests.length, 1);
    context.mock.timers.tick(1);
    assert.equal(requests.length, 2);

    await controller.refresh();
    assert.equal(requests.length, 2);
    controller.toggleActivity(session.key);
    controller.toggleExplanation(explanationId);
    requests[1].response.resolve({ ...initial, generation: 3 });
    await requests[1].response.promise;
    assert.equal(requests.length, 3);
    assert.deepEqual(requests[2].selection, { expandedSessionKeys: [session.key], explanationIds: [explanationId] });

    controller.toggleActivity(session.key);
    controller.toggleActivity(session.key);
    requests[2].response.resolve({ ...selected, generation: 4 });
    await requests[2].response.promise;
    assert.equal(requests.length, 4);
    assert.deepEqual(current().snapshot.details, []);
    assert.equal(current().snapshot.calculations.length, 1);
    requests[3].response.resolve({ ...selected, generation: 5 });
    await requests[3].response.promise;
    assert.equal(current().snapshot.details.length, 1);

    const old = controller.refresh();
    requests[4].response.resolve({ ...initial, generation: 4 });
    await old;
    assert.equal(current().snapshot.generation, 5);
    assert.equal(current().snapshot.details.length, 1);
    const failed = controller.refresh();
    requests[5].response.reject(new Error('offline'));
    await failed;
    assert.equal(current().failure, true);
    assert.deepEqual(current().snapshot.sessions, selected.sessions);

    context.mock.timers.tick(5000);
    requests[6].response.resolve({ ...initial, generation: 6, sessions: [] });
    await requests[6].response.promise;
    assert.equal(current().failure, false);
    assert.deepEqual(current().expanded, []);
    assert.deepEqual(current().explanations, []);
    context.mock.timers.tick(5000);
    const pending = requests[7];
    controller.dispose();
    assert.equal(pending.signal.aborted, true);
    const count = states.length;
    pending.response.resolve({ ...initial, generation: 7 });
    await pending.response.promise;
    page.setHidden(true);
    page.setHidden(false);
    context.mock.timers.tick(20000);
    assert.equal(states.length, count);
    assert.equal(requests.length, 8);
});

test('monitoring renders categories, totals, unresolved operands, and retained values with failure status', async () =>
{
    const { fixture, coordinator, initial, selected, session, explanationId } = await browserSnapshots();
    fixture.status = SessionDiscoveryStatus.Failed;
    const stale = new MonitoringSnapshotProjection(await coordinator.refresh()).project({ expandedSessionKeys: [], explanationIds: [] });
    const html = render(MonitoringWorkspace, { props: { initial: stale } }).body;
    for (const text of ['Input tokens', 'Output tokens', 'Cache read tokens', 'Cache write tokens', 'Parent only',
        'Parent + subagents', 'Last successful refresh', 'Session discovery failed', 'Stale', '1800', ' + unknown'])
    {
        assert.ok(html.includes(text), text);
    }
    assert.match(html, /role="alert"/);
    assert.ok(!html.includes(C.secret));
    assert.ok(!html.includes('Unresolved terms'));

    const card = render(MonitoringSessionCard, { props: {
        session, expanded: true, detail: selected.details[0], calculations: new Map(selected.calculations.map(graph => [graph.id, graph])),
        openExplanations: [explanationId], loading: false, transportFailed: true,
        onToggleActivity: () => {}, onToggleExplanation: () => {}
    } }).body;
    assert.match(card, /Unresolved terms/);
    assert.match(card, /synthetic-model/);
    assert.match(card, /Messages/);
    assert.match(card, /Stale/);
    assert.ok(initial.freshness.lastSuccessfulAt);
});

test('highlight is anchored to source time and compiled styles hold full opacity for five seconds and fade by one minute', async context =>
{
    const { session } = await browserSnapshots();
    const now = new Date('2026-10-01T00:01:00Z');
    context.mock.timers.enable({ apis: ['Date'], now });
    const cardAt = (age: number) => render(MonitoringSessionCard, { props: {
        session: { ...session, sourceUpdatedAt: new Date(now.getTime() - age).toISOString() },
        expanded: false, detail: undefined, calculations: new Map(), openExplanations: [], loading: false, transportFailed: false,
        onToggleActivity: () => {}, onToggleExplanation: () => {}
    } }).body;

    assert.match(cardAt(4999), /animation-delay:\s*-4999ms/);
    assert.match(cardAt(5000), /animation-delay:\s*-5000ms/);
    assert.match(cardAt(59999), /animation-delay:\s*-59999ms/);
    assert.doesNotMatch(cardAt(60000), /animation-delay/);
    const source = await readFile(new URL('../src/lib/monitoring/MonitoringSessionCard.svelte', import.meta.url), 'utf8');
    const css = compile(source, { filename: 'MonitoringSessionCard.svelte', generate: 'client' }).css?.code ?? '';
    const hold = /0%,\s*([\d.]+)%\s*\{\s*opacity:\s*1/.exec(css);
    assert.ok(hold);
    assert.equal(Math.round(60000 * Number(hold[1]) / 100), 5000);
    assert.match(css, /animation:\s*\S+\s+60s linear both/);
    assert.match(css, /100%\s*\{\s*opacity:\s*0/);
});
