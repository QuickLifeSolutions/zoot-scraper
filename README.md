# CodeMaster Zoot Scraper

Collect structured product data from Zoot fashion storefronts in the Czech Republic, Slovakia, and Romania.

Supported domains:

- `zoot.cz`
- `zoot.sk`
- `zoot.ro`

The default input is intentionally small so public trial runs finish quickly and avoid queueing hundreds of pagination pages.

## Quick start

```json
{
    "startUrls": [
        "https://www.zoot.cz/katalog/17504/zeny"
    ],
    "maxItems": 25,
    "maxRequestsPerCrawl": 100,
    "maxConcurrency": 2,
    "proxyConfiguration": {
        "useApifyProxy": true
    }
}
```

For a very small smoke test:

```json
{
    "startUrls": [
        "https://www.zoot.cz/katalog/17504/zeny"
    ],
    "maxItems": 2,
    "maxRequestsPerCrawl": 20,
    "maxConcurrency": 1,
    "proxyConfiguration": {
        "useApifyProxy": true
    }
}
```

## Input parameters

| Field | Type | Default | Description |
|---|---|---:|---|
| `startUrls` | string[] | one CZ women category | Category or product detail URLs. |
| `maxItems` | integer | `25` | Maximum product records to save. |
| `maxRequestsPerCrawl` | integer | `max(100, maxItems * 4)` | Hard request budget for category, pagination, and detail requests, derived in `src/config.ts` when not provided. |
| `maxConcurrency` | integer | `2` | Maximum parallel requests. |
| `minRequestIntervalSecs` | number | `0` | Minimum random delay before requests. |
| `maxRequestIntervalSecs` | number | `1` | Maximum random delay before requests. |
| `navigationTimeoutSecs` | integer | `45` | Navigation timeout. |
| `requestHandlerTimeoutSecs` | integer | `60` | Request handler timeout. |
| `proxyConfiguration` | object | Apify Proxy enabled | Proxy settings. |

## Output example

```json
{
    "url": "https://www.zoot.cz/damske/detail-vyrobku/475078-gap-dziny-high-rise-universal-legging-washwell-gap/vse/5678:modra-modra/",
    "name": "GAP - Džíny High Rise Universal Legging Washwell GAP",
    "priceCurrency": "CZK",
    "currentBestPrice": {
        "value": 1089,
        "formattedPrice": "1 089 Kč"
    },
    "originalPrice": {
        "value": null,
        "formattedPrice": null
    },
    "saleCode": null,
    "thumbnail": "https://d010202.zoot.cz/_galerie/varianty/357/3570879-z.jpg",
    "images": [
        "https://d010202.zoot.cz/_galerie/varianty/357/3570879-z.jpg"
    ],
    "brand": {
        "link": "https://www.zoot.cz/znacka/gap",
        "logo": null,
        "name": "GAP"
    },
    "breadcrumbs": [
        {
            "text": "ZOOT.cz",
            "url": "https://www.zoot.cz/"
        }
    ],
    "description": "Product description when available.",
    "attributes": [
        {
            "key": "Material",
            "value": "100% cotton"
        }
    ],
    "sizes": [
        {
            "size": "25/32",
            "available": true,
            "note": "na skladě"
        }
    ],
    "available": true
}
```

## Local development

```bash
npm install
npm run build
npm run lint
npm test
npm run start:dev
```

## Troubleshooting

- **Timeouts:** Lower `maxItems`, lower `maxRequestsPerCrawl`, and keep `maxConcurrency` at `1` or `2`.
- **Empty results:** Check that the URL is a public Zoot category or product detail page.
- **Blocked requests:** Use Apify Proxy and consider longer request delays.
- **Missing optional fields:** Some Zoot product pages do not expose every description, attribute, or brand field. The actor emits `null` or an empty list when data is unavailable.

## Support

- Email: [codemasterdevops@gmail.com](mailto:codemasterdevops@gmail.com)
- Website: [Quick Life Solutions](https://quicklifesolutions.com)
- More actors: [dainty_screw on Apify](https://apify.com/dainty_screw)
