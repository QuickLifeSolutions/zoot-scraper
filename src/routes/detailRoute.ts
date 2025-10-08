import { Actor } from 'apify';
import { CheerioCrawlingContext, CheerioRoot, htmlToText } from 'crawlee';
import { CrawleeState } from '../types.js';
import {
    BRAND_SEL,
    BREADCRUMBS_SEL,
    CURRENT_BEST_FORMATTED_PRICE_SEL,
    CURRENT_DISCOUNTED_PRICE_SEL,
    CZ_SK_ATTRIBUTES_SEL,
    DESCRIPTION_SEL,
    GALLERY_IMAGES_SEL,
    ORIGINAL_FORMATTED_PRICE_SEL,
    PRICE_CURRENCY_SEL,
    PRICE_SEL,
    RO_ATTRIBUTES_SEL,
    SALE_CODE_SEL,
    SIZES_SEL,
} from '../constants.js';

export const detailRoute = async (context: CheerioCrawlingContext) => {
    const { crawler, request: { url }, $, log } = context;

    const title = $('head title').text();
    log.info(`${title}`, { url });

    const state = await crawler.useState<CrawleeState>();

    if (state.remainingItems <= 0) {
        log.debug('Skipping product detail because maxItems threshold reached.', { url });
        return;
    }

    state.remainingItems = Math.max(0, state.remainingItems - 1);

    const images = parseImageLinks($, url);
    const sizes = parseSizes($);

    try {
        await Actor.pushData({
            url,
            name: title.replace(/ \| ZOOT.+$/i, ''),
            priceCurrency: parseCurrency($),
            currentBestPrice: parseCurrentPrice($),
            originalPrice: parseOriginalPrice($),
            saleCode: $(SALE_CODE_SEL).text() || null,
            thumbnail: images[0] || null,
            images,
            brand: parseBrand($, url),
            breadcrumbs: parseBreadcrumbs($, url),
            description: $(DESCRIPTION_SEL).text().trim() || null,
            attributes: url.match(/zoot.ro/i) ? parseRoLayoutAttributes($) : parseCzSkLayoutAttributes($),
            sizes,
            available: sizes.some((size) => size.available),
        });
    } catch (error) {
        log.exception(error as Error, 'Failed to push product record to dataset', { url });
        throw error;
    }
};

const parseCurrentPrice = ($: CheerioRoot) => {
    const priceText = $(PRICE_SEL).attr('content') || '';

    const value = priceText ? parseFloat(priceText) : null;
    let formattedPrice = $(CURRENT_BEST_FORMATTED_PRICE_SEL).text()
        || $(CURRENT_DISCOUNTED_PRICE_SEL).text();

    if (!formattedPrice) {
        formattedPrice = $(ORIGINAL_FORMATTED_PRICE_SEL).text()
            .replace(/[\d.,]+/, priceText);
    }

    const formatted = parseFormattedPrice(formattedPrice);

    return {
        value,
        formattedPrice: priceText !== formatted
            ? formatted
            : `${formatted} ${parseCurrency($)}`,
    };
};

const parseOriginalPrice = ($: CheerioRoot) => {
    const formattedPrice = parseFormattedPrice(
        $(ORIGINAL_FORMATTED_PRICE_SEL).text(),
    );

    let valueText = (formattedPrice || '').replace(/[^\d,.]/g, '');

    const replaceCommaWith = valueText.includes(',') && !valueText.includes('.')
        ? '.'
        : '';

    valueText = valueText.replace(/,/g, replaceCommaWith);

    const value = valueText ? parseFloat(valueText) : null;

    return {
        value,
        formattedPrice,
    };
};

const parseFormattedPrice = (priceText: string) => {
    return priceText
        .replace(/^[^\n]+\n+/, '')
        .trim()
        .replace(/\.00/, '')
        .replace(/\n.+$/, '') || null;
};

const parseCurrency = ($: CheerioRoot) => {
    return $(PRICE_CURRENCY_SEL).attr('content')
        || $(PRICE_CURRENCY_SEL).first().text().replace(/[\d ,.]+/g, '')
        || null;
};

const parseImageLinks = ($: CheerioRoot, url: string) => {
    const baseUrl = new URL(url).origin;

    const imageLinks = $(GALLERY_IMAGES_SEL)
        .map((_i, el) => $(el).attr('src') || $(el).attr('href') || '')
        .toArray()
        .filter((link) => link)
        .map((link) => {
            try {
                return new URL(link, baseUrl).toString();
            } catch {
                return null;
            }
        })
        .filter((link): link is string => Boolean(link));

    const largeImageLinks = imageLinks.map(
        (link) => link.replace(/fit\/[^/]+\//i, 'fit/1908x2562/'),
    );

    return Array.from(new Set(largeImageLinks));
};

const parseBreadcrumbs = ($: CheerioRoot, url: string) => {
    const urlOrigin = new URL(url).origin;

    return $(BREADCRUMBS_SEL).map((_i, el) => ({
        text: $(el).text().trim() || null,
        url: buildAbsoluteUrl($(el).attr('href'), urlOrigin),
    })).toArray();
};

const parseRoLayoutAttributes = ($: CheerioRoot) => {
    const attributes = $(RO_ATTRIBUTES_SEL).map((_i, el) => {
        const attributeText = $(el).text().replace(/: /, '\n');
        const [key, value] = attributeText.split('\n');

        return { key, value };
    }).toArray();

    return attributes;
};

const parseCzSkLayoutAttributes = ($: CheerioRoot) => {
    const attributesHtml = $(CZ_SK_ATTRIBUTES_SEL).html() || '';

    const attributesWithoutDescription = attributesHtml
        .replace(/<p>[^<]+<\/p>/gi, '')
        .trim();

    const attributes = attributesWithoutDescription.split(/<br>/)
        .map((attribute) => {
            const [key, value] = attribute.split(/<\/?strong>/).filter((part) => part);

            return {
                key: htmlToText(key).replace(/:$/, ''),
                value: htmlToText(value),
            };
        }).filter((attribute) => attribute.key && attribute.value);

    return attributes;
};

const parseSizes = ($: CheerioRoot) => {
    const sizes = $(SIZES_SEL).map((_i, el) => {
        const sizeWithNote = $(el).text().trim();
        const [size, note] = sizeWithNote.split(/ - ?/);

        const available = !$(el).attr('disabled') && !$(el).hasClass('selectBox-disabled');

        return {
            size: size.replace(/ .*$/, ''),
            available,
            note: note || sizeWithNote.split(' ')[1],
        };
    }).toArray();

    return sizes;
};

const parseBrand = ($: CheerioRoot, url: string) => {
    const { origin } = new URL(url);

    const link = buildAbsoluteUrl($(BRAND_SEL).attr('href'), origin);
    const logo = buildAbsoluteUrl($(BRAND_SEL).find('img[src]').attr('src'), origin);
    const name = $(BRAND_SEL).text().trim();

    return url.match(/zoot.ro/i)
        ? { link, name }
        : { link, logo };
};

const buildAbsoluteUrl = (pathname: string | undefined | null, origin: string) => {
    if (!pathname) {
        return null;
    }

    try {
        return new URL(pathname, origin).toString();
    } catch {
        return null;
    }
};
