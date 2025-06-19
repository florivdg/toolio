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

/**
 * Format a date string for display
 *
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Check if URL is from a known e-commerce site and return site-specific patterns
 */
export function getEcommerceSiteInfo(url: string): {
  siteName: string
  titlePatterns?: RegExp[]
  pricePatterns?: RegExp[]
  imagePatterns?: RegExp[]
} {
  const hostname = new URL(url).hostname.toLowerCase()

  if (hostname.includes('amazon.')) {
    return {
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
    }
  }

  if (hostname.includes('ebay.')) {
    return {
      siteName: 'eBay',
      titlePatterns: [
        /<h1[^>]*id="it-ttl"[^>]*>([^<]+)</i,
        /<h1[^>]*>([^<]+)</i,
      ],
      pricePatterns: [
        /<span[^>]*id="notranslate"[^>]*>EUR ([0-9.,]+)</i,
        /EUR\s+([0-9.,]+)/i,
      ],
    }
  }

  if (hostname.includes('otto.de')) {
    return {
      siteName: 'Otto',
      pricePatterns: [
        /<span[^>]*class="[^"]*price[^"]*"[^>]*>([0-9.,]+)[^€]*€</i,
      ],
    }
  }

  if (hostname.includes('zalando.')) {
    return {
      siteName: 'Zalando',
      pricePatterns: [
        /<span[^>]*class="[^"]*price[^"]*"[^>]*>([0-9.,]+)\s*€</i,
      ],
    }
  }

  // Default patterns for unknown sites
  return {
    siteName: 'Unknown',
  }
}
