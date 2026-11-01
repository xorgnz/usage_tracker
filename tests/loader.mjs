import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { compile } from 'svelte/compiler';

export async function resolve(specifier, context, nextResolve)
{
    if (specifier === '$app/navigation')
    {
        return nextResolve(new URL('./support/RefreshHarness.ts', import.meta.url).href, context);
    }

    try
    {
        return await nextResolve(specifier, context);
    }
    catch (error)
    {
        if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier))
        {
            return nextResolve(`${specifier}.ts`, context);
        }

        throw error;
    }
}

export async function load(url, context, nextLoad)
{
    if (url.endsWith('.ts'))
    {
        const source = await readFile(new URL(url), 'utf8');
        const result = ts.transpileModule(source, {
            compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, verbatimModuleSyntax: true },
            fileName: fileURLToPath(url)
        });
        return { format: 'module', source: result.outputText, shortCircuit: true };
    }

    if (url.endsWith('.svelte'))
    {
        let source = await readFile(new URL(url), 'utf8');

        // Expose the actual component closure only in tests; production source remains unchanged.
        if (url.endsWith('/routes/+page.svelte'))
        {
            source = source.replace('</script>', `
                globalThis[Symbol.for('usage-tracker.refresh')] = {
                    refresh,
                    get refreshing() { return refreshing; },
                    get refreshIssue() { return refreshIssue; }
                };
            </script>`);
        }

        const result = compile(source, { filename: fileURLToPath(url), generate: 'server' });
        return { format: 'module', source: result.js.code, shortCircuit: true };
    }

    return nextLoad(url, context);
}
