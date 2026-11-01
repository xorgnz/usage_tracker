import { mkdtemp, mkdir, writeFile, rm, utimes } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, isAbsolute } from 'node:path';
import { SessionFileDAO } from '../../src/lib/server/sessions/SessionFileDAO';
import type { SessionFile } from '../../src/lib/server/sessions/SessionFile';

/** Owns disposable session files and prevents fixture operations outside its temporary root. */
export class SessionFixture
{
    readonly root: string;

    private constructor(root: string)
    {
        this.root = root;
    }

    static async create(): Promise<SessionFixture>
    {
        const fixture = new SessionFixture(await mkdtemp(join(tmpdir(), 'usage-tracker-test-')));
        await mkdir(join(fixture.root, 'projects'));
        return fixture;
    }

    async write(project: string, filename: string, content = '{"cwd":"/work/example"}\n'): Promise<string>
    {
        const path = this.inside(join('projects', project, filename));
        await mkdir(join(path, '..'), { recursive: true });
        await writeFile(path, content, 'utf8');
        return path;
    }

    async session(project: string, id: string, content?: string): Promise<SessionFile>
    {
        const path = await this.write(project, `${id}.jsonl`, content);
        const discovery = await new SessionFileDAO(this.root).discover();
        const session = discovery.sessions.find(item => item.path === path);

        if (session === undefined)
        {
            throw new Error(`Fixture session was not discovered: ${path}`);
        }

        return session;
    }

    async modified(path: string, date: string): Promise<void>
    {
        const checked = this.inside(relative(this.root, path));
        await utimes(checked, new Date(date), new Date(date));
    }

    async remove(path: string): Promise<void>
    {
        await rm(this.inside(relative(this.root, path)), { recursive: true, force: true });
    }

    async dispose(): Promise<void>
    {
        // Only roots created by this fixture factory can reach this cleanup operation.
        await rm(this.root, { recursive: true, force: true });
    }

    private inside(path: string): string
    {
        const candidate = join(this.root, path);
        const child = relative(this.root, candidate);

        if (child.length === 0 || child.startsWith('..') || isAbsolute(child))
        {
            throw new Error('Fixture path must stay beneath its temporary root.');
        }

        return candidate;
    }
}
