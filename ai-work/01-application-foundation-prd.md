# Product Requirements: Application Foundation

## Overview

Deliver a runnable TypeScript/SvelteKit application inside WSL, with a preliminary navigation shell and predictable file-based configuration.

## Goals

1. Establish a runnable application through documented npm run commands.
2. Provide a simple navigation shell for Monitoring and Analysis.
3. Make local configuration predictable through explicit file settings and documented defaults.

## Scope Boundaries

### In Scope

- Application setup using SvelteKit and TypeScript.
- Documented npm commands.
- Configuration loading and validation.
- Localhost serving on a configurable port.
- Preliminary layout and placeholder pages for Monitoring and Analysis.

### Out of Scope

- Session discovery, parsing, accounting, refresh behavior, and working conversation views; these belong to subsequent features.
- Detailed visual design.
- Containers, remote access, and authentication.
- UI-based configuration.

### Key Assumptions and Constraints

- Run locally inside WSL under the owner's control.
- Use SvelteKit with TypeScript.
- The application will not run in a container.
- File settings and documented defaults determine application configuration; exported shell variables must not silently override application settings.
- Detailed UI design will be revisited later.
- Feature 1 remains planned; PRD approval does not activate implementation.

## Requirements

| Area | Requirement |
|---|---|
| Startup | Provide documented npm run commands and report the local URL when running. |
| Navigation | Show Usage Tracker branding and a left sidebar containing Monitoring and Analysis, with the current location indicated. |
| Monitoring | Serve as the landing page, with placeholder framing for an active-session list and selected-session activity. |
| Analysis | Provide a placeholder for later conversation inspection. |
| Placeholder behavior | Clearly identify functionality that is not implemented; do not fabricate sessions or usage. |
| Configuration | Read application settings from a project-root `.env`; provide a committed `.env.example`. Exported shell variables must not silently override application settings. |
| Defaults | Use documented defaults for omitted settings when meaningful: port `5173` and the current WSL user's `~/.claude` directory. |
| Validation | Reject explicitly invalid settings with an actionable error. If the configured port is occupied, report the conflict rather than silently selecting another port. |
| Folder availability | Allow the foundation shell to run when the Claude Code folder is absent. Report its unavailability clearly without reading session files. |
| Local access | Listen on localhost using the configured port. |
| Documentation | Explain configuration, defaults, startup, and existing validation commands. |

## Design Considerations

- Use a left sidebar with Monitoring and Analysis; Monitoring is the landing page.
- The intended Monitoring workflow is an active-session list followed by the selected session's live activity. Feature 1 supplies only placeholder framing for this workflow, without session data or working session selection.
- Analysis provides the later path into deeper conversation inspection.
- History, graphs, alarms, and settings can gain navigation entries when their features arrive.

## Acceptance Criteria

- The documented command starts the application inside WSL.
- Both placeholder pages are reachable through the sidebar.
- File settings and documented defaults determine application configuration consistently.
- Invalid settings and port conflicts produce clear errors.
- An absent Claude Code folder does not prevent access to the shell.
- Existing project checks pass, and no session functionality is required.

## Clarifications Applied

- Configuration uses a project-root `.env` file with a committed `.env.example`.
- Defaults and validation depend on the setting; reasonable defaults are used where meaningful.
- The spoken folder name ".claud" is interpreted as `~/.claude`.
- The preliminary UI accommodates the broader project without implementing later features.

## Open Architectural Questions

The existing question in `00-architecture.md` remains unresolved:

- What execution modes and npm commands should support development and regular local use, and how should they differ?

This PRD does not select execution modes or add architectural decisions.
