import { ApplicationConfig } from '../lib/server/config/ApplicationConfig';
import { SessionListService } from '../lib/server/sessions/SessionListService';
import type { PageServerLoad } from './$types';

/** Re-evaluates configuration and session files on every initial load or invalidation. */
export const load: PageServerLoad = async () =>
{
    const configuration = await ApplicationConfig.load(process.cwd());
    const sessionList = await new SessionListService(configuration.claudeDirectory).load();

    return {
        claudeDirectoryAvailable: configuration.claudeDirectoryAvailable,
        claudeDirectoryIssue: configuration.claudeDirectoryIssue,
        sessionList
    };
};
