import { ProxyConfigurationOptions } from 'crawlee';

export type StartUrlSource = string | { url: string; label?: string | null };

export type RawInput = {
    startUrls?: StartUrlSource[];
    maxItems?: number;
    maxRequestsPerCrawl?: number;
    maxConcurrency?: number;
    minRequestIntervalSecs?: number;
    maxRequestIntervalSecs?: number;
    navigationTimeoutSecs?: number;
    requestHandlerTimeoutSecs?: number;
    proxyConfiguration?: ProxyConfigurationOptions;
};

export type NormalizedStartUrl = {
    url: string;
    label?: string;
};

export type NormalizedInput = {
    startUrls: NormalizedStartUrl[];
    maxItems: number;
    maxRequestsPerCrawl?: number;
    maxConcurrency: number;
    minRequestIntervalSecs: number;
    maxRequestIntervalSecs: number;
    navigationTimeoutSecs: number;
    requestHandlerTimeoutSecs: number;
    proxyConfiguration?: ProxyConfigurationOptions;
};

export type CrawleeState = {
    remainingItems: number;
};
