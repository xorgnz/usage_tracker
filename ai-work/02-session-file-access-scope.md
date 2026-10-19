# Project Scope: Session File Access

## Overview

Discover and read all local Claude Code session files from Usage Tracker running in WSL on the same machine. Connect the existing UI shell to a session list grouped by project folder, with newest sessions first and subagent sessions listed beneath their parent session.

## Problem Statement

Usage Tracker needs access to local session files and a browsable session list before conversation interpretation, usage accounting, and live monitoring can build on those files. Reading must tolerate files that Claude Code is actively updating and surface file problems without blocking the entire list.

## Target Users

The project owner browsing their own local Claude Code sessions.

## Core Objectives

1. Discover all local sessions and associate subagent sessions with their parent session.
2. Read JSONL files safely while they change, deferring incomplete trailing records until a later read.
3. Present a grouped session list with basic file metadata and visible warnings in the existing UI.

## In Scope

- Discover all sessions in the local Claude Code session directory within WSL.
- Group sessions by project folder and sort sessions by date, newest first.
- List subagent sessions beneath their parent session.
- Show filenames, paths, timestamps, and file sizes.
- Read JSONL session files while Claude Code updates them.
- Defer incomplete trailing records until a later read.
- Skip unreadable files and malformed records with visible warnings, and handle files disappearing during discovery or reading.
- Populate the existing UI shell with the grouped session list and warnings.

## Explicitly Out of Scope

- Uploaded sessions and alternative source paths.
- Conversation interpretation.
- Token accounting and cost estimation.
- Automatic live monitoring, including choosing file watchers, polling, or a delay after a file change.

## Assumptions and Constraints

- Usage Tracker runs in WSL on the same machine as the Claude Code sessions and accesses those sessions directly.
- The local Claude Code session directory is the only session source.
- Incomplete trailing records are deferred rather than treated as malformed records while a file is being written.
- File watchers, polling, and any delay after a change remain for live-monitoring planning.
