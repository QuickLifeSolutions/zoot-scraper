import { Actor } from 'apify';
import { CheerioCrawler, CheerioCrawlingContext } from 'crawlee';
import { CrawleeState, InputSchema } from './types.js';
import { categorizeUrls } from './utils.js';
import { router } from './routes/router.js';
import { normalizeInput } from './config.js';

await Actor.init();

const input = normalizeInput(await Actor.getInput<InputSchema>() ?? {});

const proxyConfiguration = await Actor.createProxyConfiguration(input.proxyConfiguration);

const randomDelay = async (minSecs: number, maxSecs: number) => {
    if (maxSecs <= 0) return;

    const delaySecs = minSecs + Math.random() * (maxSecs - minSecs);
    await new Promise((resolve) => { setTimeout(resolve, delaySecs * 1000); });
};

const crawler = new CheerioCrawler({
    proxyConfiguration,
    requestHandler: router,
    maxConcurrency: input.maxConcurrency,
    maxRequestsPerCrawl: input.maxRequestsPerCrawl,
    navigationTimeoutSecs: input.navigationTimeoutSecs,
    requestHandlerTimeoutSecs: input.requestHandlerTimeoutSecs,
    preNavigationHooks: [
        async (context: CheerioCrawlingContext) => {
            const { crawler: cheerioCrawler, log } = context;
            const state = await cheerioCrawler.useState<CrawleeState>();

            if (state.remainingItems <= 0) {
                log.info('Reached max items limit, aborting the run');
                await cheerioCrawler.autoscaledPool?.abort();
                return;
            }

            await randomDelay(input.minRequestIntervalSecs, input.maxRequestIntervalSecs);
        },
    ],
});

await crawler.useState<CrawleeState>({
    remainingItems: input.maxItems,
    maxItems: input.maxItems,
});

await crawler.run(
    categorizeUrls(input.startUrls),
);

await Actor.exit();
