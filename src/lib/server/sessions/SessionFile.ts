import type { SessionFileViewModel } from '../../sessions/SessionDiscoveryViewModel';

export interface SessionFileFields
{
    sessionId: string;
    agentId: string | null;
    parentSessionId: string | null;
    projectDirectory: string;
    filename: string;
    path: string;
    sizeBytes: number;
    createdAt: Date;
    modifiedAt: Date;
}

/** A discovered file snapshot, with subagent membership owned by its parent session. */
export class SessionFile
{
    readonly sessionId: string;
    readonly agentId: string | null;
    readonly parentSessionId: string | null;
    readonly projectDirectory: string;
    readonly filename: string;
    readonly path: string;
    readonly sizeBytes: number;
    readonly createdAt: Date;
    readonly modifiedAt: Date;
    private readonly children: SessionFile[];

    constructor(fields: SessionFileFields)
    {
        this.sessionId = fields.sessionId;
        this.agentId = fields.agentId;
        this.parentSessionId = fields.parentSessionId;
        this.projectDirectory = fields.projectDirectory;
        this.filename = fields.filename;
        this.path = fields.path;
        this.sizeBytes = fields.sizeBytes;
        this.createdAt = fields.createdAt;
        this.modifiedAt = fields.modifiedAt;
        this.children = [];
    }

    get subagents(): readonly SessionFile[]
    {
        return this.children;
    }

    /** Only attach files belonging to this parent in this project. */
    addSubagent(subagent: SessionFile): void
    {
        if (this.agentId !== null || subagent.agentId === null || subagent.parentSessionId !== this.sessionId
            || subagent.projectDirectory !== this.projectDirectory)
        {
            throw new Error('Subagent does not belong to this parent session.');
        }

        this.children.push(subagent);
    }

    /** Explicitly project runtime file metadata into the plain UI contract. */
    toViewModel(): SessionFileViewModel
    {
        return {
            sessionId: this.sessionId,
            agentId: this.agentId,
            parentSessionId: this.parentSessionId,
            projectDirectory: this.projectDirectory,
            filename: this.filename,
            path: this.path,
            sizeBytes: this.sizeBytes,
            createdAt: this.createdAt.toISOString(),
            modifiedAt: this.modifiedAt.toISOString(),
            subagents: this.children.map(child => child.toViewModel())
        };
    }
}
