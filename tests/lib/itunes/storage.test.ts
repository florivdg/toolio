import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { db } from '@/db/database'
import { itunesMediaItem, itunesPriceHistory } from '@/db/schema/itunes'
import { eq } from 'drizzle-orm'
import {
  lookupAndStoreItem,
  updateAllMediaItemPrices,
} from '@/lib/itunes/storage'
import {
  itunesAlbum,
  itunesMovie,
  resetItunes,
  stubItunesNetwork,
} from '../../support/itunes'
import type { ItunesNetworkStub } from '../../support/itunes'

/**
 * Exercises the storage layer against the in-memory database with the network
 * stubbed, so the lookup client, the mapper and the price rules all run for
 * real.
 */

let net: ItunesNetworkStub | null = null

/** Swaps in a fresh canned network, restoring any previous one first. */
function network(responsesById: Record<number, Record<string, any>[]>) {
  net?.restore()
  net = stubItunesNetwork(responsesById)

  return net
}

function priceRows(mediaItemId: string) {
  return db
    .select()
    .from(itunesPriceHistory)
    .where(eq(itunesPriceHistory.mediaItemId, mediaItemId))
    .all()
}

function storedItem(id: string) {
  return db
    .select()
    .from(itunesMediaItem)
    .where(eq(itunesMediaItem.id, id))
    .get()
}

beforeEach(() => {
  resetItunes()
})

afterEach(() => {
  net?.restore()
  net = null
})

describe('lookupAndStoreItem', () => {
  test('stores a track with its first price entry', async () => {
    network({ 1001: [itunesMovie()] })

    const { mediaItemId } = await lookupAndStoreItem(1001)

    expect(storedItem(mediaItemId)?.name).toBe('Interstellar')
    expect(storedItem(mediaItemId)?.itunesIdType).toBe('track')
    expect(priceRows(mediaItemId)).toHaveLength(1)
    expect(priceRows(mediaItemId)[0]!.standardPrice).toBe(9.99)
  })

  test('stores a collection using the collection lookup', async () => {
    network({ 2002: [itunesAlbum()] })

    const { mediaItemId } = await lookupAndStoreItem(2002, true)

    expect(storedItem(mediaItemId)?.itunesIdType).toBe('collection')
    expect(storedItem(mediaItemId)?.name).toBe('Interstellar OST')
    expect(priceRows(mediaItemId)[0]!.standardPrice).toBe(11.99)
  })

  test('rejects an id the store does not know', async () => {
    network({})

    expect(lookupAndStoreItem(9999)).rejects.toThrow(
      'Item not found in iTunes store',
    )
  })

  test('updates in place rather than duplicating a known item', async () => {
    network({ 1001: [itunesMovie()] })
    const first = await lookupAndStoreItem(1001)

    network({ 1001: [itunesMovie({ trackName: 'Interstellar (Remastered)' })] })
    const second = await lookupAndStoreItem(1001)

    expect(second.mediaItemId).toBe(first.mediaItemId)
    expect(db.select().from(itunesMediaItem).all()).toHaveLength(1)
    expect(storedItem(first.mediaItemId)?.name).toBe(
      'Interstellar (Remastered)',
    )
  })

  test('records a second price row only when the price moved', async () => {
    network({ 1001: [itunesMovie()] })
    const { mediaItemId } = await lookupAndStoreItem(1001)

    // Same payload again: nothing changed, so no new row.
    await lookupAndStoreItem(1001)
    expect(priceRows(mediaItemId)).toHaveLength(1)

    network({ 1001: [itunesMovie({ trackPrice: 4.99 })] })
    await lookupAndStoreItem(1001)

    expect(priceRows(mediaItemId)).toHaveLength(2)
  })
})

describe('updateAllMediaItemPrices', () => {
  test('reports nothing to do on an empty library', async () => {
    network({})

    expect(await updateAllMediaItemPrices()).toEqual({
      total: 0,
      updated: 0,
      unchanged: 0,
      errors: 0,
      errorDetails: [],
    })
  })

  test('counts an unchanged price as unchanged', async () => {
    network({ 1001: [itunesMovie()] })
    await lookupAndStoreItem(1001)

    expect(await updateAllMediaItemPrices()).toMatchObject({
      total: 1,
      updated: 0,
      unchanged: 1,
    })
  })

  test('writes a new price row when the price moved', async () => {
    network({ 1001: [itunesMovie()] })
    const { mediaItemId } = await lookupAndStoreItem(1001)

    network({ 1001: [itunesMovie({ trackPrice: 4.99 })] })
    const summary = await updateAllMediaItemPrices()

    expect(summary).toMatchObject({ total: 1, updated: 1, unchanged: 0 })
    expect(priceRows(mediaItemId)).toHaveLength(2)
  })

  test('announces a price drop', async () => {
    network({ 1001: [itunesMovie()] })
    await lookupAndStoreItem(1001)

    const stub = network({ 1001: [itunesMovie({ trackPrice: 4.99 })] })
    await updateAllMediaItemPrices()

    expect(stub.notifications).toHaveLength(1)
    expect(stub.notifications[0]).toContain('Preissenkung')
    expect(stub.notifications[0]).toContain('9.99€ → 4.99€')
  })

  test('stays quiet when the price went up', async () => {
    network({ 1001: [itunesMovie()] })
    await lookupAndStoreItem(1001)

    const stub = network({ 1001: [itunesMovie({ trackPrice: 19.99 })] })
    const summary = await updateAllMediaItemPrices()

    expect(stub.notifications).toEqual([])
    // A rise is still a change, so the history row is written either way.
    expect(summary.updated).toBe(1)
  })

  test('records an item that vanished from the store as an error', async () => {
    network({ 1001: [itunesMovie()] })
    const { mediaItemId } = await lookupAndStoreItem(1001)

    network({})
    const summary = await updateAllMediaItemPrices()

    expect(summary).toMatchObject({ total: 1, errors: 1, updated: 0 })
    expect(summary.errorDetails[0]).toEqual({
      mediaItemId,
      itunesId: 1001,
      error: 'Item not found in iTunes store',
    })
  })

  test('keeps going after one item fails', async () => {
    network({ 1001: [itunesMovie()] })
    await lookupAndStoreItem(1001)

    network({ 2002: [itunesAlbum()] })
    await lookupAndStoreItem(2002, true)

    // Only the album still resolves; the movie must not abort the run.
    network({ 2002: [itunesAlbum({ collectionPrice: 5.99 })] })
    const summary = await updateAllMediaItemPrices()

    expect(summary.total).toBe(2)
    expect(summary.errors).toBe(1)
    expect(summary.updated).toBe(1)
  })
})
