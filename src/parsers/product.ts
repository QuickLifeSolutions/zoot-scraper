import { CheerioRoot, htmlToText } from 'crawlee';
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

export const parseProduct = ($: CheerioRoot, url: string) => {
    const title = $('head title').text();
    const images = parseImageLinks($);
    const sizes = parseSizes($);

    const brand = parseBrand($, url);
    const name = title.replace(/ \| ZOOT.+$/i, '').trim() || $('h1').first().text().trim() || null;

    return {
        url,
        name,
        priceCurrency: parseCurrency($, url),
        currentBestPrice: parseCurrentPrice($, url),
        originalPrice: parseOriginalPrice($),
        saleCode: $(SALE_CODE_SEL).text().trim() || null,
        thumbnail: images[0] || null,
        images,
        brand: inferBrandName(brand, name),
        breadcrumbs: parseBreadcrumbs($, url),
        description: parseDescription($),
        attributes: url.match(/zoot.ro/i) ? parseRoLayoutAttributes($) : parseCzSkLayoutAttributes($),
        sizes,
        available: sizes.filter((size) => size.available).length > 0,
    };
};

export const parseCurrentPrice = ($: CheerioRoot, url: string) => {
    const priceText = ($(PRICE_SEL).attr('content') || '').trim()
        || extractFirstPriceText($).replace(/[^\d,.]/g, '');
    const value = parsePriceValue(priceText);
    const currency = parseCurrency($, url);

    let formattedPrice = $(CURRENT_BEST_FORMATTED_PRICE_SEL).text()
        || $(CURRENT_DISCOUNTED_PRICE_SEL).text();

    if (!formattedPrice) {
        formattedPrice = $(ORIGINAL_FORMATTED_PRICE_SEL).text()
            .replace(/[\d.,]+/, priceText);
    }

    let formatted = parseFormattedPrice(formattedPrice);

    if (!formatted && value !== null) {
        formatted = formatPrice(value, currency, url);
    }

    return {
        value,
        formattedPrice: formatted,
    };
};

export const parseOriginalPrice = ($: CheerioRoot) => {
    const formattedPrice = parseFormattedPrice(
        $(ORIGINAL_FORMATTED_PRICE_SEL).text(),
    );

    const value = parsePriceValue((formattedPrice || '').replace(/[^\d,.]/g, ''));

    return {
        value,
        formattedPrice,
    };
};

export const parseFormattedPrice = (priceText: string) => {
    return priceText
        .replace(/^[^\n]+\n+/, '')
        .trim()
        .replace(/\.00/, '')
        .replace(/\n.+$/, '') || null;
};

export const parseCurrency = ($: CheerioRoot, url: string) => {
    const currencyText = ($(PRICE_CURRENCY_SEL).attr('content') || $(PRICE_CURRENCY_SEL).first().text())
        .replace(/[\d\s.,]+/g, '')
        .trim();

    if (/CZK|Kč/i.test(currencyText)) return 'CZK';
    if (/EUR|€/i.test(currencyText)) return 'EUR';
    if (/RON|Lei|lei/i.test(currencyText)) return 'RON';

    const visiblePriceText = extractFirstPriceText($);
    if (/Kč/.test(visiblePriceText)) return 'CZK';
    if (/€/.test(visiblePriceText)) return 'EUR';
    if (/\blei\b/i.test(visiblePriceText)) return 'RON';

    const { hostname } = new URL(url);
    if (hostname.endsWith('zoot.cz')) return 'CZK';
    if (hostname.endsWith('zoot.sk')) return 'EUR';
    if (hostname.endsWith('zoot.ro')) return 'RON';

    return null;
};

export const parseImageLinks = ($: CheerioRoot) => {
    const imageLinks = $(GALLERY_IMAGES_SEL)
        .map((_i, el) => $(el).attr('src') || $(el).attr('href') || '')
        .toArray()
        .filter((link) => link)
        .map((link) => link.replace(/^[/]+/, 'https://'));

    const largeImageLinks = imageLinks.map(
        (link) => link.replace(/fit\/[^/]+\//i, 'fit/1908x2562/'),
    );

    return Array.from(new Set(largeImageLinks));
};

export const parseBreadcrumbs = ($: CheerioRoot, url: string) => {
    const urlOrigin = new URL(url).origin;

    return $(BREADCRUMBS_SEL).map((_i, el) => ({
        text: $(el).text().trim() || null,
        url: new URL($(el).attr('href') || '/', urlOrigin).href,
    })).toArray();
};

export const parseDescription = ($: CheerioRoot) => {
    const explicitDescription = $(DESCRIPTION_SEL).first().text().trim();
    if (explicitDescription) return explicitDescription;

    const content = $(CZ_SK_ATTRIBUTES_SEL).first();
    const paragraphText = content.find('p').first().text().trim();
    if (paragraphText) return paragraphText;

    return $('[itemprop="description"], meta[name="description"]')
        .first()
        .attr('content')
        ?.trim() || null;
};

export const parseRoLayoutAttributes = ($: CheerioRoot) => {
    return $(RO_ATTRIBUTES_SEL).map((_i, el) => {
        const attributeText = $(el).text().replace(/: /, '\n');
        const [key, value] = attributeText.split('\n');

        return {
            key: key?.trim(),
            value: value?.trim(),
        };
    }).toArray().filter((attribute) => attribute.key && attribute.value);
};

export const parseCzSkLayoutAttributes = ($: CheerioRoot) => {
    const content = $(CZ_SK_ATTRIBUTES_SEL).first().clone();
    content.find('p').remove();

    const attributesHtml = content.html() || '';

    return attributesHtml.split(/<br\s*\/?>/i)
        .map((attribute) => {
            const [key, value] = attribute.split(/<\/?strong>/i).filter((part) => part.trim());

            return {
                key: htmlToText(key || '').replace(/:$/, '').trim(),
                value: htmlToText(value || '').trim(),
            };
        }).filter((attribute) => attribute.key && attribute.value);
};

export const parseSizes = ($: CheerioRoot) => {
    return $(SIZES_SEL).map((_i, el) => {
        const sizeWithNote = $(el).text().trim().replace(/\s+/g, ' ');
        const { size, note } = parseSizeLabel(sizeWithNote);

        const available = !$(el).attr('disabled') && !$(el).hasClass('selectBox-disabled');

        return {
            size,
            available,
            note: note || undefined,
        };
    }).toArray();
};

export const parseBrand = ($: CheerioRoot, url: string) => {
    const brand = $(BRAND_SEL).first();
    const href = brand.attr('href');
    const link = href ? new URL(href, new URL(url).origin).href : null;
    const logo = brand.find('img[src]').attr('src') || null;
    const name = brand.text().trim() || brand.find('img[alt]').attr('alt') || null;

    return {
        link,
        logo,
        name,
    };
};

const inferBrandName = (
    brand: { link: string | null; logo: string | null; name: string | null },
    productName: string | null,
) => {
    if (brand.name || !productName?.includes(' - ')) return brand;

    return {
        ...brand,
        name: productName.split(' - ')[0].trim() || null,
    };
};

const parseSizeLabel = (sizeWithNote: string): { size: string; note: string } => {
    const [, baseBeforeDash, dashNote] = sizeWithNote.match(/^(.+?)\s*-\s*(.+)$/) || [];
    const base = (baseBeforeDash || sizeWithNote).trim();
    const [, sizeBeforeParen, parenNote] = base.match(/^(.+?)\s*\((.+)\)$/) || [];
    const notes = [parenNote, dashNote]
        .map((note) => note?.trim())
        .filter((note): note is string => Boolean(note));

    return {
        size: (sizeBeforeParen || base).trim(),
        note: notes.join('; '),
    };
};

const parsePriceValue = (priceText: string): number | null => {
    let valueText = (priceText || '').replace(/[^\d,.]/g, '');

    if (valueText.includes(',') && valueText.includes('.')) {
        const lastCommaIndex = valueText.lastIndexOf(',');
        const lastDotIndex = valueText.lastIndexOf('.');
        valueText = lastCommaIndex > lastDotIndex
            ? valueText.replace(/\./g, '').replace(/,/g, '.')
            : valueText.replace(/,/g, '');
    } else if (valueText.includes(',')) {
        valueText = valueText.replace(/,/g, '.');
    } else if (/^\d{1,3}(\.\d{3})+$/.test(valueText)) {
        valueText = valueText.replace(/\./g, '');
    }

    return valueText ? parseFloat(valueText) : null;
};

const formatPrice = (value: number, currency: string | null, url: string): string => {
    const roundedValue = Number.isInteger(value) ? value.toString() : value.toFixed(2);
    const formattedValue = roundedValue.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

    if (currency === 'CZK') return `${formattedValue} Kč`;
    if (currency === 'EUR') return `${formattedValue} €`;
    if (currency === 'RON') return `${formattedValue} lei`;

    return `${formattedValue} ${parseCurrencyFallback(url)}`.trim();
};

const parseCurrencyFallback = (url: string): string => {
    const { hostname } = new URL(url);
    if (hostname.endsWith('zoot.cz')) return 'Kč';
    if (hostname.endsWith('zoot.sk')) return '€';
    if (hostname.endsWith('zoot.ro')) return 'lei';
    return '';
};

const extractFirstPriceText = ($: CheerioRoot): string => {
    const priceText = $('[class*="price"], [class*="Price"], [itemprop="price"]').map((_i, el) => (
        $(el).attr('content') || $(el).text()
    )).toArray().find((text) => /\d/.test(text));

    return priceText || '';
};
