## Tasks

- [ ] 1 - Define searchable activity from the shared snapshot
  - [ ] 1.1 - Define searchable activity and its session identity and metadata
  - [ ] 1.2 - Map interpreted messages, thinking, tools, and system events
  - [ ] 1.3 - Map unrecognized source JSON without duplicating interpreted matches
  - [ ] 1.4 - Associate searchable activity with Conversation Inspection references
  - [ ] 1.5 - Check parent and subagent coverage and unknown metadata with existing fixtures
  - [ ] 1.6 - Run the existing type check

- [ ] 2 - Implement search matching and grouped results
  - [ ] 2.1 - Obtain one refreshed monitoring snapshot per submitted search
  - [ ] 2.2 - Match case-insensitive substrings and support filters-only searches
  - [ ] 2.3 - Apply project, date, activity type, and model to the same activity
  - [ ] 2.4 - Group hits by session and distinguish subagent hits
  - [ ] 2.5 - Build short snippets and link each hit to its matching activity
  - [ ] 2.6 - Check grouped results and distinguish partial coverage from zero hits

- [ ] 3 - Connect search to the monitoring page
  - [ ] 3.1 - Validate search submissions and invoke search for the configured source
  - [ ] 3.2 - Return serializable groups, snippets, and inspection references
  - [ ] 3.3 - Add query submission and project, date, activity type, and model controls
  - [ ] 3.4 - Render expandable session groups with individual hit links
  - [ ] 3.5 - Keep submitted results independent of edits and monitoring refresh
  - [ ] 3.6 - Prevent late responses from replacing newer results
  - [ ] 3.7 - Check invalid submissions and rendered loading, empty, and failure states

- [ ] 4 - Validate the search and inspection workflow
  - [ ] 4.1 - Run the existing type check and regression suite
  - [ ] 4.2 - Verify activity-level filters, raw-only hits, and unopened and subagent coverage with disposable data
  - [ ] 4.3 - Verify that resubmission sees new activity while existing results stay fixed
  - [ ] 4.4 - Verify text and filters-only search and result expansion in the WSL browser
  - [ ] 4.5 - Verify parent, subagent, and unavailable hit destinations in the WSL browser
  - [ ] 4.6 - Record validation results and coverage limits

- [ ] 5 - Author and run Session Search regression tests
  - [ ] 5.1 - Test recorded content, substring matching, and filters-only search
  - [ ] 5.2 - Test same-activity filters, date boundaries, and unknown metadata
  - [ ] 5.3 - Test source isolation, session grouping, and snippets
  - [ ] 5.4 - Test request validation, snapshot coherence, and partial coverage
  - [ ] 5.5 - Test inspection links and the result payload
  - [ ] 5.6 - Test submission, rendering, and fixed results during monitoring refresh
  - [ ] 5.7 - Run the new and existing suites and record browser coverage limits

## Task Details

<!-- task:1:start -->
### 1 - Define searchable activity from the shared snapshot

**Outcome:** Every available session contributes searchable activity with its original context.

**Scope:** Create a server-side activity adapter over interpreted conversations and retained source records.

**Dependencies:** Feature 6’s Conversation Inspection activity references are required for match navigation.

**Acceptance criteria:**

- Preserve the owning session, project, timestamp, activity type, model, and Inspection activity reference where available. Keep unknown metadata explicit and avoid duplicate hits for interpreted content also present in raw records.
- Verify interpreted and raw-only records, parent and subagent identity, and missing metadata. Run the existing type check.
<!-- task:1:end -->

<!-- task:2:start -->
### 2 - Implement search matching and grouped results

**Outcome:** A submitted query returns the matching activities from one coherent snapshot.

**Scope:** Build a server-side search service that obtains a refreshed snapshot from the monitoring coordinator and owns matching and grouping.

**Dependencies:** Task 1.

**Acceptance criteria:**

- A text match outside the range or on a different activity does not qualify. An active date or model filter excludes activity with unknown corresponding metadata.
- Check grouped results and snippets with disposable inputs. Confirm that partial source coverage is distinguishable from a complete search with zero hits.
<!-- task:2:end -->

<!-- task:3:start -->
### 3 - Connect search to the monitoring page

**Outcome:** Users can submit a search and browse results while monitoring continues to refresh.

**Scope:** Add a thin SvelteKit submission handler and focused search controls and results on the monitoring page.

**Dependencies:** Task 2.

**Acceptance criteria:**

- Return grouped hits and short snippets with inspection references. Keep full transcripts and filesystem paths out of the search response. Check invalid input and empty results through the handler.
- Editing controls and automatic monitoring refresh do not rerun the search. Submitting again replaces results, and a late response cannot replace a newer submission. Check rendered controls and loading, empty, and failure states.
<!-- task:3:end -->

<!-- task:4:start -->
### 4 - Validate the search and inspection workflow

**Outcome:** The feature works through its normal monitoring and inspection entry points.

**Scope:** Run existing checks and verify the complete workflow with disposable data in the supported WSL browser environment.

**Dependencies:** Task 3.

**Acceptance criteria:**

- Verify mixed filters apply to one activity, raw-only matches remain searchable, and a later submission sees new data. Record commands, results, and coverage limits.
- Confirm the results stay fixed until resubmission and links select the exact activity. When a source change makes a hit unavailable, confirm Inspection reports it clearly. Record the browser results.
<!-- task:4:end -->

<!-- task:5:start -->
### 5 - Author and run Session Search regression tests

**Outcome:** Repeatable tests protect search semantics, presentation, and navigation.

**Scope:** Add focused regression coverage after implementation using the existing test tooling.

**Dependencies:** Task 4.

**Acceptance criteria:**

- Cover invalid input, one coherent snapshot per search, partial coverage, and the result payload and inspection references.
- Run the new suite and the full existing check and test commands. Record the difference between automated coverage and the manual browser checks in subtasks 4.4–4.5.
<!-- task:5:end -->

## Feature Context

- Follow the [Session Search PRD](07-session-search-prd.md), the Session search and inspection navigation decision in the [architecture record](00-architecture.md), and approved technology choices TC1–TC4 in the [master tech stack](00-master-techstack.md).
- Feature 7 depends on Feature 6's activity references for navigation. Persistent indexing, historical storage, and export are out of scope.

## Implementation Placement and Relevant Files

- Use `src/lib/server/monitoring/MonitoringCoordinator.ts` and `MonitoringSnapshot.ts` for shared refresh and publication. Keep activity mapping and matching in server-side search modules. Reuse conversation and retained-record data, leaving file access, interpretation, and pricing with their existing owners.
- Use the Conversation Inspection navigation contract for hit destinations. Keep the SvelteKit submission handler focused on request validation and response delivery.
- Integrate focused search controls and results with `src/lib/monitoring/MonitoringWorkspace.svelte`. Keep search submission and results independent of `MonitoringRefreshController.ts`.
- Reuse conversation and monitoring fixtures and the patterns in `tests/monitoring-snapshot.test.ts`, `tests/monitoring-route.test.ts`, and `tests/monitoring-browser.test.ts`.
