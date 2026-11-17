# PRD: Live Session Monitoring

## Overview

Provide an automatically refreshed monitoring page for all discovered local Claude Code sessions. Maintain current session information and aggregate usage on the server, and send browser details only when requested.

## Goals

- Make session activity, token categories, and estimated costs visible without opening each session.
- Consume appended session data incrementally while recovering safely when incremental tracking is no longer valid.
- Keep browser payloads limited to displayed information and preserve precise uncertainty and visible refresh failures.

## Scope Boundaries

In scope: in-memory server-side session state; incremental JSONL consumption and recovery; metadata and aggregate summaries for all discovered sessions; on-demand expanded activity summaries; visible-data refresh; recent-update highlighting; separate subagent and parent-only/combined totals; and explainable incomplete calculations.

Out of scope: conversation and step inspection (feature 6), persistent history, graphs, alarms, pricing administration, and missing-data editing workflows.

## Requirements

### 1. Server-side Session State

- Maintain an in-memory view of discovered sessions, recorded usage, and calculated aggregates.
- Update that view from current session files. Aggregate usage must be available for unopened sessions; server-side reading is not conditional on a browser expansion.
- Reuse the existing discovery, parsing, accounting, and estimation capabilities while preserving their responsibility boundaries.
- This in-memory state is not persistent history storage.

### 2. Incremental JSONL Reading and Recovery

- Consume appended JSONL data incrementally instead of routinely rereading complete files.
- Track consumed byte offsets and file identity/metadata. Use byte counts rather than character counts, since characters may occupy multiple bytes.
- Retain incomplete trailing records until they can be completed and interpreted.
- Rebuild the affected session state when truncation, replacement, or inconsistent tracking invalidates incremental reading.
- File-size agreement is a useful consistency check but does not alone establish that no replacement or rewrite occurred.

### 3. Monitoring Summaries and On-demand Details

- List all discovered sessions with session identity, latest activity, aggregate token categories, and estimated costs.
- Send session metadata and aggregate summaries to the browser for unopened sessions.
- Send expanded activity details only when requested. On-demand loading describes browser delivery, not whether the server reads a session file.
- Keep subagents distinct and expose parent-only and combined totals separately.
- Leave conversation and step inspection to feature 6.

### 4. Refresh Behavior

- Refresh displayed data approximately every five seconds while the page is visible.
- Refresh expanded details for open sessions and displayed metadata/aggregate summaries for collapsed sessions.
- Pause automatic browser refresh in hidden tabs.
- Retain manual refresh and prevent overlapping requests.

### 5. Recent Activity and Failures

- Highlight an updated session bright yellow for the first five seconds, then fade to its normal background by one minute.
- Show the associated update timestamp. Recent file activity must not imply that Claude is currently running.
- Retain previous values after a refresh failure, mark them stale with their last successful refresh time, and show a visible failure alert or flag.
- Retry through subsequent refreshes. Preserve available values and explicit uncertainty in partial results.

### 6. Usage and Cost Uncertainty

- Preserve known token quantities independently of price availability.
- Display known cost subtotals with expandable unresolved calculation operands rather than replacing incomplete amounts with zero or a single opaque status.
- Retain separate parent, subagent, and combined contribution membership without double counting.
- Treat costs as estimates under the selected dated rate assumptions.

## Constraints and Considerations

- Preserve the approved Node.js/TypeScript/SvelteKit stack and existing local foreground application execution model.
- WSL execution remains an environment constraint; it does not determine project architecture.
- Preserve independent parser, accounting, rate-selection, and calculation responsibilities.
- Exact calculation precision remains in the domain; presentation formatting belongs at the UI boundary.
- Ownership of incremental state, invalidation/rebuild policy, and summary/detail refresh coordination remain unresolved architectural work for rule 5. This PRD establishes required behavior, not those architectural decisions.

## Clarifications Applied

- This approved PRD supersedes the scope document's earlier interpretation that detailed server-side usage loading waits until a session is opened. The server maintains usage and aggregates for all sessions; only detailed browser delivery is on demand.
- Refresh only the data displayed in the browser: aggregate summaries/metadata for collapsed sessions and expanded details for open sessions.

## Open Architectural Questions

1. How should incremental file tracking, in-memory session state, parsing, and estimation coordinate while preserving their existing responsibilities?
2. How should summary/detail delivery and refresh coordinate so browsers receive only displayed data?
3. How should incremental state detect invalidation and recover through a full rebuild?
