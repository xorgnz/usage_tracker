import { ApplicationConfig } from '../lib/server/config/ApplicationConfig';
import { MonitoringCoordinator } from '../lib/server/monitoring/MonitoringCoordinator';
import { MonitoringSnapshotProjection } from '../lib/server/monitoring/MonitoringSnapshotProjection';
import type { PageServerLoad } from './$types';

/** Initial page data and refresh requests use the same coordinator for the configured source. */
export const load: PageServerLoad = async () =>
{
    const configuration = await ApplicationConfig.load(process.cwd());
    const snapshot = await MonitoringCoordinator.forSource(configuration.claudeDirectory).refresh();
    const projection = new MonitoringSnapshotProjection(snapshot);

    return {
        claudeDirectoryAvailable: configuration.claudeDirectoryAvailable,
        claudeDirectoryIssue: configuration.claudeDirectoryIssue,
        sessionList: projection.sessionList(),
        monitoring: projection.project({ expandedSessionKeys: [], explanationIds: [] })
    };
};
