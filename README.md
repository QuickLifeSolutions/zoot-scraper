# Zoot Fashion Product Scraper

Collect structured product data from the Zoot fashion storefronts (cz/sk/ro) with pagination, rate limiting, and robust input validation. This actor is ready for production on the Apify platform or in your own automation pipelines.

## Quick Start

1. **Deploy** the actor (Apify console → *Actors* → *Create new* → upload this repo).
2. **Review input** – defaults crawl the Czech women’s category and stop after 50 products.
3. **Run** the actor. The dataset will populate with products containing price, brand, sizes, availability, imagery, breadcrumbs, and attributes.
4. **Export** results via dataset UI or API (`JSON`, `CSV`, `XLSX`, etc.).

## Apify Console Flow

1. Open the actor → *Input* tab.
2. Adjust `startUrls`, limits, and proxy settings; leave defaults for a quick smoke test.
3. Run the actor. Live logs surface pagination progress and remaining quota.
4. Inspect the dataset items, download exports, or connect webhooks under *Integrations*.

## API & Automation

- **Run via API**: `POST https://api.apify.com/v2/acts/<user>/<actor-name>/runs?token=...` with an input body matching the schema below.
- **Monitor status**: Poll the run `GET .../runs/<run-id>` or subscribe to webhooks.
- **Consume dataset**: `GET .../datasets/<dataset-id>/items?format=json&clean=1`.
- Integrate with Zapier, Make, or your CI/CD to trigger new crawls when inventory changes.

## Local Development

```bash
npm install
npm run start:dev      # Run TypeScript directly
npm run build          # Emit JS to dist/
npm run start:prod     # Execute compiled build
npm run lint           # Static analysis
```

Optional: populate the `storage` folder with session state or tweak `DEFAULT_INPUT.json` (bundled in the repo) for iterative tests. The included default input works with the bundled selectors and rate limits.

## Input Parameters

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `startUrls` | array of `{ url, label? }` | 3 core category URLs | Category or product detail URLs. Labels override auto-routing (`CATEGORY`, `DETAIL`). |
| `maxItems` | integer | 50 | Stop after this many product records reach the dataset. |
| `maxRequestsPerCrawl` | integer | – | Global ceiling for HTTP requests (useful when estimating traffic). |
| `maxConcurrency` | integer (1–10) | 2 | Parallel requests. Lowering reduces load on Zoot, raising speeds up large crawls. |
| `minRequestIntervalSecs` | number | 1 | Minimum random delay between completed requests. Set to 0 to disable throttling. |
| `maxRequestIntervalSecs` | number | 3 | Maximum random delay between completed requests. Must be ≥ `minRequestIntervalSecs`. |
| `navigationTimeoutSecs` | integer | 45 | Abort navigation if the response stalls longer than this. |
| `requestHandlerTimeoutSecs` | integer | 60 | Abort the page handler when processing exceeds this limit. |
| `proxyConfiguration` | Apify proxy payload | `{ useApifyProxy: true }` | Use Apify proxy groups or custom proxy URLs. The actor automatically falls back to direct connections if credentials are missing. |

Refer to `INPUT_SCHEMA.json` for the full specification and console editor hints.

## Output Schema

Each dataset item resembles:

```json
{
  "url": "https://www.zoot.cz/polozka/1234567/stylish-jacket",
  "name": "Stylish Jacket",
  "priceCurrency": "CZK",
  "currentBestPrice": { "value": 2199, "formattedPrice": "2 199 Kč" },
  "originalPrice": { "value": 2999, "formattedPrice": "2 999 Kč" },
  "saleCode": "WEEKEND10",
  "thumbnail": "https://images.zoot.cz/fit/1908x2562/...",
  "images": ["https://...", "..."],
  "brand": { "link": "https://www.zoot.cz/brand/only", "logo": "https://..." },
  "breadcrumbs": [
    { "text": "Ženy", "url": "https://www.zoot.cz/katalog/17504/zeny" }
  ],
  "description": "Lightweight jacket ideal for spring.",
  "attributes": [
    { "key": "Material", "value": "100 % polyester" }
  ],
  "sizes": [
    { "size": "S", "available": true, "note": null }
  ],
  "available": true
}
```

See `OUTPUT_SCHEMA.json` for official typings if you need to ingest data into typed consumers.

## Dataset Handling

- Use dataset exports for downstream analytics (`CSV` for BI tools, `JSONL` for pipelines).
- Attach a `dataset` webhook to stream items to webhooks, queues, or storage buckets in near real-time.
- Need historical comparisons? Configure dataset to append (`keepUrlFragment=true`) and manage TTL via Apify dataset settings.

## Troubleshooting

- **Auth/Proxy missing**: The actor logs a warning and proceeds without the Apify proxy. Supply valid credentials to avoid IP-based throttling.
- **Empty results**: Confirm your `startUrls` are full category or product URLs. Private or filtered pages may require cookies/session handling.
- **Slow runs**: Increase `maxConcurrency` cautiously and reduce request delays once you verify stability.
- **Blocked requests**: Consider residential proxy groups or longer delays between requests; capture log lines for support.

## Support

- Issues & enhancements: open a GitHub issue or email [codemasterdevops@gmail.com](mailto:codemasterdevops@gmail.com).
- Priority support & automation consulting: [Quick Life Solutions](https://apify.com/dainty_screw).
- Community chat & troubleshooting: [Discord](https://discord.gg/2WGj2PDmHb) and [YouTube tutorials](https://www.youtube.com/channel/UCSglWXooehH8Cy7LYHhXtqA).
