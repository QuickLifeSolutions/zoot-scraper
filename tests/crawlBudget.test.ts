import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';
import {
    calculatePaginationLimit,
    normalizeInput,
} from '../src/config.js';
import { buildNextPageUrls } from '../src/routes/categoryRoute.js';

assert.equal(calculatePaginationLimit({
    maxItems: 2,
    productLinksOnCurrentPage: 48,
    totalPages: 505,
}), 1, 'maxItems already satisfied by first page should skip pagination');

assert.equal(calculatePaginationLimit({
    maxItems: 50,
    productLinksOnCurrentPage: 48,
    totalPages: 505,
}), 2, 'maxItems slightly above first page should enqueue one extra page');

assert.equal(calculatePaginationLimit({
    maxItems: 100,
    productLinksOnCurrentPage: 48,
    totalPages: 505,
}), 3, 'pagination should be capped to needed pages');

const normalized = normalizeInput({});
assert.equal(normalized.maxItems, 25);
assert.equal(normalized.maxConcurrency, 2);
assert.equal(normalized.maxRequestsPerCrawl, 100);
assert.deepEqual(normalized.startUrls, ['https://www.zoot.cz/katalog/17504/zeny']);

{
    const $ = cheerio.load(`
        <a class="pagination__item" href="/damske/strana:505/" data-number="505" data-test="pagination__page">505</a>
    `);

    assert.deepEqual(buildNextPageUrls($, 'https://www.zoot.cz/katalog/17504/zeny', 100, 48), [
        'https://www.zoot.cz/damske/strana:2/',
        'https://www.zoot.cz/damske/strana:3/',
    ]);
}

{
    const $ = cheerio.load(`
        <a class="pagination__item" href="/katalog/zeny/stranka/505" data-number="505" data-test="pagination__page">505</a>
    `);

    assert.deepEqual(buildNextPageUrls($, 'https://www.zoot.cz/katalog/17504/zeny', 50, 48), [
        'https://www.zoot.cz/katalog/zeny/stranka/2',
    ]);
}

{
    const $ = cheerio.load(`
        <a class="pagination__jump" href="/fashion/pagina:10">10</a>
    `);

    assert.deepEqual(buildNextPageUrls($, 'https://www.zoot.ro/fashion', 50, 24), [
        'https://www.zoot.ro/fashion/pagina:2',
        'https://www.zoot.ro/fashion/pagina:3',
    ]);
}

console.log('crawl budget tests passed');
