import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import * as cheerio from 'cheerio';
import {
    calculatePaginationLimit,
    normalizeInput,
} from '../src/config.js';
import { buildNextPageUrls } from '../src/routes/categoryRoute.js';

describe('calculatePaginationLimit', () => {
    it('skips pagination when maxItems is already satisfied by the first page', () => {
        assert.equal(calculatePaginationLimit({
            maxItems: 2,
            productLinksOnCurrentPage: 48,
            totalPages: 505,
        }), 1);
    });

    it('enqueues one extra page when maxItems is slightly above the first page', () => {
        assert.equal(calculatePaginationLimit({
            maxItems: 50,
            productLinksOnCurrentPage: 48,
            totalPages: 505,
        }), 2);
    });

    it('caps pagination to the number of pages needed for maxItems', () => {
        assert.equal(calculatePaginationLimit({
            maxItems: 100,
            productLinksOnCurrentPage: 48,
            totalPages: 505,
        }), 3);
    });
});

describe('normalizeInput', () => {
    it('applies crawler safety defaults', () => {
        const normalized = normalizeInput({});

        assert.equal(normalized.maxItems, 25);
        assert.equal(normalized.maxConcurrency, 2);
        assert.equal(normalized.maxRequestsPerCrawl, 100);
        assert.deepEqual(normalized.startUrls, ['https://www.zoot.cz/katalog/17504/zeny']);
    });
});

describe('buildNextPageUrls', () => {
    it('builds colon-style Czech pagination URLs up to the crawl budget', () => {
        const $ = cheerio.load(`
            <a class="pagination__item" href="/damske/strana:505/" data-number="505" data-test="pagination__page">505</a>
        `);

        assert.deepEqual(buildNextPageUrls($, 'https://www.zoot.cz/katalog/17504/zeny', 100, 48), [
            'https://www.zoot.cz/damske/strana:2/',
            'https://www.zoot.cz/damske/strana:3/',
        ]);
    });

    it('builds path-style pagination URLs up to the crawl budget', () => {
        const $ = cheerio.load(`
            <a class="pagination__item" href="/katalog/zeny/stranka/505" data-number="505" data-test="pagination__page">505</a>
        `);

        assert.deepEqual(buildNextPageUrls($, 'https://www.zoot.cz/katalog/17504/zeny', 50, 48), [
            'https://www.zoot.cz/katalog/zeny/stranka/2',
        ]);
    });

    it('builds Romanian pagination URLs up to the crawl budget', () => {
        const $ = cheerio.load(`
            <a class="pagination__jump" href="/fashion/pagina:10">10</a>
        `);

        assert.deepEqual(buildNextPageUrls($, 'https://www.zoot.ro/fashion', 50, 24), [
            'https://www.zoot.ro/fashion/pagina:2',
            'https://www.zoot.ro/fashion/pagina:3',
        ]);
    });
});
