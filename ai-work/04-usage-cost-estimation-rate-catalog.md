# Dated Usage Rate Catalog

## Local ownership

DatedUsageRateCatalog implements UsageRateCatalog using a defensive snapshot of local UsageRate records. InitialUsageRates.ts is the initial data table. There is no runtime network request, filesystem reader, dependency installation, pricing administration UI, or automatic update process.

Selection requires exact model/category/detail identity and a usable contribution timestamp. Unknown model aliases are not guessed. Cache-write totals without a duration are unsupported; their 5-minute and 1-hour measurements can be priced individually. Unsupported category details remain unresolved rather than inheriting another category's price.

## Time and validation rules

Intervals use start-inclusive/end-exclusive UTC instants. Zoned ISO timestamps with seconds and optional 1-3 millisecond digits are supported; offsets are normalized through their absolute instant. Date-only, zone-free, impossible calendar dates, and malformed values are rejected. UTC midnight is the explicit convention for date-only rate-card effective dates. Launch-day time is not asserted: historical base coverage starts the following UTC day.

Catalog issues retain invalid rows, duplicate IDs, overlaps, and internal gaps. At lookup time, invalid matching entries block only periods that they may affect; an unplaceable invalid date blocks that price key conservatively. Multiple valid active entries are ambiguous. Missing periods remain missing; no closest/latest/other-model fallback is used. Unaffected keys and periods remain usable.

Rate amounts use exact decimal text and a positive safe-integer token unit. Validation checks exact unit conversion against the existing decimal limits; invalid, nonterminating, or out-of-range conversions do not become rounded prices. Selected results retain the original effective interval, source, unit, rate ID, and assumptions.

## Initial evidence and coverage

Verified on 2026-11-13. The inspected records contain claude-sonnet-5, claude-opus-5, claude-opus-5-5, and claude-sonnet-5-5; synthetic model labels receive no invented rate.

The dated standard/global Claude API rows use the [October 22 rate card](https://assets.claude.com/5633dc848caa431115468f31c7085d695bbfb9cc.pdf) and [November 9 rate card](https://assets.claude.com/a04aca860a54b7323e33f449706e9b43680e1346.pdf). They specify USD per million tokens:

| Model | Input | Output | Cache read | 5m write | 1h write |
|---|---|---|---|---|---|
| Sonnet 5 | 2 | 10 | 0.2 | 2.5 | 4 |
| Opus 5 | 5 | 25 | 0.5 | 6.25 | 10 |
| Opus 5.5 | 4 | 20 | 0.2 | 5 | 8 |
| Sonnet 5.5 | 2 | 10 | 0.1 | 2.5 | 4 |

Both cards support the same included values; the second interval retains its own dated source even where prices did not change. The current [pricing documentation](https://platform.claude.com/docs/en/about-claude/pricing) is consistent with these values. The Sonnet 5.5 launch page lists an earlier cache-read price; it does not establish when that cache price changed. No cache schedule before October 22 is therefore supplied.

Historical input/output entries use the dated launch publications: [Sonnet 5](https://www.anthropic.com/news/claude-sonnet-5), [Opus 5](https://www.anthropic.com/news/claude-opus-5), [Opus 5.5](https://www.anthropic.com/claude-opus-5-5), and [Sonnet 5.5](https://www.anthropic.com/claude-sonnet-5-5). Their published base amounts are carried forward to the first dated card under an explicit estimate assumption, not evidence of an independently audited continuous price history. Earlier or otherwise unsupported history stays unresolved. Latest verified rates remain open-ended until a local update supersedes them; future price stability is not guaranteed.

## Pricing context limits

Initial entries represent Claude API standard/global list prices, not subscription charges or partner-platform billing. Missing service-tier/speed/geography metadata uses that explicit baseline assumption. Explicit nonstandard or unknown values (including inference_geo=not_available) return UnsupportedPricing instead of receiving standard/global prices. Fast, priority, batch, residency premiums, discounts, and non-token tool charges are not implemented by this initial table. Original usage metadata remains preserved for later interpretation; token counts remain usable independently of rate availability.
