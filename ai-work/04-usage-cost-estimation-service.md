# Usage Estimation Service

`UsageEstimationService.estimate(loadResult)` accepts the actual `ConversationLoadResult` returned by `ConversationService.load()`. It is synchronous once files have been loaded. The default constructor supplies `TokenUsageAccounting` and `DatedUsageRateCatalog`; callers may supply those contracts explicitly. It has no route, UI, filesystem access, persistence, or network dependency.

## Result contract

- `source` retains the original access status, per-file warnings, deferred-tail flags, orphan state, raw conversation records, and parser diagnostics.
- `accounting` retains the canonical interpreted contributions, token expressions, category breakdowns, shared allocations, membership, and accounting diagnostics. It describes available parsed data, not a claim that every source file was readable.
- `costs` supplies substep, response, turn, own-session, and session-including-subagents groups. Each group has per-category token/cost evaluations and an overall USD evaluation. Evaluations retain the full calculation, exact known subtotal, unresolved terms, and identified unknowns.
- `terms` retain the actual token operand, contribution evidence, selected/unresolved price, USD product, and optional priced `sharedTotal`. Shared totals are evidence and are never added to an allocation's value. Selected rates carry their effective period, source, original amount/unit, and assumptions; the expression records the exact per-token conversion and rate ID.
- `coverage` describes unavailable file usage independently of interpreted measurements. It supplies unknown tokens multiplied by unknown price context for each category, rather than reporting a failed read as zero. File gaps participate in own/combined session results; discovery gaps with no known file identity stay at result level and cannot be assigned to an arbitrary session.

## Composition policies

Each contribution is priced with its own model/timestamp before aggregation. Canonical accounting membership controls response, turn, and session amounts. Missing price dependencies do not alter token calculations. Substep and cross-turn allocation terms retain the accounting allocation expression and a separately priced shared response total; they do not add unknown allocation charges to enclosing measured totals.

Known cache-write totals use supported duration components when consistent. Known portions can be priced independently, with remaining tokens retaining an unresolved duration price. A complete breakdown contradicting its known total is not substituted for that total. Output subdivisions are not added to their enclosing output amount. Missing totals follow accounting's existing breakdown/block/remainder expressions rather than inventing completeness.

Unread files, malformed skipped records, and deferred tails introduce scoped unknown usage. A readable child's known cost survives a failed parent read in the combined result, alongside unknown parent usage. Discovery failure is preserved separately. Parser diagnostics remain available verbatim through `source`; interpretation findings do not automatically invent additional charges for measurements already recorded at response level.

Exact values remain decimal text through domain evaluation; formatting and rounding belong to later UI projection. These are estimates under the selected rate assumptions, not subscription charges or billing reconciliation.
