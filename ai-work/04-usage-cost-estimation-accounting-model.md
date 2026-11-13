# Token Usage Accounting

TokenUsageAccounting accepts parsed Conversation snapshots and returns source-preserving contributions, breakdowns, allocation views, groups, and diagnostics. UsageMeasurementReader reconciles source observations; UsageTokenCalculations converts measurements into token expressions. No filesystem, price lookup, currency calculation, or UI work occurs here.

## Identity and observation policy

Assistant observations are grouped by responseId within the complete project/session/agent/file identity; absent response ids use source location. Identical category measurements count once. Missing observations do not override known observations. Differing counts, differing non-null request IDs, or a mix of valid and invalid recorded values produce an unresolved category with all recorded evidence retained. Different model/timestamp evidence leaves the affected pricing metadata unresolved without discarding known token counts. Source observations retain original usage objects, field values, presence, request/model/time evidence, and locations.

The same Conversation object may be passed repeatedly without multiplying usage. Distinct snapshots for the same file identity are rejected explicitly; callers must provide one current snapshot per file rather than rely on latest/sum/max selection.

## Categories and breakdowns

Input, output, cache-read, and cache-write are independent named category results. Cache-write breakdowns recognize ephemeral_5m_input_tokens and ephemeral_1h_input_tokens. Thinking is a partial output breakdown. Totals and their components remain linked and are never added together.

A known total remains the category amount even when its internal distribution is missing or inconsistent; diagnostics preserve any disagreement. A missing total can retain known components plus unresolved components/remainder. Cache subdivisions are treated as exhaustive only when all observations supply the recognized cache structure without extension fields. Unsupported breakdown structure retains uncertainty and original values rather than silently assuming completeness. Explicit zero remains known; missing/invalid/null data never becomes zero or not-applicable by omission.

## Substeps and grouping

An explicit block usage object using the named token-field schema supplies a separate block view. No such blocks were found in the inspected local sample, so no token counts are inferred from text length or block order. A block with no measurement has an unknown allocation referencing its shared response contribution. User/system activity without a recorded measurement also remains unknown at substep level; it is not invented as a separate response charge.

Response, turn, session-own, and session-including-subagents groups declare their contribution membership. The top-level contributions collection is an inventory, not an additive billing list: it includes response and measured block views. Group calculations select canonical response measurements for aggregation. Measured blocks do not add to known response totals. For a missing response total, usable block counts can participate with an unresolved remainder; block observations spanning repeated response snapshots are not summed into a missing total.

Turn membership reuses the existing conversation chronology so assistant messages with empty content still belong to their initiating turn. Response observations crossing multiple turns leave each turn allocation unknown while retaining the response once in session totals. Unattached response usage still belongs to its session.

Combined groups follow explicit parent identities only within the same project/session, using a visited set. Each subagent retains its own group, and a contribution is included once per aggregate even through repeated references. Orphans remain independently accounted conversations. Read failure, deferred-file tails, and broader upstream completeness remain responsibilities of the later estimation coordinator, which receives ConversationLoadResult.
