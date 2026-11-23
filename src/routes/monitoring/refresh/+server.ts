import { error, json } from '@sveltejs/kit';
import type { MonitoringSelection } from '../../../lib/monitoring/MonitoringViewModel';
import { ApplicationConfig } from '../../../lib/server/config/ApplicationConfig';
import { MonitoringCoordinator } from '../../../lib/server/monitoring/MonitoringCoordinator';
import { MonitoringSnapshotProjection } from '../../../lib/server/monitoring/MonitoringSnapshotProjection';
import type { RequestHandler } from './$types';

function readKeys(values: unknown, pattern: RegExp): string[]
{
    if (!Array.isArray(values) || values.length > 2000 || !values.every(value => typeof value === 'string' && pattern.test(value)))
    {
        error(400, 'Invalid monitoring selection.');
    }
    return [...new Set(values)];
}

async function readSelection(request: Request): Promise<MonitoringSelection>
{
    const body: unknown = await request.json().catch(() => null);
    if (typeof body !== 'object' || body === null || !('expandedSessionKeys' in body) || !('explanationIds' in body))
    {
        error(400, 'Expected expanded session keys and calculation explanation IDs.');
    }

    return {
        expandedSessionKeys: readKeys(body.expandedSessionKeys, /^[A-Za-z0-9_-]{43}$/u),
        explanationIds: readKeys(body.explanationIds, /^[A-Za-z0-9_-]{43}\.(?:own|including-subagents)\.[a-z-]{1,24}$/u)
    };
}

export const POST: RequestHandler = async ({ request }) =>
{
    const selection = await readSelection(request);
    const configuration = await ApplicationConfig.load(process.cwd());
    const snapshot = await MonitoringCoordinator.forSource(configuration.claudeDirectory).refresh();
    const monitoring = new MonitoringSnapshotProjection(snapshot).project(selection);
    return json(monitoring, { headers: { 'cache-control': 'no-store' } });
};
