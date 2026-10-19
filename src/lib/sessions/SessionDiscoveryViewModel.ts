/** Discovery can succeed with no files, return partial results, or fail at the source. */
export enum SessionDiscoveryStatus
{
    Complete = 'complete',
    Partial = 'partial',
    Failed = 'failed'
}

export enum SessionWarningCode
{
    DirectoryAccess = 'directory-access',
    FileAccess = 'file-access',
    MissingParent = 'missing-parent'
}

/** Safe diagnostic metadata; never contains conversation records. */
export interface SessionWarning
{
    code: SessionWarningCode;
    path: string;
    message: string;
}

/** Plain metadata contract for a file and its associated subagents. Dates are ISO strings. */
export interface SessionFileViewModel
{
    sessionId: string;
    agentId: string | null;
    parentSessionId: string | null;
    projectDirectory: string;
    filename: string;
    path: string;
    sizeBytes: number;
    createdAt: string;
    modifiedAt: string;
    subagents: SessionFileViewModel[];
}

/** Empty successful results remain distinguishable from partial results and source failure. */
export interface SessionDiscoveryViewModel
{
    status: SessionDiscoveryStatus;
    sessions: SessionFileViewModel[];
    orphanSubagents: SessionFileViewModel[];
    warnings: SessionWarning[];
}
