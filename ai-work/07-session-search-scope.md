# Project Scope: Session Search

## Overview

Add search and filters to the monitoring page for all sessions in the configured local source. Results link to the matching activity in Conversation Inspection.

## Problem Statement

Users need to find specific activity across sessions, including sessions they have yet to open and activity recorded by subagents.

## Target Users

Local usage tracker users looking for specific sessions or recorded activity.

## Core Objectives

1. Find relevant activity across the full configured source.
2. Narrow matches by project, activity date range, activity type, and model.
3. Open matching activity directly in Conversation Inspection.

## In Scope

- Add a search box and filters to the monitoring page. Include all sessions, including unopened sessions, and identify subagent matches separately from their parent sessions.
- Search all recorded content, including user and assistant messages, thinking, tool names, inputs and results, system events, and unrecognized source JSON.
- Combine project, activity date range, activity type, and model filters. A date range limits which activity can qualify. If a session spans Monday through Friday and the search is limited to Wednesday, only Wednesday's activity can match.
- Show matching sessions with short snippets for content matches. Open Conversation Inspection at the matching turn, substep, or standalone event.

## Explicitly Out of Scope

- Persistent indexing, historical storage, and export.

## Assumptions and Constraints

- Run searches only when the user submits them. Results stay fixed until the user runs another search. Monitoring can continue refreshing independently.
