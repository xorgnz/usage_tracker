# Project Scope: Conversation Parsing

## Overview

Convert session JSONL records into server-side conversation models organized as user-to-assistant turns with ordered substeps. Interpret user and assistant messages, tool calls and results, thinking blocks, system events, and available metadata.

Keep subagent conversations separate and linked to their parent session. Preserve original records, including unrecognized content, so later inspection can expose details the parser does not interpret.

## Problem Statement

File access provides records but does not explain conversation structure. Later monitoring, usage accounting, and inspection features need a consistent interpretation without losing source information.

## Target Users

The project owner reviewing their own Claude Code sessions, through subsequent application features.

## Core Objectives

1. Represent turns and their ordered internal activity.
2. Interpret the agreed content types and preserve available metadata.
3. Retain source records and identify interpretation gaps.

## In Scope

- Server-side parsing and conversation models.
- User-to-assistant turns with ordered message and activity substeps.
- User/assistant messages, tool calls/results, thinking blocks, and system events.
- Separate subagent conversations linked to their parent session.
- Traceability from parsed content to original records and source locations.
- Raw retention of valid records and fields, including unknown or partially interpreted content.
- Preserve recorded usage fields and their association with turns/substeps for feature 04-usage-cost-estimation.
- Tolerant handling of incomplete conversations in files still being written.
- Diagnostics for content that cannot be interpreted reliably.

## Explicitly Out of Scope

- Conversation browsing or raw-record UI; these belong to later inspection work.
- Token accounting, cost estimation, and pricing; calculations belong to feature 04-usage-cost-estimation without discarding recorded usage data here.
- Automatic monitoring, search, analytics, and alarms.
- Persistent ingestion or a separate raw-record archive.
- Guaranteed structured interpretation of every record type.

## Assumptions and Constraints

- Application execution remains inside WSL under the approved architecture.
- Reuse feature 2's session discovery and JSONL reading.
- Keep parsing and raw records server-side.
- Retain raw form means preserve original content in parsing results, with source traceability; it does not introduce durable storage.
- Invalid JSON and unfinished trailing data retain feature 2's existing reader behavior.
- Source inspection will establish detailed turn boundaries, ordering, and record mappings during subsequent planning.
