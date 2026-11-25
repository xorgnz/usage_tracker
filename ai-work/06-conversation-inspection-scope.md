# Project Scope: Conversation Inspection

## Overview

Open a dedicated, linkable conversation view in a new browser tab from the monitoring list. Inspect the full conversation, linked subagent activity, and usage and estimated cost at each supported level.

## Problem Statement

The monitoring list shows session summaries. Users need to examine what happened in a conversation and trace usage and cost to the activity and data behind them.

## Target Users

Local usage tracker users who want to understand a specific Claude Code conversation.

## Core Objectives

1. Make turns and ordered substeps easy to browse.
2. Keep source records, warnings, and linked subagent conversations accessible in context.
3. Make usage, estimated costs, and missing calculation inputs understandable.

## In Scope

- Show user-to-assistant turns and ordered substeps, including messages, thinking, tool calls and results, and system events. Collapse long content by default.
- Make source JSON available on demand, including unrecognized fields and events. Show parse and read warnings alongside affected content.
- Open linked subagent conversations within the same inspection tab. Link to a subagent from its invoking substep when the relationship is known.
- Show usage and estimated cost at the session, turn, response, and substep levels. Preserve known amounts, identify missing operands, and link unknown substep allocations to the shared response total.
- Improve the readability of cost explanations in both inspection and monitoring.
- Refresh periodically while the inspection tab is visible and pause automatic refresh while hidden. Preserve the selected conversation and expanded content across refreshes.

## Explicitly Out of Scope

- Search, export, and historical storage.
- Broader UI refinements beyond the cost explanation readability changes described above.

## Assumptions and Constraints

- Use the existing server-side conversation interpretation and usage estimation results.
- Deliver raw source records on demand in the inspection view.
