# Tasks: Conversation Parsing

## Implementation Context

- Source: `03-conversation-parsing-prd.md`; preserve the approved server-side conversation parsing boundary in `00-architecture.md`.
- Reuse Node.js (`TC1`), strict TypeScript (`TC2`), SvelteKit (`TC3`), and npm (`TC4`); no additional dependencies are required.
- Application execution remains in the existing foreground server inside WSL. The IDE/agent environment does not change the application architecture.
- Place conversation concepts and interpretation in a cohesive server-only conversations module. The parser owns interpretation, ordering, turn/substep construction, and structured diagnostics; it has no filesystem, framework request-state, console-reporting, UI-model, or cost-accounting responsibilities.
- A conversation service coordinates existing discovery/reading and parses parent/subagent files separately. It preserves read outcomes, links conversations, and reports parser ordering diagnostics to the console only during development.
- SessionListService retains metadata listing. Do not wire full parsing into list loading or add routes/UI for this feature.
- Preserve raw parsed JSON, source references, and recorded usage without adding persistent storage, token calculations, or costs.
- Test authoring is a separate final task. Planning these tasks does not authorize beginning implementation or writing tests.

## Relevant Files

- `src/lib/server/sessions/SessionFileDAO.ts` - Existing discovery and parent/subagent associations.
- `src/lib/server/sessions/SessionFile.ts` - File identity, project context, and subagent membership.
- `src/lib/server/sessions/SessionJsonlReader.ts` - Existing tolerant JSONL reading; reuse its malformed-line and incomplete-tail behavior.
- `src/lib/server/sessions/SessionReadResult.ts` - Parsed unknown values, line numbers, warnings, read failure, and deferred-tail state.
- `src/lib/server/sessions/SessionListService.ts` - Metadata-only list owner; preserve this responsibility.
- `src/lib/server/conversations/` - Proposed implementation-local home for conversation models, parser, and conversation service within the approved server boundary.
- `tests/sessions.test.ts` - Existing file-access regression coverage.
- `tests/session-page.test.ts` - Existing list/UI regression coverage; no new conversation UI is required.
- `tests/support/SessionFixture.ts` - Reusable isolated temporary session files.
- `tests/register.mjs`, `tests/loader.mjs`, `tests/tsconfig.json` - Existing TypeScript test tooling.
- `package.json` - Existing `npm run check` and `npm test` commands.

## Tasks

- [x] 1 - Establish source mappings and conversation model boundaries
  - [x] 1.1 - Inspect representative available session records read-only to establish actual user/assistant, tool, thinking, system-event, timestamp, identifier, model, usage, and parent/subagent shapes. Record supported mappings and interpretation gaps without copying private conversation content into planning notes.
  - [x] 1.2 - Establish how genuine user messages differ from tool-result and other synthetic user-role records, and how explicit relationships identify tool activity and turn associations. Do not infer unsupported meanings from role alone.
  - [x] 1.3 - Define named server-side conversation, turn, substep, source-reference, diagnostic, and parsing-result concepts. Use concept-owning classes where behavior/invariants require them; preserve file/project identity so repeated IDs across projects do not collide.
  - [x] 1.4 - Define raw-record retention and source linkage so every valid JSON input, including primitive/array values and unknown fields, remains available without requiring a recognized record shape. Keep runtime models distinct from UI or transport contracts; do not add speculative serialization types.

- [x] 2 - Implement source-preserving record interpretation
  - [x] 2.1 - Establish the parser entry boundary accepting source-located records without filesystem or framework dependencies. Preserve source order separately from chronological order and retain raw input without mutating it.
  - [x] 2.2 - Interpret supported user/assistant messages, ordered content blocks, thinking, tool calls/results, and system events using the mappings established in task 1. Retain identifiers and available metadata.
  - [x] 2.3 - Preserve recorded usage with its originating message and applicable turn/substep references without replicating a message's usage as independent charges on every content block or calculating totals/costs.
  - [x] 2.4 - Retain unknown records, unsupported content blocks, unknown fields, and partially interpretable records. Produce structured source-located diagnostics for interpretation gaps while returning usable recognized content.

- [x] 3 - Construct chronological turns and related activity
  - [x] 3.1 - Order timestamped activity by timestamp, preserving file order for ties and content-block order within messages. Define and document a deterministic source-order placement policy for missing/invalid timestamps, mark chronology uncertainty, and ensure valid timestamped activity remains chronologically ordered.
  - [x] 3.2 - Produce structured diagnostics when timestamp order differs from file order. Keep console reporting outside the parser and include source locations rather than transcript content.
  - [x] 3.3 - Build turns beginning with genuine user messages and containing subsequent assistant/tool/event substeps until the next genuine user message. Tool-result records must not start new user turns.
  - [x] 3.4 - Associate tool calls/results and other explicitly related activity using source identifiers while preserving chronological presentation. Handle ambiguous or conflicting relationships explicitly instead of inventing links or silently losing activity.
  - [x] 3.5 - Represent interrupted responses, incomplete turns, missing/unmatched tool calls/results, and unattached activity. Use evidence from records for completion status; retain uncertainty when completion cannot be established.

- [x] 4 - Coordinate file access and linked conversations
  - [x] 4.1 - Add a server-side conversation service that reuses existing discovery/reading and invokes the parser through the approved dependency direction. Keep interpretation out of the service and metadata-list loading unchanged.
  - [x] 4.2 - Parse parent and subagent files independently, preserving session-level associations and orphan subagent results. Link a subagent to a parent tool invocation only when explicit source evidence supports it; keep project/file context in relationship resolution.
  - [x] 4.3 - Preserve discovery/read warnings, failed-read outcomes, deferred trailing-record state, and empty readable conversations separately from parse diagnostics. Isolate failed or disappearing files so usable conversations remain available.
  - [x] 4.4 - Report ordering discrepancies to the server console during development using parser diagnostics. Keep development-mode detection and console effects outside the parser; do not print raw messages or tool payloads.
  - [x] 4.5 - Ensure each service load reflects current files without persistent ingestion or stale conversation retention. Expose the server-side service for later features without adding endpoints, browser payloads, or conversation UI.

- [ ] 5 - Validate the implemented feature using existing checks
  - [ ] 5.1 - Run the existing npm run check and npm test commands through the applicable validation workflow. Record runtime/environment and any checks that could not be completed; do not install dependencies or start persistent processes.
  - [ ] 5.2 - Use focused disposable-record/file checks to verify timestamp ordering, genuine-user turn boundaries, ordered content blocks, raw preservation, source linkage, recorded usage retention, and incomplete/unattached activity. Keep real Claude files read-only.
  - [ ] 5.3 - Verify parent/subagent separation, evidence-based links, failure isolation, deferred-tail completion on a later read, and development-only console diagnostics without transcript content. Confirm existing list behavior is preserved and parsing results stay server-side.

- [ ] 6 - Author and run conversation parsing tests
  - [ ] 6.1 - Add reusable synthetic record builders and conversation fixtures using the existing test runner and isolated temporary-file support. Keep parser unit tests independent of filesystem/framework state; never modify real Claude session files.
  - [ ] 6.2 - Cover supported message/content/event interpretation, genuine-user boundaries, ordered substeps, explicit tool relationships, metadata, and recorded usage associations without accounting calculations.
  - [ ] 6.3 - Cover reversed timestamp/file order, equal timestamps, missing/invalid timestamps, deterministic repeat parsing, and preserved content-block order. Verify ordering diagnostics identify source locations.
  - [ ] 6.4 - Cover unknown record types/fields/blocks, valid non-object JSON values, partial interpretation, raw input preservation without mutation, and source traceability.
  - [ ] 6.5 - Cover interrupted/incomplete turns, unmatched tools, unattached activity, ambiguous relationships, and incomplete-tail completion after a later read.
  - [ ] 6.6 - Cover service coordination for separate parent/subagent conversations, evidence-based tool links and session-level fallback, orphan retention, project identity collisions, empty/failed reads, warning propagation, and failure isolation.
  - [ ] 6.7 - Verify console reporting occurs only in development and excludes conversation content. Run the authored tests and existing npm run check/npm test commands; record results and execution limitations without starting a server or installing dependencies.

## Task 1 Implementation Notes

- Completed read-only local inspection of 38 files and 4,121 records, including one subagent transcript. Mapping evidence, synthetic-user distinctions, repeated response identifiers, and unobserved cases are documented in `03-conversation-parsing-source-mappings.md` without transcript content.
- Added server-only conversation, message, turn, substep, relationship, diagnostic, and parse-result contracts. Identity includes project/session/agent/file context; content-block references retain their source line and index.
- ConversationSource owns location validation and identity comparison. ConversationRecord retains a defensive snapshot of arbitrary parsed JSON and exposes copies. Other models are named structural contracts until parser behavior is implemented in subsequent tasks; no speculative transport or serialization layer was added.
- Original usage remains a message-level value with presence distinguished from absence; substeps link to their source message. Raw records preserve all unknown fields and record types independently of interpretation.
- git diff --check passed. User-selected validation on native Windows: npm run check passed with zero errors and zero warnings; npm test passed all 12 existing tests. These tests cover existing file-access/UI behavior, not dedicated conversation-model behavior; feature 3 test authoring remains task 6. WSL execution was not validated. No tests were authored, no server was started, and task 2 has not begun.

## Task 2 Implementation Notes

- Task 1 committed as `229508d` before task 2 began.
- Added ConversationParser accepting conversation identity and source-located ConversationRecord snapshots. It rejects cross-conversation input, preserves supplied record/file order, and performs no filesystem, framework, or console operations.
- Added ConversationRecordInterpreter as the owner of per-record interpretation and safe source-located diagnostics. It recognizes user/assistant envelopes, string and block-array content, text/thinking/tool-call/tool-result blocks, and system events. Known system subtypes are turn_duration and local_command; other system subtypes retain event content with a diagnostic.
- Every raw record remains available, including primitive/array/null values and unknown envelope types. Recognized blocks with invalid fields remain classified with diagnostics; unsupported blocks remain Unknown. Embedded API-request copies are not interpreted as fresh messages. Original extension fields remain in retained snapshots and full block content.
- Message observations retain record/response/request identifiers, model, timestamp, API block index, stop reason, and the original usage value with an explicit presence flag. Substeps refer to message sources instead of copying usage; repeated response ids do not collapse records. Turn association remains task 3.
- User-origin interpretation gives tool-result and synthetic metadata precedence; unsupported origins remain Unknown with a diagnostic. Classification does not construct turns or resolve relationships.
- All activity is currently returned in source order as unattached, with unknown completion status. Chronological ordering, turn construction, relationship resolution, and completion inference remain task 3; parent/subagent coordination remains task 4.
- Validation on native Windows: npm run check passed with zero errors/warnings; npm test passed all 12 existing file-access/UI regression tests. git diff --check passed. No dedicated parser tests were authored or run; they remain task 6. WSL execution was not validated.

## Task 3 Implementation Notes

- Task 2 committed as `0d8b009` before task 3 began.
- Added ConversationTimeline, ConversationRelationships, and ConversationTurnBuilder as cohesive owners within the approved parser boundary; ConversationParser coordinates these stages without filesystem/framework/console access.
- Chronology policy: sort records by source line, retain undated/invalid-timestamp records in their original ordinal slots, and fill dated slots in ascending timestamp order with source-line tie-breaking. Blocks move with their whole record and retain array order. Raw records and message observations retain input order independently of turn presentation. Reordered dated records produce a source-located TimestampOrderMismatch diagnostic.
- Turns begin only at interpreted initiating user messages, including messages with no content blocks. Earlier activity remains unattached. Tool-result and synthetic messages do not create turns. Each interpreted activity item remains present once in a turn or unattached activity.
- Relationship resolution indexes all record UUIDs, assistant record UUIDs, and tool-call IDs before resolving forward references. Missing, duplicate, and self-referencing targets remain explicit and unresolved. Tool-result, source-assistant, source-tool, and parent-record evidence is retained independently. Cross-turn activity links and disagreeing tool/source-assistant links produce diagnostics while preserving chronological membership and both references.
- Completion uses explicit assistant stop reasons conservatively: end_turn/stop_sequence complete a response; max_tokens/pause_turn indicate incompleteness; interrupted/cancelled indicate interruption; other or absent reasons remain unknown. A final tool_use response or unmatched tools leaves the turn incomplete. Starting another turn does not by itself establish completion. Tool calls with missing or multiple resolved results produce diagnostics; unmatched results remain represented.
- Validation on native Windows: npm run check passed with zero errors/warnings and npm test passed all 12 existing regression tests. Dedicated parser chronology/relationship tests remain task 6; no tests were authored and WSL execution was not validated. Task 4 has not begun.

## Task 4 Implementation Notes

- Added ConversationService.load() for server-only callers. Each call rediscovers files, rereads current contents, wraps source-located raw records, and invokes the existing parser independently for parents, subagents, and orphan subagents. No conversation cache, routes, UI changes, or persistent storage were introduced; SessionListService is unchanged.
- Added ConversationLoadResult and per-file ConversationFileResult. Access status and discovery/read warnings remain separate from parser diagnostics. A failed read has parsed=null/readFailed=true; an empty readable file has a successful empty parsed conversation. Deferred trailing-record state is retained for later callers. Orphan results retain their SessionFile parentSessionId and project/file context with orphan=true; no unavailable parent conversation is invented.
- Added ConversationSubagentLinker within the parser domain to keep record interpretation out of service orchestration. Read-only inspection found parent user tool-result records with toolUseResult.agentId. A link requires matching project/session identity, matching agentId, and one resolved tool-result invocation. Repeated evidence for the same target agrees; conflicting or unresolved evidence retains session membership with a diagnostic and no invented invocation link. No matching evidence also retains session-level membership.
- Parent read failure does not suppress child parsing; discovered parent identity remains linked even when its content is unavailable. Existing DAO/reader failure isolation preserves other usable results and file warnings.
- Ordering diagnostics are reported outside the parser through Vite import.meta.env.DEV only, logging source paths/lines without transcript payloads. Direct Node execution defaults to silent when Vite development metadata is absent.
- Validation on native Windows: npm run check passed with zero errors/warnings; npm test passed all 12 existing regression tests; git diff --check passed. Dedicated service/linking/development-console behavioral coverage remains tasks 5 and 6; no tests were authored, no server was started, and WSL execution was not validated.
