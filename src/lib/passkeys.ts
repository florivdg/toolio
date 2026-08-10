/** Presentation helpers for the passkey manager. */

/** A passkey as the /api/auth/passkeys endpoint returns it. */
export interface Passkey {
  id: string
  name: string | null
  deviceType: string
  backedUp: boolean
  createdAt: string
}

/** German labels for the WebAuthn device types. */
const DEVICE_TYPE_LABELS: Record<string, string> = {
  singleDevice: 'Einzelgerät',
  multiDevice: 'Mehrere Geräte',
}

/** Falls back to the raw value so a new device type still shows something. */
export function getDeviceTypeLabel(deviceType: string): string {
  return DEVICE_TYPE_LABELS[deviceType] ?? deviceType
}

/** Creation timestamp in German day-month-year with the time. */
export function formatPasskeyDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
