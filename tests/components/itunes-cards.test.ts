import '../support/dom' // DOM is registered in preload; kept for clarity when running this file alone
import { afterEach, describe, expect, test } from 'bun:test'
import { mount } from '@vue/test-utils'
import MediaCard from '@/components/itunes/MediaCard.vue'
import ItunesLinkButton from '@/components/itunes/ItunesLinkButton.vue'
import SearchResultCard from '@/components/itunes/SearchResultCard.vue'
import WatchlistItemCard from '@/components/itunes/WatchlistItemCard.vue'
import type { SearchResult } from '@/lib/itunes/search'
import type { ParsedWatchlistItem } from '@/lib/itunes/watchlist'
import { normalizeSpaces } from '../support/intl'

/**
 * The two grids render a shared MediaCard with different actions. These cover
 * what each card decides to show, which is where the conditionals live.
 */

afterEach(() => {
  document.body.innerHTML = ''
})

function searchResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    wrapperType: 'track',
    kind: 'feature-movie',
    trackId: 1001,
    trackName: 'Interstellar',
    artistName: 'Christopher Nolan',
    currency: 'EUR',
    ...overrides,
  } as SearchResult
}

function watchlistItem(
  overrides: Partial<ParsedWatchlistItem> = {},
): ParsedWatchlistItem {
  return {
    id: 'w1',
    name: 'Interstellar',
    artistName: 'Christopher Nolan',
    entityType: 'feature-movie',
    currency: 'EUR',
    ...overrides,
  } as ParsedWatchlistItem
}

describe('MediaCard', () => {
  const base = {
    title: 'Interstellar',
    artworkUrl: 'https://cdn.example/a.jpg',
    mediaType: 'Film',
  }

  test('shows the title, media type and artwork', () => {
    const w = mount(MediaCard, { props: base })

    expect(w.text()).toContain('Interstellar')
    expect(w.text()).toContain('Film')
    expect(w.find('img').attributes('src')).toBe('https://cdn.example/a.jpg')
  })

  test('falls back to a generic alt text without a title', () => {
    const w = mount(MediaCard, { props: { ...base, title: '' } })

    expect(w.find('img').attributes('alt')).toBe('Artwork')
  })

  test('shows the price overlay only when there is a price', () => {
    expect(mount(MediaCard, { props: base }).text()).not.toContain('€')
    expect(
      mount(MediaCard, { props: { ...base, price: '9,99 €' } }).text(),
    ).toContain('9,99')
  })

  test('omits the artist line when there is no artist', () => {
    const withArtist = mount(MediaCard, {
      props: { ...base, artistName: 'Nolan' },
    })
    expect(withArtist.text()).toContain('Nolan')
    expect(mount(MediaCard, { props: base }).text()).not.toContain('Nolan')
  })

  test('formats a release date given as a string or a Date', () => {
    const asString = mount(MediaCard, {
      props: { ...base, releaseDate: '2014-11-05T08:00:00Z' },
    })
    const asDate = mount(MediaCard, {
      props: { ...base, releaseDate: new Date('2014-11-05T08:00:00Z') },
    })

    expect(asString.text()).toContain('2014')
    expect(normalizeSpaces(asDate.text())).toContain('2014')
  })
})

describe('ItunesLinkButton', () => {
  test('links out in a new tab', () => {
    const w = mount(ItunesLinkButton, {
      props: { href: 'https://itunes.example/1' },
    })
    const link = w.find('a')

    expect(link.attributes('href')).toBe('https://itunes.example/1')
    expect(link.attributes('target')).toBe('_blank')
    // Without noopener the opened page could reach back through window.opener.
    expect(link.attributes('rel')).toContain('noopener')
  })

  test('renders nothing when there is nowhere to link to', () => {
    expect(mount(ItunesLinkButton, { props: { href: null } }).text()).toBe('')
    expect(mount(ItunesLinkButton, { props: {} }).find('a').exists()).toBe(
      false,
    )
  })
})

describe('SearchResultCard', () => {
  test('shows the German media label and the formatted price', () => {
    const w = mount(SearchResultCard, {
      props: {
        result: searchResult({ trackPrice: 9.99, trackHdPrice: 12.99 }),
        isAdding: false,
      },
    })

    expect(w.text()).toContain('Film')
    expect(normalizeSpaces(w.text())).toContain('12,99 €')
  })

  test('prefers the collection name when there is no track name', () => {
    const w = mount(SearchResultCard, {
      props: {
        result: searchResult({
          trackName: undefined,
          collectionName: 'Interstellar OST',
        }),
        isAdding: false,
      },
    })

    expect(w.text()).toContain('Interstellar OST')
  })

  test('emits the result when the add button is clicked', async () => {
    const result = searchResult()
    const w = mount(SearchResultCard, { props: { result, isAdding: false } })

    await w.findAll('button').at(-1)!.trigger('click')

    expect(w.emitted('add')?.[0]).toEqual([result])
  })

  test('disables the add button and says so while adding', () => {
    const w = mount(SearchResultCard, {
      props: { result: searchResult(), isAdding: true },
    })
    const button = w.findAll('button').at(-1)!

    expect(button.attributes('disabled')).toBeDefined()
    expect(w.text()).toContain('Wird hinzugefügt...')
  })

  test('hides the iTunes link when the result has no view url', () => {
    const w = mount(SearchResultCard, {
      props: { result: searchResult(), isAdding: false },
    })

    expect(w.find('a').exists()).toBe(false)
  })
})

describe('WatchlistItemCard', () => {
  test('shows the German label and the recorded price', () => {
    const w = mount(WatchlistItemCard, {
      props: {
        item: watchlistItem({ additionalData: { trackPrice: 9.99 } }),
        isRemoving: false,
      },
    })

    expect(w.text()).toContain('Film')
    expect(normalizeSpaces(w.text())).toContain('9,99 €')
  })

  test('says so while a removal is in flight', () => {
    const w = mount(WatchlistItemCard, {
      props: { item: watchlistItem(), isRemoving: true },
    })

    expect(w.text()).toContain('Wird entfernt...')
    expect(w.findAll('button').at(-1)!.attributes('disabled')).toBeDefined()
  })

  test('links to the stored view url', () => {
    const w = mount(WatchlistItemCard, {
      props: {
        item: watchlistItem({ viewUrl: 'https://itunes.example/w1' }),
        isRemoving: false,
      },
    })

    expect(w.find('a').attributes('href')).toBe('https://itunes.example/w1')
  })

  test('asks for confirmation before removing', async () => {
    const w = mount(WatchlistItemCard, {
      props: { item: watchlistItem(), isRemoving: false },
      attachTo: document.body,
    })

    // Nothing is emitted until the dialog is confirmed.
    await w.findAll('button').at(-1)!.trigger('click')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(w.emitted('remove')).toBeUndefined()

    const confirm = [...document.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Ja, entfernen'),
    )
    expect(confirm).toBeDefined()
    expect(document.body.textContent).toContain('Interstellar')

    confirm!.click()
    expect(w.emitted('remove')?.[0]).toEqual([w.props('item')])
    w.unmount()
  })
})
