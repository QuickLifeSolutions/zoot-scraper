import { CheerioCrawlingContext, CheerioRoot } from 'crawlee';
import {
    LABELS, PAGINATION_PAGES_SEL, PRODUCT_LINKS_SEL,
} from '../constants.js';
import { CrawleeState } from '../types.js';
import { calculatePaginationLimit } from '../config.js';
import { enqueueProductDetails, getCurrentPage } from '../utils.js';

export const categoryRoute = async (context: CheerioCrawlingContext) => {
    const { crawler, log, $, request: { url } } = context;

    const pageTitle = $('head title').text();
    log.info(`Opened category page: ${pageTitle}`, { url });

    const state = await crawler.useState<CrawleeState>();
    const productLinksOnCurrentPage = $(PRODUCT_LINKS_SEL).length;
    const productLimit = Math.max(0, Math.min(state.remainingItems, productLinksOnCurrentPage));

    if (productLimit > 0) {
        await enqueueProductDetails(context, productLimit);
    } else if (state.remainingItems <= 0) {
        log.info('Skipping product detail enqueue because max item budget is already exhausted', { url });
    } else {
        log.warning('No product detail links found on category page', { url });
    }

    await enqueueNextPages(context, productLinksOnCurrentPage);
};

const enqueueNextPages = async (context: CheerioCrawlingContext, productLinksOnCurrentPage: number) => {
    const { crawler, $, enqueueLinks, log, request: { url } } = context;
    const state = await crawler.useState<CrawleeState>();

    const currentPage = getCurrentPage(url);

    if (new URL(url).searchParams.get('p')) {
        log.info(
            `Opened page ${currentPage}, not enqueueing next pages.
            If you want to crawl all category pages, remove page parameter 'p=${currentPage}' from your start URL.`,
            { url },
        );
        return;
    }

    const nextPageUrls = buildNextPageUrls($, url, state.maxItems, productLinksOnCurrentPage);

    const { processedRequests } = await enqueueLinks({
        urls: nextPageUrls,
        label: LABELS.PAGE,
    });

    const enqueuedPages = processedRequests.filter((req) => !req.wasAlreadyPresent);
    const lastPage = currentPage + enqueuedPages.length;

    log.info(
        `Enqueued ${enqueuedPages.length} next product pages${enqueuedPages.length > 0 ? ` (2-${lastPage})` : ''}`,
        { url },
    );
};

export const buildNextPageUrls = (
    $: CheerioRoot,
    currentUrl: string,
    maxItems: number,
    productLinksOnCurrentPage: number,
) : string[] => {
    const totalPages = parseTotalPagesCount($);
    const maxPageToCrawl = calculatePaginationLimit({
        maxItems,
        productLinksOnCurrentPage,
        totalPages,
    });

    if (productLinksOnCurrentPage <= 0 || maxPageToCrawl <= 1) return [];

    const examplePageRelPaths = $(PAGINATION_PAGES_SEL).map(
        (_i, el) => $(el).attr('href') || $(el).text(),
    ).toArray();

    const lastRelPath = examplePageRelPaths[examplePageRelPaths.length - 1];
    if (!lastRelPath) return [];

    const examplePageLink = new URL(lastRelPath, new URL(currentUrl).origin).href;

    const nextPageUrls: string[] = [];

    for (let i = 2; i <= maxPageToCrawl; i++) {
        const nextPageUrl = examplePageLink
            .replace(/(stran(?:ka|a)[/:])\d+/i, `$1${i}`)
            .replace(/(pagina:)\d+/i, `$1${i}`);

        nextPageUrls.push(nextPageUrl.toString());
    }

    return nextPageUrls;
};

const parseTotalPagesCount = ($: CheerioRoot) : number => {
    const paginationPages = $(PAGINATION_PAGES_SEL).map((_i, el) => {
        const page = $(el).attr('data-number') || $(el).text() || '-1';
        return parseInt(page, 10);
    }).toArray().filter(Number.isFinite);

    return paginationPages.length > 0 ? Math.max(...paginationPages) : 1;
};
