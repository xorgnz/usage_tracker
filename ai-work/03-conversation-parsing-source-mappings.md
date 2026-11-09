# Conversation Source Mappings

## Inspection evidence

Read-only inspection on 2026-11-09 covered 38 JSONL files (including one subagent file) under the configured Claude projects directory: 4,121 valid records, no malformed nonblank lines in this sample. Only keys, type labels, flags, and aggregate counts were collected; transcript content is not reproduced here. These observations describe the local sample, not a universal schema guarantee.

## Supported mappings for subsequent parser work

- Top-level user/assistant records contain message.role and message.content. User content occurs as strings or content-block arrays; assistant blocks observed: text, thinking, tool_use. Preserve array index as source block identity/order.
- Text blocks contain text. Thinking blocks contain thinking and signature. Tool calls contain id, name, input, and sometimes caller. Tool results contain tool_use_id, content, and sometimes is_error; preserve content as unknown JSON rather than assuming text.
- User tool-result records have tool_result blocks, toolUseResult, and sourceToolAssistantUUID. Match tool_use_id to tool-use id within the appropriate conversation; sourceToolAssistantUUID and parentUuid are separate relationship evidence, not interchangeable identifiers.
- Genuine initiating-message candidates exclude tool results, isMeta=true, promptSource=system, and known synthetic origins. The sample includes promptSource=typed/turnOrigin=human and promptSource=sdk/turnOrigin=sdk; SDK prompts can initiate turns. userType=external alone does not distinguish them from tool results or synthetic content.
- Synthetic user examples include isMeta=true text, sourceToolUseID, turnOrigin=peer, and turnOrigin=task_notification. Retain these as associated activity rather than automatically creating new turns. Records lacking decisive classification evidence require explicit uncertainty; role or text shape alone is insufficient proof.
- Record uuid and parentUuid describe record relationships. message.id identifies an assistant response and repeats: 373 repeated assistant message-id occurrences were observed within files. Preserve each source record independently, along with apiBlockIndex/requestId when present; do not overwrite records or duplicate message usage across content blocks.
- Top-level timestamp is observed on conversation records but absent on several bookkeeping types. Keep its original value in raw data and a nullable interpreted timestamp; source line/block location remains available independently of chronological ordering.
- Assistant metadata includes message.model, id, stop_reason, stop_sequence, stop_details, usage, and optional diagnostic/context fields. Preserve unknown fields through raw retention.
- Usage keys observed: input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens, output_tokens_details, cache_creation, server_tool_use, service_tier, inference_geo, iterations, speed, fallback_credit. Preserve the entire original usage value once per source message record; field interpretation/accounting belongs to later work.
- System records observed: turn_duration and local_command. They contain subtype, timestamps/identity, and subtype-dependent fields such as durationMs, messageCount, content, level, commandRun, pendingBackgroundAgentCount. These are events, not automatically assistant completion evidence.
- Subagent records include agentId and isSidechain; use discovered file/project/parent identity for membership. The inspected data does not establish a universal parent tool-invocation link; preserve available evidence and leave unsupported links unresolved.

## Retention and interpretation gaps

Observed additional types: queue-operation, attachment, atis-latch, last-prompt, cost-state, mode, permission-mode, file-history-snapshot, api-request-shape, api-request-blob, api-request, ai-title, tools-used, isolation-latch. Preserve them in raw records; do not reinterpret embedded API-request messages as new conversation messages or use cost-state as newly measured usage.

Compaction records, multimodal blocks, and other versions were not demonstrated by this sample. Unknown records/blocks and missing or ambiguous relationships remain retained with interpretation diagnostics. Valid JSON primitives, arrays, and null must also remain representable even though this sample contained objects.

## Model boundary

Conversation identity includes project directory, session id, agent id, and file path. Source references add a one-based line and optional zero-based content-block index. Raw records own a defensive snapshot and expose defensive copies, preserving JSON shape without allowing callers to mutate retained data. Parsed messages hold one usage value; substeps reference message sources rather than copying usage onto every block. Conversation, turn, message, substep, relationship, and diagnostic contracts remain server-only. Interpretation, ordering, classification, and turn-building behavior are tasks 2 and 3.
