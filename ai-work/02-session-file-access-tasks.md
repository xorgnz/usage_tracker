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

- [x] 1 - Establish local session-access models and file discovery
  - [x] 1.1 - Inspect the available session layout and documented file metadata to determine parent/subagent locations and project-path extraction. Keep inspection limited to what this feature needs; do not infer project paths by reversing encoded directory names.
  - [x] 1.2 - Define named session metadata, warning, and discovery-result concepts, distinguishing server-side objects from the serializable UI contract. Represent successful empty discovery separately from discovery failure.
  - [x] 1.3 - Implement server-only discovery under the existing configured Claude directory, collecting all parent and subagent session files with filenames, paths, timestamps, and sizes.
  - [x] 1.4 - Associate subagents with their parent session and isolate directory/file access failures so unaffected results remain available with warnings. Handle files disappearing during discovery.

- [x] 2 - Implement tolerant JSONL reading
  - [x] 2.1 - Give complete-record reading a focused server-only owner, exposing records internally without interpreting conversation messages or sending raw records to the browser.
  - [x] 2.2 - Read complete JSONL records while files change, deferring an incomplete trailing record until a later read. Skip malformed complete records with warnings and retain valid records.
  - [x] 2.3 - Handle unreadable or disappearing files without blocking other sessions. Include enough file and record context in warnings to identify the problem.

- [x] 3 - Coordinate the session list and page loading
  - [x] 3.1 - Coordinate discovery and the minimal record access needed to resolve original project paths and report record warnings. Use the storage directory name when the project path cannot be determined; keep conversation interpretation out of this code.
  - [x] 3.2 - Group parent sessions by project path, sort them by file modification time newest first, and retain subagents beneath their parent. Keep grouping and sorting out of the Svelte page.
  - [x] 3.3 - Add a thin monitoring page server loader that resolves configuration, calls session-list coordination, and returns plain serializable metadata, warnings, and empty/failure state. Re-evaluate file availability on each request.

- [x] 4 - Integrate the grouped session list and manual refresh
  - [x] 4.1 - Replace the session-discovery placeholder with project groups, parent sessions, nested subagents, and filenames, paths, timestamps, and file sizes. Preserve unrelated shell behavior and the deferred activity area.
  - [x] 4.2 - Display warnings alongside usable results, and show distinct explanations for an empty session directory and discovery failure.
  - [x] 4.3 - Add a manual Refresh button that reruns server loading and updates discovery results and metadata, including additions, changes, and removals. Provide a visible pending state and restore the control after completion or failure.
  - [x] 4.4 - Keep the list and refresh control usable at existing responsive widths, with accessible headings and controls and local CSS matching repository conventions.

- [x] 5 - Validate the implemented feature
  - [x] 5.1 - Run the existing `npm run check` command using the project's supported runtime, without installing dependencies or starting a persistent process.
  - [x] 5.2 - Verify discovery, project-path fallback, newest-first ordering, parent/subagent association, and metadata against representative local files using focused checks or an already running application.
  - [x] 5.3 - Verify complete-record reading, incomplete-tail deferral, malformed-record warnings, unreadable/disappearing files, and distinct empty/failure states using disposable fixtures outside the real session directory. Do not alter Claude's session files.
  - [x] 5.4 - Verify initial loading and manual refresh for added, changed, and removed files. If a running application is needed, ask the user to run it rather than starting a dev server without explicit authorization. Record any validation that could not be completed.

- [ ] 6 - Author and run feature tests
  - [ ] 6.1 - Establish a repeatable test command using the existing stack where practical, and reusable fixtures/builders in a disposable directory outside the real Claude session directory. Never modify real session files.
  - [ ] 6.2 - Add automated coverage for discovery, file metadata, original project-path grouping and fallback, newest-first ordering, and parent/subagent association.
  - [ ] 6.3 - Add automated coverage for complete JSONL records, incomplete-tail deferral and successful reading after completion, malformed-record warnings, and preservation of valid records.
  - [ ] 6.4 - Add automated coverage for unreadable and disappearing files, partial discovery results with warnings, and distinct empty/discovery-failure outcomes.
  - [ ] 6.5 - Add UI coverage for grouped metadata, nested subagents, warnings, empty/failure states, and manual refresh reflecting added, changed, and removed sessions, including pending and failure recovery.
  - [ ] 6.6 - Run the authored tests and the existing npm run check command; resolve failures within this feature and record any checks that could not be completed. Dependency installation remains user-run, and persistent processes require explicit authorization.

## Task 1 Implementation Notes

- Inspected local WSL parent transcripts under `~/.claude/projects/<project>/<sessionId>.jsonl`; metadata-bearing records include `cwd` for the original project path. Extraction remains in task 3.
- No local subagent transcripts were present. The official Claude Code documentation describes `<project>/<sessionId>/subagents/agent-<agentId>.jsonl`: https://code.claude.com/docs/en/sub-agents#resume-subagents.
- `SessionFileDAO` discovers parent and nested subagent files without reading JSONL content. Missing or unreadable parents leave subagent metadata in `orphanSubagents` with warnings; other project results remain available.
- Task 1 validation: `npm run check` passed with zero errors and zero warnings from svelte-check; Vite printed its existing configuration notices. Run used Windows Node.js 24.19.0, below the repository's declared 24.21.0 minimum. WSL runtime behavior has not yet been validated. No test files were authored.

## Task 2 Implementation Notes

- Added the server-only SessionJsonlReader and SessionReadResult contract. Records retain their source line number and an unknown JSON value, without conversation interpretation or browser exposure.
- Each call reads the file afresh. Newline-terminated malformed records produce path/line warnings and do not discard valid records. CRLF is accepted by JSON parsing.
- A valid final JSON value is accepted without a newline. An invalid unterminated tail is deferred without a warning until a later read; without a terminator, malformed and unfinished trailing data cannot reliably be distinguished.
- File read failures, including files removed after discovery, return a failed result with a file warning rather than throwing into other session reads.
- Validation: npm run check passed with zero Svelte/TypeScript errors or warnings; existing Vite configuration notices remain. Native Windows Node.js 24.19.0 was used, below the declared 24.21.0 minimum. git diff --check passed. Runtime edge-case coverage remains in the later validation/test tasks; no tests were authored and no server was started.

## Task 3 Implementation Notes

- Added SessionListService to coordinate discovery and JSONL reading, extract the first non-empty top-level cwd, and fall back to the storage directory name without decoding it.
- Parent sessions are grouped by project path and ordered by modification time newest first. Subagents remain nested beneath their parent; orphan metadata and file/record warnings remain available.
- Added a plain SessionListViewModel and thin page server loader. Each request reloads ApplicationConfig and discovery; raw records remain server-only. Successful empty discovery is explicit and distinct from partial results or source failure.
- git diff --check passed. npm run check awaits command selection under the project-local dvc-test rule. No tests were authored and no application server was started.

## Task 4 Implementation Notes

- Replaced the discovery placeholder with project groups, parent sessions, nested subagents, and retained orphan subagents. SessionFileMetadata renders filenames, paths, ISO creation/modification timestamps, and byte sizes.
- Added warnings with file and line context alongside available results, plus separate messages for successful empty discovery, source failure, and incomplete discovery with no usable results.
- Manual Refresh uses SvelteKit invalidateAll to reload page and layout data. It prevents overlapping refreshes, announces pending state, reports rejected refresh requests, and restores the button in finally.
- Added wrapping for long paths, responsive metadata layout, semantic lists/headings, and a visible keyboard focus style. Preserved the shared shell and deferred activity area.
- git diff --check passed. npm run check awaits selection under the project-local dvc-test rule; browser behavior and runtime refresh recovery were not verified. No tests were authored and no application server was started.

## Task 5 Validation Results

- Task 4 committed as d745155 before validation began.
- 5.1: npm run check passed with zero Svelte/TypeScript errors and warnings. Existing Vite notices about extensionless configuration imports and deprecated envFile remain. The available native Windows Node is 24.19.0, below the declared >=24.21.0 <25 range; validation on a supported runtime remains outstanding, so 5.1 is not checked off.
- 5.2: Focused checks against representative local disposable files passed for discovery, original cwd grouping, storage-directory fallback, newest-first order, parent/subagent association, file sizes, modification timestamps, and exclusion of raw records from serialized list data. Real Claude files were not modified or used for these checks.
- 5.3: Disposable-file checks passed for CRLF, valid records around malformed lines, warning path/line context, incomplete-tail deferral and completion, actual deletion between discovery and reading, missing-parent retention, successful empty discovery, source failure, and partial usable results. EACCES reading and ENOENT during metadata discovery were injected to exercise failure isolation deterministically; operating-system permission enforcement was not tested. Temporary scripts and fixture directories were removed.
- 5.4: Repeated service loads reflected added, changed, and removed files. No server was listening at the default port 5173. Browser initial loading, Refresh interaction, pending state, and failure recovery remain unverified; no application server was started. Task 5 remains open for supported-runtime validation and browser checks.
- Source inspection found text-encoding corruption in the pending Refresh label and warning line separator in src/routes/+page.svelte. The stored UTF-8 strings contain mojibake rather than the intended ellipsis/em dash. Reported as a validation finding; application files were not changed under this validation task.

### Task 5 Completion Update

- The earlier outstanding items above are superseded by this update. Task 5 is complete based on successful validation and user-reported browser testing.
- 5.1: npm run check passed with zero errors and zero warnings after the Node engine range was adjusted to include Node 22.22.1 and the Vite configuration notices were fixed. The user confirmed this closes 5.1.
- 5.4: The user ran the application on Windows against the WSL Claude directory mapped at Y:/home/xorgnz/.claude and confirmed project grouping, session metadata, a nested subagent, refresh discovery of a newly created session/subagent, and deletion reflected after refresh. The user reported the remaining browser testing complete; individual changed-file and failure-recovery results were not separately detailed.
- The garbled pending Refresh label and warning separator were corrected. npm run check passed afterward with zero errors and zero warnings. Runtime/configuration and text fixes were committed together as 24ad10d.
- No automated tests were authored; task 6 remains separate and open.
