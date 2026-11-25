# PRD: Session Search

## Overview

Add session search to the monitoring page. Users can find recorded activity across their configured local source and open the matching location in Conversation Inspection.

## Goals

- Find activity across all sessions, including unopened sessions and subagents.
- Narrow results using filters that apply to each matching activity.
- Show where each match occurred and let users inspect it directly.

## Scope Boundaries

In scope: on-demand text and filters-only searches, session-grouped results, snippets for text matches, and links to individual matches in Conversation Inspection.

Out of scope: persistent indexing, historical storage, and export.

## Requirements

### 1. Searchable Content

- Include every session in the configured local source, including unopened sessions and subagents.
- Search user and assistant messages, thinking, tool names, inputs and results, system events, and unrecognized source JSON.
- Match the query as a case-insensitive substring. Support searches with filters and an empty text query.

### 2. Activity-Level Filters

- Support project, activity date range, activity type, and model filters.
- Apply the query and all active filters to the same activity. For a session spanning the selected date range, return only activity recorded within that range.
- Activity with an unknown timestamp or model can match when the corresponding filter is clear. An active date or model filter requires a known timestamp or model that satisfies it.

### 3. Results and Navigation

- Group hits by session and identify subagent hits separately from their parent session.
- Let users expand each group to see individual hits. Show a short snippet for each text match.
- Link each hit to its matching turn, substep, or standalone event in Conversation Inspection.

### 4. Search Lifecycle

- Run search only when the user submits the search form.
- Keep the displayed results fixed until the next submitted search. Monitoring continues to refresh independently.

## Constraints and Considerations

- Search only the configured local session source.
- Use Conversation Inspection for match navigation.
