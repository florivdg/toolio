import { describe, expect, test } from 'bun:test'
import {
  extractDescription,
  extractImageUrl,
  extractPrice,
  extractTitle,
  parseProductDetails,
} from '@/lib/wishlists/url-extractor'

/**
 * These extractors read arbitrary shop HTML with regexes, so the interesting
 * cases are the ones where a pattern matches but the value is unusable — the
 * search has to carry on to the next pattern rather than give up.
 */

const GENERIC_URL = 'https://shop.example/produkt/1'
const AMAZON_URL = 'https://www.amazon.de/dp/B000000000'

describe('extractTitle', () => {
  test('prefers the OpenGraph title', () => {
    const html = `
      <meta property="og:title" content="Kaffeemühle Pro">
      <title>Irgendwas anderes</title>`

    expect(extractTitle(html, GENERIC_URL)).toBe('Kaffeemühle Pro')
  })

  test('falls back through to the document title', () => {
    expect(extractTitle('<title>Kaffeemühle Pro</title>', GENERIC_URL)).toBe(
      'Kaffeemühle Pro',
    )
  })

  test('strips a trailing shop name', () => {
    const html = '<title>Kaffeemühle Pro - Amazon.de</title>'

    expect(extractTitle(html, GENERIC_URL)).toBe('Kaffeemühle Pro')
  })

  test('strips everything after a pipe separator', () => {
    const html = '<title>Kaffeemühle Pro | Grosser Shop | Angebote</title>'

    expect(extractTitle(html, GENERIC_URL)).toBe('Kaffeemühle Pro')
  })

  test('skips a match that cleans down to almost nothing', () => {
    // og:title reduces to 'Neu', too short to be a product name, so the
    // document title must still be reached.
    const html = `
      <meta property="og:title" content="Neu | Shop">
      <title>Kaffeemühle Pro</title>`

    expect(extractTitle(html, GENERIC_URL)).toBe('Kaffeemühle Pro')
  })

  test('uses the Amazon-specific product title element', () => {
    const html = `
      <span id="productTitle">   Kaffeemühle Pro   </span>
      <meta property="og:title" content="Etwas anderes">`

    expect(extractTitle(html, AMAZON_URL)).toBe('Kaffeemühle Pro')
  })

  test('returns undefined when nothing matches', () => {
    expect(extractTitle('<p>kein titel</p>', GENERIC_URL)).toBeUndefined()
  })
})

describe('extractDescription', () => {
  test('prefers the OpenGraph description', () => {
    const html = `
      <meta property="og:description" content="Eine sehr gute Kaffeemühle.">
      <meta name="description" content="Etwas ganz anderes und laenger.">`

    expect(extractDescription(html)).toBe('Eine sehr gute Kaffeemühle.')
  })

  test('skips a description that is too short', () => {
    const html = `
      <meta property="og:description" content="Kurz">
      <meta name="description" content="Eine ausreichend lange Beschreibung.">`

    expect(extractDescription(html)).toBe(
      'Eine ausreichend lange Beschreibung.',
    )
  })

  test('skips a description that is too long', () => {
    const html = `
      <meta property="og:description" content="${'x'.repeat(500)}">
      <meta name="description" content="Eine ausreichend lange Beschreibung.">`

    expect(extractDescription(html)).toBe(
      'Eine ausreichend lange Beschreibung.',
    )
  })

  test('returns undefined when nothing matches', () => {
    expect(extractDescription('<p>nichts</p>')).toBeUndefined()
  })
})

describe('extractPrice', () => {
  test('reads a JSON-LD price', () => {
    expect(extractPrice('{"price": "89.90"}', GENERIC_URL)).toBe(89.9)
  })

  test('accepts a German comma decimal', () => {
    expect(extractPrice('<span>89,90 €</span>', GENERIC_URL)).toBe(89.9)
  })

  test('reads the product:price:amount meta tag', () => {
    const html =
      '<meta property="product:price:amount" content="12.50"><span>€ 99,99</span>'

    expect(extractPrice(html, GENERIC_URL)).toBe(12.5)
  })

  test('rejects a zero price and keeps looking', () => {
    const html =
      '<meta property="product:price:amount" content="0"><p>€ 24,99</p>'

    expect(extractPrice(html, GENERIC_URL)).toBe(24.99)
  })

  test('rejects an implausibly large price', () => {
    expect(
      extractPrice(
        '<meta property="product:price:amount" content="100000">',
        GENERIC_URL,
      ),
    ).toBeUndefined()
  })

  test('joins the split Amazon whole and fraction elements', () => {
    const html =
      '<span class="a-price-whole">1.234<span class="a-price-decimal">,</span></span><span class="a-price-fraction">56</span>'

    expect(extractPrice(html, AMAZON_URL)).toBe(1234.56)
  })

  test('falls back to the generic patterns on Amazon without the split markup', () => {
    expect(extractPrice('<span>19,99 €</span>', AMAZON_URL)).toBe(19.99)
  })

  test('returns undefined when there is no price at all', () => {
    expect(extractPrice('<p>ausverkauft</p>', GENERIC_URL)).toBeUndefined()
  })
})

describe('extractImageUrl', () => {
  test('reads the OpenGraph image', () => {
    const html =
      '<meta property="og:image" content="https://cdn.example/a.jpg">'

    expect(extractImageUrl(html, GENERIC_URL)).toBe('https://cdn.example/a.jpg')
  })

  test('resolves a protocol-relative source', () => {
    const html = '<meta property="og:image" content="//cdn.example/a.jpg">'

    expect(extractImageUrl(html, GENERIC_URL)).toBe('https://cdn.example/a.jpg')
  })

  test('resolves a root-relative source against the page origin', () => {
    const html = '<meta property="og:image" content="/media/a.jpg">'

    expect(extractImageUrl(html, GENERIC_URL)).toBe(
      'https://shop.example/media/a.jpg',
    )
  })

  test('skips a source that is not a usable URL', () => {
    const html = `
      <meta property="og:image" content="not a url">
      <meta name="twitter:image" content="https://cdn.example/b.jpg">`

    expect(extractImageUrl(html, GENERIC_URL)).toBe('https://cdn.example/b.jpg')
  })

  test('returns undefined when nothing matches', () => {
    expect(extractImageUrl('<p>kein bild</p>', GENERIC_URL)).toBeUndefined()
  })
})

describe('parseProductDetails', () => {
  test('reports low confidence when nothing could be read', () => {
    expect(parseProductDetails('<p>leer</p>', GENERIC_URL)).toEqual({
      confidence: 'low',
    })
  })

  test('reports medium confidence with a name but no price', () => {
    const details = parseProductDetails(
      '<title>Kaffeemühle Pro</title>',
      GENERIC_URL,
    )

    expect(details.name).toBe('Kaffeemühle Pro')
    expect(details.confidence).toBe('medium')
  })

  test('reports high confidence once a price was found', () => {
    const html = `
      <title>Kaffeemühle Pro</title>
      <meta property="og:description" content="Eine sehr gute Kaffeemühle.">
      <meta property="og:image" content="https://cdn.example/a.jpg">
      <meta property="product:price:amount" content="89.90">`

    expect(parseProductDetails(html, GENERIC_URL)).toEqual({
      name: 'Kaffeemühle Pro',
      description: 'Eine sehr gute Kaffeemühle.',
      price: 89.9,
      imageUrl: 'https://cdn.example/a.jpg',
      confidence: 'high',
    })
  })

  test('reaches high confidence from a price alone', () => {
    const details = parseProductDetails('<p>€ 12,00</p>', GENERIC_URL)

    expect(details.price).toBe(12)
    expect(details.confidence).toBe('high')
    expect(details.name).toBeUndefined()
  })
})
