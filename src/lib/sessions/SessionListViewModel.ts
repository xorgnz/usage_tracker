import type { SessionDiscoveryStatus, SessionFileViewModel, SessionWarning } from './SessionDiscoveryViewModel';

/** Parent sessions grouped by their recorded project path or storage directory fallback. */
export interface SessionProjectViewModel
{
    projectPath: string;
    sessions: SessionFileViewModel[];
}

/** Plain page data; raw JSONL records remain on the server. */
export interface SessionListViewModel
{
    status: SessionDiscoveryStatus;
    empty: boolean;
    projects: SessionProjectViewModel[];
    orphanSubagents: SessionFileViewModel[];
    warnings: SessionWarning[];
}
