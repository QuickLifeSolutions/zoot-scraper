import { CheerioCrawlingContext, CheerioRoot } from 'crawlee';
import {
    LABELS, PAGINATION_PAGES_SEL,
} from '../constants.js';
import { enqueueProductDetails, getCurrentPage } from '../utils.js';

export const categoryRoute = async (context: CheerioCrawlingContext) => {
    const { log, $, request: { url } } = context;

    const pageTitle = $('head title').text();
    log.info(`Opened category page: ${pageTitle}`, { url });

    await enqueueProductDetails(context);
    await enqueueNextPages(context);
};

const enqueueNextPages = async (context: CheerioCrawlingContext) => {
    const { $, enqueueLinks, log, request: { url } } = context;

    const currentPage = getCurrentPage(url);

    if (new URL(url).searchParams.get('p')) {
        log.info(
            `Opened page ${currentPage}, not enqueueing next pages.
            If you want to crawl all category pages, remove page parameter 'p=${currentPage}' from your start URL.`,
            { url },
        );
        return;
    }

    const nextPageUrls = buildNextPageUrls($, url, currentPage);

    if (nextPageUrls.length === 0) {
        log.info('Pagination not detected or single page category.', { url });
        return;
    }

    const { processedRequests = [] } = await enqueueLinks({
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

const buildNextPageUrls = ($: CheerioRoot, currentUrl: string, currentPage: number) : string[] => {
    const totalPages = parseTotalPagesCount($);

    if (totalPages <= currentPage) {
        return [];
    }

    const examplePageRelPaths = $(PAGINATION_PAGES_SEL).map(
        (_i, el) => $(el).attr('href') || $(el).text(),
    ).toArray();

    const exampleLinkCandidate = examplePageRelPaths
        .map((rel) => {
            try {
                return new URL(rel, currentUrl).toString();
            } catch {
                return null;
            }
        })
        .filter((candidate): candidate is string => Boolean(candidate))
        .pop();

    const template = derivePaginationTemplate(exampleLinkCandidate ?? null, currentUrl);

    const nextPageUrls: string[] = [];

    for (let i = currentPage + 1; i <= totalPages; i++) {
        const nextPageUrl = buildPageUrl(template, i);
        if (nextPageUrl) {
            nextPageUrls.push(nextPageUrl);
        }
    }

    return nextPageUrls;
};

const parseTotalPagesCount = ($: CheerioRoot) : number => {
    const paginationPages = $(PAGINATION_PAGES_SEL).map((_i, el) => {
        const page = $(el).attr('data-number') || $(el).text() || '-1';
        return parseInt(page, 10);
    }).toArray().filter((page) => Number.isInteger(page) && page > 0);

    if (paginationPages.length === 0) {
        return 1;
    }

    return Math.max(...paginationPages);
};

type PaginationTemplate =
    | { type: 'path'; template: string }
    | { type: 'query'; url: URL }
    | { type: 'fallback'; base: URL };

const derivePaginationTemplate = (exampleLink: string | null, currentUrl: string): PaginationTemplate => {
    if (exampleLink) {
        if (exampleLink.match(/stranka\/\d+/i)) {
            return { type: 'path', template: exampleLink.replace(/stranka\/\d+/i, 'stranka/{{page}}') };
        }

        if (exampleLink.match(/pagina:\d+/i)) {
            return { type: 'path', template: exampleLink.replace(/pagina:\d+/i, 'pagina:{{page}}') };
        }

        const url = new URL(exampleLink);

        if (url.searchParams.has('p')) {
            url.searchParams.set('p', '{{page}}');
            return { type: 'query', url };
        }

        return { type: 'fallback', base: url };
    }

    return { type: 'fallback', base: new URL(currentUrl) };
};

const buildPageUrl = (template: PaginationTemplate, page: number): string | null => {
    switch (template.type) {
        case 'path':
            return template.template.replace('{{page}}', String(page));
        case 'query': {
            const urlCopy = new URL(template.url.toString());
            urlCopy.searchParams.set('p', String(page));
            return urlCopy.toString();
        }
        case 'fallback': {
            const urlCopy = new URL(template.base.toString());
            urlCopy.searchParams.set('p', String(page));
            return urlCopy.toString();
        }
        default:
            return null;
    }
};
