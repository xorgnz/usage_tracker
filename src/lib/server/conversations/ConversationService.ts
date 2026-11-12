import { SessionDiscoveryStatus, type SessionWarning } from '../../sessions/SessionDiscoveryViewModel';
import { SessionFileDAO } from '../sessions/SessionFileDAO';
import type { SessionFile } from '../sessions/SessionFile';
import { SessionJsonlReader } from '../sessions/SessionJsonlReader';
import { ConversationParser } from './ConversationParser';
import { ConversationRecord } from './ConversationRecord';
import { ConversationSource, type ConversationIdentity } from './ConversationSource';
import { ConversationSubagentLinker } from './ConversationSubagentLinker';
import { ConversationDiagnosticCode } from './ConversationDiagnostic';
import type { ConversationFileResult, ConversationLoadResult } from './ConversationLoadResult';

/** Coordinates fresh file access and independent parent/subagent parsing for server-side callers. */
export class ConversationService
{
    private readonly files: SessionFileDAO;
    private readonly reader: SessionJsonlReader;
    private readonly parser: ConversationParser;
    private readonly linker: ConversationSubagentLinker;

    constructor(claudeDirectory: string)
    {
        this.files = new SessionFileDAO(claudeDirectory);
        this.reader = new SessionJsonlReader();
        this.parser = new ConversationParser();
        this.linker = new ConversationSubagentLinker();
    }

    async load(): Promise<ConversationLoadResult>
    {
        const discovery = await this.files.discover();
        const warnings: SessionWarning[] = [...discovery.warnings];
        const conversations: ConversationFileResult[] = [];

        // Read failures are returned per file; a failed parent does not suppress its children.
        for (const file of discovery.sessions)
        {
            const parent = await this.read(file, false);
            conversations.push(parent);
            for (const childFile of file.subagents)
            {
                const child = await this.read(childFile, false);
                if (child.parsed !== null)
                {
                    const diagnostics = [...child.parsed.diagnostics];
                    const parentLink = parent.parsed === null
                        ? { parent: this.identity(file), toolInvocation: null }
                        : this.linker.link(parent.parsed.conversation, child.parsed.conversation, diagnostics);
                    conversations.push({
                        ...child,
                        parsed: { conversation: { ...child.parsed.conversation, parent: parentLink }, diagnostics }
                    });
                }
                else
                {
                    conversations.push(child);
                }
            }
        }
        for (const file of discovery.orphanSubagents)
        {
            conversations.push(await this.read(file, true));
        }
        for (const result of conversations)
        {
            warnings.push(...result.warnings);
            this.reportOrdering(result);
        }

        // Interpretation gaps do not masquerade as access failures or successful empty discovery.
        const status = discovery.status === SessionDiscoveryStatus.Failed
            ? SessionDiscoveryStatus.Failed
            : warnings.length > 0 ? SessionDiscoveryStatus.Partial : discovery.status;
        return { status, empty: status === SessionDiscoveryStatus.Complete && conversations.length === 0, conversations, warnings };
    }

    private async read(file: SessionFile, orphan: boolean): Promise<ConversationFileResult>
    {
        const read = await this.reader.read(file);
        const identity = this.identity(file);
        const records = read.records.map(record => new ConversationRecord(new ConversationSource(identity, record.lineNumber), record.value));
        return {
            file,
            parsed: read.failed ? null : this.parser.parse(identity, records),
            readFailed: read.failed,
            deferredTrailingRecord: read.deferredTrailingRecord,
            warnings: read.warnings,
            orphan
        };
    }

    private identity(file: SessionFile): ConversationIdentity
    {
        return { projectDirectory: file.projectDirectory, sessionId: file.sessionId, agentId: file.agentId, filePath: file.path };
    }

    private reportOrdering(result: ConversationFileResult): void
    {
        // Vite supplies DEV; direct Node execution defaults to silent. Never log raw content.
        if (import.meta.env?.DEV !== true || result.parsed === null)
        {
            return;
        }
        for (const diagnostic of result.parsed.diagnostics)
        {
            if (diagnostic.code === ConversationDiagnosticCode.TimestampOrderMismatch)
            {
                console.warn('Conversation timestamps differ from file order:', diagnostic.sources.map(source => ({
                    path: source.conversation.filePath,
                    lineNumber: source.lineNumber
                })));
            }
        }
    }
}
