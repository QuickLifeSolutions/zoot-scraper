import { Actor, log } from 'apify';
import { CheerioCrawler, CheerioCrawlingContext, sleep } from 'crawlee';
import { CrawleeState, RawInput } from './types.js';
import { categorizeUrls } from './utils.js';
import { router } from './routes/router.js';
import { normalizeInput } from './input.js';

await Actor.init();

const rawInput = await Actor.getInput<RawInput>();
const input = normalizeInput(rawInput);

const proxyConfiguration = await createProxyConfiguration(input.proxyConfiguration);

const crawler = new CheerioCrawler({
    proxyConfiguration,
    requestHandler: router,
    navigationTimeoutSecs: input.navigationTimeoutSecs,
    requestHandlerTimeoutSecs: input.requestHandlerTimeoutSecs,
    maxRequestsPerCrawl: input.maxRequestsPerCrawl,
    maxConcurrency: input.maxConcurrency,
    maxRequestRetries: 2,
    preNavigationHooks: [
        async (context: CheerioCrawlingContext) => {
            const { crawler: cheerioCrawler, log: contextLog } = context;
            const state = await cheerioCrawler.useState<CrawleeState>();

            if (state.remainingItems <= 0) {
                contextLog.info('Reached max items limit, aborting the run');
                await cheerioCrawler.autoscaledPool?.abort();
            }
        },
    ],
    postNavigationHooks: [
        async ({ log: contextLog }) => {
            const delaySecs = computeRequestDelay(
                input.minRequestIntervalSecs,
                input.maxRequestIntervalSecs,
            );

            if (delaySecs > 0) {
                contextLog.debug(`Sleeping for ${delaySecs.toFixed(2)}s to respect rate limits.`);
                await sleep(delaySecs * 1000);
            }
        },
    ],
});

await crawler.useState<CrawleeState>({
    remainingItems: input.maxItems,
});

try {
    await crawler.run(
        categorizeUrls(input.startUrls),
    );
} catch (error) {
    log.exception(error as Error, 'Crawler run failed.');
    throw error;
} finally {
    await Actor.exit();
}

function computeRequestDelay(minDelay: number, maxDelay: number) {
    if (maxDelay <= 0) {
        return 0;
    }

    if (minDelay === maxDelay) {
        return minDelay;
    }

    const random = Math.random();
    return minDelay + ((maxDelay - minDelay) * random);
}

async function createProxyConfiguration(proxyOptions: RawInput['proxyConfiguration']) {
    if (!proxyOptions) {
        return undefined;
    }

    try {
        return await Actor.createProxyConfiguration(proxyOptions);
    } catch (error) {
        const errorMessage = (error as Error).message || 'Unknown proxy configuration error';

        log.warning(`Proxy configuration failed (${errorMessage}). Continuing without a proxy.`);

        return undefined;
    }
}
