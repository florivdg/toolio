import { describe, expect, test } from 'bun:test'
import {
  describePriceDrop,
  formatPriceDropMessage,
  hasPriceChanged,
  hasPriceDropped,
} from '@/lib/itunes/price-changes'
import type { PriceSnapshot } from '@/lib/itunes/price-changes'

/**
 * These rules decide whether a price history row is written and whether the
 * user is told about it, so a wrong answer either loses price history or sends
 * a bogus bargain alert.
 */

function snapshot(overrides: Partial<PriceSnapshot> = {}): PriceSnapshot {
  return { standardPrice: 9.99, hdPrice: 12.99, ...overrides }
}

describe('hasPriceChanged', () => {
  test('reports no change for identical snapshots', () => {
    expect(hasPriceChanged(snapshot(), snapshot())).toBe(false)
  })

  test('detects a standard price change in either direction', () => {
    expect(hasPriceChanged(snapshot({ standardPrice: 7.99 }), snapshot())).toBe(
      true,
    )
    expect(
      hasPriceChanged(snapshot({ standardPrice: 14.99 }), snapshot()),
    ).toBe(true)
  })

  test('detects an HD price change', () => {
    expect(hasPriceChanged(snapshot({ hdPrice: 9.99 }), snapshot())).toBe(true)
  })

  test('treats a price appearing or disappearing as a change', () => {
    expect(hasPriceChanged(snapshot({ hdPrice: null }), snapshot())).toBe(true)
    expect(hasPriceChanged(snapshot(), snapshot({ hdPrice: null }))).toBe(true)
  })

  test('compares the per-variant prices as well', () => {
    const before = snapshot({
      additionalPriceData: JSON.stringify({ rentHd: 4.99 }),
    })
    const after = snapshot({
      additionalPriceData: JSON.stringify({ rentHd: 3.99 }),
    })

    expect(hasPriceChanged(after, before)).toBe(true)
  })

  test('detects a variant that only one side has', () => {
    const before = snapshot({ additionalPriceData: JSON.stringify({}) })
    const after = snapshot({
      additionalPriceData: JSON.stringify({ rentSd: 2.99 }),
    })

    expect(hasPriceChanged(after, before)).toBe(true)
  })

  test('ignores key order in the variant blob', () => {
    const before = snapshot({
      additionalPriceData: JSON.stringify({ a: 1, b: 2 }),
    })
    const after = snapshot({
      additionalPriceData: JSON.stringify({ b: 2, a: 1 }),
    })

    expect(hasPriceChanged(after, before)).toBe(false)
  })

  test('survives a malformed variant blob instead of throwing', () => {
    const broken = snapshot({ additionalPriceData: '{not json' })

    expect(hasPriceChanged(broken, snapshot())).toBe(false)
  })
})

describe('hasPriceDropped', () => {
  test('reports a standard price drop', () => {
    const info = hasPriceDropped(
      snapshot({ standardPrice: 4.99 }),
      snapshot({ standardPrice: 9.99 }),
    )

    expect(info.dropped).toBe(true)
    expect(info.standardPriceDropped).toBe(true)
    expect(info.hdPriceDropped).toBe(false)
    expect(info.oldStandardPrice).toBe(9.99)
    expect(info.newStandardPrice).toBe(4.99)
  })

  test('does not report a price rise as a drop', () => {
    const info = hasPriceDropped(
      snapshot({ standardPrice: 19.99 }),
      snapshot({ standardPrice: 9.99 }),
    )

    expect(info.dropped).toBe(false)
  })

  test('does not report an unchanged price as a drop', () => {
    expect(hasPriceDropped(snapshot(), snapshot()).dropped).toBe(false)
  })

  test('reports both variants dropping together', () => {
    const info = hasPriceDropped(
      snapshot({ standardPrice: 4.99, hdPrice: 6.99 }),
      snapshot({ standardPrice: 9.99, hdPrice: 12.99 }),
    )

    expect(info.standardPriceDropped).toBe(true)
    expect(info.hdPriceDropped).toBe(true)
  })

  test('an edition disappearing is not a bargain', () => {
    const info = hasPriceDropped(
      snapshot({ hdPrice: null }),
      snapshot({ hdPrice: 12.99 }),
    )

    expect(info.hdPriceDropped).toBe(false)
    expect(info.dropped).toBe(false)
  })

  test('a newly appearing edition is not a drop either', () => {
    const info = hasPriceDropped(
      snapshot({ hdPrice: 12.99 }),
      snapshot({ hdPrice: null }),
    )

    expect(info.hdPriceDropped).toBe(false)
  })

  test('treats a free price as a real value rather than missing', () => {
    const info = hasPriceDropped(
      snapshot({ standardPrice: 0 }),
      snapshot({ standardPrice: 9.99 }),
    )

    expect(info.standardPriceDropped).toBe(true)
  })
})

describe('describePriceDrop', () => {
  const dropped = hasPriceDropped(
    snapshot({ standardPrice: 4.99, hdPrice: 6.99 }),
    snapshot({ standardPrice: 9.99, hdPrice: 12.99 }),
  )

  test('qualifies the standard line only when HD is listed too', () => {
    expect(describePriceDrop(dropped)).toBe(
      'Standardpreis: 9.99€ → 4.99€\nHD-Preis: 12.99€ → 6.99€',
    )
  })

  test('uses the plain label when only the standard price dropped', () => {
    const info = hasPriceDropped(
      snapshot({ standardPrice: 4.99 }),
      snapshot({ standardPrice: 9.99 }),
    )

    expect(describePriceDrop(info)).toBe('Preis: 9.99€ → 4.99€')
  })

  test('lists only HD when only HD dropped', () => {
    const info = hasPriceDropped(
      snapshot({ hdPrice: 6.99 }),
      snapshot({ hdPrice: 12.99 }),
    )

    expect(describePriceDrop(info)).toBe('HD-Preis: 12.99€ → 6.99€')
  })

  test('says nothing when nothing dropped', () => {
    expect(describePriceDrop(hasPriceDropped(snapshot(), snapshot()))).toBe('')
  })
})

describe('formatPriceDropMessage', () => {
  const info = hasPriceDropped(
    snapshot({ standardPrice: 4.99 }),
    snapshot({ standardPrice: 9.99 }),
  )

  test('names the artist and title and links the stored view url', () => {
    const message = formatPriceDropMessage(
      {
        itunesId: 123,
        name: 'Interstellar',
        artistName: 'Christopher Nolan',
        viewUrl: 'https://itunes.example/movie/123',
      },
      info,
    )

    expect(message).toContain('"Christopher Nolan - Interstellar"')
    expect(message).toContain('Preis: 9.99€ → 4.99€')
    expect(message).toContain('https://itunes.example/movie/123')
  })

  test('omits the artist prefix when there is none', () => {
    const message = formatPriceDropMessage(
      { itunesId: 123, name: 'Interstellar', artistName: null },
      info,
    )

    expect(message).toContain('"Interstellar"')
    expect(message).not.toContain(' - Interstellar')
  })

  test('builds a link for items stored without a view url', () => {
    const message = formatPriceDropMessage(
      { itunesId: 456, name: 'Dune', viewUrl: null },
      info,
    )

    expect(message).toContain('https://music.apple.com/de/album/id456')
  })
})
