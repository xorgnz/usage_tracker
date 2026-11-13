# Usage Calculation Model

## Representation and ownership

UsageCalculation is an immutable server-domain expression with known values, named unknowns, sums, binary products, and explicit references. Factories validate units and defensively retain operand/source/rate-reference arrays. UsageCalculationEngine evaluates expressions without file, framework, UI, or pricing-table access.

An evaluation retains its original calculation plus an additive decomposition: knownSubtotal + sum(unresolvedTerms). A subtotal of zero is not a claim that an unresolved amount is zero. unknowns lists dependencies in unresolved terms; original evidence remains accessible through calculation even when a mathematically zero factor eliminates a dependency from the evaluated amount.

Sums retain independently known amounts. Products preserve known partial amounts using (a + x)(b + y) = ab + ay + xb + xy, keeping residual terms grouped. This is finite arithmetic composition, not variable solving or general symbolic algebra. A missing input price does not invalidate a separately evaluated token total.

## Units and provenance

Supported units are scalar, tokens, USD, and USD-per-token. Sums require matching units. Products accept a scalar times any supported unit, or tokens times USD-per-token to produce USD. Other unit products are rejected. Rate-table unit conversion can use ExactDecimal.divideByInteger before creating a USD-per-token operand.

Expressions retain source references and selected rate IDs. Pricing terms will additionally retain the complete selected rate and assumptions through the existing UsageCostTerm contract in later tasks. Calculation formatting and display rounding are outside this module.

## Exact numeric limits

ExactDecimal uses a BigInt coefficient and decimal scale. It accepts nonnegative plain decimal strings without signs, whitespace, or exponent notation; no JavaScript number is used for currency arithmetic. Addition and multiplication are exact. Division by a positive integer succeeds only when the reduced result has a terminating decimal expansion; unsupported recurring results throw instead of rounding.

Normalized values support up to 10,000 coefficient digits and 1,000 decimal places. Inputs/operations outside these bounds throw RangeError. Trailing zeros are normalized, not rounded. Values above Number.MAX_SAFE_INTEGER remain exact when provided as decimal text. The evaluator limits expressions to 10,000 distinct nodes and depth 128; unsupported sizes fail explicitly. These are implementation limits, not display precision choices.

## Dependency and allocation identity

Unknown IDs must identify the actual conversation/model/category/source dependency, not a generic label such as unknown-price shared across unrelated terms. Repeated references to the same unknown retain its identity. Reusing an ID with different units, reasons, source evidence, or shared-total constraint is rejected rather than silently merging dependencies.

UsageCalculation.reference retains its target. A missing allocation may additionally retain sharedTotal as constraint/provenance evidence. That total is not an arithmetic operand and cannot make the individual allocation known. For example, two substep unknowns can reference the same 900-token response calculation while the response remains exactly 900. This layer does not solve their distribution.

The engine preserves explicit arithmetic multiplicity: x + x still contains two occurrences even though its dependency list contains x once. Accounting owns contribution membership and deduplication in task 3; callers must not add a known response total and its unmeasured allocation views as independent charges.
