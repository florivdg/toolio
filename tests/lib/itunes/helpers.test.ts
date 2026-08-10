import { describe, expect, test } from 'bun:test'
import type { SearchResult } from '@/lib/itunes/search'
import {
  formatDate,
  formatPrice,
  getArtworkUrl,
  getMediaType,
  mapCountryCode,
} from '@/lib/itunes/helpers'
import { normalizeSpaces } from '../../support/intl'

/** Minimal SearchResult, widened so each test only states the fields it cares about. */
function result(overrides: Partial<SearchResult> = {}): SearchResult {
  return overrides as SearchResult
}

describe('formatDate', () => {
  test('formats an ISO string in the German locale', () => {
    expect(formatDate('2024-03-15T00:00:00Z')).toBe('15. März 2024')
  })

  test('returns "Invalid Date" for unparseable input rather than throwing', () => {
    // toLocaleDateString does not throw on an invalid Date, so the catch block
    // is unreachable and the raw string is never echoed back.
    expect(formatDate('not-a-date')).toBe('Invalid Date')
  })
})

describe('formatPrice', () => {
  test('formats a price with the given currency', () => {
    expect(normalizeSpaces(formatPrice(9.99, 'EUR'))).toBe('9,99 €')
  })

  test('treats a missing price as free', () => {
    expect(formatPrice(undefined, 'EUR')).toBe('Kostenlos')
  })

  test('treats zero as free', () => {
    expect(formatPrice(0, 'EUR')).toBe('Kostenlos')
  })

  test('falls back to EUR when currency is empty', () => {
    expect(normalizeSpaces(formatPrice(5, ''))).toBe('5,00 €')
  })

  test('degrades to a plain string for an invalid currency code', () => {
    expect(formatPrice(5, 'NOT_A_CURRENCY')).toBe('5 NOT_A_CURRENCY')
  })
})

describe('getMediaType', () => {
  test.each([
    ['song', 'Titel'],
    ['album', 'Album'],
    ['artist', 'Künstler'],
    ['podcast', 'Podcast'],
    ['audiobook', 'Hörbuch'],
    ['music-video', 'Musikvideo'],
    ['tv-episode', 'TV-Folge'],
    ['tv-season', 'TV-Staffel'],
    ['feature-movie', 'Film'],
    ['software', 'App'],
    ['ebook', 'Buch'],
  ])('maps kind %s to %s', (kind, expected) => {
    expect(getMediaType(result({ kind }))).toBe(expected)
  })

  test('passes an unknown kind through unchanged', () => {
    expect(getMediaType(result({ kind: 'hologram' }))).toBe('hologram')
  })

  test('falls back to wrapperType when kind is absent', () => {
    expect(getMediaType(result({ wrapperType: 'track' }))).toBe('Titel')
    expect(getMediaType(result({ wrapperType: 'collection' }))).toBe('Sammlung')
    expect(getMediaType(result({ wrapperType: 'artist' }))).toBe('Künstler')
  })

  test('falls back to a generic label with neither kind nor wrapperType', () => {
    expect(getMediaType(result())).toBe('Medien')
  })
})

describe('getArtworkUrl', () => {
  test('prefers the highest available resolution', () => {
    const url = getArtworkUrl(
      result({
        artworkUrl600: 'https://example.com/a/600x600bb.jpg',
        artworkUrl100: 'https://example.com/a/100x100bb.jpg',
      }),
    )
    expect(url).toBe('https://example.com/a/536x0w.webp')
  })

  test.each([
    ['artworkUrl100', '100x100bb.jpg'],
    ['artworkUrl60', '60x60bb.jpg'],
    ['artworkUrl30', '30x30bb.jpg'],
  ])('upgrades %s to webp', (field, segment) => {
    const url = getArtworkUrl(
      result({ [field]: `https://example.com/a/${segment}` }),
    )
    expect(url).toBe('https://example.com/a/536x0w.webp')
  })

  test('returns the placeholder when no artwork is present', () => {
    expect(getArtworkUrl(result())).toBe('/placeholder-image.svg')
  })

  test('leaves an unrecognised artwork URL untouched', () => {
    const url = 'https://example.com/a/custom.png'
    expect(getArtworkUrl(result({ artworkUrl600: url }))).toBe(url)
  })
})

describe('mapCountryCode', () => {
  test('always resolves to the German store', () => {
    expect(mapCountryCode('US')).toBe('de')
    expect(mapCountryCode(undefined)).toBe('de')
  })
})
