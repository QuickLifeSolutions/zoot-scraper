import { ProxyConfigurationOptions } from 'crawlee';
import { InputSchema, NormalizedInput } from './types.js';

export const DEFAULT_START_URLS = ['https://www.zoot.cz/katalog/17504/zeny'];
export const DEFAULT_MAX_ITEMS = 25;
export const DEFAULT_MAX_CONCURRENCY = 2;
export const DEFAULT_MAX_REQUESTS_PER_CRAWL = 100;
export const DEFAULT_NAVIGATION_TIMEOUT_SECS = 45;
export const DEFAULT_REQUEST_HANDLER_TIMEOUT_SECS = 60;
export const DEFAULT_MIN_REQUEST_INTERVAL_SECS = 0;
export const DEFAULT_MAX_REQUEST_INTERVAL_SECS = 1;

export const normalizeInput = (input: Partial<InputSchema> = {}): NormalizedInput => {
    const maxItems = clampInteger(input.maxItems, DEFAULT_MAX_ITEMS, 1, 10000);
    const maxRequestsPerCrawl = clampInteger(
        input.maxRequestsPerCrawl,
        Math.max(DEFAULT_MAX_REQUESTS_PER_CRAWL, maxItems * 4),
        1,
        100000,
    );

    const minRequestIntervalSecs = clampNumber(
        input.minRequestIntervalSecs,
        DEFAULT_MIN_REQUEST_INTERVAL_SECS,
        0,
        60,
    );
    const maxRequestIntervalSecs = Math.max(
        minRequestIntervalSecs,
        clampNumber(input.maxRequestIntervalSecs, DEFAULT_MAX_REQUEST_INTERVAL_SECS, 0, 60),
    );

    return {
        startUrls: normalizeStartUrls(input.startUrls),
        maxItems,
        maxRequestsPerCrawl,
        maxConcurrency: clampInteger(input.maxConcurrency, DEFAULT_MAX_CONCURRENCY, 1, 10),
        minRequestIntervalSecs,
        maxRequestIntervalSecs,
        navigationTimeoutSecs: clampInteger(
            input.navigationTimeoutSecs,
            DEFAULT_NAVIGATION_TIMEOUT_SECS,
            5,
            300,
        ),
        requestHandlerTimeoutSecs: clampInteger(
            input.requestHandlerTimeoutSecs,
            DEFAULT_REQUEST_HANDLER_TIMEOUT_SECS,
            5,
            300,
        ),
        proxyConfiguration: input.proxyConfiguration ?? { useApifyProxy: true } as ProxyConfigurationOptions,
    };
};

export const calculatePaginationLimit = ({
    maxItems,
    productLinksOnCurrentPage,
    totalPages,
}: {
    maxItems: number;
    productLinksOnCurrentPage: number;
    totalPages: number;
}): number => {
    if (totalPages <= 1) return 1;
    if (productLinksOnCurrentPage <= 0) return Math.min(totalPages, 2);

    return Math.max(1, Math.min(totalPages, Math.ceil(maxItems / productLinksOnCurrentPage)));
};

const normalizeStartUrls = (startUrls?: InputSchema['startUrls']): string[] => {
    if (!startUrls || startUrls.length === 0) return DEFAULT_START_URLS;

    const urls = startUrls
        .map((item) => (typeof item === 'string' ? item : item.url))
        .filter((url): url is string => Boolean(url && url.trim()));

    return urls.length > 0 ? urls : DEFAULT_START_URLS;
};

const clampInteger = (value: number | undefined, fallback: number, min: number, max: number): number => {
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(value as number)));
};

const clampNumber = (value: number | undefined, fallback: number, min: number, max: number): number => {
    if (!Number.isFinite(value)) return fallback;
    return Math.min(max, Math.max(min, value as number));
};
