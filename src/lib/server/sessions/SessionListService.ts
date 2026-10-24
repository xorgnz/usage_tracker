import { basename } from 'node:path';
import { SessionDiscoveryStatus, type SessionFileViewModel, type SessionWarning } from '../../sessions/SessionDiscoveryViewModel';
import type { SessionListViewModel, SessionProjectViewModel } from '../../sessions/SessionListViewModel';
import type { SessionFile } from './SessionFile';
import { SessionFileDAO } from './SessionFileDAO';
import { SessionJsonlReader } from './SessionJsonlReader';

/** Coordinates current file discovery and metadata-only project grouping. */
export class SessionListService
{
    private readonly files: SessionFileDAO;
    private readonly reader: SessionJsonlReader;

    constructor(claudeDirectory: string)
    {
        this.files = new SessionFileDAO(claudeDirectory);
        this.reader = new SessionJsonlReader();
    }

    async load(): Promise<SessionListViewModel>
    {
        const discovery = await this.files.discover();
        const warnings = [...discovery.warnings];
        const projects = new Map<string, SessionProjectViewModel>();

        // Only inspect top-level cwd metadata; conversation content has no role in grouping.
        for (const session of discovery.sessions)
        {
            const projectPath = await this.readProjectPath(session, warnings) ?? basename(session.projectDirectory);
            const metadata = session.toViewModel();
            await this.readSubagents(session, warnings);
            this.sortSessions(metadata.subagents);
            let project = projects.get(projectPath);

            if (project === undefined)
            {
                project = { projectPath, sessions: [] };
                projects.set(projectPath, project);
            }

            project.sessions.push(metadata);
        }

        // Retain unassociated metadata and surface record failures for these files too.
        for (const subagent of discovery.orphanSubagents)
        {
            await this.readProjectPath(subagent, warnings);
        }

        const groupedProjects = [...projects.values()].sort((left, right) => left.projectPath.localeCompare(right.projectPath));
        const orphanSubagents = discovery.orphanSubagents.map(session => session.toViewModel());

        for (const project of groupedProjects)
        {
            this.sortSessions(project.sessions);
        }

        this.sortSessions(orphanSubagents);
        const status = discovery.status === SessionDiscoveryStatus.Failed
            ? SessionDiscoveryStatus.Failed
            : warnings.length > 0 ? SessionDiscoveryStatus.Partial : SessionDiscoveryStatus.Complete;

        return {
            status,
            empty: status === SessionDiscoveryStatus.Complete && groupedProjects.length === 0 && orphanSubagents.length === 0,
            projects: groupedProjects,
            orphanSubagents,
            warnings
        };
    }

    private async readProjectPath(session: SessionFile, warnings: SessionWarning[]): Promise<string | null>
    {
        const result = await this.reader.read(session);
        warnings.push(...result.warnings);

        // Reading the complete file also collects malformed-record warnings after the first cwd.
        for (const record of result.records)
        {
            const value = record.value;

            if (typeof value === 'object' && value !== null && 'cwd' in value && typeof value.cwd === 'string' && value.cwd.trim().length > 0)
            {
                return value.cwd;
            }
        }

        return null;
    }

    private async readSubagents(session: SessionFile, warnings: SessionWarning[]): Promise<void>
    {
        // Subagents stay beneath their parent regardless of their own recorded working directory.
        for (const subagent of session.subagents)
        {
            await this.readProjectPath(subagent, warnings);
        }
    }

    private sortSessions(sessions: SessionFileViewModel[]): void
    {
        // ISO timestamps preserve chronological order; paths provide a stable tie-breaker.
        sessions.sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt) || left.path.localeCompare(right.path));
    }
}
