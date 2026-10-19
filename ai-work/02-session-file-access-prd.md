# Product Requirements: Session File Access

## Overview

Discover local Claude Code sessions and display them in the existing UI, grouped by project path. Provide internal access to complete JSONL records for later parsing features.

## Goals

1. Discover all local parent and subagent sessions and present their file metadata in a browsable list.
2. Read complete JSONL records while tolerating files that Claude Code is actively updating.
3. Let the user refresh discovery results and metadata manually, with visible warnings for file and record failures.

## Scope Boundaries

### In Scope

- Discovery of all local Claude Code sessions, including subagent sessions.
- Session grouping by project path and sorting by file modification time, newest first.
- Subagent sessions listed beneath their parent session.
- File metadata displayed in the existing UI shell.
- Internal server-side access to complete JSONL records.
- Initial page loading and a manual Refresh button.
- Visible warnings and distinct empty and failure states.

### Out of Scope

- Uploaded sessions and alternative source paths.
- Conversation interpretation and a raw-record viewer.
- Token accounting and cost estimation.
- Persistent ingestion.
- Configurable sorting.
- Automatic refresh, file watchers, polling, and read delays.

## Requirements

1. Discover all sessions in the local Claude Code session directory, including subagent sessions.
2. Group parent sessions by original project path. Use the storage directory name as a fallback when the project path cannot be determined.
3. Sort sessions within each group by file modification time, newest first. Configurable sorting is deferred.
4. List subagent sessions beneath their parent session.
5. Display filenames, paths, timestamps, and file sizes.
6. Load the session list when the page opens. Provide a manual Refresh button that reloads discovery results and metadata.
7. Provide server-side access to complete JSONL records without interpreting conversation content or displaying raw records.
8. Defer incomplete trailing records until a later read.
9. Skip unreadable files and malformed records with visible warnings. Files disappearing during discovery or reading must not prevent other sessions from being listed.
10. Distinguish an empty session directory from a discovery failure, with a visible explanation.

## Constraints and Technical Context

- Usage Tracker runs in WSL on the same machine as the Claude Code sessions and accesses those files directly.
- The local Claude Code session directory is the only session source.
- Use the existing Node.js 24 LTS (`TC1`), strict TypeScript (`TC2`), and SvelteKit (`TC3`) foundation.
- Preserve the approved single foreground application-server model inside WSL, started through npm run dev and served on localhost.
- Incomplete trailing records are deferred rather than treated as malformed records while a file is being written.
- Metadata is shown in the UI; complete JSONL records remain internal for later parsing features.

## Acceptance Criteria

- Available parent sessions appear under their project paths, newest modified first, with subagents nested beneath them.
- The UI displays filenames, paths, timestamps, and file sizes.
- Manual refresh reflects added, changed, and removed files.
- Incomplete trailing records are deferred; complete records remain available internally.
- File and record failures produce visible warnings while unaffected sessions remain usable.
- Empty results and discovery failures are clearly distinguishable.
