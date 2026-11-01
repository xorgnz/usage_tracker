# Session file access tests

Run `npm test` for the one-shot Node test suite. Run `npm run check` for the existing application Svelte/TypeScript checks.

The suite uses the existing TypeScript and Svelte compilers through a test-only Node loader. It does not install dependencies, start an application server, read `.env`, or access real Claude session files. Each filesystem test owns an isolated directory under the operating-system temporary directory and removes it afterward.

Filesystem coverage includes metadata, original project paths and fallback, sorting, parent/subagent association, nested and orphan agents, tolerant JSONL reading, incomplete tails, deletion, warnings, empty/failure states, and repeated discovery after changes. Permission failures and discovery races are injected deterministically through restored Node filesystem mocks; this does not verify operating-system ACL enforcement.

Page tests compile the real Svelte components for server rendering. A test-only compiler injection exposes the page's actual refresh closure, and a replacement for `$app/navigation` controls invalidation success and failure. These tests cover output and refresh state transitions without changing production components. They do not mount a browser DOM or test SvelteKit's network transport, focus behavior, or responsive layout. Interactive browser validation is recorded separately in task 5.
