# Project Scope: Live Session Monitoring

## Overview

Extend the monitoring page with automatically refreshed session activity, token usage, and estimated costs. List all discovered sessions and load detailed activity and usage on demand rather than reading every conversation upfront.

## Problem Statement

The current monitoring page lists file metadata and supports manual refresh. The owner needs a current view of activity and usage, including precise uncertainty, without eagerly loading every session's conversation details.

## Target Users

The project owner monitoring their own local Claude Code sessions.

## Core Objectives

1. Show all discovered sessions with identity, latest activity, token categories, and estimated costs when details are requested.
2. Keep visible monitoring information current with lightweight automatic refresh and a simple recent-update indicator.
3. Preserve distinct subagent usage, parent-only and combined totals, and explainable incomplete calculations.

## In Scope

- Extend the existing monitoring page with session identity, latest activity, token categories, and estimated costs.
- List all discovered sessions; load detailed activity and usage on demand rather than upfront for every conversation.
- Refresh approximately every five seconds while the page is visible; pause automatic refresh in hidden tabs.
- Retain manual refresh and prevent overlapping requests.
- Show a simple updated-recently indicator and timestamp without inferring that Claude is still running.
- Keep subagents distinct and show parent-only and combined totals separately.
- Show known subtotals with expandable unresolved calculation operands.

## Explicitly Out of Scope

- Conversation and step inspection, which belongs to feature 6.
- Persistent history, graphs, alarms, and pricing administration.

## Assumptions and Constraints

- Reuse the existing session discovery, conversation parsing, token accounting, and cost-estimation capabilities.
- Preserve approved responsibility boundaries and the existing local foreground application execution model.
- Treat prices as estimates and missing values as explicit unknowns rather than zero.
- File updates indicate recent activity, not proof that Claude is currently running.
- WSL execution remains an environment constraint; it does not determine the project architecture.

## Unresolved Architectural Questions

- How should metadata discovery, on-demand detail loading, and refresh coordination interact?
- How should loaded details be refreshed or reused while avoiding unnecessary file reads?
