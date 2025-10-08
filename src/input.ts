import { log } from 'apify';
import {
    NormalizedInput,
    NormalizedStartUrl,
    RawInput,
    StartUrlSource,
} from './types.js';

const DEFAULT_START_URLS: NormalizedStartUrl[] = [
    { url: 'https://www.zoot.cz/katalog/17504/zeny' },
    { url: 'https://www.zoot.cz/katalog/17572/muzi' },
    { url: 'https://www.zoot.cz/vse-pro-deti' },
];

const DEFAULT_MAX_ITEMS = 50;
const DEFAULT_MIN_DELAY = 1;
const DEFAULT_MAX_DELAY = 3;
const DEFAULT_NAVIGATION_TIMEOUT = 45;
const DEFAULT_HANDLER_TIMEOUT = 60;
const DEFAULT_MAX_CONCURRENCY = 2;

export const normalizeInput = (rawInput: RawInput | null | undefined): NormalizedInput => {
    const startUrls = normalizeStartUrls(rawInput?.startUrls);
    const maxItems = normalizePositiveInteger(rawInput?.maxItems, 'maxItems', {
        defaultValue: DEFAULT_MAX_ITEMS,
        minValue: 1,
    }) ?? DEFAULT_MAX_ITEMS;

    const maxRequestsPerCrawl = normalizePositiveInteger(
        rawInput?.maxRequestsPerCrawl,
        'maxRequestsPerCrawl',
    );

    const maxConcurrency = normalizePositiveInteger(
        rawInput?.maxConcurrency,
        'maxConcurrency',
        {
            defaultValue: DEFAULT_MAX_CONCURRENCY,
            minValue: 1,
            maxValue: 10,
        },
    ) ?? DEFAULT_MAX_CONCURRENCY;

    const {
        minRequestIntervalSecs,
        maxRequestIntervalSecs,
    } = normalizeDelayRange(
        rawInput?.minRequestIntervalSecs,
        rawInput?.maxRequestIntervalSecs,
    );

    const navigationTimeoutSecs = normalizePositiveInteger(
        rawInput?.navigationTimeoutSecs,
        'navigationTimeoutSecs',
        {
            defaultValue: DEFAULT_NAVIGATION_TIMEOUT,
            minValue: 5,
        },
    ) ?? DEFAULT_NAVIGATION_TIMEOUT;

    const requestHandlerTimeoutSecs = normalizePositiveInteger(
        rawInput?.requestHandlerTimeoutSecs,
        'requestHandlerTimeoutSecs',
        {
            defaultValue: DEFAULT_HANDLER_TIMEOUT,
            minValue: 5,
        },
    ) ?? DEFAULT_HANDLER_TIMEOUT;

    return {
        startUrls,
        maxItems,
        maxRequestsPerCrawl,
        maxConcurrency,
        minRequestIntervalSecs,
        maxRequestIntervalSecs,
        navigationTimeoutSecs,
        requestHandlerTimeoutSecs,
        proxyConfiguration: rawInput?.proxyConfiguration,
    };
};

const normalizeStartUrls = (startUrls?: StartUrlSource[]): NormalizedStartUrl[] => {
    const sources = startUrls && startUrls.length > 0 ? startUrls : DEFAULT_START_URLS;

    const normalized = sources.map((source, index) => {
        const candidate = typeof source === 'string' ? source : source?.url;

        if (!candidate) {
            throw new Error(`startUrls[${index}] is missing a URL.`);
        }

        let parsedUrl: URL;
        try {
            parsedUrl = new URL(candidate);
        } catch {
            throw new Error(`startUrls[${index}] is not a valid absolute URL: ${candidate}`);
        }

        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            throw new Error(`startUrls[${index}] must use http or https protocol: ${candidate}`);
        }

        const label = typeof source === 'object' && source?.label
            ? String(source.label)
            : undefined;

        return {
            url: parsedUrl.toString(),
            label: label?.trim() || undefined,
        };
    });

    const deduped = Array.from(
        new Map(normalized.map((item) => [item.url, item])).values(),
    );

    if (deduped.length === 0) {
        throw new Error('At least one valid start URL is required.');
    }

    if (deduped.length < normalized.length) {
        log.info(`Removed ${normalized.length - deduped.length} duplicate start URL(s).`);
    }

    return deduped;
};

const normalizePositiveInteger = (
    value: number | undefined,
    key: string,
    {
        defaultValue,
        minValue = 1,
        maxValue,
    }: {
        defaultValue?: number;
        minValue?: number;
        maxValue?: number;
    } = {},
): number | undefined => {
    if (value === undefined || value === null) {
        return defaultValue;
    }

    if (!Number.isFinite(value)) {
        throw new Error(`${key} must be a finite number.`);
    }

    if (!Number.isInteger(value)) {
        throw new Error(`${key} must be an integer.`);
    }

    if (value < minValue) {
        throw new Error(`${key} must be >= ${minValue}.`);
    }

    if (maxValue && value > maxValue) {
        throw new Error(`${key} must be <= ${maxValue}.`);
    }

    return value;
};

const normalizeDelayRange = (
    min?: number,
    max?: number,
) => {
    const minValue = min ?? DEFAULT_MIN_DELAY;
    const maxValue = max ?? DEFAULT_MAX_DELAY;

    [minValue, maxValue].forEach((value, index) => {
        if (typeof value !== 'number') {
            throw new Error('Request interval values must be numbers.');
        }
        if (value < 0) {
            throw new Error(`Request interval ${index === 0 ? 'minimum' : 'maximum'} cannot be negative.`);
        }
        if (!Number.isFinite(value)) {
            throw new Error('Request interval values must be finite numbers.');
        }
    });

    if (maxValue < minValue) {
        throw new Error('maxRequestIntervalSecs must be greater than or equal to minRequestIntervalSecs.');
    }

    return {
        minRequestIntervalSecs: minValue,
        maxRequestIntervalSecs: maxValue,
    };
};
