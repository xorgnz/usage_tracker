# Tasks: Live Session Monitoring

## Feature Context and Constraints

- Active feature: `05-live-session-monitoring`.
- Requirements: `05-live-session-monitoring-prd.md`. Its clarified server-side incremental tracking and all-session aggregates supersede the earlier scope interpretation of on-demand server reads.
- Architecture: the approved Incremental monitoring state, Monitoring delivery and refresh, and Incremental reading and recovery decisions in `00-architecture.md` resolve the questions still listed historically in the PRD. Do not reopen those decisions or treat those questions as current blockers.
- Stack: approved TC1-TC4 in `00-master-techstack.md`; no new dependencies selected. WSL is the application execution environment, not an architectural boundary.
- Server updates are request-driven, process-local, and shared across clients. No autonomous polling loop, persistent history, or additional process is in scope.
- All discovered sessions receive server-side aggregate usage. Browser responses contain summaries for all sessions and expanded activity details only for requested sessions. Raw transcripts and conversation/step inspection remain outside this feature's browser payloads.
- Preserve exact calculations, named unknowns, parent/subagent separation, and existing parser/accounting/rate-selection ownership. Never accumulate repeated response observations as additional charges.
- Complete implementation before the final test-authoring task. Existing checks can run during implementation; new tests, fixtures, and harness changes belong to task 8.

## Implementation Placement and Relevant Files

- `src/lib/server/sessions/SessionFileDAO.ts`, `SessionFile.ts`, `SessionJsonlReader.ts`, and `SessionReadResult.ts`: existing file discovery/read boundary. Place incremental reading, retained source records, byte tracking, and recovery here using named concept owners; preserve fresh-read callers where needed.
- `src/lib/server/conversations/`: existing parser, source/record models, subagent linker, and conversation result contracts. Reuse interpretation from retained records rather than adding file/cache/request state to the parser.
- `src/lib/server/usage/`: existing accounting, dated pricing, exact arithmetic, and estimation. Reuse these owners for refreshed aggregates.
- `src/lib/server/monitoring/`: proposed cohesive home for the approved monitoring coordinator, process-local state ownership, and server-side monitoring projection. Establish concrete names in task 1.
- `src/lib/server/sessions/SessionListService.ts`: metadata-list responsibility; do not make it the owner of monitoring state, accounting, or browser refresh.
- `src/lib/monitoring/`: proposed home for browser-facing monitoring view models, focused monitoring components, and refresh/presentation owners as needed.
- `src/routes/+page.server.ts` and `src/routes/+page.svelte`: existing initial load and monitoring page. Keep route transport thin and component responsibilities focused. Add refresh transport using native SvelteKit route conventions as needed.
- `tests/support/SessionFixture.ts`, `ConversationFixture.ts`, `UsageFixture.ts`, and `RefreshHarness.ts`: existing synthetic/disposable test tooling.
- `tests/sessions.test.ts`, `conversation-parser.test.ts`, `conversation-service.test.ts`, `usage-*.test.ts`, and `session-page.test.ts`: existing regressions. Extend or add focused suites in task 8.
- `package.json`, `tests/tsconfig.json`, and `tests/README.md`: existing validation commands, type checking, and documented harness limitations.

## Tasks

- [ ] 1 - Establish monitoring contracts and responsibility boundaries
  - [ ] 1.1 - Review actual discovery, record/source, parser/linker, accounting/estimation, and page-data contracts. Identify the narrow reuse/extension points for retained-record snapshots without changing their responsibility ownership.
  - [ ] 1.2 - Establish named server concepts for tracked files, coherent monitoring snapshots, session state, source/update generations, last successful refresh, and local/global failures. Key state by configured source and full session/file identity, including project and subagent identity.
  - [ ] 1.3 - Establish distinct serializable summary and requested-detail contracts for the browser, including all token categories, parent-only/combined totals, unresolved calculation operands, source-update times, stale state, and failure indicators. Keep runtime domain models separate from transport/view models.
  - [ ] 1.4 - Define the update and projection interfaces connecting the file-access boundary, monitoring coordinator, existing interpretation/calculation owners, and thin transport. Keep filesystem behavior out of parsers/calculations and browser state out of the server store.

- [ ] 2 - Implement incremental file reading and local recovery
  - [ ] 2.1 - Add a named incremental reader/state owner within the file-access boundary. Retain completed source-located records, consumed byte offsets, file identity/metadata, and incomplete trailing bytes. Preserve correct line numbering, CRLF handling, and UTF-8 boundaries across appends.
  - [ ] 2.2 - Implement initial reads, unchanged-file reuse, and appended-range reads. Admit only newline-completed records into interpreted snapshots; retain malformed-record diagnostics while preserving valid neighbors and deferred tails.
  - [ ] 2.3 - Implement explicit append-consistency checks beyond file-size growth, using identity/metadata and appropriate retained-content evidence. Detect supported truncation, replacement, same-size rewrite, and contradictory-prefix cases; document detection limits rather than claiming size alone proves append-only behavior.
  - [ ] 2.4 - Rebuild invalidated file state from the current file, replacing prior records and contributions. Bound reads to a coherent file snapshot, account for writes during reading, and publish successful updates consistently instead of exposing partially processed state.
  - [ ] 2.5 - Preserve last successful file state on read/rebuild failure with explicit stale/read-failure evidence; distinguish empty, deleted, unavailable, malformed, and incomplete files. Keep failures local and permit later recovery. Preserve existing fresh-read behavior needed by other callers.

- [ ] 3 - Implement shared request-driven monitoring coordination
  - [ ] 3.1 - Implement the monitoring coordinator and shared process-local store per configured source. Coalesce concurrent update requests; ensure source/configuration changes cannot reuse another source's state. Do not add a background polling process.
  - [ ] 3.2 - Discover all sessions and subagents, advance tracked files, and retain cached results for unchanged files. Reconcile additions/removals and orphan/parent relationship changes without conflating a discovery failure with a successfully empty source.
  - [ ] 3.3 - Supply retained-record snapshots to the existing parser and linker for changed files/families, then invoke existing accounting and estimation owners. Recompute affected parent/subagent aggregates from canonical observations; do not blindly add new observed token amounts to old totals.
  - [ ] 3.4 - Reuse computed results for unaffected sessions. Invalidate dependent family aggregates when children or membership change, keep each child independently identifiable, and prevent duplicate membership across refreshes or projects.
  - [ ] 3.5 - Publish coherent versioned monitoring snapshots with source-update and successful-refresh times. Preserve prior successful values and explicit stale/partial diagnostics after localized or global failures; replace stale state after successful recovery. Rebuild the in-memory store after process restart.

- [ ] 4 - Project monitoring results and expose thin SvelteKit transport
  - [ ] 4.1 - Implement a named monitoring projection owner converting domain snapshots into plain serializable view models. Preserve exact numeric text, known subtotals, meaningful unresolved operands, category identity, and rate assumptions needed to explain estimates without serializing raw records or class instances.
  - [ ] 4.2 - Produce metadata and aggregate summaries for all discovered sessions, including parent-only/combined amounts and separate subagents. Produce expanded activity summary payloads only for requested session identities; keep conversation/step inspection outside the payload.
  - [ ] 4.3 - Integrate initial page loading and native SvelteKit refresh transport with the same shared coordinator. Parse requested expansion identities explicitly, resolve them within the configured discovered source, and avoid accepting arbitrary client filesystem paths.
  - [ ] 4.4 - Return summaries and requested details from one coherent snapshot, with explicit global/per-session failure and freshness information. Distinguish unavailable values from zero and stale prior values from current results; keep business rules in domain/service owners.

- [ ] 5 - Build the monitoring summaries and expanded activity UI
  - [ ] 5.1 - Extend the current page with all-session identity, latest-update metadata, token category summaries, and estimated costs. Preserve useful project grouping, empty/failed/partial states, and distinct subagent presentation.
  - [ ] 5.2 - Implement expansion state and on-demand activity summary delivery. Expanded sessions display their requested details; collapsed sessions continue to display metadata and aggregate usage. Keep page coordination separate from focused session/usage presentation components where needed.
  - [ ] 5.3 - Show parent-only and combined totals with clear labels, separate subagent amounts, estimate assumptions, and expandable unresolved operands. Keep known quantities usable when another operand is missing and do not label uncertainty as zero usage/cost.
  - [ ] 5.4 - Display source-update timestamps and highlight updated sessions bright yellow for five seconds, fading to the normal background by one minute. Base recency on source updates rather than refresh completion; avoid implying an executing process and keep text legible throughout the fade.
  - [ ] 5.5 - Add visible global/per-session failure flags and stale indicators with last successful refresh times. Retain prior displayed values on failures, show partial-result uncertainty, and provide meaningful loading status for requested details.

- [ ] 6 - Coordinate automatic and manual browser refresh
  - [ ] 6.1 - Introduce a focused browser refresh owner integrated with component lifecycle. Request approximately every five seconds while visible, pause in hidden tabs, and clean up scheduling on navigation/unmount.
  - [ ] 6.2 - Share the refresh path between automatic updates, manual Refresh, and expansion changes. Prevent overlapping browser requests and handle expansion changes during an in-flight update without showing obsolete details or overwriting newer state.
  - [ ] 6.3 - Request summaries for all sessions and details only for currently expanded sessions. Preserve expansion state through refreshes, reconcile removed sessions, and refresh requested details when opened again.
  - [ ] 6.4 - Retain successful values and visible failure/stale state after transport errors. Retry on subsequent refreshes, clear resolved failure flags after success, and keep recency fading correct between network refreshes.

- [ ] 7 - Validate implementation with existing tooling and focused checks
  - [ ] 7.1 - Run existing npm run check and npm test through the applicable validation workflow. Record runtime/environment and coverage limitations; do not install dependencies or start persistent processes without an explicit request.
  - [ ] 7.2 - Use synthetic/disposable examples to verify initial/appended/unchanged reads, multi-byte and CRLF boundaries, incomplete-tail completion, invalidation/rebuild, race/failure recovery, and absence of duplicate charges across refreshes. Keep real session files read-only.
  - [ ] 7.3 - Verify all-session aggregate availability before expansion, requested-only detail payloads, concurrent request coalescing, cached unaffected results, and coherent parent/subagent updates with explicit partial/stale evidence.
  - [ ] 7.4 - Verify automatic/manual refresh, hidden-tab pause, expansion changes, stale/error visibility, unknown operand displays, and yellow-to-normal timing using available harnesses. Record interactive browser/WSL checks separately when they require user-run application execution; do not claim they were covered by Node tests.

- [ ] 8 - Author and run monitoring tests
  - [ ] 8.1 - Add reusable synthetic/disposable incremental-file and monitoring snapshot fixtures using existing test tooling. Keep domain/projection tests independent of filesystem/framework state; use isolated files only where file behavior is under test.
  - [ ] 8.2 - Cover initial/appended/unchanged reads, byte offsets, UTF-8 splits, CRLF, malformed lines, deferred tails, truncation/replacement/rewrites and consistency detection limits, concurrent writes, failed reads/rebuilds, and later recovery.
  - [ ] 8.3 - Cover shared-state reuse and coalescing, source/project/session identity isolation, restart/configuration changes, additions/removals/orphans, dependent family recomputation, repeated observations, and parent/subagent totals without duplicate contributions.
  - [ ] 8.4 - Cover serializable projections and transport selection: summaries for all sessions, details only for requested valid identities, coherent snapshot versions, precise known/unknown values and assumptions, failure/freshness metadata, and exclusion of raw transcripts/domain instances.
  - [ ] 8.5 - Cover rendered category/totals/uncertainty/stale/error states and controlled-clock refresh behavior, including hidden tabs, manual/automatic overlap, expansion changes during requests, response freshness, cleanup, retries, and five-second/one-minute highlight boundaries.
  - [ ] 8.6 - Add integration coverage from incremental source updates through monitoring responses using temporary parent/subagent sessions. Run authored tests and the full existing npm run check/npm test commands; document browser/network and WSL limitations without claiming unsupported coverage.
