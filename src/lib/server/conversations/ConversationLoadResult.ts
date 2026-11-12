import type { SessionDiscoveryStatus, SessionWarning } from '../../sessions/SessionDiscoveryViewModel';
import type { SessionFile } from '../sessions/SessionFile';
import type { ConversationParseResult } from './Conversation';

/** A current file read, keeping failed reads distinct from empty parsed conversations. */
export interface ConversationFileResult
{
    readonly file: SessionFile;
    readonly parsed: ConversationParseResult | null;
    readonly readFailed: boolean;
    readonly deferredTrailingRecord: boolean;
    readonly warnings: readonly SessionWarning[];
    readonly orphan: boolean;
}

/** Access status and warnings are separate from per-conversation interpretation diagnostics. */
export interface ConversationLoadResult
{
    readonly status: SessionDiscoveryStatus;
    readonly empty: boolean;
    readonly conversations: readonly ConversationFileResult[];
    readonly warnings: readonly SessionWarning[];
}
