import type { SessionDiscoveryStatus, SessionWarning } from '../../sessions/SessionDiscoveryViewModel';
import type { SessionFile } from './SessionFile';

/** Server-only discovery snapshot; file objects are converted before crossing a page boundary. */
export interface SessionDiscoveryResult
{
    status: SessionDiscoveryStatus;
    sessions: SessionFile[];
    orphanSubagents: SessionFile[];
    warnings: SessionWarning[];
}
