import { before, after, test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
let server, m
before(async () => {
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} }
  server = await createServer({ configFile: false, cacheDir: 'node_modules/.vite-catalog-tests', server: { middlewareMode: true, hmr: false }, appType: 'custom' })
  m = await server.ssrLoadModule('/src/lib/catalogParams.ts')
})
after(async () => { await server?.close() })
const P = (s) => new URLSearchParams(s)

test('search is trimmed and whitespace-only search is ignored (API answers 422 for it)', () => {
  assert.equal(m.readCatalog(P('search=%20%20')).search, '')
  assert.equal(m.readCatalog(P('search=%20سيروم%20')).search, 'سيروم')
  assert.equal(m.sanitizeCatalogParams(P('search=%20%20')).toString(), 'all=1')
  assert.equal(m.sanitizeCatalogParams(P('search=%20Serum')).get('search'), 'Serum')
})

test('invalid sort, price and page values never reach the request and are removed from the URL', () => {
  const s = m.readCatalog(P('sort=bogus&min_price=-3&max_price=abc&page=0&collection=1.5'))
  assert.equal(s.sort, undefined); assert.equal(s.minPrice, undefined); assert.equal(s.maxPrice, undefined); assert.equal(s.page, 1); assert.equal(s.collection, undefined)
  assert.equal(m.sanitizeCatalogParams(P('all=1&sort=bogus&min_price=-3&page=0')).toString(), 'all=1')
  assert.equal(m.sanitizeCatalogParams(P('all=1&page=2.7')).get('page'), '2')
  assert.equal(m.sanitizeCatalogParams(P('all=1&sort=price&min_price=0&page=2')), null)
})

test('min greater than max is flagged instead of being sent (API answers 422)', () => {
  assert.equal(m.readCatalog(P('min_price=50&max_price=10')).priceRangeInvalid, true)
  assert.equal(m.readCatalog(P('min_price=10&max_price=10')).priceRangeInvalid, false)
  assert.equal(m.sanitizeCatalogParams(P('all=1&min_price=50&max_price=10')), null)
})

test('clearing filters keeps search and sort; clearing search keeps filters; pagination resets', () => {
  const q = P('search=Serum&category=skincare&sub=serums&min_price=10&max_price=50&sort=price&page=3')
  assert.equal(m.clearFilters(q).toString(), 'search=Serum&sort=price')
  assert.equal(m.clearSearch(q).toString(), 'category=skincare&sub=serums&min_price=10&max_price=50&sort=price')
  assert.equal(m.removeFilter(q, 'price').toString(), 'search=Serum&category=skincare&sub=serums&sort=price')
  assert.equal(m.removeFilter(q, 'category').toString(), 'search=Serum&min_price=10&max_price=50&sort=price')
  assert.equal(m.setCatalogParam(q, 'sort', '-price').get('page'), null)
})

test('removing the last constraint stays on the catalog instead of jumping to the home page', () => {
  assert.equal(m.clearSearch(P('search=Serum')).toString(), 'all=1')
  assert.equal(m.removeFilter(P('category=skincare'), 'category').toString(), 'all=1')
  assert.equal(m.clearFilters(P('all=1&min_price=5')).toString(), 'all=1')
})

test('active filter count treats the price range as one filter and ignores search/sort', () => {
  assert.equal(m.activeFilterCount(m.readCatalog(P('search=a&sort=price&category=c&min_price=1&max_price=9'))), 2)
  assert.equal(m.activeFilterCount(m.readCatalog(P('search=a'))), 0)
})

test('price inputs are validated before applying', () => {
  assert.deepEqual(m.priceParams('', ''), {})
  assert.deepEqual(m.priceParams('0', ''), {})
  assert.deepEqual(m.priceParams('10', '0'), { error: 'range' })
  assert.deepEqual(m.priceParams('-1', ''), { error: 'negative' })
  assert.deepEqual(m.priceParams('5', '5'), { min_price: '5', max_price: '5' })
  assert.deepEqual(m.priceParams('', '0'), { max_price: '0' })
  assert.deepEqual(m.priceParams('12.5', '40'), { min_price: '12.5', max_price: '40' })
})

test('search link encodes the trimmed phrase and opens the results section', () => {
  assert.equal(m.searchHref('  عطر ورد '), '/?search=%D8%B9%D8%B7%D8%B1+%D9%88%D8%B1%D8%AF#products')
})
