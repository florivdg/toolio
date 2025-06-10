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
