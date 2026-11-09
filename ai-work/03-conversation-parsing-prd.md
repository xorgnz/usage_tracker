# PRD: Conversation Parsing

## Overview and Goals

Interpret session records into server-side conversations containing user-to-assistant turns and ordered substeps. Preserve original records and metadata so later inspection and usage accounting can use information without losing unrecognized content.

## Scope Boundaries

Includes messages, tool activity, thinking blocks, system events, metadata, linked subagent conversations, raw-record preservation, and parsing diagnostics.

Excludes UI work, token calculations, cost estimation, automatic monitoring, persistent ingestion, search, and analytics. Recorded usage data remains available for feature 4.

## Requirements

### 1. Turns and Substeps

- Start a turn at a genuine user message.
- Include subsequent assistant messages, thinking, tool calls/results, and associated events until the next genuine user message.
- Treat tool-result records as activity within a turn, even when their source role is `user`.
- Preserve content-block order within each message.

### 2. Chronological Ordering

- Order timestamped activity by recorded timestamps.
- Preserve file order when timestamps are equal.
- Keep activity with missing or invalid timestamps in a deterministic position based on source order, marking its chronology as uncertain.
- Use explicit record relationships to associate related activity without discarding chronological information.
- During development, log discrepancies between timestamp order and file order to the server console, identifying source locations without logging conversation content.

### 3. Content Interpretation

- Interpret user/assistant messages, tool calls/results, thinking blocks, and system events.
- Preserve available identifiers, timestamps, model information, recorded usage fields, and other metadata.
- Associate recorded usage with its originating message and applicable turn/substep without calculating totals or costs.

### 4. Raw Preservation and Traceability

- Retain every valid input record in its original parsed JSON form, including unknown fields and record types.
- Link interpreted content to its source file and record location.
- Identify unrecognized or partially interpreted content without preventing recognized content from being returned.
- Keep raw records server-side for later inspection features; introduce no durable archive.

### 5. Subagents

- Parse each subagent conversation separately.
- Preserve its parent-session association.
- Link to a specific parent tool invocation when the source provides sufficient evidence; otherwise retain the session-level link without inventing one.

### 6. Incomplete and Irregular Conversations

- Represent interrupted responses, missing tool results, and incomplete turns explicitly.
- Retain activity without an identifiable initiating user message as unattached activity.
- Preserve unmatched tool calls/results and report interpretation problems without discarding other usable content.
- Reuse feature 2's malformed-JSON warnings and unfinished-tail handling.

## Constraints

- Preserve the approved foreground application server inside WSL.
- Use the existing Node.js, strict TypeScript, and SvelteKit stack.
- Reuse feature 2's discovery and JSONL reading.
- Keep filesystem access, parsing, and raw records server-side.
- No application UI changes are required.
- Detailed record mappings must be established through source inspection rather than guessed.

## Acceptance Criteria

- Representative conversations produce turns with chronologically ordered substeps.
- Tool results remain within their associated activity rather than creating user turns.
- Timestamp/file-order discrepancies produce development console diagnostics.
- Unknown records and fields remain available through raw data and source references.
- Partial conversations and missing relationships remain represented explicitly.
- Parent and subagent conversations remain separate and linked.
- Recorded usage survives parsing without accounting or cost calculations.
