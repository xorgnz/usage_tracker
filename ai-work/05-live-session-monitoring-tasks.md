## Tasks

- [x] 1 - Establish monitoring contracts and responsibility boundaries
  - [x] 1.1 - Identify reusable discovery, parsing, and usage contracts
  - [x] 1.2 - Define server state and identity contracts
  - [x] 1.3 - Define browser summary and detail contracts
  - [x] 1.4 - Define update and projection interfaces

- [x] 2 - Implement incremental file reading and local recovery
  - [x] 2.1 - Track incremental reader state and byte boundaries
  - [x] 2.2 - Read initial and appended records and reuse unchanged files
  - [x] 2.3 - Check append consistency
  - [x] 2.4 - Rebuild invalidated files coherently
  - [x] 2.5 - Retain usable state on file failures

- [x] 3 - Implement shared request-driven monitoring coordination
  - [x] 3.1 - Share monitoring state and coalesce refreshes
  - [x] 3.2 - Refresh discovery and reconcile session relationships
  - [x] 3.3 - Recompute affected usage from canonical observations
  - [x] 3.4 - Reuse unaffected results and invalidate dependent totals
  - [x] 3.5 - Publish versioned snapshots and retain stale values on failure

- [x] 4 - Project monitoring results and expose thin SvelteKit transport
  - [x] 4.1 - Project serializable monitoring view models
  - [x] 4.2 - Return all-session summaries and requested details
  - [x] 4.3 - Connect initial load and refresh to the coordinator
  - [x] 4.4 - Return one coherent snapshot with freshness information

- [x] 5 - Build the monitoring summaries and expanded activity UI
  - [x] 5.1 - Show all-session monitoring summaries
  - [x] 5.2 - Load expanded activity on demand
  - [x] 5.3 - Explain totals, assumptions, and unknown operands
  - [x] 5.4 - Highlight sessions by source-update recency
  - [x] 5.5 - Show failures, stale values, and detail loading

- [x] 6 - Coordinate automatic and manual browser refresh
  - [x] 6.1 - Schedule automatic refresh while visible
  - [x] 6.2 - Coordinate refresh triggers and in-flight changes
  - [x] 6.3 - Keep requested details in sync with expansions
  - [x] 6.4 - Retain data and retry after transport errors

- [x] 7 - Validate implementation with existing tooling and focused checks
  - [x] 7.1 - Run existing validation commands
  - [x] 7.2 - Verify incremental reads, recovery, and deduplication
  - [x] 7.3 - Verify monitoring coordination and payloads
  - [x] 7.4 - Verify browser refresh, failure states, and highlight timing

- [x] 8 - Author and run monitoring tests
  - [x] 8.1 - Add reusable monitoring fixtures
  - [x] 8.2 - Test incremental reader behavior
  - [x] 8.3 - Test monitoring coordination and family totals
  - [x] 8.4 - Test monitoring projections and transport
  - [x] 8.5 - Test rendered states and browser refresh
  - [x] 8.6 - Test the source-to-response flow and run validation

## Task Details

<!-- task:1:start -->
### 1 - Establish monitoring contracts and responsibility boundaries

**Outcome:** Monitoring contracts define what each layer owns and exchanges.

**Scope:** Establish contracts for incremental file state, monitoring snapshots, browser data, and their integration.

**Acceptance criteria:**

- Meet the acceptance criteria for subtasks 1.1 through 1.4.
<!-- task:1:end -->

<!-- task:1.1:start -->
### 1.1 - Identify reusable discovery, parsing, and usage contracts

**Outcome:** The monitoring integration points are identified.

**Scope:** Review actual discovery, record/source, parser/linker, accounting/estimation, and page-data contracts.

**Acceptance criteria:**

- Identify the narrow reuse/extension points for retained-record snapshots without changing their responsibility ownership.
<!-- task:1.1:end -->

<!-- task:1.2:start -->
### 1.2 - Define server state and identity contracts

**Outcome:** Server state has explicit owners and stable identities.

**Scope:** Establish named server concepts for tracked files, coherent monitoring snapshots, session state, source/update generations, last successful refresh, and local/global failures.

**Acceptance criteria:**

- Key state by configured source and full session/file identity, including project and subagent identity.
<!-- task:1.2:end -->

<!-- task:1.3:start -->
### 1.3 - Define browser summary and detail contracts

**Outcome:** Browser summaries and requested details have separate serializable contracts.

**Scope:** Establish distinct serializable summary and requested-detail contracts for the browser, including all token categories, parent-only/combined totals, unresolved calculation operands, source-update times, stale state, and failure indicators.

**Acceptance criteria:**

- Keep runtime domain models separate from transport/view models.
<!-- task:1.3:end -->

<!-- task:1.4:start -->
### 1.4 - Define update and projection interfaces

**Outcome:** The update and projection boundaries are explicit.

**Scope:** Define the update and projection interfaces connecting the file-access boundary, monitoring coordinator, existing interpretation/calculation owners, and thin transport.

**Acceptance criteria:**

- Keep filesystem behavior out of parsers/calculations and browser state out of the server store.
<!-- task:1.4:end -->

<!-- task:2:start -->
### 2 - Implement incremental file reading and local recovery

**Outcome:** Session files can be read incrementally and recovered after invalidation or failure.

**Scope:** Implement incremental reads within the existing file-access boundary.

**Acceptance criteria:**

- Meet the acceptance criteria for subtasks 2.1 through 2.5.
<!-- task:2:end -->

<!-- task:2.1:start -->
### 2.1 - Track incremental reader state and byte boundaries

**Outcome:** Incremental state preserves record locations and byte boundaries.

**Scope:** Add a named incremental reader/state owner within the file-access boundary.

**Acceptance criteria:**

- Retain completed source-located records, consumed byte offsets, file identity/metadata, and incomplete trailing bytes. Preserve correct line numbering, CRLF handling, and UTF-8 boundaries across appends.
<!-- task:2.1:end -->

<!-- task:2.2:start -->
### 2.2 - Read initial and appended records and reuse unchanged files

**Outcome:** Completed records are reused or appended without publishing an incomplete tail.

**Scope:** Implement initial reads, unchanged-file reuse, and appended-range reads.

**Acceptance criteria:**

- Admit only newline-completed records into interpreted snapshots; retain malformed-record diagnostics while preserving valid neighbors and deferred tails.
<!-- task:2.2:end -->

<!-- task:2.3:start -->
### 2.3 - Check append consistency

**Outcome:** The reader detects supported cases where an append is unsafe.

**Scope:** Implement explicit append-consistency checks beyond file-size growth, using identity/metadata and appropriate retained-content evidence.

**Acceptance criteria:**

- Detect supported truncation, replacement, same-size rewrite, and contradictory-prefix cases; document detection limits rather than claiming size alone proves append-only behavior.
<!-- task:2.3:end -->

<!-- task:2.4:start -->
### 2.4 - Rebuild invalidated files coherently

**Outcome:** Invalidated files yield a coherent replacement snapshot.

**Scope:** Rebuild invalidated file state from the current file, replacing prior records and contributions.

**Acceptance criteria:**

- Bound reads to a coherent file snapshot, account for writes during reading, and publish successful updates consistently instead of exposing partially processed state.
<!-- task:2.4:end -->

<!-- task:2.5:start -->
### 2.5 - Retain usable state on file failures

**Outcome:** A failed read preserves the last usable file state and can recover later.

**Scope:** Preserve last successful file state on read/rebuild failure with explicit stale/read-failure evidence; distinguish empty, deleted, unavailable, malformed, and incomplete files.

**Acceptance criteria:**

- Keep failures local and permit later recovery. Preserve existing fresh-read behavior needed by other callers.
<!-- task:2.5:end -->

<!-- task:3:start -->
### 3 - Implement shared request-driven monitoring coordination

**Outcome:** Refresh requests share coherent session and usage results for each configured source.

**Scope:** Coordinate discovery, incremental reads, interpretation, and estimates in a shared process-local store.

**Acceptance criteria:**

- Meet the acceptance criteria for subtasks 3.1 through 3.5.
<!-- task:3:end -->

<!-- task:3.1:start -->
### 3.1 - Share monitoring state and coalesce refreshes

**Outcome:** Concurrent refreshes share one update for the configured source.

**Scope:** Implement the monitoring coordinator and shared process-local store per configured source.

**Acceptance criteria:**

- Coalesce concurrent update requests; ensure source/configuration changes cannot reuse another source's state. Do not add a background polling process.
<!-- task:3.1:end -->

<!-- task:3.2:start -->
### 3.2 - Refresh discovery and reconcile session relationships

**Outcome:** Tracked sessions and their relationships reflect successful discovery.

**Scope:** Discover all sessions and subagents, advance tracked files, and retain cached results for unchanged files.

**Acceptance criteria:**

- Reconcile additions/removals and orphan/parent relationship changes without conflating a discovery failure with a successfully empty source.
<!-- task:3.2:end -->

<!-- task:3.3:start -->
### 3.3 - Recompute affected usage from canonical observations

**Outcome:** Affected usage totals derive from canonical observations.

**Scope:** Supply retained-record snapshots to the existing parser and linker for changed files/families, then invoke existing accounting and estimation owners.

**Acceptance criteria:**

- Recompute affected parent/subagent aggregates from canonical observations; do not blindly add new observed token amounts to old totals.
<!-- task:3.3:end -->

<!-- task:3.4:start -->
### 3.4 - Reuse unaffected results and invalidate dependent totals

**Outcome:** Unaffected results are reused and changes invalidate dependent families.

**Scope:** Reuse computed results for unaffected sessions.

**Acceptance criteria:**

- Invalidate dependent family aggregates when children or membership change, keep each child independently identifiable, and prevent duplicate membership across refreshes or projects.
<!-- task:3.4:end -->

<!-- task:3.5:start -->
### 3.5 - Publish versioned snapshots and retain stale values on failure

**Outcome:** Consumers receive versioned snapshots with explicit freshness and failure information.

**Scope:** Publish coherent versioned monitoring snapshots with source-update and successful-refresh times.

**Acceptance criteria:**

- Preserve prior successful values and explicit stale/partial diagnostics after localized or global failures; replace stale state after successful recovery. Rebuild the in-memory store after process restart.
<!-- task:3.5:end -->

<!-- task:4:start -->
### 4 - Project monitoring results and expose thin SvelteKit transport

**Outcome:** The page and refresh route deliver coherent monitoring view models.

**Scope:** Project snapshots into browser payloads and expose them through thin SvelteKit handlers.

**Acceptance criteria:**

- Meet the acceptance criteria for subtasks 4.1 through 4.4.
<!-- task:4:end -->

<!-- task:4.1:start -->
### 4.1 - Project serializable monitoring view models

**Outcome:** The browser receives serializable amounts that retain their meaning and precision.

**Scope:** Implement a named monitoring projection owner converting domain snapshots into plain serializable view models.

**Acceptance criteria:**

- Preserve exact numeric text, known subtotals, meaningful unresolved operands, category identity, and rate assumptions needed to explain estimates without serializing raw records or class instances.
<!-- task:4.1:end -->

<!-- task:4.2:start -->
### 4.2 - Return all-session summaries and requested details

**Outcome:** Every discovered session gets a summary and requested sessions get details.

**Scope:** Produce metadata and aggregate summaries for all discovered sessions, including parent-only/combined amounts and separate subagents.

**Acceptance criteria:**

- Produce expanded activity summary payloads only for requested session identities; keep conversation/step inspection outside the payload.
<!-- task:4.2:end -->

<!-- task:4.3:start -->
### 4.3 - Connect initial load and refresh to the coordinator

**Outcome:** Initial load and refresh share the monitoring coordinator.

**Scope:** Integrate initial page loading and native SvelteKit refresh transport with the same shared coordinator.

**Acceptance criteria:**

- Parse requested expansion identities explicitly, resolve them within the configured discovered source, and avoid accepting arbitrary client filesystem paths.
<!-- task:4.3:end -->

<!-- task:4.4:start -->
### 4.4 - Return one coherent snapshot with freshness information

**Outcome:** Each response consistently represents one snapshot and its freshness.

**Scope:** Return summaries and requested details from one coherent snapshot, with explicit global/per-session failure and freshness information.

**Acceptance criteria:**

- Distinguish unavailable values from zero and stale prior values from current results; keep business rules in domain/service owners.
<!-- task:4.4:end -->

<!-- task:5:start -->
### 5 - Build the monitoring summaries and expanded activity UI

**Outcome:** The monitoring page shows session usage, expandable details, and update status.

**Scope:** Render project-grouped monitoring summaries and request expanded activity and explanations on demand.

**Acceptance criteria:**

- Meet the acceptance criteria for subtasks 5.1 through 5.5.
<!-- task:5:end -->

<!-- task:5.1:start -->
### 5.1 - Show all-session monitoring summaries

**Outcome:** The page displays all sessions with usage summaries and visible subagent identity.

**Scope:** Extend the current page with all-session identity, latest-update metadata, token category summaries, and estimated costs.

**Acceptance criteria:**

- Preserve useful project grouping, empty/failed/partial states, and distinct subagent presentation.
<!-- task:5.1:end -->

<!-- task:5.2:start -->
### 5.2 - Load expanded activity on demand

**Outcome:** Expanded sessions show requested activity while collapsed sessions retain their summaries.

**Scope:** Implement expansion state and on-demand activity summary delivery.

**Acceptance criteria:**

- Expanded sessions display their requested details; collapsed sessions continue to display metadata and aggregate usage. Keep page coordination separate from focused session/usage presentation components where needed.
<!-- task:5.2:end -->

<!-- task:5.3:start -->
### 5.3 - Explain totals, assumptions, and unknown operands

**Outcome:** Costs and token amounts expose their scopes and missing operands.

**Scope:** Show parent-only and combined totals with clear labels, separate subagent amounts, estimate assumptions, and expandable unresolved operands.

**Acceptance criteria:**

- Keep known quantities usable when another operand is missing and do not label uncertainty as zero usage/cost.
<!-- task:5.3:end -->

<!-- task:5.4:start -->
### 5.4 - Highlight sessions by source-update recency

**Outcome:** Recently updated sessions are visually identifiable from their source timestamps.

**Scope:** Display source-update timestamps and highlight updated sessions bright yellow for five seconds, fading to the normal background by one minute.

**Acceptance criteria:**

- Base recency on source updates rather than refresh completion; avoid implying an executing process and keep text legible throughout the fade.
<!-- task:5.4:end -->

<!-- task:5.5:start -->
### 5.5 - Show failures, stale values, and detail loading

**Outcome:** Users can see failures, stale values, partial results, and loading status.

**Scope:** Add visible global/per-session failure flags and stale indicators with last successful refresh times.

**Acceptance criteria:**

- Retain prior displayed values on failures, show partial-result uncertainty, and provide meaningful loading status for requested details.
<!-- task:5.5:end -->

<!-- task:6:start -->
### 6 - Coordinate automatic and manual browser refresh

**Outcome:** Browser refresh stays current while visible and recovers after failures.

**Scope:** Coordinate scheduled refresh, manual refresh, and selection changes through one browser owner.

**Acceptance criteria:**

- Meet the acceptance criteria for subtasks 6.1 through 6.4.
<!-- task:6:end -->

<!-- task:6.1:start -->
### 6.1 - Schedule automatic refresh while visible

**Outcome:** Automatic refresh follows tab visibility and component lifecycle.

**Scope:** Introduce a focused browser refresh owner integrated with component lifecycle.

**Acceptance criteria:**

- Request approximately every five seconds while visible, pause in hidden tabs, and clean up scheduling on navigation/unmount.
<!-- task:6.1:end -->

<!-- task:6.2:start -->
### 6.2 - Coordinate refresh triggers and in-flight changes

**Outcome:** Refresh triggers share a request path that avoids races.

**Scope:** Share the refresh path between automatic updates, manual Refresh, and expansion changes.

**Acceptance criteria:**

- Prevent overlapping browser requests and handle expansion changes during an in-flight update without showing obsolete details or overwriting newer state.
<!-- task:6.2:end -->

<!-- task:6.3:start -->
### 6.3 - Keep requested details in sync with expansions

**Outcome:** Requests and the displayed details reflect current expansions.

**Scope:** Request summaries for all sessions and details only for currently expanded sessions.

**Acceptance criteria:**

- Preserve expansion state through refreshes, reconcile removed sessions, and refresh requested details when opened again.
<!-- task:6.3:end -->

<!-- task:6.4:start -->
### 6.4 - Retain data and retry after transport errors

**Outcome:** Refresh failures retain usable data and later success clears the error.

**Scope:** Retain successful values and visible failure/stale state after transport errors.

**Acceptance criteria:**

- Retry on subsequent refreshes, clear resolved failure flags after success, and keep recency fading correct between network refreshes.
<!-- task:6.4:end -->

<!-- task:7:start -->
### 7 - Validate implementation with existing tooling and focused checks

**Outcome:** Existing checks and focused monitoring validation establish what has been verified.

**Scope:** Validate the implemented monitoring flow with existing tooling, disposable data, and interactive checks where needed.

**Acceptance criteria:**

- Meet the acceptance criteria for subtasks 7.1 through 7.4.
<!-- task:7:end -->

<!-- task:7.1:start -->
### 7.1 - Run existing validation commands

**Outcome:** Existing checks have recorded results and coverage limits.

**Scope:** Run existing npm run check and npm test through the applicable validation workflow.

**Acceptance criteria:**

- Record runtime/environment and coverage limitations; do not install dependencies or start persistent processes without an explicit request.
<!-- task:7.1:end -->

<!-- task:7.2:start -->
### 7.2 - Verify incremental reads, recovery, and deduplication

**Outcome:** Disposable examples verify incremental reads, recovery, and charge deduplication.

**Scope:** Use synthetic/disposable examples to verify initial/appended/unchanged reads, multi-byte and CRLF boundaries, incomplete-tail completion, invalidation/rebuild, race/failure recovery, and absence of duplicate charges across refreshes.

**Acceptance criteria:**

- Keep real session files read-only.
<!-- task:7.2:end -->

<!-- task:7.3:start -->
### 7.3 - Verify monitoring coordination and payloads

**Outcome:** Focused checks verify refresh coordination and payload selection.

**Scope:** Verify monitoring coordination and payloads.

**Acceptance criteria:**

- Verify all-session aggregate availability before expansion, requested-only detail payloads, concurrent request coalescing, cached unaffected results, and coherent parent/subagent updates with explicit partial/stale evidence.
<!-- task:7.3:end -->

<!-- task:7.4:start -->
### 7.4 - Verify browser refresh, failure states, and highlight timing

**Outcome:** Monitoring behavior is verified with applicable harnesses and interactive checks.

**Scope:** Verify automatic/manual refresh, hidden-tab pause, expansion changes, stale/error visibility, unknown operand displays, and yellow-to-normal timing using available harnesses.

**Acceptance criteria:**

- Record interactive browser/WSL checks separately when they require user-run application execution; do not claim they were covered by Node tests.
<!-- task:7.4:end -->

<!-- task:8:start -->
### 8 - Author and run monitoring tests

**Outcome:** Repeatable tests cover the monitoring flow from file updates to browser behavior.

**Scope:** Add focused monitoring fixtures and tests using the existing tooling.

**Acceptance criteria:**

- Meet the acceptance criteria for subtasks 8.1 through 8.6.
<!-- task:8:end -->

<!-- task:8.1:start -->
### 8.1 - Add reusable monitoring fixtures

**Outcome:** Reusable fixtures isolate monitoring test inputs.

**Scope:** Add reusable synthetic/disposable incremental-file and monitoring snapshot fixtures using existing test tooling.

**Acceptance criteria:**

- Keep domain/projection tests independent of filesystem/framework state; use isolated files only where file behavior is under test.
<!-- task:8.1:end -->

<!-- task:8.2:start -->
### 8.2 - Test incremental reader behavior

**Outcome:** Reader tests cover retained bytes, invalidation, and recovery.

**Scope:** Test incremental reader behavior.

**Acceptance criteria:**

- Cover initial/appended/unchanged reads, byte offsets, UTF-8 splits, CRLF, malformed lines, deferred tails, truncation/replacement/rewrites and consistency detection limits, concurrent writes, failed reads/rebuilds, and later recovery.
<!-- task:8.2:end -->

<!-- task:8.3:start -->
### 8.3 - Test monitoring coordination and family totals

**Outcome:** Coordinator tests cover source isolation, reuse, and accurate family totals.

**Scope:** Test monitoring coordination and family totals.

**Acceptance criteria:**

- Cover shared-state reuse and coalescing, source/project/session identity isolation, restart/configuration changes, additions/removals/orphans, dependent family recomputation, repeated observations, and parent/subagent totals without duplicate contributions.
<!-- task:8.3:end -->

<!-- task:8.4:start -->
### 8.4 - Test monitoring projections and transport

**Outcome:** Projection and transport tests cover selection, precision, and freshness.

**Scope:** Test monitoring projections and transport.

**Acceptance criteria:**

- Cover serializable projections and transport selection: summaries for all sessions, details only for requested valid identities, coherent snapshot versions, precise known/unknown values and assumptions, failure/freshness metadata, and exclusion of raw transcripts/domain instances.
<!-- task:8.4:end -->

<!-- task:8.5:start -->
### 8.5 - Test rendered states and browser refresh

**Outcome:** Presentation and refresh tests cover visible states, timing, and races.

**Scope:** Test rendered states and browser refresh.

**Acceptance criteria:**

- Cover rendered category/totals/uncertainty/stale/error states and controlled-clock refresh behavior, including hidden tabs, manual/automatic overlap, expansion changes during requests, response freshness, cleanup, retries, and five-second/one-minute highlight boundaries.
<!-- task:8.5:end -->

<!-- task:8.6:start -->
### 8.6 - Test the source-to-response flow and run validation

**Outcome:** Integration tests verify that source changes propagate into monitoring responses.

**Scope:** Add integration coverage from incremental source updates through monitoring responses using temporary parent/subagent sessions.

**Acceptance criteria:**

- Run authored tests and the full existing npm run check/npm test commands; document browser/network and WSL limitations without claiming unsupported coverage.
<!-- task:8.6:end -->

## Feature: Live Session Monitoring

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

## Task 1 Implementation Notes

- Reviewed actual file discovery/read, source/record, parser/linker, ConversationLoadResult, usage estimation, and initial page-load contracts. Recorded reuse points and placement in 05-live-session-monitoring-contracts.md; existing fresh-read callers and parser/accounting independence remain intact.
- Added IncrementalSessionRead.ts under the existing file-access boundary, defining revision/checkpoint metadata, tracked byte/record snapshots, change/failure outcomes, and the advance interface. No reading, caching, append checking, or rebuild behavior was implemented.
- Added MonitoringSessionIdentity, MonitoringSnapshot, and MonitoringProjection under the server-only monitoring module. Source plus complete conversation/file identity keys remain separate from browser selection keys. Contracts represent per-session and family membership, generations, last successful refresh, source-update time, and local/global stale/failure state; the coordinator/store implementations remain task 3.
- Added browser-safe MonitoringViewModel contracts for all-session metadata/aggregate summaries, requested activity details, compact exact amounts, and requested calculation graphs with source/price context and rate assumptions. Browser contracts do not import server modules, and transport/projection behavior remains task 4. Null unavailable results remain distinct from partial known amounts and unknown operands.
- No routes, UI, parser/accounting behavior, architecture records, dependencies, tests, or fixtures were changed. No persistent process was started. Task 2 has not begun; dedicated test authoring remains task 8.
- Validation on 2026-11-18 in native Windows PowerShell with Node.js v24.19.0: npm run check passed with zero errors/warnings; npm test passed all 68 existing tests. git diff --check passed. These are type/regression checks, not dedicated monitoring contract coverage. WSL execution remains unverified. Task 1 changes remain uncommitted.

## Task 2 Implementation Notes

- IncrementalSessionJsonlReader reads a bounded range from an open file handle, retains incomplete UTF-8 bytes, and decodes completed physical lines. Malformed lines produce source-located warnings and still advance the line counter. The existing fresh reader keeps its established behavior.
- Reuse checks file identity, size, and nanosecond modification/change times. For growth, compare up to three 4 KiB samples from the previous revision before reading appended bytes. A mismatch, file replacement, truncation, or a changed same-size revision triggers a rebuild. Sampling can miss a rewrite in unsampled bytes if the file also grows, or if the filesystem reports unchanged metadata. It does not prove that the full prefix is unchanged.
- Recheck the open handle and named path before publishing. A revision race or short read triggers one retry. If reading still fails, return the previous successful snapshot with an attempt warning. A missing path is distinguishable from a readable empty file. Rebuilds replace the retained records.
- On Windows Node.js 24.22.1, npm.cmd run check passed with zero diagnostics and npm.cmd test passed all 68 existing tests. Disposable smoke checks passed for split UTF-8, CRLF, malformed records, deferred tails, unchanged reuse, rewrite, truncation, deletion, replacement, and injected write races with recovery. WSL execution remains unverified.

## Task 3 Implementation Notes

- MonitoringCoordinator.forSource shares process-local state by resolved configured directory. Concurrent refreshes share one in-flight promise and one published snapshot. Each completed attempt publishes a generation, with separate generations for derived session and family results.
- The coordinator advances discovered files through IncrementalSessionJsonlReader and parses changed retained records with ConversationParser. Family processing links children with ConversationSubagentLinker and invokes UsageEstimationService over the resulting snapshots. Unchanged files reuse their parses and unaffected families reuse their estimates. Rebuilds and membership changes use current canonical observations.
- Complete discovery drops confirmed removals. Partial discovery retains prior entries covered by access warnings. Global discovery failures retain prior rows and estimates with stale flags. Local read failures retain prior parsed data and contribute explicit usage gaps. Orphans and restored parents are reconciled within their own project and session.
- Type checking and all 68 existing tests passed on Windows Node.js 24.22.1. Disposable smoke checks passed for concurrent calls, source isolation, cache reuse, child updates, partial/failed discovery, read failure and recovery, and orphan reassociation. WSL execution remains unverified.

## Task 4 Implementation Notes

- MonitoringSnapshotProjection maps one published snapshot to all-session summaries, selected activity summaries, and selected explanation graphs. Parent and subagent amounts retain their distinct scopes. Missing data stays distinct from exact zero. Graphs preserve decimal text, named unknowns, source locations, and selected rate assumptions using response-local references.
- The initial page load and POST /monitoring/refresh share MonitoringCoordinator.forSource. The refresh body contains expandedSessionKeys and explanationIds, each limited to 2,000 entries. Selections are validated as opaque IDs and resolved within the current projection. Unknown IDs are ignored. The refresh response is marked no-store.
- The existing page metadata list is projected from the same snapshot during the transition to the monitoring UI. The initial response selects no expanded details or explanations.
- On Windows Node.js 24.22.1, npm.cmd run check passed with zero diagnostics, and npm.cmd test passed all 68 existing tests. Direct handler smoke checks passed with temporary sessions for initial and refresh coherence, selection filtering, exact and partial amounts, stale recovery, and exclusion of raw transcript payloads. WSL and browser network execution remain unverified.

## Task 5 Implementation Notes

- The monitoring page now shows sessions grouped by project, separate subagent cards, latest activity and source-update times, four token categories, and labeled parent-only and combined estimated costs.
- Opening activity or an explanation requests the selected details through the refresh endpoint. Expanded usage explanations show exact known values, unresolved operands, and available rate assumptions. Partial amounts show uncertainty explicitly.
- Source updates drive the card highlight. It stays bright yellow for five seconds and fades to the normal background at one minute. Request failures keep prior results visible and show stale flags, errors, and last successful refresh times.
- Windows validation passed with zero type diagnostics and all 68 existing tests. Disposable server-render checks covered grouped session and subagent data, known and unknown amounts, calculation explanations, retained values after failure, and transcript exclusion. Browser interaction and animation timing remain unverified.

## Task 6 Implementation Notes

- MonitoringRefreshController shares one request path for automatic refresh, manual refresh, and newly opened panels. It schedules the next automatic request after roughly five seconds, clears the timer while hidden, and refreshes immediately on return. Component cleanup removes the listener, clears the timer, and aborts any pending request.
- Requests include the current activity and explanation selections. Selection versions prevent old responses from filling a panel closed and reopened during the request. Successful snapshots preserve still-valid selections, clear removed entries, and discard older same-source generations. Closing a panel clears its returned detail so reopening fetches fresh data.
- Transport failures preserve the latest published values and show the existing stale and failure indicators. The scheduler continues retrying, and a successful response clears the transport failure. Recency animation stays keyed to the file's source-update timestamp.
- Windows type checking and all 68 existing tests passed. Disposable controller checks with a simulated visibility event, clock, and deferred requests covered scheduling, visibility pause and resume, coalescing, close/reopen races, stale-value retention, retry, removal, and cleanup. Interactive browser timing and WSL remain unverified.

## Task 7 Validation Notes

- Task 6 committed as 2782b02. On Windows Node.js 24.22.1, npm.cmd run check passed with zero errors or warnings and npm.cmd test passed all 68 existing tests.
- Disposable reader assertions passed for initial, incremental, and unchanged reads, split multibyte UTF-8 with CRLF, deferred-line completion, same-size rewrite and truncation recovery, and repeated write races. Failed reads retained the previous snapshot.
- Disposable coordinator and projection assertions passed for initial totals, requested-only details and explanations, shared in-flight refreshes, unaffected estimate reuse, and incremental parent/subagent aggregation. Combined output advanced from 1,800 to 2,700 tokens and stayed at 2,700 on an unchanged refresh. Deferred tails surfaced as coverage gaps and failed discovery preserved prior rows as stale.
- Simulated browser lifecycle and server-render assertions passed for visibility changes, refresh coalescing, rapid close/reopen, retained values and recovery after failures, request cleanup, and unresolved calculation rendering. Browser network behavior and visual highlight timing require the manual check below. WSL enumeration was denied in this execution environment.
- Manual WSL/browser check for 7.4: run npm run dev from the configured WSL workspace and open the printed local URL. In the browser Network panel, verify refresh requests roughly every five seconds while visible, none while hidden, and an immediate request when returning. Use Refresh and open, close, and reopen a session's activity and a cost explanation. Check that requests do not overlap, closed panels no longer have their IDs requested, and reopened panels show current details. Simulate a failed request with the browser offline control. Values should remain visible as stale and recover once back online. Observe a normally updated session or a disposable fixture update: the highlight should start bright yellow, remain bright for its first five seconds, then fade by one minute from the source update. Report any mismatch, or confirm these checks passed.
- User-confirmed WSL/browser results: visible-tab refresh ran about every five seconds, paused while hidden, and resumed immediately on return. Manual refresh and reopening activity and cost explanations showed current details, with one request at a time. Going offline showed a yellow warning and preserved stale values. A successful online refresh cleared the warning. A new session appeared yellow, updated with activity, and faded to its normal background within one minute. The user deferred feedback on the readability of the cost explanation.

## Task 8 Validation Notes

- Added 12 monitoring tests with in-memory snapshots and disposable session files. Coverage includes incremental byte tracking and recovery, family aggregation and deduplication, serializable requested details and calculation graphs, direct page and refresh handlers, rendered failure and uncertainty states, controlled refresh timing, and compiled highlight styles.
- On Windows with Node.js v24.22.1, npm.cmd run check passed with zero errors and warnings, and npm.cmd test passed all 80 tests.
- The automated suite invokes route handlers in-process and checks rendered markup, compiled styles, and a simulated visibility and timer lifecycle. Live browser networking and animation remain covered by the user’s manual WSL run in task 7.4.
