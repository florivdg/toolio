/**
 * Price comparison rules for stored iTunes media items.
 *
 * Kept free of database access so the decisions that drive "save a new price
 * row" and "notify about a drop" can be exercised directly.
 */

/** The subset of a price history row these comparisons read. */
export interface PriceSnapshot {
  standardPrice?: number | null
  hdPrice?: number | null
  additionalPriceData?: string | null
}

/** What changed between two snapshots, and by how much. */
export interface PriceDropInfo {
  dropped: boolean
  standardPriceDropped: boolean
  hdPriceDropped: boolean
  oldStandardPrice?: number | null
  newStandardPrice?: number | null
  oldHdPrice?: number | null
  newHdPrice?: number | null
}

/** Parses the JSON blob of per-variant prices, tolerating null and bad JSON. */
function parseAdditional(raw: string | null | undefined): Record<string, any> {
  if (!raw) return {}

  try {
    return JSON.parse(raw) as Record<string, any>
  } catch {
    // A malformed blob must not abort a price run; treat it as "no extra
    // prices", which at worst records one redundant history row.
    return {}
  }
}

/**
 * Whether any price differs between the new and the stored snapshot.
 *
 * Drives whether a new price history row is written at all, so it compares the
 * per-variant prices too, not just the headline standard and HD figures.
 */
export function hasPriceChanged(
  newPriceData: PriceSnapshot,
  latestPriceData: PriceSnapshot,
): boolean {
  if (newPriceData.standardPrice !== latestPriceData.standardPrice) return true
  if (newPriceData.hdPrice !== latestPriceData.hdPrice) return true

  const next = parseAdditional(newPriceData.additionalPriceData)
  const previous = parseAdditional(latestPriceData.additionalPriceData)
  const keys = new Set([...Object.keys(next), ...Object.keys(previous)])

  return [...keys].some((key) => next[key] !== previous[key])
}

/** True when `next` is a real price below `previous`; missing prices never drop. */
function isDrop(
  previous: number | null | undefined,
  next: number | null | undefined,
): boolean {
  return previous != null && next != null && next < previous
}

/**
 * Compare two snapshots for price *drops* specifically.
 *
 * A missing price on either side is not a drop — an item losing its HD edition
 * should not be announced as a bargain.
 */
export function hasPriceDropped(
  newPriceData: PriceSnapshot,
  latestPriceData: PriceSnapshot,
): PriceDropInfo {
  const standardPriceDropped = isDrop(
    latestPriceData.standardPrice,
    newPriceData.standardPrice,
  )
  const hdPriceDropped = isDrop(latestPriceData.hdPrice, newPriceData.hdPrice)

  return {
    dropped: standardPriceDropped || hdPriceDropped,
    standardPriceDropped,
    hdPriceDropped,
    oldStandardPrice: latestPriceData.standardPrice,
    newStandardPrice: newPriceData.standardPrice,
    oldHdPrice: latestPriceData.hdPrice,
    newHdPrice: newPriceData.hdPrice,
  }
}

/** The stored item fields a drop notification names. */
export interface NotifiableItem {
  itunesId: number
  name: string
  artistName?: string | null
  viewUrl?: string | null
}

/** The German price lines of a drop notification, one per dropped variant. */
export function describePriceDrop(info: PriceDropInfo): string {
  const lines: string[] = []

  // Only one price dropping is the common case, and it reads better without
  // the "Standardpreis" qualifier that is needed when both are listed.
  const standardLabel = info.hdPriceDropped ? 'Standardpreis' : 'Preis'

  if (info.standardPriceDropped) {
    lines.push(
      `${standardLabel}: ${info.oldStandardPrice}€ → ${info.newStandardPrice}€`,
    )
  }

  if (info.hdPriceDropped) {
    lines.push(`HD-Preis: ${info.oldHdPrice}€ → ${info.newHdPrice}€`)
  }

  return lines.join('\n')
}

/** The full broadcast text announcing a price drop for one stored item. */
export function formatPriceDropMessage(
  item: NotifiableItem,
  info: PriceDropInfo,
): string {
  const itemName = item.artistName
    ? `${item.artistName} - ${item.name}`
    : item.name
  // Items stored before viewUrl was captured fall back to a constructed link.
  const itunesLink =
    item.viewUrl || `https://music.apple.com/de/album/id${item.itunesId}`

  return `🤑🤑🤑 Preissenkung bei "${itemName}"!\n\n${describePriceDrop(info)}\n\n${itunesLink}`
}
