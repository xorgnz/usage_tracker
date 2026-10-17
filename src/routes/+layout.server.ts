import { ApplicationConfig } from '../lib/server/config/ApplicationConfig';
import type { LayoutServerLoad } from './$types';

/** Returns the source directory's availability for the shared application shell. */
export const load: LayoutServerLoad = async () =>
{
    const configuration = await ApplicationConfig.load(process.cwd());

    return {
        claudeDirectoryAvailable: configuration.claudeDirectoryAvailable,
        claudeDirectoryIssue: configuration.claudeDirectoryIssue
    };
};
