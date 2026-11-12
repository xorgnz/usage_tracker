# Session and conversation tests

Run `npm test` for the one-shot Node test suite. Run `npm run check` for the existing application Svelte/TypeScript checks.

The suite uses the existing TypeScript and Svelte compilers through a test-only Node loader. It does not install dependencies, start an application server, read `.env`, or access real Claude session files. Each filesystem test owns an isolated directory under the operating-system temporary directory and removes it afterward.

Filesystem coverage includes metadata, original project paths and fallback, sorting, parent/subagent association, nested and orphan agents, tolerant JSONL reading, incomplete tails, deletion, warnings, empty/failure states, and repeated discovery after changes. Permission failures and discovery races are injected deterministically through restored Node filesystem mocks; this does not verify operating-system ACL enforcement.

Page tests compile the real Svelte components for server rendering. A test-only compiler injection exposes the page's actual refresh closure, and a replacement for `$app/navigation` controls invalidation success and failure. These tests cover output and refresh state transitions without changing production components. They do not mount a browser DOM or test SvelteKit's network transport, focus behavior, or responsive layout. Interactive browser validation is recorded separately in task 5.

Conversation parser tests use synthetic in-memory records through ConversationFixture. They cover turn origins, content blocks, system events, timestamp ordering and missing-date slots, raw JSON retention, usage metadata, ambiguous/missing relationships, and incomplete/interrupted activity. They do not calculate token totals or costs.

Conversation service tests reuse SessionFixture for isolated files. They cover independent parent/subagent results, invocation evidence and fallback, project isolation, orphan membership, empty/failed reads, malformed-record warnings, incomplete-tail completion, fresh loads, and deletion between discovery and reading. Read denial is injected and restored; operating-system ACL enforcement is not exercised.

ConversationServiceHarness transpiles the actual service source in memory, substitutes only the Vite development constant, and resolves production imports through the existing loader. Console tests verify warnings with development true, silence with development false and direct Node execution, and exclusion of transcript/model payloads. The harness does not verify Vite's own flag injection or run an application server. Test type checking includes vite/client declarations because the service references import.meta.env.

These suites currently run on native Windows. WSL execution and interactive browser validation are separate from this automated coverage.
