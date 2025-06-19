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
 * Parse HTML content and extract product details
 */
function parseProductDetails(
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

/**
 * Extract product title from HTML
 */
function extractTitle(html: string, url: string): string | undefined {
  const siteInfo = getEcommerceSiteInfo(url)

  // Start with site-specific patterns if available
  const patterns: RegExp[] = [
    ...(siteInfo.titlePatterns || []),
    // General patterns as fallback
    /<meta\s+property="og:title"\s+content="([^"]+)"/i,
    /<meta\s+name="twitter:title"\s+content="([^"]+)"/i,
    /<meta\s+name="product-title"\s+content="([^"]+)"/i,
    /<meta\s+property="product:name"\s+content="([^"]+)"/i,
    /<h1[^>]*>([^<]+)</i,
    /<title>([^<]+)<\/title>/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      const title = match[1].trim()
      // Clean up common suffixes
      const cleanTitle = title
        .replace(
          /\s*[-|]\s*(Amazon|eBay|Shop|Store|Online|Kaufen|günstig|billig).*$/i,
          '',
        )
        .replace(/\s*\|\s*.*$/, '')
        .trim()

      if (cleanTitle.length > 3) {
        return cleanTitle
      }
    }
  }

  return undefined
}

/**
 * Extract product description from HTML
 */
function extractDescription(html: string): string | undefined {
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

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      const description = match[1].trim()
      if (description.length > 10 && description.length < 500) {
        return description
      }
    }
  }

  return undefined
}

/**
 * Extract price from HTML
 */
function extractPrice(html: string, url: string): number | undefined {
  const siteInfo = getEcommerceSiteInfo(url)

  const patterns: RegExp[] = [
    ...(siteInfo.pricePatterns || []),
    // General patterns as fallback
    /<meta\s+property="product:price:amount"\s+content="([0-9.,]+)"/i,
    /price[^>]*>.*?([0-9]+[.,]\d{2})/i,
    /€\s*([0-9]+[.,]\d{2})/i,
    /([0-9]+[.,]\d{2})\s*€/i,
    // JSON-LD structured data
    /"price":\s*"([0-9.,]+)"/i,
    /"price":\s*([0-9.,]+)/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      const priceStr = match[1].replace(',', '.')
      const price = parseFloat(priceStr)
      if (!isNaN(price) && price > 0 && price < 100000) {
        return price
      }
    }
  }

  return undefined
}

/**
 * Extract image URL from HTML
 */
function extractImageUrl(html: string, baseUrl: string): string | undefined {
  const siteInfo = getEcommerceSiteInfo(baseUrl)

  const patterns: RegExp[] = [
    ...(siteInfo.imagePatterns || []),
    // General patterns as fallback
    /<meta\s+property="og:image"\s+content="([^"]+)"/i,
    /<meta\s+name="twitter:image"\s+content="([^"]+)"/i,
    /<meta\s+property="product:image"\s+content="([^"]+)"/i,
    /<img[^>]+class="[^"]*product[^"]*"[^>]+src="([^"]+)"/i,
    /<img[^>]+alt="[^"]*product[^"]*"[^>]+src="([^"]+)"/i,
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match && match[1]) {
      let imageUrl = match[1].trim()

      // Convert relative URLs to absolute
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl
      } else if (imageUrl.startsWith('/')) {
        const baseUrlObj = new URL(baseUrl)
        imageUrl = baseUrlObj.origin + imageUrl
      }

      // Validate URL
      try {
        new URL(imageUrl)
        return imageUrl
      } catch {
        continue
      }
    }
  }

  return undefined
}
