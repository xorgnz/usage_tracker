# PRD: Conversation Inspection

## Overview

Open a full conversation from the monitoring list to inspect what happened in a session and trace recorded usage and estimated costs to the activity behind them.

## Goals

- Make user-to-assistant turns and their ordered substeps easy to browse.
- Show linked subagent conversations, source records, and warnings in context.
- Explain known usage and estimated cost, including what remains unknown.

## Scope Boundaries

In scope: a dedicated conversation view, linked subagent views, inline timeline events and diagnostics, on-demand source JSON, usage and cost at each supported level, clearer cost explanations in inspection and monitoring, and periodic refresh.

Out of scope: search, export, historical storage, and broader UI refinements. More detailed cost explanation design is deferred until the core implementation is in place.

## Requirements

### 1. Session Navigation

- Open a dedicated, linkable inspection view in a new browser tab from the monitoring list.
- Open linked subagent conversations within the same inspection tab. Link to the subagent from its invoking substep when that relationship is known.

### 2. Conversation Timeline

- Show user-to-assistant turns and their ordered substeps, including messages, thinking, tool calls, and tool results.
- Show standalone system events and unrecognized records inline in chronological context.
- Collapse long content by default.
- Make source JSON available on demand, including unrecognized fields. Show read and parse warnings alongside affected content when their location is known.

### 3. Usage and Estimated Cost

- Show usage and estimated cost at the session, turn, assistant response, and substep levels.
- Lead cost explanations in inspection and monitoring with the known subtotal and a short description of missing inputs. Put arithmetic, model and rate assumptions, and source references behind expandable details.
- When only a response total is known, show that total and explicitly indicate that each substep's share is unknown. Link the unknown share to the shared response total.

### 4. Refresh

- Refresh about every five seconds while the inspection tab is visible, pause while hidden, and refresh immediately on return.
- Preserve the selected conversation, open panels, and reading position. Leave scrolling under user control when new activity arrives.
- On failure, keep the last successful view visible and mark it stale. Clear the warning when refresh succeeds.

## Constraints and Considerations

- Use existing server-side conversation interpretation and usage estimation results.
- Deliver raw source records on demand in the inspection view.
