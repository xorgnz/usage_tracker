# Project Scope: Usage and Cost Estimation

## Overview

Calculate token usage and estimated costs from feature 3's parsed conversations. Provide server-side results at substep, assistant-response, turn, and session levels, preserving distinct token categories, subagent usage, and incomplete calculations.

All known data remains available as calculation operands even when another required value is missing. Preserve unresolved variables and dependencies so later UI features can convey precisely which amounts are known and which remain uncertain.

## Problem Statement

Recorded usage needs consistent accounting and transparent pricing calculations so the owner can understand consumption without losing detail or mistaking incomplete estimates for complete totals. Missing information must not discard known operands or invalidate unrelated calculations.

## Target Users

The project owner monitoring and reviewing Claude Code activity.

## Core Objectives

1. Account for recorded usage at each supported level without double counting.
2. Keep input, output, cache-read, and cache-write usage distinct.
3. Retain composable calculation data and propagate uncertainty through dependent calculations, preserving known operands, unresolved variables, and dependencies.

## In Scope

- Server-side usage accounting and cost estimation.
- Substep-level results and aggregation into assistant responses, turns, and sessions.
- Explicit attribution limits when source records provide usage only for a larger unit; do not invent a distribution across substeps.
- Separate parent and subagent accounting, with clearly distinguished parent-only and combined totals.
- Separate input, output, cache-read, and cache-write counts and pricing, preserving further recorded distinctions where relevant.
- An initial local model-rate table in USD.
- Traceability to recorded usage and applied pricing assumptions.
- Structured, composable calculation terms that later UI features can render, including known operands, known subtotals, unresolved variables, and dependencies.
- Preservation of all known information when counts, model identity, or rates are missing. Known values continue to participate in calculations wherever applicable.
- Propagation of missing information only through calculations that depend on it. Incomplete totals retain their known and unresolved terms rather than only receiving a general incomplete label.
- For example, a session cost may remain `$0.42 known cost + (1,200 input tokens x unknown model input rate)`. The 1,200 tokens still contribute to token totals; the missing rate affects the dependent cost calculation without invalidating unrelated amounts.

## Explicitly Out of Scope

- Monitoring and conversation UI, owned by features 5 and 6.
- Full pricing-management capabilities, owned by feature 12.
- Persistent ingestion, historical analytics, alarms, and authoritative billing reconciliation.
- Invented token counts or unsupported substep allocations.

## Assumptions and Constraints

- Consume feature 3's conversation models and preserved usage data.
- Keep accounting separate from conversation parsing.
- Preserve the approved WSL execution environment and existing technology stack.
- Treat costs as estimates, with identifiable rate assumptions.
- Represent missing information symbolically rather than substituting zero or dropping affected terms.
- Preserve enough calculation structure for later UI features to communicate uncertainty precisely; UI rendering itself remains outside this feature.
