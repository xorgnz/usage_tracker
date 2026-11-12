import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import ts from 'typescript';
import type { ConversationService } from '../../src/lib/server/conversations/ConversationService';

interface ConversationServiceModule
{
    ConversationService: typeof ConversationService;
}

/** Substitutes only the Vite development constant, preserving actual service behavior and imports. */
export class ConversationServiceHarness
{
    static async load(development: boolean): Promise<typeof ConversationService>
    {
        const url = new URL('../../src/lib/server/conversations/ConversationService.ts', import.meta.url);
        const original = await readFile(url, 'utf8');
        assert.equal(original.split('import.meta.env?.DEV').length, 2, 'Harness requires exactly one development gate.');
        const source = original.replace('import.meta.env?.DEV', String(development)).replace(/from '([^']+)'/g, (match: string, specifier: string) =>
        {
            // Data modules need absolute URLs for their production dependencies.
            return specifier.startsWith('.') ? `from '${pathToFileURL(resolve(dirname(fileURLToPath(url)), `${specifier}.ts`)).href}'` : match;
        });
        const result = ts.transpileModule(source, {
            compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
        });
        const module: ConversationServiceModule = await import(`data:text/javascript;base64,${Buffer.from(result.outputText).toString('base64')}`);
        return module.ConversationService;
    }
}
