import { describe, expect, test } from 'bun:test'
import {
  getLatestPrice,
  getMediaTypeLabel,
  getWatchlistArtworkUrl,
  parseWatchlistItem,
} from '@/lib/itunes/watchlist'
import type { ParsedWatchlistItem, WatchlistItem } from '@/lib/itunes/watchlist'
import { normalizeSpaces } from '../../support/intl'

/**
 * These drive what a watchlist card shows. Most of the interesting behaviour is
 * in the fallbacks: items stored before a column existed only carry the value
 * inside their additionalData blob.
 */

function item(overrides: Partial<ParsedWatchlistItem> = {}) {
  return { id: 'w1', name: 'Interstellar', ...overrides } as ParsedWatchlistItem
}

describe('parseWatchlistItem', () => {
  test('decodes a raw JSON blob', () => {
    const parsed = parseWatchlistItem({
      id: 'w1',
      additionalData: JSON.stringify({ trackPrice: 9.99 }),
    } as WatchlistItem)

    expect(parsed.additionalData).toEqual({ trackPrice: 9.99 })
  })

  test('passes through data the API already decoded', () => {
    const parsed = parseWatchlistItem({
      id: 'w1',
      additionalData: { trackPrice: 9.99 },
    } as unknown as WatchlistItem)

    expect(parsed.additionalData).toEqual({ trackPrice: 9.99 })
  })

  test('leaves additionalData undefined when there is none', () => {
    const parsed = parseWatchlistItem({
      id: 'w1',
      additionalData: null,
    } as WatchlistItem)

    expect(parsed.additionalData).toBeUndefined()
  })

  test('survives a corrupt blob instead of failing the whole list', () => {
    const parsed = parseWatchlistItem({
      id: 'w1',
      name: 'Interstellar',
      additionalData: '{not json',
    } as WatchlistItem)

    expect(parsed.additionalData).toBeUndefined()
    expect(parsed.name).toBe('Interstellar')
  })
})

describe('getMediaTypeLabel', () => {
  test('translates a known entity type', () => {
    expect(getMediaTypeLabel(item({ entityType: 'tv-season' }))).toBe(
      'TV-Staffel',
    )
    expect(getMediaTypeLabel(item({ entityType: 'audiobook' }))).toBe('Hörbuch')
  })

  test('labels both movie spellings as Film', () => {
    expect(getMediaTypeLabel(item({ entityType: 'feature-movie' }))).toBe(
      'Film',
    )
    expect(getMediaTypeLabel(item({ entityType: 'movie' }))).toBe('Film')
  })

  test('shows an unknown entity type verbatim', () => {
    expect(getMediaTypeLabel(item({ entityType: 'hoerspiel' }))).toBe(
      'hoerspiel',
    )
  })

  test('falls back to the wrapper type', () => {
    expect(getMediaTypeLabel(item({ wrapperType: 'collection' }))).toBe(
      'Sammlung',
    )
  })

  test('falls back to the media type for an unmapped wrapper type', () => {
    expect(
      getMediaTypeLabel(item({ wrapperType: 'sonstiges', mediaType: 'music' })),
    ).toBe('music')
  })

  test('never leaves a card unlabelled', () => {
    expect(getMediaTypeLabel(item())).toBe('Medien')
  })

  test('prefers the entity type over the wrapper type', () => {
    expect(
      getMediaTypeLabel(
        item({ entityType: 'song', wrapperType: 'collection' }),
      ),
    ).toBe('Titel')
  })
})

describe('getWatchlistArtworkUrl', () => {
  test('upgrades the stored artwork to the large webp rendition', () => {
    expect(
      getWatchlistArtworkUrl(
        item({ artworkUrl: 'https://cdn.example/a/100x100bb.jpg' }),
      ),
    ).toBe('https://cdn.example/a/536x0w.webp')
  })

  test('falls back to the largest variant in additionalData', () => {
    expect(
      getWatchlistArtworkUrl(
        item({
          additionalData: {
            artworkUrl100: 'https://cdn.example/a/100x100bb.jpg',
            artworkUrl600: 'https://cdn.example/a/600x600bb.jpg',
          },
        }),
      ),
    ).toBe('https://cdn.example/a/536x0w.webp')
  })

  test('prefers the stored column over additionalData', () => {
    expect(
      getWatchlistArtworkUrl(
        item({
          artworkUrl: 'https://cdn.example/stored.jpg',
          additionalData: { artworkUrl600: 'https://cdn.example/extra.jpg' },
        }),
      ),
    ).toBe('https://cdn.example/stored.jpg')
  })

  test('leaves an unrecognised URL alone', () => {
    expect(
      getWatchlistArtworkUrl(item({ artworkUrl: 'https://cdn.example/a.png' })),
    ).toBe('https://cdn.example/a.png')
  })

  test('uses the placeholder when there is no artwork anywhere', () => {
    expect(getWatchlistArtworkUrl(item())).toBe('/placeholder-image.svg')
  })
})

describe('getLatestPrice', () => {
  test('formats the HD price in preference to the standard one', () => {
    const price = getLatestPrice(
      item({
        currency: 'EUR',
        additionalData: { trackPrice: 9.99, trackHdPrice: 12.99 },
      }),
    )

    expect(normalizeSpaces(price!)).toBe('12,99 €')
  })

  test('falls back to the collection price', () => {
    const price = getLatestPrice(
      item({ currency: 'EUR', additionalData: { collectionPrice: 19.99 } }),
    )

    expect(normalizeSpaces(price!)).toBe('19,99 €')
  })

  test('reports no price when none was recorded', () => {
    expect(getLatestPrice(item({ currency: 'EUR' }))).toBeNull()
  })

  test('reports no price without a currency to format it in', () => {
    expect(
      getLatestPrice(item({ additionalData: { trackPrice: 9.99 } })),
    ).toBeNull()
  })
})
