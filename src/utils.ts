import { CheerioCrawlingContext, Request } from 'crawlee';
import { LABELS, PRODUCT_DETAIL_URL_REGEX, PRODUCT_LINKS_SEL } from './constants.js';
import { CrawleeState, NormalizedStartUrl } from './types.js';

export const categorizeUrls = (startUrls: NormalizedStartUrl[]) : Request[] => {
    return startUrls.map(({ url, label }) => {
        const normalizedLabel = label
            || (PRODUCT_DETAIL_URL_REGEX.test(url) ? LABELS.DETAIL : LABELS.CATEGORY);

        return new Request({
            url,
            label: normalizedLabel,
        });
    });
};

export const enqueueProductDetails = async (context: CheerioCrawlingContext) => {
    const { enqueueLinks, request: { url }, log, crawler } = context;

    const state = await crawler.useState<CrawleeState>();
    if (state.remainingItems <= 0) {
        log.debug('Skipping product detail enqueueing because item limit was reached.', { url });
        return;
    }

    const { processedRequests: reqs = [] } = await enqueueLinks({
        selector: PRODUCT_LINKS_SEL,
        label: LABELS.DETAIL,
        forefront: true,
    });

    const enqueuedReqs = reqs.filter((req) => !req.wasAlreadyPresent);
    log.info(`Enqueued ${enqueuedReqs.length} product detail pages`, { url });
};

export const getCurrentPage = (url: string): number => {
    const pathMatch = url.match(/\/(stranka|strana|pagina)[/:](\d+)/i);
    if (pathMatch?.[2]) {
        return Number.parseInt(pathMatch[2], 10);
    }

    const { searchParams } = new URL(url);
    const explicitPage = searchParams.get('p');

    if (explicitPage) {
        const parsed = Number.parseInt(explicitPage, 10);
        if (Number.isInteger(parsed) && parsed > 0) {
            return parsed;
        }
    }

    return 1;
};
