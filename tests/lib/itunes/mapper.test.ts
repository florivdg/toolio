import { describe, expect, test } from 'bun:test'
import {
  mapItunesDataToMediaItem,
  mapItunesDataToPriceHistory,
} from '@/lib/itunes/mapper'

const movie = {
  wrapperType: 'track',
  kind: 'feature-movie',
  trackId: 1234,
  trackName: 'Ein Film',
  trackCensoredName: 'Ein Film',
  trackViewUrl: 'https://itunes.apple.com/de/movie/1234',
  artistName: 'Regisseurin',
  artworkUrl100: 'https://example.com/a/100x100bb.jpg',
  releaseDate: '2023-06-01T07:00:00Z',
  primaryGenreName: 'Drama',
  country: 'DEU',
  currency: 'EUR',
  trackPrice: 9.99,
  trackHdPrice: 12.99,
}

const tvSeason = {
  wrapperType: 'collection',
  collectionType: 'TV Season',
  collectionId: 5678,
  collectionName: 'Eine Serie, Staffel 1',
  collectionCensoredName: 'Eine Serie, Staffel 1',
  collectionViewUrl: 'https://itunes.apple.com/de/tv-season/5678',
  artistName: 'Ein Sender',
  country: 'DEU',
  currency: 'EUR',
  collectionPrice: 19.99,
  collectionHdPrice: 24.99,
}

describe('mapItunesDataToMediaItem', () => {
  test('maps a track-style item from its track fields', () => {
    const mapped = mapItunesDataToMediaItem(movie)

    expect(mapped.itunesId).toBe(1234)
    expect(mapped.itunesIdType).toBe('track')
    expect(mapped.name).toBe('Ein Film')
    expect(mapped.viewUrl).toBe('https://itunes.apple.com/de/movie/1234')
    // kind is split on '-', so 'feature-movie' yields the 'feature' media type.
    expect(mapped.mediaType).toBe('feature')
    expect(mapped.entityType).toBe('feature-movie')
  })

  test('maps a collection from its collection fields', () => {
    const mapped = mapItunesDataToMediaItem(tvSeason)

    expect(mapped.itunesId).toBe(5678)
    expect(mapped.itunesIdType).toBe('collection')
    expect(mapped.name).toBe('Eine Serie, Staffel 1')
    expect(mapped.viewUrl).toBe('https://itunes.apple.com/de/tv-season/5678')
    expect(mapped.mediaType).toBe('tvShow')
    expect(mapped.entityType).toBe('tvSeason')
  })

  test('classifies an album collection as music', () => {
    const mapped = mapItunesDataToMediaItem({
      ...tvSeason,
      collectionType: 'Album',
    })
    expect(mapped.mediaType).toBe('music')
    expect(mapped.entityType).toBe('album')
  })

  test('lowercases an unrecognised collection type', () => {
    const mapped = mapItunesDataToMediaItem({
      ...tvSeason,
      collectionType: 'Boxed Set',
    })
    expect(mapped.mediaType).toBe('boxed set')
    expect(mapped.entityType).toBe('boxed set')
  })

  test('falls back to unknown when a collection has no type', () => {
    const mapped = mapItunesDataToMediaItem({
      ...tvSeason,
      collectionType: undefined,
    })
    expect(mapped.mediaType).toBe('unknown')
  })

  test('picks the highest-resolution artwork available', () => {
    const mapped = mapItunesDataToMediaItem({
      ...movie,
      artworkUrl600: 'https://example.com/a/600.jpg',
    })
    expect(mapped.artworkUrl).toBe('https://example.com/a/600.jpg')
  })

  test('parses releaseDate into a Date and nulls it when absent', () => {
    expect(mapItunesDataToMediaItem(movie).releaseDate).toEqual(
      new Date('2023-06-01T07:00:00Z'),
    )
    expect(
      mapItunesDataToMediaItem({ ...movie, releaseDate: undefined }).releaseDate,
    ).toBeNull()
  })

  test('normalises country to the German store', () => {
    expect(mapItunesDataToMediaItem({ ...movie, country: 'USA' }).country).toBe(
      'de',
    )
  })

  test('routes non-schema fields into additionalData and omits mapped ones', () => {
    const additional = JSON.parse(
      mapItunesDataToMediaItem({ ...movie, trackCount: 12 }).additionalData,
    )
    expect(additional.trackCount).toBe(12)
    expect(additional).not.toHaveProperty('trackName')
    expect(additional).not.toHaveProperty('artistName')
  })
})

describe('mapItunesDataToPriceHistory', () => {
  test('uses track prices for a track', () => {
    const price = mapItunesDataToPriceHistory(movie, 'media-1')
    expect(price.mediaItemId).toBe('media-1')
    expect(price.standardPrice).toBe(9.99)
    expect(price.hdPrice).toBe(12.99)
    expect(price.currency).toBe('EUR')
    expect(price.country).toBe('de')
  })

  test('uses collection prices for a collection', () => {
    const price = mapItunesDataToPriceHistory(tvSeason, 'media-2')
    expect(price.standardPrice).toBe(19.99)
    expect(price.hdPrice).toBe(24.99)
  })

  test('stores the opposite side prices as additional data', () => {
    const price = mapItunesDataToPriceHistory(
      { ...movie, collectionPrice: 29.99 },
      'media-1',
    )
    expect(JSON.parse(price.additionalPriceData!).collectionPrice).toBe(29.99)
  })

  test('captures other price-shaped fields', () => {
    const price = mapItunesDataToPriceHistory(
      { ...movie, trackRentalPrice: 4.99 },
      'media-1',
    )
    expect(JSON.parse(price.additionalPriceData!).trackRentalPrice).toBe(4.99)
  })

  test('leaves additionalPriceData null when there is nothing extra', () => {
    const price = mapItunesDataToPriceHistory(
      {
        wrapperType: 'track',
        kind: 'song',
        trackId: 1,
        trackPrice: 1.29,
        currency: 'EUR',
      },
      'media-3',
    )
    expect(price.additionalPriceData).toBeNull()
  })
})
