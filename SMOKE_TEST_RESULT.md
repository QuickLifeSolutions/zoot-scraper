# Easy Zoot Data Scraper smoke test

## Previous live actor test

Actor: `dainty_screw/easy-zoot-data-scraper`
Run ID: `8OIvi3YeUFgfeGauH`
Dataset ID: `8ISnxPX0GQDjbMUvp`
Run URL: https://console.apify.com/actors/4vsXJhs3BCrksCgps/runs/8OIvi3YeUFgfeGauH
Result: `SUCCEEDED`, but output had null currency/description/attributes and malformed size notes.

## Local fixed-branch smoke tests

Branch: `fix/easy-zoot-output-quality`

### Category smoke

Command:

```bash
npx --yes apify-cli run --purge --input-file /tmp/zoot_fixed_smoke_input.json
```

Input file: `/tmp/zoot_fixed_smoke_input.json`
Raw log: `/tmp/zoot_local_fixed_run.log`

Result: `SUCCEEDED`

Observed local output:

- Requests failed: 0
- Pagination enqueue was capped; the run no longer queues hundreds of pages for `maxItems: 2`.
- `priceCurrency`: `CZK`
- `currentBestPrice.formattedPrice`: populated, e.g. `1 911 Kč`
- Size notes fixed, e.g. `na cedulce 35,5; vyprodáno` instead of `(na`

### Product detail smoke

Command:

```bash
npx --yes apify-cli run --purge --input-file /tmp/zoot_product_smoke_input.json
```

Input file: `/tmp/zoot_product_smoke_input.json`
Raw log: `/tmp/zoot_product_local_fixed_run.log`

Result: `SUCCEEDED`

Observed product output:

- Dataset items: 1
- Brand fallback populated: `Under Armour`
- `priceCurrency`: `CZK`
- `currentBestPrice.formattedPrice`: `1 911 Kč`
- Size notes are complete, e.g. `na cedulce 35,5; vyprodáno`
- Description/attributes can still be `null`/empty when not present in the server-rendered page returned to Cheerio.

Verification commands passed:

```bash
npm run build
npm run lint
npm test
```
