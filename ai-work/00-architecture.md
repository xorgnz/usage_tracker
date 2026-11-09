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
