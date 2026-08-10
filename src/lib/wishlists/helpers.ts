/**
 * Handle image loading errors by setting a fallback placeholder
 *
 * @param event The error event from the image element
 */
export function handleImageError(event: Event): void {
  const img = event.target as HTMLImageElement
  img.src = '/placeholder-image.svg'
}

/**
 * Format a price as currency
 *
 * @param price The price to format
 * @param currency The currency code (defaults to EUR)
 * @returns Formatted price string
 */
export function formatPrice(price: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(price)
}

/** Scraping patterns for one shop, tried before the generic fallbacks. */
export interface EcommerceSiteInfo {
  siteName: string
  titlePatterns?: RegExp[]
  pricePatterns?: RegExp[]
  imagePatterns?: RegExp[]
}

/**
 * Known shops, matched by hostname substring in order.
 *
 * A table rather than an if-chain: adding a shop is one entry, and the match
 * rule stays in one place instead of being restated per branch.
 */
const ECOMMERCE_SITES: { match: string; info: EcommerceSiteInfo }[] = [
  {
    match: 'amazon.',
    info: {
      siteName: 'Amazon',
      titlePatterns: [
        /<span\s+id="productTitle"[^>]*>([^<]+)</i,
        /<h1[^>]*>([^<]+)</i,
      ],
      pricePatterns: [
        /<span\s+class="a-price-whole">([0-9.,]+)</i,
        /<span\s+class="a-offscreen">€([0-9.,]+)</i,
        /<span\s+class="a-price"[^>]*>.*?€([0-9.,]+)</i,
      ],
      imagePatterns: [
        /<img[^>]+id="landingImage"[^>]+src="([^"]+)"/i,
        /<img[^>]+data-old-hires="([^"]+)"/i,
      ],
    },
  },
  {
    match: 'ebay.',
    info: {
      siteName: 'eBay',
      titlePatterns: [
        /<h1[^>]*id="it-ttl"[^>]*>([^<]+)</i,
        /<h1[^>]*>([^<]+)</i,
      ],
      pricePatterns: [
        /<span[^>]*id="notranslate"[^>]*>EUR ([0-9.,]+)</i,
        /EUR\s+([0-9.,]+)/i,
      ],
    },
  },
  {
    match: 'otto.de',
    info: {
      siteName: 'Otto',
      pricePatterns: [
        /<span[^>]*class="[^"]*price[^"]*"[^>]*>([0-9.,]+)[^€]*€</i,
      ],
    },
  },
  {
    match: 'zalando.',
    info: {
      siteName: 'Zalando',
      pricePatterns: [
        /<span[^>]*class="[^"]*price[^"]*"[^>]*>([0-9.,]+)\s*€</i,
      ],
    },
  },
]

/** Returned for anything not in the table; only the generic patterns apply. */
const UNKNOWN_SITE: EcommerceSiteInfo = { siteName: 'Unknown' }

/**
 * Check if URL is from a known e-commerce site and return site-specific patterns
 */
export function getEcommerceSiteInfo(url: string): EcommerceSiteInfo {
  const hostname = new URL(url).hostname.toLowerCase()

  return (
    ECOMMERCE_SITES.find((site) => hostname.includes(site.match))?.info ??
    UNKNOWN_SITE
  )
}
