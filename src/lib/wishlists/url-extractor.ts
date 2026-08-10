export interface ProductDetails {
  name?: string
  description?: string
  price?: number
  imageUrl?: string
  extractedFrom: string
  confidence: 'high' | 'medium' | 'low'
}

import { getEcommerceSiteInfo } from './helpers'

/**
 * Extract product details from a URL by fetching and parsing the HTML
 */
export async function extractProductDetailsFromUrl(
  url: string,
): Promise<ProductDetails> {
  try {
    // Fetch the HTML content
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        DNT: '1',
        Connection: 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      redirect: 'follow',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()

    // Parse the HTML and extract product details
    const details = parseProductDetails(html, url)

    return {
      ...details,
      extractedFrom: url,
    }
  } catch (error) {
    console.error('Error fetching URL:', error)
    throw new Error('Fehler beim Laden der URL')
  }
}

/**
 * Try each pattern in order and return the first captured group that `refine`
 * accepts.
 *
 * Every extractor below works this way: site-specific patterns first, general
 * ones as a fallback, and a per-extractor notion of what makes a hit usable. A
 * pattern that matches but yields an unusable value must not stop the search,
 * which is the part that is easy to get wrong when the loop is written out.
 */
function firstMatch<T>(
  html: string,
  patterns: RegExp[],
  refine: (captured: string) => T | undefined,
): T | undefined {
  for (const pattern of patterns) {
    const captured = html.match(pattern)?.[1]
    if (!captured) continue

    const value = refine(captured)
    if (value !== undefined) return value
  }

  return undefined
}

/** A price is usable when it parses and lands in a plausible range. */
function toPlausiblePrice(raw: string): number | undefined {
  const price = parseFloat(raw.replace(',', '.'))

  return !isNaN(price) && price > 0 && price < 100000 ? price : undefined
}

/**
 * Parse HTML content and extract product details
 */
export function parseProductDetails(
  html: string,
  url: string,
): Omit<ProductDetails, 'extractedFrom'> {
  // Create a simple HTML parser using regex patterns
  const details: Omit<ProductDetails, 'extractedFrom'> = {
    confidence: 'low',
  }

  // Extract title
  const name = extractTitle(html, url)
  if (name) {
    details.name = name
    details.confidence = 'medium'
  }

  // Extract description
  const description = extractDescription(html)
  if (description) {
    details.description = description
  }

  // Extract price
  const price = extractPrice(html, url)
  if (price) {
    details.price = price
    details.confidence = 'high'
  }

  // Extract image URL
  const imageUrl = extractImageUrl(html, url)
  if (imageUrl) {
    details.imageUrl = imageUrl
  }

  return details
}

/** Shop names and separators that pad a page title but are not the product. */
const TITLE_NOISE =
  /\s*[-|]\s*(Amazon|eBay|Shop|Store|Online|Kaufen|günstig|billig).*$/i

/**
 * Extract product title from HTML
 */
export function extractTitle(html: string, url: string): string | undefined {
  const patterns: RegExp[] = [
    // Site-specific patterns first, general ones as a fallback.
    ...(getEcommerceSiteInfo(url).titlePatterns || []),
    /<meta\s+property="og:title"\s+content="([^"]+)"/i,
    /<meta\s+name="twitter:title"\s+content="([^"]+)"/i,
    /<meta\s+name="product-title"\s+content="([^"]+)"/i,
    /<meta\s+property="product:name"\s+content="([^"]+)"/i,
    /<h1[^>]*>([^<]+)</i,
    /<title>([^<]+)<\/title>/i,
  ]

  return firstMatch(html, patterns, (captured) => {
    const title = captured
      .trim()
      .replace(TITLE_NOISE, '')
      .replace(/\s*\|\s*.*$/, '')
      .trim()

    // Anything this short is a breadcrumb or a stray label, not a product name.
    return title.length > 3 ? title : undefined
  })
}

/**
 * Extract product description from HTML
 */
export function extractDescription(html: string): string | undefined {
  const patterns: RegExp[] = [
    // OpenGraph description
    /<meta\s+property="og:description"\s+content="([^"]+)"/i,
    // Meta description
    /<meta\s+name="description"\s+content="([^"]+)"/i,
    // Product description
    /<meta\s+name="product-description"\s+content="([^"]+)"/i,
    // Amazon feature bullets
    /<div\s+id="feature-bullets"[^>]*>.*?<span[^>]*>([^<]+)</i,
  ]

  return firstMatch(html, patterns, (captured) => {
    const description = captured.trim()

    return description.length > 10 && description.length < 500
      ? description
      : undefined
  })
}

/**
 * Amazon splits a price across separate whole and fraction elements, so the
 * general single-capture patterns would read only the euros.
 */
function extractAmazonPrice(html: string): number | undefined {
  const match = html.match(
    /<span[^>]*class="a-price-whole"[^>]*>([0-9.]+)<span[^>]*class="a-price-decimal"[^>]*>[^<]*<\/span><\/span><span[^>]*class="a-price-fraction"[^>]*>([0-9]{2})<\/span>/i,
  )

  if (!match?.[1] || !match[2]) return undefined

  // The whole part carries German thousands dots, which must go before parsing.
  const whole = match[1].replace(/\./g, '').replace(/\s/g, '')

  return toPlausiblePrice(`${whole}.${match[2]}`)
}

/**
 * Extract price from HTML
 */
export function extractPrice(html: string, url: string): number | undefined {
  if (url.includes('amazon.')) {
    const amazonPrice = extractAmazonPrice(html)
    if (amazonPrice !== undefined) return amazonPrice
  }

  const patterns: RegExp[] = [
    ...(getEcommerceSiteInfo(url).pricePatterns || []),
    // General patterns as fallback
    /<meta\s+property="product:price:amount"\s+content="([0-9.,]+)"/i,
    /price[^>]*>.*?([0-9]+[.,]\d{2})/i,
    /€\s*([0-9]+[.,]\d{2})/i,
    /([0-9]+[.,]\d{2})\s*€/i,
    // JSON-LD structured data
    /"price":\s*"([0-9.,]+)"/i,
    /"price":\s*([0-9.,]+)/i,
  ]

  return firstMatch(html, patterns, toPlausiblePrice)
}

/** Resolves protocol-relative and root-relative image sources against the page. */
function absoluteImageUrl(src: string, baseUrl: string): string | undefined {
  const candidate = src.startsWith('//')
    ? `https:${src}`
    : src.startsWith('/')
      ? new URL(baseUrl).origin + src
      : src

  try {
    new URL(candidate)
    return candidate
  } catch {
    return undefined
  }
}

/**
 * Extract image URL from HTML
 */
export function extractImageUrl(
  html: string,
  baseUrl: string,
): string | undefined {
  const patterns: RegExp[] = [
    ...(getEcommerceSiteInfo(baseUrl).imagePatterns || []),
    // General patterns as fallback
    /<meta\s+property="og:image"\s+content="([^"]+)"/i,
    /<meta\s+name="twitter:image"\s+content="([^"]+)"/i,
    /<meta\s+property="product:image"\s+content="([^"]+)"/i,
    /<img[^>]+class="[^"]*product[^"]*"[^>]+src="([^"]+)"/i,
    /<img[^>]+alt="[^"]*product[^"]*"[^>]+src="([^"]+)"/i,
  ]

  return firstMatch(html, patterns, (captured) =>
    absoluteImageUrl(captured.trim(), baseUrl),
  )
}
