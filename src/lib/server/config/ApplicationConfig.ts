import { constants } from 'node:fs';
import { access, readFile, stat } from 'node:fs/promises';
import { userInfo } from 'node:os';
import { resolve } from 'node:path';
import { parseEnv } from 'node:util';

export class ApplicationConfig
{
    readonly port: number;
    readonly claudeDirectory: string;
    readonly claudeDirectoryAvailable: boolean;
    readonly claudeDirectoryIssue: string | null;

    /** Creates a configuration snapshot from validated settings and directory availability. */
    private constructor(port: number, claudeDirectory: string, claudeDirectoryAvailable: boolean, claudeDirectoryIssue: string | null)
    {
        this.port = port;
        this.claudeDirectory = claudeDirectory;
        this.claudeDirectoryAvailable = claudeDirectoryAvailable;
        this.claudeDirectoryIssue = claudeDirectoryIssue;
    }

    /** Loads a validated configuration snapshot from the project .env file and the source directory's current accessibility. */
    static async load(projectRoot: string): Promise<ApplicationConfig>
    {
        // Read file values directly; never merge application settings from process.env.
        const root = resolve(projectRoot);
        const environmentFile = resolve(root, '.env');
        let content = '';

        try
        {
            content = await readFile(environmentFile, 'utf8');
        }
        catch (error)
        {
            if (!ApplicationConfig.hasErrorCode(error, 'ENOENT'))
            {
                throw new Error(`Cannot read configuration file ${environmentFile}. Check that it is a readable file.`, { cause: error });
            }
        }

        const settings = parseEnv(content);
        const port = ApplicationConfig.resolvePort(settings.PORT);
        const claudeDirectory = ApplicationConfig.resolveClaudeDirectory(settings.CLAUDE_DIRECTORY, root);

        // Check the directory itself without listing or opening any session files.
        try
        {
            const directory = await stat(claudeDirectory);

            if (!directory.isDirectory())
            {
                return new ApplicationConfig(port, claudeDirectory, false, `Claude Code path is not a directory: ${claudeDirectory}`);
            }

            await access(claudeDirectory, constants.R_OK | constants.X_OK);
            return new ApplicationConfig(port, claudeDirectory, true, null);
        }
        catch (error)
        {
            if (ApplicationConfig.hasErrorCode(error, 'ENOENT') || ApplicationConfig.hasErrorCode(error, 'ENOTDIR'))
            {
                return new ApplicationConfig(port, claudeDirectory, false, `Claude Code directory does not exist: ${claudeDirectory}`);
            }

            if (ApplicationConfig.hasErrorCode(error, 'EACCES') || ApplicationConfig.hasErrorCode(error, 'EPERM'))
            {
                return new ApplicationConfig(port, claudeDirectory, false, `Claude Code directory is not accessible: ${claudeDirectory}`);
            }

            throw new Error(`Cannot inspect Claude Code directory ${claudeDirectory}. Check the path and filesystem.`, { cause: error });
        }
    }

    /** Returns the default port when omitted or validates and converts the supplied port. */
    private static resolvePort(value: string | undefined): number
    {
        // An omitted setting uses a default; an explicitly invalid value is an error.
        if (value === undefined)
        {
            return 5173;
        }

        if (!/^[0-9]+$/.test(value))
        {
            throw new Error('Invalid PORT in .env. Use a whole number from 1 through 65535, or omit PORT to use 5173.');
        }

        const port = Number(value);

        if (!Number.isInteger(port) || port < 1 || port > 65535)
        {
            throw new Error('Invalid PORT in .env. Use a whole number from 1 through 65535, or omit PORT to use 5173.');
        }

        return port;
    }

    /** Resolves a directory setting using the host platform, project root, or current account home. */
    private static resolveClaudeDirectory(value: string | undefined, projectRoot: string): string
    {
        // Use the operating-system account home, independent of an exported HOME override.
        const directory = value ?? '~/.claude';

        if (directory.trim().length === 0 || directory.includes('\0'))
        {
            throw new Error('Invalid CLAUDE_DIRECTORY in .env. Use a non-empty directory path, or omit it to use ~/.claude.');
        }

        if (directory === '~' || directory.startsWith('~/'))
        {
            return resolve(userInfo().homedir, directory === '~' ? '.' : directory.slice(2));
        }

        if (directory.startsWith('~'))
        {
            throw new Error('Invalid CLAUDE_DIRECTORY in .env. Only ~ or ~/ can reference the current user home; ~username is not supported.');
        }

        return resolve(projectRoot, directory);
    }

    /** Reports whether an Error carries the specified filesystem error code. */
    private static hasErrorCode(error: unknown, code: string): boolean
    {
        return error instanceof Error && 'code' in error && error.code === code;
    }
}
