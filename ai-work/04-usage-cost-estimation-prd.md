# PRD: Usage and Cost Estimation

## Overview and Goals

Produce server-side token accounting and estimated costs from parsed conversations. Preserve known values, unknown operands, and calculation dependencies so later UI can communicate uncertainty precisely.

## Scope Boundaries

Include substep, assistant-response, turn, and session accounting; separate subagent usage; distinct token categories; and model pricing with effective dates.

UI belongs to features 5 and 6. Pricing administration belongs to feature 12. Data-editing workflows, persistent ingestion, analytics, and billing reconciliation are outside this feature.

## Requirements

### 1. Usage Identity and Attribution

- Associate usage with its source record, model, timestamp, and applicable conversation level.
- Preserve missing model or timestamp information explicitly.
- Use recorded substep counts when available.
- When only a response total is known, retain that total and mark individual substep allocations unknown, linked to the shared total. Do not invent allocations.

### 2. Token Categories

- Keep input, output, cache-read, and cache-write counts distinct.
- Preserve additional recorded distinctions needed for accurate pricing.
- Distinguish explicit zero, missing information, and categories established as not applicable.
- Preserve original recorded values and their provenance.

### 3. Aggregation

- Provide results for substeps, assistant responses, user-to-assistant turns, and sessions.
- Count each usage contribution once, including when several substeps reference one response total.
- Preserve known aggregate totals even when their internal distribution is unknown.
- Keep each subagent's usage distinct. Provide parent-only and combined parent-plus-subagent totals with traceable contributions.

### 4. Pricing over Time

- Use a local USD rate table supporting model-specific rates and effective periods.
- Select rates using the model and timestamp associated with each usage contribution.
- Price token categories separately, preserving applicable pricing distinctions.
- Retain the selected rate, effective period, and pricing assumptions with the calculation.
- Missing or ambiguous model, timestamp, or rate information remains an unresolved dependency; do not silently substitute a current or unrelated rate.

### 5. Calculations and Uncertainty

- Retain structured known operands, named unknowns, operations, and dependencies.
- Calculate every amount supported by available information.
- Preserve unresolved terms alongside known subtotals, for example: `$0.42 + (1,200 input tokens x unknown input rate)`.
- Propagate uncertainty only to dependent calculations. An unknown price must not prevent known token counts from contributing to token totals.
- Preserve relationships between known totals and unknown allocations so aggregation does not introduce duplicate or additional usage.
- Provide enough structured information for later UI to explain missing values precisely.

## Constraints and Considerations

- Consume feature 3's conversation models and preserved usage data.
- Keep accounting outside the conversation parser.
- Preserve the approved WSL execution environment and existing stack.
- Treat costs as estimates.
- Preserve calculation precision through aggregation; defer display rounding to presentation.
- No special missing-data update mechanism is required.

## Acceptance Criteria

- A response with 900 recorded tokens and unknown substep allocations contributes exactly 900 tokens to higher totals.
- Token categories and subagent contributions remain independently identifiable.
- Usage on opposite sides of a model's price-change date selects the appropriate rates.
- Missing pricing preserves known token totals and unresolved cost expressions.
- Known subtotals remain usable when other contributions are incomplete.
- Every calculated amount is traceable to its usage operands and pricing assumptions.
