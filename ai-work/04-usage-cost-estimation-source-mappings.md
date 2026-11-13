# Usage Source Mappings

## Inspection evidence

Read-only inspection on 2026-11-12 covered the same 38 available JSONL files used during feature 3 inspection. There were 886 assistant usage observations. Among within-file repeated message.id observations, 373 matched the previous usage JSON exactly and none differed. No observed message content block contained its own usage field. These are sample observations, not a guarantee for future versions or files. No transcript content is reproduced here.

## Actual upstream contracts

- ConversationMessage provides source, recordId, parentRecordId, responseId, requestId, apiBlockIndex, timestamp, model, usage: unknown, and hasUsage. Each message is a source-record observation; responseId may repeat.
- ConversationSource includes projectDirectory, sessionId, agentId, filePath, lineNumber, and optional blockIndex. Usage identity must retain this context; response ids alone are not global keys.
- Conversation turns and unattached activity expose substeps referring to messageSource. A substep's source is not evidence of independently recorded token counts.
- ConversationLoadResult separates access warnings/status, per-file read failure and deferred tails, and parser diagnostics. Future estimation coordination must preserve these limitations instead of claiming full session completeness.

## Recorded categories and breakdowns

- input_tokens, output_tokens, cache_read_input_tokens, and cache_creation_input_tokens were numbers in all inspected usage objects. Preserve separate categories; zero is a value, absence is not zero.
- cache_creation contains ephemeral_5m_input_tokens and ephemeral_1h_input_tokens. In all 886 observed cases their sum equals cache_creation_input_tokens. Retain both total and breakdown provenance; do not add the total to its components. Subsequent accounting must surface missing or inconsistent breakdowns rather than guess allocations.
- output_tokens_details may be null or an object containing thinking_tokens. Retain it as an output breakdown, not an additional independent token category to sum on top of output_tokens. This sample alone does not establish all possible relationships or future fields.
- server_tool_use contains web_search_requests and web_fetch_requests. These are named request counts, not evidence of token counts; preserve raw metadata rather than convert them to tokens or invent pricing coverage.
- service_tier, inference_geo, speed, iterations, and fallback_credit are present with strings, arrays, objects, or null as appropriate. Retain original fields and mark unsupported pricing dependencies explicitly when relevant; do not silently infer their pricing semantics.

## Repeated observations and uncertainty

Repeated response observations must remain available with individual source references. The local sample supports detecting identical repeated usage, but does not establish whether differing observations would be cumulative, replacements, retries, or independent charges. Task 3 must treat conflicts explicitly rather than assume sum, latest, or maximum. IDs require conversation context and model/time evidence.

Missing usage, explicit null, malformed fields, explicit zero, and demonstrated non-applicability are distinct. No category may become not-applicable merely because it was absent. Unsupported field meanings remain unknown and preserved in raw form.

## Known totals and substeps

A response with a known total of 900 tokens contributes that total once. Each unmeasured substep has an unknown allocation referencing the same contribution. The unknown allocation is a view of the shared total, not a new missing charge. When all allocations are unknown, no equal distribution or subtraction-based guess is made. Actual substep measurements can be modeled separately only when supported by source evidence.

## Ownership and implementation boundary

The server-only usage module defines contracts for accounting, dated-rate resolution, calculation evaluation, and estimation coordination. Calculation contracts use decimal text for evaluated amounts pending task 2's exact numeric implementation; no floating-point cost arithmetic is introduced here. Task 1 defines concepts and invariants only. Extraction/deduplication/aggregation, arithmetic evaluation, rate loading/selection, and service integration remain later tasks. Conversation parsing and metadata listing are unchanged.
