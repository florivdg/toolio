import { describe, expect, test } from 'bun:test'
import { formatPrice, getEcommerceSiteInfo } from '@/lib/wishlists/helpers'
import { normalizeSpaces } from '../../support/intl'

describe('formatPrice', () => {
  test('formats in euros by default', () => {
    expect(normalizeSpaces(formatPrice(19.9))).toBe('19,90 €')
  })

  test('honours an explicit currency', () => {
    expect(normalizeSpaces(formatPrice(19.9, 'USD'))).toBe('19,90 $')
  })

  test('formats zero rather than treating it as absent', () => {
    expect(normalizeSpaces(formatPrice(0))).toBe('0,00 €')
  })

  test('groups thousands in the German style', () => {
    expect(normalizeSpaces(formatPrice(1234.56))).toBe('1.234,56 €')
  })
})

describe('getEcommerceSiteInfo', () => {
  test.each([
    ['https://www.amazon.de/dp/B08N5WRWNW', 'Amazon'],
    ['https://www.amazon.com/dp/B08N5WRWNW', 'Amazon'],
    ['https://www.ebay.de/itm/123', 'eBay'],
    ['https://www.otto.de/p/123', 'Otto'],
    ['https://www.zalando.de/p/123', 'Zalando'],
  ])('recognises %s as %s', (url, siteName) => {
    expect(getEcommerceSiteInfo(url).siteName).toBe(siteName)
  })

  test('falls back to Unknown for unrecognised hosts', () => {
    const info = getEcommerceSiteInfo('https://example.com/product/1')
    expect(info.siteName).toBe('Unknown')
    expect(info.titlePatterns).toBeUndefined()
    expect(info.pricePatterns).toBeUndefined()
  })

  test('matches the host case-insensitively', () => {
    expect(getEcommerceSiteInfo('https://WWW.AMAZON.DE/dp/1').siteName).toBe(
      'Amazon',
    )
  })

  test('matches on the hostname, not the path', () => {
    // A path segment naming another retailer must not win over the real host.
    expect(
      getEcommerceSiteInfo('https://example.com/amazon.de/x').siteName,
    ).toBe('Unknown')
  })

  test('supplies Amazon extraction patterns that match real markup', () => {
    const info = getEcommerceSiteInfo('https://www.amazon.de/dp/1')
    const title =
      '<span id="productTitle" class="a-size-large">Ein Produkt</span>'
    const matched = info.titlePatterns?.find((p) => p.test(title))
    expect(matched).toBeDefined()
    expect(title.match(matched!)?.[1]?.trim()).toBe('Ein Produkt')
  })

  test('supplies Amazon price patterns that capture the amount', () => {
    const info = getEcommerceSiteInfo('https://www.amazon.de/dp/1')
    const markup = '<span class="a-price-whole">1.299</span>'
    const pattern = info.pricePatterns?.find((p) => p.test(markup))
    expect(markup.match(pattern!)?.[1]).toBe('1.299')
  })

  test('throws on input that is not a URL', () => {
    expect(() => getEcommerceSiteInfo('not a url')).toThrow()
  })
})
