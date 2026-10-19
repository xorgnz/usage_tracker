import { constants, type Dirent } from 'node:fs';
import { access, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { SessionDiscoveryStatus, SessionWarningCode, type SessionWarning } from '../../sessions/SessionDiscoveryViewModel';
import type { SessionDiscoveryResult } from './SessionDiscoveryResult';
import { SessionFile } from './SessionFile';

/** Discovers file metadata beneath the configured Claude directory without reading conversations. */
export class SessionFileDAO
{
    private readonly projectsDirectory: string;

    constructor(claudeDirectory: string)
    {
        this.projectsDirectory = join(claudeDirectory, 'projects');
    }

    async discover(): Promise<SessionDiscoveryResult>
    {
        // Failure at the source is distinct from an accessible directory containing no sessions.
        const warnings: SessionWarning[] = [];
        const projects = await this.readDirectory(this.projectsDirectory, warnings);
        const sessions: SessionFile[] = [];
        const orphanSubagents: SessionFile[] = [];

        if (projects === null)
        {
            return { status: SessionDiscoveryStatus.Failed, sessions, orphanSubagents, warnings };
        }

        // Keep failures local to a project so other projects can still be discovered.
        for (const project of projects)
        {
            if (project.isDirectory())
            {
                await this.discoverProject(join(this.projectsDirectory, project.name), sessions, orphanSubagents, warnings);
            }
        }

        const status = warnings.length === 0 ? SessionDiscoveryStatus.Complete : SessionDiscoveryStatus.Partial;
        return { status, sessions, orphanSubagents, warnings };
    }

    private async discoverProject(
        projectDirectory: string,
        sessions: SessionFile[],
        orphanSubagents: SessionFile[],
        warnings: SessionWarning[]
    ): Promise<void>
    {
        const entries = await this.readDirectory(projectDirectory, warnings);

        if (entries === null)
        {
            return;
        }

        // Parent IDs come from filenames; identical IDs in different projects remain independent.
        const parents = new Map<string, SessionFile>();

        for (const entry of entries)
        {
            if (entry.isFile() && entry.name.endsWith('.jsonl'))
            {
                const sessionId = entry.name.slice(0, -6);
                const session = await this.readMetadata(projectDirectory, projectDirectory, entry.name, sessionId, null, warnings);

                if (session !== null)
                {
                    parents.set(sessionId, session);
                    sessions.push(session);
                }
            }
        }

        // Scan session sidecar directories even when the parent file is missing or unreadable.
        for (const entry of entries)
        {
            if (!entry.isDirectory())
            {
                continue;
            }

            const subagentsDirectory = join(projectDirectory, entry.name, 'subagents');
            const subagents = await this.discoverSubagents(subagentsDirectory, projectDirectory, entry.name, warnings, true);
            const parent = parents.get(entry.name);

            for (const subagent of subagents)
            {
                if (parent !== undefined)
                {
                    parent.addSubagent(subagent);
                }
                else
                {
                    orphanSubagents.push(subagent);
                    warnings.push({
                        code: SessionWarningCode.MissingParent,
                        path: subagent.path,
                        message: `Parent session ${entry.name} is missing or unreadable; retaining the subagent metadata.`
                    });
                }
            }
        }
    }

    private async discoverSubagents(
        directory: string,
        projectDirectory: string,
        parentSessionId: string,
        warnings: SessionWarning[],
        optional: boolean
    ): Promise<SessionFile[]>
    {
        const entries = await this.readDirectory(directory, warnings, optional);
        const subagents: SessionFile[] = [];

        if (entries === null)
        {
            return subagents;
        }

        // Include nested subagent directories without following directory symlinks.
        for (const entry of entries)
        {
            if (entry.isDirectory())
            {
                subagents.push(...await this.discoverSubagents(join(directory, entry.name), projectDirectory, parentSessionId, warnings, false));
            }
            else if (entry.isFile() && entry.name.startsWith('agent-') && entry.name.endsWith('.jsonl'))
            {
                const agentId = entry.name.slice(6, -6);
                const subagent = await this.readMetadata(projectDirectory, directory, entry.name, parentSessionId, agentId, warnings);

                if (subagent !== null)
                {
                    subagents.push(subagent);
                }
            }
        }

        return subagents;
    }

    private async readMetadata(
        projectDirectory: string,
        directory: string,
        filename: string,
        sessionId: string,
        agentId: string | null,
        warnings: SessionWarning[]
    ): Promise<SessionFile | null>
    {
        const path = join(directory, filename);

        // Files can disappear or become inaccessible after directory enumeration.
        try
        {
            const metadata = await stat(path);

            if (!metadata.isFile())
            {
                throw new Error('Path is no longer a regular file.');
            }

            await access(path, constants.R_OK);
            return new SessionFile({
                sessionId,
                agentId,
                parentSessionId: agentId === null ? null : sessionId,
                projectDirectory,
                filename,
                path,
                sizeBytes: metadata.size,
                createdAt: metadata.birthtime,
                modifiedAt: metadata.mtime
            });
        }
        catch (error)
        {
            warnings.push({ code: SessionWarningCode.FileAccess, path, message: this.describeError('Cannot inspect session file', error) });
            return null;
        }
    }

    private async readDirectory(directory: string, warnings: SessionWarning[], optional = false): Promise<Dirent[] | null>
    {
        try
        {
            return await readdir(directory, { withFileTypes: true });
        }
        catch (error)
        {
            // Most parent sessions have no subagents directory; its absence is expected.
            if (!(optional && error instanceof Error && 'code' in error && error.code === 'ENOENT'))
            {
                warnings.push({
                    code: SessionWarningCode.DirectoryAccess,
                    path: directory,
                    message: this.describeError('Cannot list session directory', error)
                });
            }

            return null;
        }
    }

    private describeError(action: string, error: unknown): string
    {
        const detail = error instanceof Error ? error.message : 'Unknown filesystem error';
        return `${action}: ${detail}`;
    }
}
