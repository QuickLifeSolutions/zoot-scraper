import { ProxyConfigurationOptions } from 'crawlee';

export type StartUrl = string | { url: string; label?: string };

export type InputSchema = {
    startUrls: StartUrl[];
    maxItems?: number;
    maxRequestsPerCrawl?: number;
    maxConcurrency?: number;
    minRequestIntervalSecs?: number;
    maxRequestIntervalSecs?: number;
    navigationTimeoutSecs?: number;
    requestHandlerTimeoutSecs?: number;
    proxyConfiguration: ProxyConfigurationOptions;
};

export type NormalizedInput = Required<Omit<InputSchema, 'startUrls' | 'proxyConfiguration'>> & {
    startUrls: string[];
    proxyConfiguration: ProxyConfigurationOptions;
};

export type CrawleeState = {
    remainingItems: number;
    maxItems: number;
};
