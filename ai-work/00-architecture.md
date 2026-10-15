# Architecture

## Architectural Decisions

### Initial local execution mode

- Status: Approved
- Source: `01-application-foundation`
- Decision: For the application foundation, use a single foreground application server inside WSL, started through npm run dev, for both development and initial local use. Serve the browser interface on localhost. A separate built application startup mode is deferred.
- Context: The initial application is a local UI shell under the owner's control. Separate development and regular-use execution modes are not yet required.
- Consequences: Initial use requires the development tooling to be available. Startup must apply the same file-based configuration and validation rules for all initial use. No background service, container, separate backend process, or production startup command is required by this feature.
