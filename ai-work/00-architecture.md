# Architecture

## Architectural Decisions

### Initial local execution mode

- Status: Approved
- Source: `01-application-foundation`
- Decision: For the application foundation, use a single foreground application server inside WSL, started through npm run dev, for both development and initial local use. Serve the browser interface on localhost. A separate built application startup mode is deferred.
- Context: The initial application is a local UI shell under the owner's control. Separate development and regular-use execution modes are not yet required.
- Consequences: Initial use requires the development tooling to be available. Startup must apply the same file-based configuration and validation rules for all initial use. No background service, container, separate backend process, or production startup command is required by this feature.

### Server-side conversation parsing boundary

- Status: Approved
- Source: `03-conversation-parsing`
- Decision: A server-only conversation parser owns record interpretation, chronological ordering, turn/substep construction, and interpretation diagnostics. It accepts source-located records without accessing the filesystem or framework request state. A conversation service coordinates existing session discovery and JSONL reading, invokes the parser separately for parent and subagent sessions, and links the resulting conversations. `SessionListService` retains its metadata-list responsibility.
- Context: Conversation interpretation must support later inspection and usage accounting while preserving unknown content and tolerating incomplete sessions.
- Consequences: File access supplies records to parsing; parsing does not depend on routes, UI models, or usage/cost calculations. Conversation models retain original parsed JSON records and source references alongside interpreted content. The service preserves read warnings and incomplete-tail state. Development console reporting occurs outside the parser using its diagnostics. Parsing results remain server-side and introduce no persistent storage. Execution remains within the existing foreground application server inside WSL.

### Usage accounting and dated pricing boundaries

- Status: Approved
- Source: `04-usage-cost-estimation`
- Decision: A server-side usage accounting boundary consumes parsed conversations and owns usage attribution, category separation, and aggregation without double counting. A distinct rate catalog owns model/category rate selection by usage timestamp and effective period. An estimation service coordinates these boundaries to produce usage and cost results. Conversation parsing remains independent of accounting and pricing.
- Context: Usage must remain useful independently of price availability, while model rates change over time and parent/subagent contributions must remain distinguishable.
- Consequences: Accounting preserves source identity, model, timestamp, category, and attribution level. Shared response usage is counted once even when referenced by several substeps. The rate catalog consumes the local rate table and returns applicable rates or explicit unresolved dependencies. Domain calculations do not access files or framework request state; the coordinating service supplies their inputs. This feature introduces no database, editing workflow, or additional process.

### Composable calculations with explicit uncertainty

- Status: Approved
- Source: `04-usage-cost-estimation`
- Decision: Domain-owned calculation objects represent known operands, identified unknowns, operations, units, dependencies, and provenance. They own evaluation of supported arithmetic and propagation of unresolved dependencies. Accounting and estimation compose these objects; later UI projects their results into explanatory displays.
- Context: Missing operands must not discard usable data or reduce an entire result to an undifferentiated incomplete flag.
- Consequences: Known subtotals and unresolved terms coexist. Unknown rates affect dependent costs while known token counts remain usable. Unknown substep allocations reference their known response total without adding extra usage. Calculation results preserve source and applied-rate references and retain precision through aggregation. Presentation formatting and display rounding remain outside calculation ownership. The calculation model is limited to usage and cost requirements; no general-purpose symbolic algebra system is required.

### Incremental monitoring state

- Status: Approved
- Source: `05-live-session-monitoring`
- Decision: A server-side monitoring coordinator owns shared, process-local session state, keyed by configured source and full session/file identity. Browser requests trigger discovery and updates; concurrent updates are coalesced. The file-access boundary owns incremental reading and retained source records. The coordinator supplies snapshots to the existing parser, subagent linker, and estimation service.
- Context: All sessions need current aggregates while detailed browser delivery remains on demand.
- Consequences: Unchanged sessions reuse computed results. Changed sessions and affected parent/subagent aggregates are recalculated from retained records; repeated response observations are reconciled by accounting rather than blindly added. Parsing and calculation remain independent of filesystem access and browser state. Restarting the application rebuilds the in-memory store.

### Monitoring delivery and refresh

- Status: Approved
- Source: `05-live-session-monitoring`
- Decision: Thin SvelteKit transport boundaries obtain monitoring snapshots from the coordinator and return explicit serializable view models. Responses contain metadata and aggregate summaries for all sessions, with expanded activity details only for requested sessions. The browser owns visibility-aware refresh scheduling, expansion state, and recent-update presentation.
- Context: Server-side reading and aggregation must be independent of how much detail the browser displays.
- Consequences: Refreshes obtain one coherent snapshot for summaries and requested details. Domain objects and raw transcripts remain server-side. Responses preserve calculation uncertainty, source-update times, successful-refresh times, and failures. Failed refreshes retain prior displayed values with visible stale/failure indicators.

### Incremental reading and recovery

- Status: Approved
- Source: `05-live-session-monitoring`
- Decision: The file-access boundary owns byte offsets, file identity/metadata, incomplete trailing bytes, and append-consistency checks. Detected truncation, replacement, rewriting, or inconsistent reads invalidate the affected file state and trigger a full rebuild. Size growth alone is insufficient evidence of a valid append.
- Context: JSONL normally grows by appending, but files can change while being read or be replaced.
- Consequences: Only completed records enter interpreted snapshots. Updates publish consistently after processing succeeds; read failures preserve the last successful snapshot with explicit stale status. Rebuilds replace previous contributions rather than adding a second copy. Recovery remains local to affected sessions and aggregates.
