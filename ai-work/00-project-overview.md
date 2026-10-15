# Project Overview

## Purpose

Usage Tracker is a local application for monitoring and analyzing Claude Code sessions. It reads session JSONL files to show conversations, metadata, token usage, and estimated costs.

## Intended Users

The initial user is the project owner, monitoring and reviewing their own Claude Code activity.

## Initial Scope

### In Scope

- Discover and list sessions from the local Claude Code folder.
- Provide a monitoring view showing session activity and usage.
- Open individual sessions to inspect conversations and available metadata.
- Extract recorded token counts and estimate costs per conversation step and session using reasonable pricing assumptions.
- Refresh visible monitoring information automatically on a clock, initially around every five seconds.
- Load conversation details when opened and refresh information according to the active view.
- Read current session files directly as needed, including files being updated by Claude Code.

### Later Capabilities

These are intended parts of Usage Tracker, deferred beyond the initially useful version:

- Persistent ingestion and storage of session history, informed by the owner's existing system document.
- Graphs of usage and costs over time.
- Feedback and alarm capabilities.

## Initial Constraints

- Run as a small Node application inside WSL.
- Provide a local browser interface served on a local port.
- Use the previously stated TypeScript/SvelteKit project direction.
- Treat existing Claude Code JSONL files as the initial data source.
- Present costs as estimates rather than authoritative billing amounts.
- Leave the exact refresh interval and view-specific refresh behavior for feature planning.
- Defer persistent ingestion design until the owner's existing system document is provided.

## Initially Useful Version

The owner can run Usage Tracker inside WSL, open its local web interface, and see an automatically refreshing list of Claude Code sessions with activity, token usage, and estimated costs. Opening a session reveals its conversation, metadata, and estimated costs for individual steps, read directly from the current session files.
