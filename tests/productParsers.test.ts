import assert from 'node:assert/strict';
import * as cheerio from 'cheerio';
import {
    parseCurrentPrice,
    parseCurrency,
    parseSizes,
    parseDescription,
    parseCzSkLayoutAttributes,
    parseBrand,
} from '../src/parsers/product.js';

const load = (html: string) => cheerio.load(html);

{
    const $ = load(`
        <html><head><title>Example Jacket | ZOOT.cz</title></head><body>
            <meta itemprop="price" content="1089" />
            <span class="price__discounted">1 089 Kč</span>
        </body></html>
    `);

    assert.equal(parseCurrency($, 'https://www.zoot.cz/polozka/1/example'), 'CZK');
    assert.deepEqual(parseCurrentPrice($, 'https://www.zoot.cz/polozka/1/example'), {
        value: 1089,
        formattedPrice: '1 089 Kč',
    });
}

{
    const $ = load(`
        <html><body>
            <meta itemprop="price" content="1089" />
        </body></html>
    `);

    assert.deepEqual(parseCurrentPrice($, 'https://www.zoot.cz/polozka/1/example'), {
        value: 1089,
        formattedPrice: '1 089 Kč',
    });
}

{
    const $ = load(`
        <html><body>
            <span class="product-detail__price"><span content="1234.56">1.234,56 lei</span></span>
        </body></html>
    `);

    assert.equal(parseCurrency($, 'https://www.zoot.ro/detaliu/1/example'), 'RON');
    assert.deepEqual(parseCurrentPrice($, 'https://www.zoot.ro/detaliu/1/example'), {
        value: 1234.56,
        formattedPrice: '1 234.56 lei',
    });
}

{
    const $ = load(`
        <html><body>
            <span class="product-detail__price">1.234,56 lei</span>
        </body></html>
    `);

    assert.deepEqual(parseCurrentPrice($, 'https://www.zoot.ro/detaliu/1/example'), {
        value: 1234.56,
        formattedPrice: '1 234.56 lei',
    });
}

{
    const $ = load(`
        <html><body>
            <span class="product-detail__price">1.234 lei</span>
        </body></html>
    `);

    assert.deepEqual(parseCurrentPrice($, 'https://www.zoot.ro/detaliu/1/example'), {
        value: 1234,
        formattedPrice: '1 234 lei',
    });
}

{
    const $ = load(`
        <html><body>
            <span class="product-detail__price">1234.56 lei</span>
        </body></html>
    `);

    assert.deepEqual(parseCurrentPrice($, 'https://www.zoot.ro/detaliu/1/example'), {
        value: 1234.56,
        formattedPrice: '1 234.56 lei',
    });
}

{
    const $ = load(`
        <div data-read-more-target="content">
            <p>Comfortable jacket for spring.</p>
            <strong>Material:</strong> 100% cotton<br>
            <strong>Fit:</strong> Regular<br>
        </div>
    `);

    assert.equal(parseDescription($), 'Comfortable jacket for spring.');
    assert.deepEqual(parseCzSkLayoutAttributes($), [
        { key: 'Material', value: '100% cotton' },
        { key: 'Fit', value: 'Regular' },
    ]);
}

{
    const $ = load(`
        <select data-rich-select>
            <option data-placeholder="true">Choose</option>
            <option>24/32 (na objednávku)</option>
            <option disabled>30/32 (vyprodáno)</option>
            <option>L - poslední kus</option>
            <option disabled>35 1/2 (na cedulce 35,5)- vyprodáno</option>
        </select>
    `);

    assert.deepEqual(parseSizes($), [
        { size: '24/32', available: true, note: 'na objednávku' },
        { size: '30/32', available: false, note: 'vyprodáno' },
        { size: 'L', available: true, note: 'poslední kus' },
        { size: '35 1/2', available: false, note: 'na cedulce 35,5; vyprodáno' },
    ]);
}

{
    const $ = load(`
        <a data-test="dealDetail__brandLogo" href="/znacka/gap"><img src="https://example.com/gap.png" alt="GAP"></a>
    `);

    assert.deepEqual(parseBrand($, 'https://www.zoot.cz/polozka/1/example'), {
        link: 'https://www.zoot.cz/znacka/gap',
        logo: 'https://example.com/gap.png',
        name: 'GAP',
    });
}
