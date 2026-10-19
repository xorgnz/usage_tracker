# Tasks: Session File Access

## Implementation Context

- Source: `02-session-file-access-prd.md`.
- Use the existing Node.js (`TC1`), strict TypeScript (`TC2`), and SvelteKit (`TC3`) stack; no additional dependencies are required.
- Preserve the approved single foreground application server inside WSL.
- Keep filesystem operations and JSONL records server-only. Keep the page loader focused on configuration, calling the session-access code, and returning plain serializable metadata and warnings.
- Use focused classes in a server-only sessions module for file access and list coordination. This is local organization within the existing SvelteKit application, without additional processes or services.
- Use the existing ApplicationConfig as the source of the local Claude directory. Do not introduce uploads, source selection in the UI, or new source-path settings.
- Automatic monitoring, configurable sorting, conversation interpretation, raw-record viewing, token accounting, cost estimation, and persistent ingestion remain out of scope.

## Relevant Files

- `src/lib/server/config/ApplicationConfig.ts` - Existing local directory configuration and availability checks.
- `src/routes/+layout.server.ts` - Existing shell availability data; preserve its role and avoid putting discovery here.
- `src/routes/+page.svelte` - Monitoring shell to receive the grouped session list and manual refresh control.
- `src/routes/+page.server.ts` - New page loader for initial loading and refresh requests.
- `src/lib/server/sessions/` - New cohesive server-only session discovery, JSONL reading, and list coordination code.
- `src/lib/` - Named metadata/view contracts only where shared by server and UI; no filesystem implementation or raw session records.
- `package.json` - Existing `npm run check` validation command. No existing test files were found.

## Tasks

- [ ] 1 - Establish local session-access models and file discovery
  - [ ] 1.1 - Inspect the available session layout and documented file metadata to determine parent/subagent locations and project-path extraction. Keep inspection limited to what this feature needs; do not infer project paths by reversing encoded directory names.
  - [ ] 1.2 - Define named session metadata, warning, and discovery-result concepts, distinguishing server-side objects from the serializable UI contract. Represent successful empty discovery separately from discovery failure.
  - [ ] 1.3 - Implement server-only discovery under the existing configured Claude directory, collecting all parent and subagent session files with filenames, paths, timestamps, and sizes.
  - [ ] 1.4 - Associate subagents with their parent session and isolate directory/file access failures so unaffected results remain available with warnings. Handle files disappearing during discovery.

- [ ] 2 - Implement tolerant JSONL reading
  - [ ] 2.1 - Give complete-record reading a focused server-only owner, exposing records internally without interpreting conversation messages or sending raw records to the browser.
  - [ ] 2.2 - Read complete JSONL records while files change, deferring an incomplete trailing record until a later read. Skip malformed complete records with warnings and retain valid records.
  - [ ] 2.3 - Handle unreadable or disappearing files without blocking other sessions. Include enough file and record context in warnings to identify the problem.

- [ ] 3 - Coordinate the session list and page loading
  - [ ] 3.1 - Coordinate discovery and the minimal record access needed to resolve original project paths and report record warnings. Use the storage directory name when the project path cannot be determined; keep conversation interpretation out of this code.
  - [ ] 3.2 - Group parent sessions by project path, sort them by file modification time newest first, and retain subagents beneath their parent. Keep grouping and sorting out of the Svelte page.
  - [ ] 3.3 - Add a thin monitoring page server loader that resolves configuration, calls session-list coordination, and returns plain serializable metadata, warnings, and empty/failure state. Re-evaluate file availability on each request.

- [ ] 4 - Integrate the grouped session list and manual refresh
  - [ ] 4.1 - Replace the session-discovery placeholder with project groups, parent sessions, nested subagents, and filenames, paths, timestamps, and file sizes. Preserve unrelated shell behavior and the deferred activity area.
  - [ ] 4.2 - Display warnings alongside usable results, and show distinct explanations for an empty session directory and discovery failure.
  - [ ] 4.3 - Add a manual Refresh button that reruns server loading and updates discovery results and metadata, including additions, changes, and removals. Provide a visible pending state and restore the control after completion or failure.
  - [ ] 4.4 - Keep the list and refresh control usable at existing responsive widths, with accessible headings and controls and local CSS matching repository conventions.

- [ ] 5 - Validate the implemented feature
  - [ ] 5.1 - Run the existing `npm run check` command using the project's supported runtime, without installing dependencies or starting a persistent process.
  - [ ] 5.2 - Verify discovery, project-path fallback, newest-first ordering, parent/subagent association, and metadata against representative local files using focused checks or an already running application.
  - [ ] 5.3 - Verify complete-record reading, incomplete-tail deferral, malformed-record warnings, unreadable/disappearing files, and distinct empty/failure states using disposable fixtures outside the real session directory. Do not alter Claude's session files.
  - [ ] 5.4 - Verify initial loading and manual refresh for added, changed, and removed files. If a running application is needed, ask the user to run it rather than starting a dev server without explicit authorization. Record any validation that could not be completed.

- [ ] 6 - Author and run feature tests
  - [ ] 6.1 - Establish a repeatable test command using the existing stack where practical, and reusable fixtures/builders in a disposable directory outside the real Claude session directory. Never modify real session files.
  - [ ] 6.2 - Add automated coverage for discovery, file metadata, original project-path grouping and fallback, newest-first ordering, and parent/subagent association.
  - [ ] 6.3 - Add automated coverage for complete JSONL records, incomplete-tail deferral and successful reading after completion, malformed-record warnings, and preservation of valid records.
  - [ ] 6.4 - Add automated coverage for unreadable and disappearing files, partial discovery results with warnings, and distinct empty/discovery-failure outcomes.
  - [ ] 6.5 - Add UI coverage for grouped metadata, nested subagents, warnings, empty/failure states, and manual refresh reflecting added, changed, and removed sessions, including pending and failure recovery.
  - [ ] 6.6 - Run the authored tests and the existing npm run check command; resolve failures within this feature and record any checks that could not be completed. Dependency installation remains user-run, and persistent processes require explicit authorization.
