import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MonitoringTokenCategory, type MonitoringUsageViewModel } from '../src/lib/monitoring/MonitoringViewModel';
import { MonitoringCoordinator } from '../src/lib/server/monitoring/MonitoringCoordinator';
import { MonitoringSnapshotProjection } from '../src/lib/server/monitoring/MonitoringSnapshotProjection';
import { SessionDiscoveryStatus } from '../src/lib/sessions/SessionDiscoveryViewModel';
import { ConversationFixture as C } from './support/ConversationFixture';
import { MonitoringFixture as M } from './support/MonitoringFixture';

function output(usage: MonitoringUsageViewModel | null | undefined): string | undefined
{
    return usage?.categories.find(category => category.category === MonitoringTokenCategory.Output)?.tokens.knownSubtotal;
}

test('coordinator shares source state, coalesces refresh and isolates project, source and new instances', async () =>
{
    const fixture = new M('synthetic-source-a');
    const first = fixture.file('project-a');
    const second = fixture.file('project-b');
    fixture.sessions = [first, second];
    fixture.records.set(first.path, [C.user(), M.response('first')]);
    fixture.records.set(second.path, [C.user(), M.response('second', 'synthetic-model', 300)]);

    const coordinator = fixture.coordinator();
    const pending = coordinator.refresh();
    assert.equal(coordinator.refresh(), pending);
    const initial = await pending;
    assert.equal(fixture.discoveries, 1);
    assert.equal(new Set(initial.sessions.map(session => session.identity.key)).size, 2);

    const unchanged = await coordinator.refresh();
    assert.equal(unchanged.generation, 2);
    for (const [index, session] of unchanged.sessions.entries())
    {
        assert.equal(session.conversation?.parsed, initial.sessions[index].conversation?.parsed);
        assert.equal(unchanged.families[index].estimation, initial.families[index].estimation);
    }

    assert.equal(MonitoringCoordinator.forSource(fixture.root), MonitoringCoordinator.forSource('./' + fixture.root));
    const otherSource = new M('synthetic-source-b');
    otherSource.sessions = [otherSource.file('project-a')];
    assert.notEqual(MonitoringCoordinator.forSource(fixture.root), MonitoringCoordinator.forSource(otherSource.root));
    assert.notEqual((await otherSource.coordinator().refresh()).sessions[0].identity.key, initial.sessions[0].identity.key);

    const restarted = await fixture.coordinator().refresh();
    assert.equal(restarted.generation, 1);
    assert.notEqual(restarted.sessions[0].conversation, initial.sessions[0].conversation);
});

test('child changes, repeated observations, orphaning and restored relationships recompute only the affected family', async () =>
{
    const fixture = new M();
    const child = fixture.file('project', 'parent', 'child');
    const parent = fixture.file('project', 'parent', null, [child]);
    const unrelated = fixture.file('project', 'other');
    fixture.sessions = [parent, unrelated];
    const repeated = M.response('parent');
    fixture.records.set(parent.path, [C.user(), repeated, repeated]);
    fixture.records.set(child.path, [C.user(), M.response('child')]);
    const coordinator = fixture.coordinator();
    const initial = await coordinator.refresh();

    const summary = (snapshot: typeof initial) =>
        new MonitoringSnapshotProjection(snapshot).project({ expandedSessionKeys: [], explanationIds: [] }).sessions;
    const parentRow = (snapshot: typeof initial) => summary(snapshot).find(row => row.sessionId === 'parent' && row.agentId === null);
    assert.equal(output(parentRow(initial)?.ownUsage), '900');
    assert.equal(output(parentRow(initial)?.combinedUsage), '1800');
    const childRow = summary(initial).find(row => row.agentId === 'child');
    assert.equal(output(childRow?.ownUsage), '900');
    assert.equal(childRow?.parentKey, parentRow(initial)?.key);

    fixture.records.set(child.path, [C.user(), M.response('child'), M.response('new-child-response')]);
    const appended = await coordinator.refresh();
    assert.equal(output(parentRow(appended)?.combinedUsage), '2700');
    const unrelatedKey = initial.sessions.find(session => session.file.path === unrelated.path)?.identity.key;
    assert.ok(unrelatedKey);
    const unrelatedEstimate = initial.families.find(family => family.root.key === unrelatedKey)?.estimation;
    assert.ok(unrelatedEstimate);
    assert.equal(appended.families.find(family => family.root.key === unrelatedKey)?.estimation, unrelatedEstimate);
    assert.equal(output(parentRow(await coordinator.refresh())?.combinedUsage), '2700');

    fixture.sessions = [unrelated];
    fixture.orphans = [child];
    const orphan = summary(await coordinator.refresh()).find(row => row.agentId === 'child');
    assert.equal(orphan?.orphan, true);
    assert.equal(orphan.parentKey, null);
    assert.equal(orphan.key, childRow?.key);
    assert.equal(output(orphan.ownUsage), '1800');
    fixture.sessions = [parent, unrelated];
    fixture.orphans = [];
    const restored = await coordinator.refresh();
    assert.equal(output(parentRow(restored)?.combinedUsage), '2700');
    assert.equal(summary(restored).find(row => row.agentId === 'child')?.orphan, false);
});

test('snapshot projection keeps all summaries and serializes selected details, exact costs, unknowns and freshness', async () =>
{
    const fixture = new M();
    const file = fixture.file('project');
    const second = fixture.file('project', 'second');
    fixture.sessions = [file, second];
    fixture.records.set(file.path, [C.user(), M.response('known', 'claude-sonnet-5', 123), M.response('unknown')]);
    const coordinator = fixture.coordinator();
    const snapshot = await coordinator.refresh();
    const projection = new MonitoringSnapshotProjection(snapshot);
    const initial = projection.project({ expandedSessionKeys: [], explanationIds: [] });
    assert.equal(initial.sessions.length, 2);
    assert.deepEqual(initial.details, []);
    assert.deepEqual(initial.calculations, []);

    const row = initial.sessions.find(session => session.sessionId === 'parent');
    assert.ok(row?.ownUsage);
    assert.equal(output(row.ownUsage), '1023');
    assert.equal(row.ownUsage.cost.knownSubtotal, '0.00143');
    assert.ok(row.ownUsage.cost.unresolvedTermCount > 0);
    const selection = {
        expandedSessionKeys: [row.key, 'unknown-session'],
        explanationIds: [row.ownUsage.cost.explanationId, 'unknown-explanation']
    };
    const selected = projection.project(selection);
    assert.deepEqual(selected.sessions, initial.sessions);
    assert.equal(selected.generation, snapshot.generation);
    assert.equal(selected.details.length, 1);
    assert.equal(selected.details[0].sessionKey, row.key);
    assert.equal(selected.details[0].generation, row.generation);
    assert.equal(selected.calculations.length, 1);
    const graph = selected.calculations[0];
    assert.equal(graph.id, row.ownUsage.cost.explanationId);
    assert.ok(graph.nodes.some(node => node.unknown?.pricing?.model === 'synthetic-model'));
    assert.ok(graph.rates.some(rate => rate.model === 'claude-sonnet-5' && rate.assumptions.length > 0));
    const wire = JSON.stringify(selected);
    assert.deepEqual(JSON.parse(wire), selected);
    assert.ok(!wire.includes(C.secret));

    fixture.status = SessionDiscoveryStatus.Failed;
    const stale = new MonitoringSnapshotProjection(await coordinator.refresh()).project(selection);
    assert.equal(stale.freshness.stale, true);
    assert.equal(stale.freshness.lastSuccessfulAt, selected.freshness.lastSuccessfulAt);
    const retained = stale.sessions.find(session => session.key === row.key);
    assert.equal(retained?.freshness.stale, true);
    assert.deepEqual(retained?.ownUsage, row.ownUsage);
    fixture.status = SessionDiscoveryStatus.Complete;
    const recovered = new MonitoringSnapshotProjection(await coordinator.refresh()).project(selection);
    assert.equal(recovered.freshness.stale, false);
});
