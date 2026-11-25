## Tasks

- [ ] 1 - Project the inspection timeline from the shared snapshot
  - [ ] 1.1 - Define serializable inspection view models
  - [ ] 1.2 - Resolve session links within the configured source
  - [ ] 1.3 - Assign stable timeline identities and source references
  - [ ] 1.4 - Project turns and ordered substeps from retained parses
  - [ ] 1.5 - Project standalone system events and unrecognized records inline
  - [ ] 1.6 - Project subagent relationships and known invocation links
  - [ ] 1.7 - Attach read and parse diagnostics to affected activity
  - [ ] 1.8 - Check representative timeline projections and run the type check

- [ ] 2 - Serve inspection and on-demand source records
  - [ ] 2.1 - Serve the initial inspection snapshot
  - [ ] 2.2 - Serve refreshed inspection snapshots
  - [ ] 2.3 - Handle invalid, missing, and unavailable selections
  - [ ] 2.4 - Bind source references to displayed file revisions
  - [ ] 2.5 - Resolve requested JSON within the selected conversation family
  - [ ] 2.6 - Check inspection handlers and monitoring payload boundaries with disposable data

- [ ] 3 - Build the conversation inspection interface
  - [ ] 3.1 - Open inspection links from monitoring in a new tab
  - [ ] 3.2 - Navigate linked subagents and invoking substeps in the inspection tab
  - [ ] 3.3 - Render turns, messages, and ordered activity with long content collapsed
  - [ ] 3.4 - Render standalone events and localized diagnostics inline
  - [ ] 3.5 - Fetch and display source JSON on demand
  - [ ] 3.6 - Show a refresh path for unavailable source references
  - [ ] 3.7 - Check rendered timeline and source states

- [ ] 4 - Show attributed usage and share clearer cost explanations
  - [ ] 4.1 - Project session and turn usage and estimated costs
  - [ ] 4.2 - Project assistant response and substep usage and estimated costs
  - [ ] 4.3 - Link unknown substep shares to shared response totals
  - [ ] 4.4 - Summarize known cost and missing inputs in the shared explanation
  - [ ] 4.5 - Make arithmetic, model and rate assumptions, and source references expandable
  - [ ] 4.6 - Use the shared explanation in inspection and monitoring
  - [ ] 4.7 - Check rendered known, partial, and shared-total examples

- [ ] 5 - Refresh the inspection tab without disrupting reading
  - [ ] 5.1 - Schedule refresh while visible and refresh immediately on return
  - [ ] 5.2 - Coordinate in-flight requests and dispose refresh work on teardown
  - [ ] 5.3 - Preserve the selected conversation and open panels across refreshes
  - [ ] 5.4 - Keep reading position stable when new activity arrives
  - [ ] 5.5 - Retain the last successful view and show a stale warning on failure
  - [ ] 5.6 - Clear the warning after successful refresh
  - [ ] 5.7 - Check refresh behavior with controlled timing and existing validation commands

- [ ] 6 - Validate the complete inspection flow
  - [ ] 6.1 - Run the existing type check
  - [ ] 6.2 - Run the existing regression suite
  - [ ] 6.3 - Check load, refresh, source references, and monitoring payloads with disposable data
  - [ ] 6.4 - Verify new-tab entry and same-tab subagent navigation in the WSL browser
  - [ ] 6.5 - Verify timeline, source JSON, and explanations in the WSL browser
  - [ ] 6.6 - Verify visibility, reading position, stale recovery, and expired source handling in the WSL browser
  - [ ] 6.7 - Record validation results and coverage limits

- [ ] 7 - Author and run inspection regression tests
  - [ ] 7.1 - Test projected chronology, unknown records, diagnostics, and linked families
  - [ ] 7.2 - Test usage attribution, calculation uncertainty, and shared response totals
  - [ ] 7.3 - Test initial and refresh handlers and response payload boundaries
  - [ ] 7.4 - Test revision-bound source retrieval and wrong-family and expired references
  - [ ] 7.5 - Test rendered navigation, timeline, source, and explanation states
  - [ ] 7.6 - Test scheduling, delayed responses, stale recovery, and cleanup
  - [ ] 7.7 - Run the new and existing suites and record browser coverage limits

## Task Details

<!-- task:1:start -->
### 1 - Project the inspection timeline from the shared snapshot

**Outcome:** An inspection response describes one selected conversation family and its current state.

**Scope:** Build a server-side inspection adapter and serializable browser contract. Reuse the monitoring coordinator, retained parse results, and linked family data.

**Acceptance criteria:**

- Use stable identities for retained entries across ordinary appends. Keep raw JSON, internal file paths, and domain objects outside the view model.
- Reuse parser chronology and preserve uncertainty. Associate warnings and subagent invocation links where evidence exists. Check the projection against existing synthetic conversation fixtures and run the existing type check.
<!-- task:1:end -->

<!-- task:2:start -->
### 2 - Serve inspection and on-demand source records

**Outcome:** The inspection tab can load, refresh, and retrieve a specific source record.

**Scope:** Implement thin SvelteKit inspection routes and a server-side source resolver over the shared snapshot.

**Dependencies:** Task 1.

**Acceptance criteria:**

- Each response represents one coherent snapshot. Invalid, missing, and unavailable selections have explicit outcomes, and monitoring responses continue to omit transcripts.
- Return valid source JSON including unrecognized fields. Reject references outside the family and report expired or mismatched revisions as unavailable. Check initial, refresh, and source handlers with disposable data.
<!-- task:2:end -->

<!-- task:3:start -->
### 3 - Build the conversation inspection interface

**Outcome:** Users can browse the main conversation and its subagents in one inspection tab.

**Scope:** Add the monitoring entry point and focused inspection timeline and source components.

**Dependencies:** Task 2.

**Acceptance criteria:**

- The monitoring tab stays open. Subagents remain distinct and can be opened from their invoking substep when known.
- Source JSON loads on request and displays as text. Unavailable source references provide a clear refresh path. Verify rendered timeline and source states with existing tooling.
<!-- task:3:end -->

<!-- task:4:start -->
### 4 - Show attributed usage and share clearer cost explanations

**Outcome:** Inspection and monitoring explain known values and what remains unknown.

**Scope:** Use the existing estimates and calculation evidence. Share the explanation presentation across both screens.

**Dependencies:** Task 3.

**Acceptance criteria:**

- Preserve token categories, known values, named missing inputs, and rate and source evidence. An unknown substep allocation links to the known response total without duplicating the amount.
- Lead with the known subtotal and a short description of missing inputs. Keep arithmetic, model and rate assumptions, and source references in expandable details. Check rendered known, partial, and shared-total examples.
<!-- task:4:end -->

<!-- task:5:start -->
### 5 - Refresh the inspection tab without disrupting reading

**Outcome:** Visible inspections stay current while users retain their context.

**Scope:** Add visibility-aware browser refresh around inspection selection and panel state.

**Dependencies:** Task 4.

**Acceptance criteria:**

- Refresh preserves selected conversation, open panels, and reading position, without automatically scrolling to new activity. Delayed responses cannot overwrite a newer selection.
- Check refresh scheduling, selection changes, stale-state recovery, and cleanup using controlled timing and existing validation commands.
<!-- task:5:end -->

<!-- task:6:start -->
### 6 - Validate the complete inspection flow

**Outcome:** Automated checks and browser observations establish that the feature works through its entry points.

**Scope:** Run existing validation and verify the completed inspection in the documented WSL application environment.

**Dependencies:** Task 5.

**Acceptance criteria:**

- Record command results, environment, and coverage limits.
- Confirm retained scroll and panels, visible stale warning and recovery, and useful handling of an expired source reference. Record the browser results before checking off this item.
<!-- task:6:end -->

<!-- task:7:start -->
### 7 - Author and run inspection regression tests

**Outcome:** Repeatable coverage protects the inspection boundaries and browser behavior.

**Scope:** Add focused tests after implementation, using the existing test runner, synthetic data, and disposable files.

**Dependencies:** Task 6.

**Acceptance criteria:**

- Cover wrong-family and expired references, coherent revisions, and exclusion of raw JSON from ordinary inspection and monitoring responses.
- Run the new tests and full existing check and test commands. Record any browser-specific behavior verified through subtasks 6.4–6.6.
<!-- task:7:end -->

## Feature Context

- Feature `06-conversation-inspection` uses [the approved PRD](06-conversation-inspection-prd.md), the [Conversation inspection and source access decision](00-architecture.md), and approved technology choices TC1–TC4 in the [master tech stack](00-master-techstack.md).
- Search, export, historical storage, and broader UI refinements are outside this feature's scope.

## Implementation Placement and Relevant Files

- `src/lib/server/monitoring/MonitoringCoordinator.ts`, `MonitoringSnapshot.ts`, and `MonitoringFamilyEstimator.ts` provide shared incremental state and linked estimation inputs. Keep the inspection adapter and source resolver focused on inspection delivery, leaving refresh coordination, parsing, and pricing with their existing owners.
- `src/lib/server/conversations/Conversation.ts` and `ConversationSource.ts` supply interpreted content and provenance. `src/lib/server/usage/UsageContribution.ts` and `src/lib/server/monitoring/MonitoringCalculationProjection.ts` supply attribution and existing calculation projection patterns.
- Use native SvelteKit inspection routes and focused inspection components. Review `MonitoringExplanation.svelte` for shared presentation and `MonitoringRefreshController.ts` for visibility and request sequencing behavior. Share only behavior that both views need.
- Relevant existing checks include `tests/monitoring-snapshot.test.ts`, `tests/monitoring-route.test.ts`, `tests/monitoring-browser.test.ts`, and the conversation and usage suites.
