import assert from 'node:assert/strict';
import { test } from 'node:test';
import { render } from 'svelte/server';
import Page from '../src/routes/+page.svelte';
import { SessionListService } from '../src/lib/server/sessions/SessionListService';
import { SessionDiscoveryStatus } from '../src/lib/sessions/SessionDiscoveryViewModel';
import type { SessionListViewModel } from '../src/lib/sessions/SessionListViewModel';
import { SessionFixture } from './support/SessionFixture';
import { RefreshHarness } from './support/RefreshHarness';

interface RefreshController
{
    refresh(): Promise<void>;
    readonly refreshing: boolean;
    readonly refreshIssue: string | null;
}

/** Renders the actual page with a service snapshot and captures its test-only refresh closure. */
class SessionPageHarness
{
    static render(sessionList: SessionListViewModel): string
    {
        return render(Page, { props: { data: { sessionList } } }).body;
    }

    static controller(): RefreshController
    {
        return Reflect.get(globalThis, Symbol.for('usage-tracker.refresh'));
    }
}

test('page renders grouped metadata and subagents under the parent without exposing transcript content', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    const parent = await fixture.write('project', 'parent.jsonl', '{"cwd":"/work/project","secret":"never render this"}\n');
    await fixture.write('project', 'parent/subagents/agent-child.jsonl');
    const list = await new SessionListService(fixture.root).load();
    const html = SessionPageHarness.render(list);
    assert.ok(html.includes('/work/project'));
    assert.ok(html.includes('parent.jsonl'));
    assert.ok(html.includes('Subagents'));
    assert.ok(html.includes('agent-child.jsonl'));
    assert.ok(html.indexOf('parent.jsonl') < html.indexOf('Subagents'));
    assert.ok(html.indexOf('Subagents') < html.indexOf('agent-child.jsonl'));
    assert.ok(html.includes('Created') && html.includes('Modified') && html.includes('bytes'));
    assert.ok(html.includes(list.projects[0].sessions[0].modifiedAt));
    assert.ok(html.includes(parent));
    assert.ok(!html.includes('never render this'));
    assert.ok(html.includes('aria-busy="false"'));
    assert.ok(html.includes('role="status"'));
});

test('page distinguishes empty, failed and partial discovery and renders warning file and line context', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    const service = new SessionListService(fixture.root);
    const empty = SessionPageHarness.render(await service.load());
    assert.ok(empty.includes('No session files were found'));
    assert.ok(!empty.includes('Session discovery failed'));
    await fixture.write('project', 'broken.jsonl', '{"cwd":"/work"}\nmalformed\n');
    const partial = SessionPageHarness.render(await service.load());
    assert.ok(partial.includes('Session warnings'));
    assert.ok(partial.includes('broken.jsonl'));
    assert.ok(partial.includes('line 2'));
    assert.ok(partial.includes('Skipping malformed JSONL record'));
    assert.ok(!partial.includes('â€'));
    await fixture.remove(fixture.root + '/projects');
    const failed = SessionPageHarness.render(await service.load());
    assert.ok(failed.includes('Session discovery failed'));
    assert.ok(!failed.includes('No session files were found'));
    const partialEmpty: SessionListViewModel = {
        status: SessionDiscoveryStatus.Partial,
        empty: false,
        projects: [],
        orphanSubagents: [],
        warnings: []
    };
    assert.ok(SessionPageHarness.render(partialEmpty).includes('Discovery was incomplete'));
});

test('refresh handler prevents overlap, clears pending state on success/failure, and permits recovery', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    SessionPageHarness.render(await new SessionListService(fixture.root).load());
    const controller = SessionPageHarness.controller();
    const initialCalls = RefreshHarness.calls;
    const pending = controller.refresh();
    assert.equal(controller.refreshing, true);
    assert.equal(controller.refreshIssue, null);
    await controller.refresh();
    assert.equal(RefreshHarness.calls, initialCalls + 1);
    RefreshHarness.succeed();
    await pending;
    assert.equal(controller.refreshing, false);
    const failed = controller.refresh();
    RefreshHarness.fail();
    await failed;
    assert.equal(controller.refreshing, false);
    assert.equal(controller.refreshIssue, 'Could not refresh sessions. Please try again.');
    const retry = controller.refresh();
    assert.equal(controller.refreshIssue, null);
    assert.equal(controller.refreshing, true);
    RefreshHarness.succeed();
    await retry;
    assert.equal(controller.refreshing, false);
    assert.equal(controller.refreshIssue, null);
});

test('fresh service snapshots render added, changed and removed sessions', async context =>
{
    const fixture = await SessionFixture.create();
    context.after(() => fixture.dispose());
    const service = new SessionListService(fixture.root);
    assert.ok(SessionPageHarness.render(await service.load()).includes('No session files were found'));
    const path = await fixture.write('project', 'new.jsonl');
    assert.ok(SessionPageHarness.render(await service.load()).includes('new.jsonl'));
    await fixture.write('project', 'new.jsonl', '{"cwd":"/changed/project"}\n');
    await fixture.modified(path, '2025-06-01T00:00:00.000Z');
    const changed = SessionPageHarness.render(await service.load());
    assert.ok(changed.includes('/changed/project'));
    assert.ok(changed.includes('2025-06-01T00:00:00.000Z'));
    await fixture.remove(path);
    const removed = SessionPageHarness.render(await service.load());
    assert.ok(!removed.includes('new.jsonl'));
    assert.ok(removed.includes('No session files were found'));
});
