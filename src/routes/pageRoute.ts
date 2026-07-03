import { CheerioCrawlingContext } from 'crawlee';
import { PRODUCT_LINKS_SEL } from '../constants.js';
import { CrawleeState } from '../types.js';
import { enqueueProductDetails, getCurrentPage } from '../utils.js';

export const pageRoute = async (context: CheerioCrawlingContext) => {
    const { crawler, log, $, request: { url } } = context;

    const pageTitle = $('head title').text();
    const pageNumber = getCurrentPage(url);

    log.info(`Opened page ${pageNumber}: ${pageTitle}`, { url });

    const state = await crawler.useState<CrawleeState>();
    const productLimit = Math.max(0, Math.min(state.remainingItems, $(PRODUCT_LINKS_SEL).length));

    if (productLimit > 0) {
        await enqueueProductDetails(context, productLimit);
    } else if (state.remainingItems <= 0) {
        log.info('Skipping product detail enqueue because max item budget is already exhausted', { url });
    } else {
        log.warning('No product detail links found on pagination page', { url });
    }
};
