# Tasks: Usage and Cost Estimation

## Implementation Context

- Source: `04-usage-cost-estimation-prd.md`. Preserve the approved accounting/pricing and composable-calculation decisions in `00-architecture.md`.
- Feature 4 is active in 00-feature-status.md. Execute only explicitly requested tasks.
- Feature 3's conversation models and service are implemented. Integrate with their actual contracts; do not build a second parser or invent a parallel conversation model.
- Use existing Node.js (`TC1`), strict TypeScript (`TC2`), SvelteKit (`TC3`), and npm (`TC4`). Preserve foreground execution inside WSL; no additional dependency is currently required.
- Place accounting, calculation objects, rate catalog, and estimation coordination in a cohesive server-only usage module with distinct concept owners. The service supplies inputs and coordinates; domain owners implement rules without filesystem or framework request-state access.
- Known operands remain usable despite missing dependencies. Preserve expressions, units, source references, named unknowns, and relationships rather than returning only a numeric subtotal or incomplete flag.
- No UI, database, data-editing support, pricing administration, ingestion, analytics, or billing reconciliation work belongs here. Test authoring is the separate final task.

## Relevant Files and Placement

- `ai-work/03-conversation-parsing-prd.md` and `ai-work/03-conversation-parsing-tasks.md` - Upstream conversation and usage-preservation contracts.
- `src/lib/server/conversations/` - Implemented feature 3 models and service supplying preserved usage and source references.
- `src/lib/server/usage/` - Proposed local home for usage accounting, domain calculation objects, dated rate catalog, and estimation service within the approved boundaries.
- A local rate-table data file alongside the usage module - Establish its concrete name and format during task 4; preserve effective periods and source evidence.
- `src/lib/server/sessions/SessionListService.ts` - Existing metadata listing; do not add accounting to this owner.
- `tests/support/SessionFixture.ts` - Existing isolated file fixtures where integration checks require files.
- `tests/sessions.test.ts` and `tests/session-page.test.ts` - Existing regression coverage.
- `tests/tsconfig.json`, `tests/register.mjs`, `tests/loader.mjs`, and `package.json` - Existing test/check tooling; reuse without installing dependencies.

## Tasks

- [x] 1 - Establish usage contracts and domain owners
  - [x] 1.1 - Review implemented feature 3 contracts and representative preserved usage shapes. Identify response/substep usage, model and timestamp sources, cache categories/subcategories, and repeated or cumulative observations. Record supported semantics and gaps without guessing or copying private transcript content.
  - [x] 1.2 - Establish named usage contribution, attribution, category, source identity, and result concepts. Preserve project/session/subagent identity and distinguish explicit zero, missing, and demonstrably not-applicable values.
  - [x] 1.3 - Establish separate accounting, rate-catalog, calculation, and service owners within the server-only usage module. Define their explicit domain contracts before adding behavior; keep parsing, UI projection, and file loading outside domain calculations.
  - [x] 1.4 - Define known-total/unknown-allocation relationships: a response with 900 tokens remains a known contribution while linked substep allocations remain unknown. Unknown allocations must not become additional usage contributions.

- [x] 2 - Implement composable calculation objects
  - [x] 2.1 - Model known operands, identified unknowns, units, supported arithmetic operations, dependencies, and provenance as durable domain concepts. Scope arithmetic to usage/cost needs without introducing a general symbolic algebra engine.
  - [x] 2.2 - Implement evaluation that retains known subtotals and unresolved terms. Preserve independent known amounts when another operand is missing; retain the reason and source of each unresolved dependency.
  - [x] 2.3 - Implement a precise numeric representation for rate multiplication and aggregation using the existing stack. Document its supported precision/range and prevent silent loss or intermediate display rounding; keep presentation formatting outside this owner.
  - [x] 2.4 - Preserve references to shared totals and unknown allocations across composition. Maintain identity for repeated unknown references without conflating unrelated missing values or requiring an algebra solver.

- [x] 3 - Implement token attribution and aggregation
  - [x] 3.1 - Convert preserved usage into contributions carrying source, model, timestamp, category, and attribution level. Keep original values traceable and retain usable fields when others are absent or invalid.
  - [x] 3.2 - Account separately for input, output, cache-read, and cache-write usage, including pricing-relevant recorded distinctions. Use inspected source semantics to avoid double counting overlapping category totals and breakdowns.
  - [x] 3.3 - Associate actual substep usage where supported; otherwise link unknown individual allocations to known response totals. Preserve known counts without inventing distributions.
  - [x] 3.4 - Aggregate contributions into assistant-response, turn, and session results once each. Handle repeated observations using supported identity/semantics; surface conflicting or ambiguous data rather than silently choosing or summing it.
  - [x] 3.5 - Retain independent subagent totals and provide parent-only and combined totals with explicit contribution membership. Avoid duplicate inclusion through multiple relationship paths and preserve project/session identity.
  - [x] 3.6 - Compose partial token totals from known operands and genuinely missing contributions while keeping unknown internal allocations from invalidating a known enclosing total.

- [x] 4 - Implement the dated model-rate catalog
  - [x] 4.1 - Define local rate records with model/category identity, USD rate and unit, effective periods, and source/assumption provenance. Document timestamp normalization and interval-boundary conventions.
  - [x] 4.2 - Populate an initial rate table from verified authoritative pricing sources for supported observed models/categories. Record evidence for effective dates; leave unsupported historical periods unresolved instead of applying today's price retroactively. Runtime network price fetching and administration UI remain out of scope.
  - [x] 4.3 - Implement catalog selection by usage model, timestamp, and category, preserving relevant pricing distinctions. Return the selected rate and effective period with provenance.
  - [x] 4.4 - Detect invalid entries, overlapping effective periods, gaps, unknown models/categories, and missing/invalid timestamps. Expose unresolved dependencies for affected lookups without silently substituting an unrelated/current rate or blocking unrelated valid lookups.

- [x] 5 - Coordinate usage and cost estimation
  - [x] 5.1 - Implement the estimation service using actual feature 3 conversation outputs. Supply accounting and rate-catalog inputs while keeping their business rules in their respective owners.
  - [x] 5.2 - Compose category-specific cost terms from token operands and selected or unresolved rates, with explicit rate-unit conversion. Preserve model/timestamp-specific pricing before aggregating across contributions.
  - [x] 5.3 - Return structured results at substep, response, turn, session, and parent/subagent aggregation levels. Preserve known subtotals, unresolved terms, shared-total links, source references, and applied rate assumptions for later UI projection.
  - [x] 5.4 - Keep missing price dependencies confined to dependent costs; retain known token totals and independently calculable costs. Preserve upstream incomplete-data diagnostics so results do not imply unsupported completeness.
  - [x] 5.5 - Expose the server-side estimation capability without adding UI, endpoints, persistent storage, or missing-data editing mechanisms. Preserve the parser's independence and the existing metadata-list responsibility.

- [ ] 6 - Validate implementation using existing checks
  - [ ] 6.1 - Run existing npm run check and npm test through the applicable validation workflow, recording runtime/environment and unresolved limitations. Do not install dependencies or start persistent processes.
  - [ ] 6.2 - Verify focused examples for 900-token shared response usage, known token counts with unknown rates, partial cost expressions, separate cache categories, and parent/subagent totals. Use synthetic/disposable data and keep real session files read-only.
  - [ ] 6.3 - Verify rates immediately before/at/after an effective-date boundary, rate gaps/overlaps, provenance, and precision through repeated aggregation. Confirm the service exposes structured uncertainty rather than only display strings or incomplete flags.

- [ ] 7 - Author and run usage/cost tests
  - [ ] 7.1 - Add reusable synthetic conversation, usage, and dated-rate builders using existing tooling. Keep domain tests independent of filesystem/framework state; use isolated temporary fixtures only when necessary.
  - [ ] 7.2 - Cover all token categories, recorded subcategories, explicit zero versus missing/not-applicable values, attribution, source/model/timestamp retention, repeated observations, and conflicting data.
  - [ ] 7.3 - Cover shared response totals with unknown substep allocations, genuine missing contributions, mixed known/unknown aggregates, and prevention of double counting at every level.
  - [ ] 7.4 - Cover parent-only, individual subagent, and combined results, repeated relationship references, and identical IDs in different projects/sessions.
  - [ ] 7.5 - Cover historical rate selection, exact interval boundaries, timestamp normalization, gaps, overlaps, invalid entries, missing model/time/rate, and preservation of selected-rate evidence.
  - [ ] 7.6 - Cover composable partial expressions, dependency-specific uncertainty, known tokens with unknown prices, distinct unknown identities, units, precision, and traceability through aggregation.
  - [ ] 7.7 - Cover service integration with feature 3 models and upstream incomplete-data outcomes. Run authored tests and existing npm run check/npm test; record results and any environment limitations.

## Task 1 Implementation Notes

- Reviewed actual ConversationMessage, ConversationSource, Conversation, and ConversationLoadResult contracts. Recorded read-only usage inspection in 04-usage-cost-estimation-source-mappings.md: 886 assistant usage observations, 373 identical repeated response-id observations, no observed per-content-block usage, and matching cache-write total/breakdown sums in this sample. Differing/cumulative observation semantics remain unproven; later accounting must preserve conflicts rather than invent a rule.
- Added a server-only usage module with named category, attribution, contribution, breakdown, diagnostic, accounting/result, rate-selection, calculation/evaluation, and estimation contracts. Accounting consumes actual Conversation objects; estimation accepts ConversationLoadResult so upstream limitations stay available. Contracts define ownership without stub implementations or premature arithmetic/rate-loading/aggregation behavior.
- TokenQuantity owns known-count validation and the distinction between known zero, unknown with a reason, and not-applicable with supporting evidence. SharedUsageAllocation links an unmeasured substep to its measured contribution while validating conversation identity; it is not an independent contribution. UsageBreakdown preserves total/component relationships without declaring them additive.
- Contribution identity preserves source/project/session/agent/file context and repeated observation references, response/request ids, model, timestamp, category/detail, original value and field path. Decimal-text amount contracts leave exact arithmetic implementation to task 2; no floating-point cost calculation or display formatting was added.
- Updated stale task context to reflect active feature 4 and implemented feature 3. Preserved the already-uncommitted feature-status transition; no commit was created.
- Validation on native Windows Node.js 24.19.0: npm run check passed with zero errors/warnings; npm test passed all 35 existing tests; git diff --check passed. These are regression/type checks, not dedicated usage-contract tests. No tests were authored, no dependencies installed, no server started, and WSL execution was not validated. Task 2 has not begun.

## Task 2 Implementation Notes

- Task 1 committed as 47e6a8e before this task began; the earlier feature-status transition remains uncommitted and unchanged.
- Implemented immutable UsageCalculation objects for known/unknown operands, sums, products, and references. Supported units and product compatibility are explicit; source and rate references remain attached. Shared-total evidence is retained separately from arithmetic operands so unknown allocations do not acquire the measured response amount.
- Added UsageCalculationEngine with exact known-subtotal plus unresolved-expression evaluation, dependency-specific unknowns, partial-product decomposition, and rejection of unknown-ID collisions with differing evidence. No pricing lookup, usage extraction/deduplication, UI formatting, or algebra solver was added.
- Added BigInt-backed ExactDecimal addition, multiplication, and exact terminating division by positive integers. Unsupported range/scale or nonterminating division fails explicitly rather than rounding. Supported limits and allocation/dependency semantics are documented in 04-usage-cost-estimation-calculation-model.md.
- Focused in-memory runtime examples produced exact 0.1 + 0.2 = 0.3, 3 / 1,000,000 = 0.000003, 1,200 tokens at that rate = 0.0036, and 9007199254740993 + 1 = 9007199254740994. Partial examples retained a known USD subtotal of 0.42 plus one unresolved rate term, and (2 + x) x 3 retained known 6 plus an unresolved term. Allocation examples retained their shared 900-token total without assigning it to the substep. Invalid unit sums, nonterminating division, and excessive scale were rejected. No test files were authored.
- Validation on native Windows Node.js 24.19.0: npm run check passed with zero errors/warnings; npm test passed all 35 existing regression tests. Dedicated usage arithmetic/uncertainty coverage remains task 7. WSL execution was not validated; no dependencies were installed or server started. Task 3 has not begun.

## Task 3 Implementation Notes

- Task 2 committed as b944c7b before this task began. The prior feature-status change remains uncommitted.
- Added TokenUsageAccounting, UsageMeasurementReader, UsageTokenCalculations, and UsageIdentity within the server-only usage module. Reconciliation, category expressions, and grouping have explicit owners; parsing, pricing, filesystem, and UI responsibilities are unchanged.
- Contributions preserve all source observations and raw usage values with presence, field-path, model, timestamp, and request evidence. Repeated identical response/category observations count once. Conflicting/invalid measurements remain unknown rather than choosing latest/max or adding snapshots; unaffected categories remain known. Model/time conflicts preserve counts while withholding unsupported pricing metadata.
- Input/output/cache-read/cache-write remain distinct. Breakdown records retain total/component relationships and explicit exhaustiveness. Known totals are not added to breakdowns; missing totals can retain known components and unresolved remainder. Unsupported cache structures retain uncertainty. Explicit zero stays known and missing fields are not declared not-applicable.
- Actual block usage in the supported named-field schema supplies block views; unmeasured substeps retain shared-allocation references. Block views never add to known response totals. Partial measured blocks can participate in missing-response calculations with an unknown remainder; repeated-response block observations are not blindly summed.
- Group results cover substeps, responses, turns, own sessions, and sessions including linked subagents. Turn membership reuses parser chronology and handles empty-content responses. Cross-turn duplicate response evidence produces unknown turn allocations while session usage remains counted once. Full identity and visited membership prevent repeated contribution inclusion across projects/subagents. Distinct current snapshots for one file identity are rejected rather than silently merged.
- Focused in-memory examples confirmed repeated output=900 once; conflicting output counts unresolved with other categories intact; known input=100 plus a genuinely missing input term; output=920 from independent 900/20 responses; cache total=100 without adding its 30/70 breakdown; missing cache total with complete breakdown=100; measured substep=50 without changing response=900; combined parent/subagent=1800 while each own total=900; empty-content turn membership and explicit zero; and cross-turn ambiguity with known session totals. No permanent tests were authored.
- Validation on native Windows Node.js 24.19.0: npm run check passed with zero errors/warnings; npm test passed all 35 existing regression tests; git diff --check passed. Dedicated accounting coverage remains task 7; WSL execution was not validated. No dependencies installed or server started. Task 4 has not begun. Accounting policies are documented in 04-usage-cost-estimation-accounting-model.md.

## Task 4 Implementation Notes

- Task 3 committed as 606605a before this task began; the earlier feature-status transition remains uncommitted.
- Added DatedUsageRateCatalog and InitialUsageRates.ts. The 48 initial rows cover the four observed non-synthetic models, historical launch input/output estimates, and separately sourced October 22/November 9 standard/global schedules including cache-read and duration-specific cache writes. Rates carry USD amount/unit, effective intervals, source URLs, and explicit assumptions. Sources, exact coverage, and limitations are documented in 04-usage-cost-estimation-rate-catalog.md.
- Verified official Anthropic launch pages, pricing documentation, and dated rate-card PDFs. Cache history before October 22 remains missing rather than applying current prices retroactively; in particular, a differing Sonnet 5.5 launch cache-read value does not establish its price-change instant. Historical base coverage begins the day after dated announcements and explicitly assumes published base amounts continue to the first rate card. Latest verified rows are open-ended pending a local update.
- Catalog lookup uses exact model/category/detail plus zoned timestamps with strict calendar validation. Start-inclusive/end-exclusive periods, equivalent offsets, invalid timestamps, gaps, overlaps, duplicate IDs, malformed rows, and exact numeric conversion are handled explicitly. Invalid entries are isolated to matching keys/affected periods. Unknown models have no inferred aliases or fallback rates.
- Initial rates are standard/global Claude API estimates. Explicit unsupported service-tier/speed/geography metadata yields UnsupportedPricing; missing context uses the recorded baseline assumption. Unspecified cache-write duration is unresolved. No network access, price-management UI, filesystem loader, or new dependency is used at runtime.
- Focused in-memory examples selected the old/new synthetic prices just before/at a boundary and for an equivalent timezone offset; gaps returned MissingRate, overlaps AmbiguousRate, invalid matching entries InvalidRate, and unrelated valid periods stayed usable. Impossible dates and zone-free timestamps remained unresolved. Verified cache5m/cache1h selection, pre-evidence cache gaps, unknown models, and unsupported fast-mode context. No permanent test files were authored.
- Validation on native Windows Node.js 24.19.0: npm run check passed with zero errors/warnings; npm test passed all 35 existing regression tests; git diff --check passed. Dedicated catalog coverage remains task 7; WSL execution was not validated. No dependencies were installed or server started. Task 5 has not begun.

## Task 5 Implementation Notes

- Task 4 committed as 594c938 before this task began. The earlier feature-status transition remains uncommitted.
- Added UsageEstimationService consuming actual ConversationLoadResult outputs, coordinating the existing accounting/catalog contracts, cost composition, and exact evaluation. Added UsageCostCalculations and UsageCoverage as named owners for pricing expression composition and source-coverage gaps. No parser, metadata listing, route, UI, persistence, or editing changes were made.
- Results retain per-category token/cost evaluations at every accounting level, canonical contribution membership, source/raw/diagnostic evidence, applied rate records and assumptions, exact unit conversion, unresolved rates, and shared allocation totals. Price selection precedes aggregation. Cache-duration components are alternatives to their enclosing measurement; unsupported remainder pricing stays symbolic.
- Source gaps remain separate from missing prices. Unread/skipped/deferred file usage adds explicit unknown token/cost terms to affected session results. Readable subagent amounts survive failed parent reads in combined results. Unassignable discovery gaps remain explicit at result level; parser and access diagnostics remain available unchanged. UsageEstimationService usage and result semantics are documented in 04-usage-cost-estimation-service.md.
- Disposable in-memory examples using the actual parser confirmed output=900 once, unknown substep allocations with four priced shared-total links, 10/30 cache-write tokens priced at distinct 5m/1h rates, own cost=0.018696 USD and combined parent/child cost=0.037392 USD, known output tokens with an empty rate catalog, and a failed parent retaining child cost=0.018696 USD plus unresolved parent usage. Real session files were not read or modified for these checks; no permanent tests were authored.
- Native Windows Node.js 24.19.0: npm run check passed with zero errors/warnings; npm test passed all 35 existing regression tests. WSL execution was not validated. Dedicated feature validation and authored usage/cost tests remain unchecked as tasks 6 and 7. No dependencies were installed or persistent processes started. Task 5 changes are uncommitted.