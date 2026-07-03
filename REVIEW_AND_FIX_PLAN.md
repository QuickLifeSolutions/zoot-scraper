# Easy Zoot Data Scraper — Code Review and Fix Plan

Branch: `fix/easy-zoot-output-quality`
Actor: `dainty_screw/easy-zoot-data-scraper`
Live notice: `UNDER_MAINTENANCE`
Smoke-test run: `8OIvi3YeUFgfeGauH`

## Current evidence

- Live Apify CLI smoke test with `maxItems: 2` succeeded.
- Dataset produced 2 items, but output quality is incomplete:
  - `priceCurrency` is `null`.
  - Some `currentBestPrice.formattedPrice` values are `null`.
  - `description` is `null`.
  - `attributes` is empty.
  - Some size `note` values are malformed, e.g. `"(na"`.
- Apify actor info reports:
  - `notice: UNDER_MAINTENANCE`
  - last 30 days: `23 SUCCEEDED`, `6 TIMED-OUT`, `29 TOTAL`.
  - timeout rate: ~`20.7%` over the last 30 days.
- Build, lint, and regression tests pass locally.
- `npm test` now runs the product parser and crawl-budget regression suite.
- Independent subagent code review confirmed the same root cause pattern: unsafe defaults + queue explosion before `maxItems` enforcement + stale output selectors.

## In-depth review findings

### 1. High — default / example run is too broad and likely causes timeout pressure

Evidence:

- `.actor/input_schema.json` pre-fills 3 category URLs:
  - `https://www.zoot.cz/katalog/17504/zeny`
  - `https://www.zoot.cz/katalog/17572/muzi`
  - `https://www.zoot.cz/vse-pro-deti`
- The live smoke test opened only the first category and immediately enqueued:
  - 48 product detail pages
  - 504 next category pages
- With 3 default categories, the actor can enqueue roughly 1,500+ page requests plus product detail pages.
- `main.ts` defaults `maxItems` to `Number.MAX_SAFE_INTEGER` if input is missing.
- The input schema has `maxItems` prefill `100`, but no hard default in code/schema. If the actor is launched via API/default storage without maxItems, it can attempt an effectively unbounded crawl.

Likely impact:

- Public users clicking “Try” or running from example/default input may trigger large crawls.
- Apify may see repeated long-running or timed-out runs, explaining the `UNDER_MAINTENANCE` status.

Recommended fix:

- Make smoke-test defaults intentionally small and reliable:
  - 1 category URL only, or a known product detail URL.
  - code-level `maxItems` default of `25` or `50`, not `Number.MAX_SAFE_INTEGER`.
  - optional `maxRequestsPerCrawl` default / input field.
  - optional `maxConcurrency`, request timeout, and delay fields exposed in input schema and respected in `CheerioCrawler`.

### 2. High — crawler enqueues all pagination before enforcing max item budget

Evidence:

- `categoryRoute.ts` calls `enqueueProductDetails(context)` and then `enqueueNextPages(context)`.
- `enqueueNextPages()` builds every page URL from page 2 to total pages.
- For the first category in the smoke test, that was 504 page URLs even though `maxItems` was only 2.
- Max item control happens later in `preNavigationHooks` and `detailRoute`, after many requests have already entered the queue.

Likely impact:

- Unnecessary request queue growth.
- More chances for timeout before useful data is extracted.
- Public default runs look slower/heavier than needed.

Recommended fix:

- Add crawl budget state beyond `remainingItems`, e.g. `enqueuedDetailCount` or `maxRequestsPerCrawl`.
- Do not enqueue all pagination if `maxItems` is small.
- Estimate pages needed: `Math.ceil(maxItems / productsOnCurrentPage)` plus a small buffer.
- If `maxItems <= product links on first page`, skip pagination entirely.

### 3. High — selectors are stale for current Zoot detail pages

Evidence from smoke-test dataset:

- `priceCurrency` null indicates `PRICE_CURRENCY_SEL` no longer matches current CZ/SK markup.
- `description` and `attributes` are empty, indicating `[data-read-more-target="content"]` selectors likely no longer match or content structure changed.
- `brand.link` and `brand.logo` were both null in smoke output, so `BRAND_SEL` may also be stale.

Recommended fix:

- Update selectors against live Zoot HTML captured during Apify runs.
- Add fallback extraction from:
  - visible price text containing `Kč`, `€`, `lei`, etc.
  - JSON-LD or embedded product state if available.
  - generic product description blocks if `data-read-more-target` is absent.
- Add defensive parsing so missing selector fields produce clean fallbacks, not malformed output.

### 4. Medium — size note parsing is too naive

Evidence:

- `parseSizes()` uses:
  - `const [size, note] = sizeWithNote.split(/ - ?/);`
  - `note: note || sizeWithNote.split(' ')[1]`
- For values like `24/32 (na skladě)` this can produce partial note `"(na"`.

Recommended fix:

- Parse size notes with a safer regex:
  - extract parenthesized notes as full text.
  - keep size labels like `24/32` intact.
  - omit `note` when no full note exists.

### 5. Medium — README and input schema are inconsistent

Evidence:

- README example uses fields that are not in the actual schema:
  - `urls`
  - `waitForSelector`
- Live README also mentions advanced fields:
  - `maxRequestsPerCrawl`
  - `maxConcurrency`
  - `minRequestIntervalSecs`
  - `maxRequestIntervalSecs`
  - `navigationTimeoutSecs`
  - `requestHandlerTimeoutSecs`
- Actual `.actor/input_schema.json` exposes only:
  - `startUrls`
  - `maxItems`
  - `proxyConfiguration`
- The schema title is still boilerplate: `CheerioCrawler Template`.
- `main.ts` does not read the advanced README fields.

Likely impact:

- Users may launch the actor with invalid inputs or rely on broad defaults.
- Users think they can tune crawl limits/timeouts, but the actor ignores those settings.
- Harder to avoid public run timeouts.

Recommended fix:

- Replace README examples with real schema-compatible inputs.
- Update schema title/description from boilerplate.
- Either implement the documented fields or remove them from README.
- Preferred: implement them and add schema validation defaults.

### 6. Medium — no automated regression tests

Evidence:

- `npm test` always fails intentionally.
- No test fixtures for parsers.

Recommended fix:

- Add tests for pure parser helpers and URL pagination limiting.
- Extract parser functions from `detailRoute.ts` for testability.
- Use stored HTML fixtures or minimal synthetic snippets for price/currency/size parsing.

### 7. Low — outdated runtime baseline

Evidence:

- Dockerfile uses `apify/actor-node:16`.
- Live actor logs show Node `v16.20.2`.

Impact:

- Not the primary bug, but Node 16 is old.

Recommended fix:

- Upgrade to a current Apify Node image after parser/crawl fixes are verified.

## Proposed implementation plan — pending approval

### Phase 1 — Safety and reproducibility

#### Task 1: Add a small smoke input and parser test harness

Acceptance criteria:

- [ ] Add local fixture-based parser tests or a lightweight script that validates price/currency/description/attributes/sizes from representative HTML snippets.
- [ ] Replace the intentionally failing `npm test` with a real command.
- [ ] `npm run build`, `npm run lint`, and `npm test` pass.

Likely files:

- `package.json`
- `src/routes/detailRoute.ts` or new `src/parsers/product.ts`
- `test/*` or `tests/*`

#### Task 2: Create safe default input

Acceptance criteria:

- [ ] `.actor/input_schema.json` uses a small, reliable default/prefill suitable for a <5 minute trial.
- [ ] Code-level default `maxItems` is bounded, e.g. `25` or `50`.
- [ ] Default run does not attempt an unbounded crawl when input is missing.

Likely files:

- `.actor/input_schema.json`
- `src/main.ts`

### Phase 2 — Fix timeout / maintenance likely cause

#### Task 3: Limit pagination based on maxItems / request budget

Acceptance criteria:

- [ ] With `maxItems: 2`, the actor does not enqueue 504 pagination pages.
- [ ] With `maxItems: 50`, the actor enqueues only enough pages to satisfy the item target plus a small buffer.
- [ ] Optional `maxRequestsPerCrawl` is supported and honored.

Likely files:

- `src/types.ts`
- `src/main.ts`
- `src/routes/categoryRoute.ts`
- `src/utils.ts`
- `.actor/input_schema.json`

#### Task 4: Implement documented runtime tuning fields

Acceptance criteria:

- [ ] `maxConcurrency`, `minRequestIntervalSecs`, `maxRequestIntervalSecs`, `navigationTimeoutSecs`, and `requestHandlerTimeoutSecs` are accepted and used.
- [ ] Defaults are conservative enough for public trial runs.
- [ ] README and input schema agree.

Likely files:

- `src/types.ts`
- `src/main.ts`
- `.actor/input_schema.json`
- `README.md`

### Phase 3 — Fix output quality

#### Task 5: Update price/currency parsing

Acceptance criteria:

- [ ] `priceCurrency` is not null for CZ/SK/RO product pages when price text is available.
- [ ] `currentBestPrice.formattedPrice` is populated when visible price text exists.
- [ ] Numeric `currentBestPrice.value` still parses correctly.

Likely files:

- `src/constants.ts`
- `src/routes/detailRoute.ts` or new parser module
- tests/fixtures

#### Task 6: Update description, attributes, and brand extraction

Acceptance criteria:

- [ ] `description` is populated when product page contains product description text.
- [ ] `attributes` are parsed when parameter/specification rows exist.
- [ ] `brand` includes at least `name` when link/logo are missing.

Likely files:

- `src/constants.ts`
- `src/routes/detailRoute.ts` or new parser module
- tests/fixtures

#### Task 7: Fix size parsing

Acceptance criteria:

- [ ] Sizes like `24/32 (na skladě)` produce `size: "24/32"`, `note: "na skladě"` or no malformed note.
- [ ] No output contains partial notes like `"(na"`.

Likely files:

- `src/routes/detailRoute.ts` or parser module
- tests/fixtures

### Phase 4 — Verify on Apify

#### Task 8: Build/run remote verification

Acceptance criteria:

- [ ] Run remote actor on feature branch/build with safe default input.
- [ ] Run with `maxItems: 2` and `maxItems: 25`.
- [ ] Confirm both complete under 5 minutes.
- [ ] Confirm dataset has non-null key fields where page data exists.

Commands:

```bash
npm run build
npm run lint
npm test
npx --yes apify-cli call dainty_screw/easy-zoot-data-scraper --input-file /tmp/zoot_smoke_input.json --output-dataset --timeout 300
```

## Proposed Definition of Done

- [ ] Feature branch contains only targeted fixes.
- [ ] Build, lint, and tests pass.
- [ ] Apify smoke run completes under 5 minutes.
- [ ] Output no longer has known malformed fields for representative products.
- [ ] README and input schema match actual behavior.
- [ ] No secrets or dangerous code patterns introduced.

## Historical implementation note

This document captures the pre-fix investigation and approved remediation plan. The fixes, regression tests, and smoke-test evidence are now part of this branch.
