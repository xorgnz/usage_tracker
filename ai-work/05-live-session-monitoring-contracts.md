# Monitoring Contracts and Placement

## Existing Reuse Points

- SessionFileDAO discovers parent/subagent files with full source paths and project/session identity. SessionListService is a metadata-list owner, not the new monitoring coordinator.
- SessionJsonlReader currently reads complete files. SessionReadResult retains JSON values and physical line numbers; the incremental reader can expose the same records while retaining byte-level tracking internally.
- ConversationParser.parse accepts a ConversationIdentity and source-located ConversationRecord objects without filesystem access. Retained SessionRecord values can be wrapped at this boundary. ConversationSubagentLinker links independently parsed snapshots; its relationship diagnostics must survive refreshes.
- ConversationService.load currently combines discovery, complete reads, parsing, and linking. Monitoring should reuse the parser/linker contracts with retained records instead of calling that fresh-read workflow for every update. Existing fresh-read callers remain supported.
- UsageEstimationService.estimate accepts ConversationLoadResult, preserving file warnings, deferred tails, orphans, and parser diagnostics alongside accounting, cost groups, and source gaps. Supply a current coherent family result, not an appended list of token charges. Family membership changes also invalidate combined estimates.
- The current page load creates SessionListService for each load/invalidation. Later transport integration must obtain shared monitoring state rather than recreate the store per request. No route or page behavior changes in task 1.

## File-access Contracts

`src/lib/server/sessions/IncrementalSessionRead.ts` defines SessionFileRevision, SessionFileCheckpoint, TrackedSessionFile, SessionFileChange, IncrementalSessionReadResult, and IncrementalSessionReader.

The read offset describes all consumed bytes, while the complete offset stops after the last completed line. Their difference is the retained trailing byte count. nextLineNumber is the next physical line, including malformed completed lines in its progression. records contains successfully decoded complete records; warnings preserve malformed-line evidence. Byte arrays stay server-side and must be defensively owned by the eventual reader. Checkpoints describe retained comparison evidence without selecting the consistency-check algorithm before task 2.

A failed advance returns the previous successful snapshot (or null if none exists), marks the attempt Failed, and supplies attempt diagnostics separately from retained record diagnostics. It does not publish an incomplete replacement or falsely advance the successful read time. Actual append, rebuild, race handling, and consistency validation belong to task 2.

## Server Monitoring Contracts

`MonitoringSessionIdentity` owns the internal identity key: configured source directory plus project directory, session ID, agent ID, and file path. It validates nonempty identity values and freezes its copied identity. It neither normalizes filesystem paths nor accepts browser keys as paths; source resolution belongs to configuration/file access and browser key resolution belongs to transport/projection.

`MonitoringSnapshot.ts` defines safe issue metadata, freshness, per-session retained read/parse state, family estimate membership, coherent published snapshots, and the MonitoringUpdater interface. A bound updater refreshes all discovered sessions independently of browser expansions. This interface does not implement polling, shared-store lifetime, or request coalescing.

Generations identify published data revisions rather than time. File snapshots retain their own generation; session and family states carry the generation of their derived results. The top-level snapshot generation identifies the coherent publication while unchanged members can retain older derived generations. Source-update timestamps remain distinct from attempted/successful refresh times. A stale session can retain its previous parse/estimate even when a newer attempt fails. Family states retain explicit membership and one existing UsageEstimationResult, avoiding a second accounting implementation.

`MonitoringProjection.ts` defines the one-way runtime-to-browser mapping. It accepts a coherent MonitoringSnapshot plus the parsed MonitoringSelection and returns MonitoringResponseViewModel; it performs no refresh or accounting. The concrete coordinator/store and projection implementations belong to tasks 3 and 4.

## Browser Contracts

`src/lib/monitoring/MonitoringViewModel.ts` is browser-safe and imports no server modules. It deliberately declares display-facing enums separately from runtime calculation/accounting enums; task 4 owns explicit mapping rather than leaking server imports into the client.

MonitoringResponseViewModel contains summaries for all sessions, requested activity details, requested calculation explanations, snapshot identity, and freshness/failure metadata. Summary rows retain ordinary file metadata, explicit orphan/parent identity, own/combined category amounts, update/activity timestamps, and refresh status. Null usage means no successful result is available; a known subtotal with unresolved terms means an available partial calculation, not zero or an unavailable result.

Compact amount summaries preserve exact decimal text, unit, unresolved-term count, and an explanation ID. Detailed calculation view models provide a referenced node graph with operand IDs, named unknowns, shared-total references, source locations, and selected-rate evidence/assumptions. Known pricing context remains available even when a price is unknown. This keeps explanatory graph payloads on demand instead of eagerly transmitting every session's detailed calculations. Dates are ISO strings and graph references are IDs, not Date, BigInt, ExactDecimal, or domain class instances.

MonitoringSelection is a real transport selection contract: expanded session keys and explanation IDs. All keys must resolve against the configured snapshot. They never authorize arbitrary filesystem reads. Expanded activity is a counts/model/latest-activity summary with diagnostics, not transcript content or conversation/step inspection. The type contracts do not implement serialization, identity lookup, or payload filtering; those guarantees must be enforced in task 4.

## Task Boundary

Task 1 adds contracts, identity invariants, and this placement record only. It does not start incremental reading, cache/store behavior, parsing changes, refresh routes, browser scheduling, UI changes, or test authoring. Existing parser/accounting/rate-selection/calculation behavior remains unchanged. Dedicated feature tests remain task 8.
