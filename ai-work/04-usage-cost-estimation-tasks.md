# Tasks: Usage and Cost Estimation

## Implementation Context

- Source: `04-usage-cost-estimation-prd.md`. Preserve the approved accounting/pricing and composable-calculation decisions in `00-architecture.md`.
- Feature 4 remains planned. This task list does not activate it or authorize implementation.
- Feature 3's conversation models and service are planned but not yet implemented in the inspected repository. Integrate with their actual contracts once available; do not build a second parser or invent a parallel conversation model.
- Use existing Node.js (`TC1`), strict TypeScript (`TC2`), SvelteKit (`TC3`), and npm (`TC4`). Preserve foreground execution inside WSL; no additional dependency is currently required.
- Place accounting, calculation objects, rate catalog, and estimation coordination in a cohesive server-only usage module with distinct concept owners. The service supplies inputs and coordinates; domain owners implement rules without filesystem or framework request-state access.
- Known operands remain usable despite missing dependencies. Preserve expressions, units, source references, named unknowns, and relationships rather than returning only a numeric subtotal or incomplete flag.
- No UI, database, data-editing support, pricing administration, ingestion, analytics, or billing reconciliation work belongs here. Test authoring is the separate final task.

## Relevant Files and Placement

- `ai-work/03-conversation-parsing-prd.md` and `ai-work/03-conversation-parsing-tasks.md` - Upstream conversation and usage-preservation contracts.
- `src/lib/server/conversations/` - Planned feature 3 models and service; confirm actual files before implementation.
- `src/lib/server/usage/` - Proposed local home for usage accounting, domain calculation objects, dated rate catalog, and estimation service within the approved boundaries.
- A local rate-table data file alongside the usage module - Establish its concrete name and format during task 4; preserve effective periods and source evidence.
- `src/lib/server/sessions/SessionListService.ts` - Existing metadata listing; do not add accounting to this owner.
- `tests/support/SessionFixture.ts` - Existing isolated file fixtures where integration checks require files.
- `tests/sessions.test.ts` and `tests/session-page.test.ts` - Existing regression coverage.
- `tests/tsconfig.json`, `tests/register.mjs`, `tests/loader.mjs`, and `package.json` - Existing test/check tooling; reuse without installing dependencies.

## Tasks

- [ ] 1 - Establish usage contracts and domain owners
  - [ ] 1.1 - Review implemented feature 3 contracts and representative preserved usage shapes. Identify response/substep usage, model and timestamp sources, cache categories/subcategories, and repeated or cumulative observations. Record supported semantics and gaps without guessing or copying private transcript content.
  - [ ] 1.2 - Establish named usage contribution, attribution, category, source identity, and result concepts. Preserve project/session/subagent identity and distinguish explicit zero, missing, and demonstrably not-applicable values.
  - [ ] 1.3 - Establish separate accounting, rate-catalog, calculation, and service owners within the server-only usage module. Define their explicit domain contracts before adding behavior; keep parsing, UI projection, and file loading outside domain calculations.
  - [ ] 1.4 - Define known-total/unknown-allocation relationships: a response with 900 tokens remains a known contribution while linked substep allocations remain unknown. Unknown allocations must not become additional usage contributions.

- [ ] 2 - Implement composable calculation objects
  - [ ] 2.1 - Model known operands, identified unknowns, units, supported arithmetic operations, dependencies, and provenance as durable domain concepts. Scope arithmetic to usage/cost needs without introducing a general symbolic algebra engine.
  - [ ] 2.2 - Implement evaluation that retains known subtotals and unresolved terms. Preserve independent known amounts when another operand is missing; retain the reason and source of each unresolved dependency.
  - [ ] 2.3 - Implement a precise numeric representation for rate multiplication and aggregation using the existing stack. Document its supported precision/range and prevent silent loss or intermediate display rounding; keep presentation formatting outside this owner.
  - [ ] 2.4 - Preserve references to shared totals and unknown allocations across composition. Maintain identity for repeated unknown references without conflating unrelated missing values or requiring an algebra solver.

- [ ] 3 - Implement token attribution and aggregation
  - [ ] 3.1 - Convert preserved usage into contributions carrying source, model, timestamp, category, and attribution level. Keep original values traceable and retain usable fields when others are absent or invalid.
  - [ ] 3.2 - Account separately for input, output, cache-read, and cache-write usage, including pricing-relevant recorded distinctions. Use inspected source semantics to avoid double counting overlapping category totals and breakdowns.
  - [ ] 3.3 - Associate actual substep usage where supported; otherwise link unknown individual allocations to known response totals. Preserve known counts without inventing distributions.
  - [ ] 3.4 - Aggregate contributions into assistant-response, turn, and session results once each. Handle repeated observations using supported identity/semantics; surface conflicting or ambiguous data rather than silently choosing or summing it.
  - [ ] 3.5 - Retain independent subagent totals and provide parent-only and combined totals with explicit contribution membership. Avoid duplicate inclusion through multiple relationship paths and preserve project/session identity.
  - [ ] 3.6 - Compose partial token totals from known operands and genuinely missing contributions while keeping unknown internal allocations from invalidating a known enclosing total.

- [ ] 4 - Implement the dated model-rate catalog
  - [ ] 4.1 - Define local rate records with model/category identity, USD rate and unit, effective periods, and source/assumption provenance. Document timestamp normalization and interval-boundary conventions.
  - [ ] 4.2 - Populate an initial rate table from verified authoritative pricing sources for supported observed models/categories. Record evidence for effective dates; leave unsupported historical periods unresolved instead of applying today's price retroactively. Runtime network price fetching and administration UI remain out of scope.
  - [ ] 4.3 - Implement catalog selection by usage model, timestamp, and category, preserving relevant pricing distinctions. Return the selected rate and effective period with provenance.
  - [ ] 4.4 - Detect invalid entries, overlapping effective periods, gaps, unknown models/categories, and missing/invalid timestamps. Expose unresolved dependencies for affected lookups without silently substituting an unrelated/current rate or blocking unrelated valid lookups.

- [ ] 5 - Coordinate usage and cost estimation
  - [ ] 5.1 - Implement the estimation service using actual feature 3 conversation outputs. Supply accounting and rate-catalog inputs while keeping their business rules in their respective owners.
  - [ ] 5.2 - Compose category-specific cost terms from token operands and selected or unresolved rates, with explicit rate-unit conversion. Preserve model/timestamp-specific pricing before aggregating across contributions.
  - [ ] 5.3 - Return structured results at substep, response, turn, session, and parent/subagent aggregation levels. Preserve known subtotals, unresolved terms, shared-total links, source references, and applied rate assumptions for later UI projection.
  - [ ] 5.4 - Keep missing price dependencies confined to dependent costs; retain known token totals and independently calculable costs. Preserve upstream incomplete-data diagnostics so results do not imply unsupported completeness.
  - [ ] 5.5 - Expose the server-side estimation capability without adding UI, endpoints, persistent storage, or missing-data editing mechanisms. Preserve the parser's independence and the existing metadata-list responsibility.

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
