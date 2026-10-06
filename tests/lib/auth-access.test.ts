import { describe, expect, test } from 'bun:test'
import {
  isPublicPath,
  requiresSession,
  safeRedirectTarget,
  signInRedirect,
} from '@/lib/auth-access'

/**
 * Every route is protected by default, so a wrong answer here either locks a
 * user out of the sign-in page or exposes a tool without a session.
 */

describe('isPublicPath', () => {
  test('lets the sign-in page through', () => {
    expect(isPublicPath('/sign-in')).toBe(true)
  })

  test('lets the auth API and its sub-paths through', () => {
    expect(isPublicPath('/api/auth')).toBe(true)
    expect(isPublicPath('/api/auth/callback/passkey')).toBe(true)
  })

  /** It authenticates the cron itself; it is not a public business endpoint. */
  test('does not treat the price cron endpoint as public', () => {
    expect(isPublicPath('/api/itunes/update-prices')).toBe(false)
  })

  test('protects the tools and the rest of the API', () => {
    expect(isPublicPath('/')).toBe(false)
    expect(isPublicPath('/tools/wishlists')).toBe(false)
    expect(isPublicPath('/api/wishlists')).toBe(false)
    expect(isPublicPath('/api/itunes/list')).toBe(false)
  })

  /**
   * Prefix matching has to be segment-aware. Matching on the bare string would
   * make every path merely starting with a public one public too.
   */
  test('does not treat a longer name as a sub-path', () => {
    expect(isPublicPath('/api/authorised')).toBe(false)
    expect(isPublicPath('/sign-in-later')).toBe(false)
  })
})

describe('requiresSession', () => {
  test('sends anonymous visitors of protected pages to sign in', () => {
    expect(requiresSession('/')).toBe(true)
    expect(requiresSession('/tools/itunes')).toBe(true)
  })

  test('lets public and self-authenticated routes answer for themselves', () => {
    expect(requiresSession('/sign-in')).toBe(false)
    expect(requiresSession('/api/auth/session')).toBe(false)
    expect(requiresSession('/api/itunes/update-prices')).toBe(false)
  })

  /** The cron route is exempted exactly, not as a prefix. */
  test('exempts nothing below, beside or above the cron route', () => {
    expect(requiresSession('/api/itunes/update-prices/')).toBe(true)
    expect(requiresSession('/api/itunes/update-prices/x')).toBe(true)
    expect(requiresSession('/api/itunes/update-prices-now')).toBe(true)
    expect(requiresSession('/api/itunes')).toBe(true)
    expect(requiresSession('/api/itunes/list')).toBe(true)
  })
})

describe('signInRedirect', () => {
  test('remembers where the visitor was going', () => {
    expect(signInRedirect('/tools/wishlists')).toBe(
      '/sign-in?redirect=%2Ftools%2Fwishlists',
    )
  })

  test('encodes a path with query-unsafe characters', () => {
    expect(signInRedirect('/tools/a b&c')).toBe(
      '/sign-in?redirect=%2Ftools%2Fa%20b%26c',
    )
  })

  test('sends the home page straight to sign-in', () => {
    expect(signInRedirect('/')).toBe('/sign-in')
  })
})

/**
 * The target comes from the address bar, so anything an attacker can put in a
 * link has to end up either on this origin or at home.
 */
describe('safeRedirectTarget', () => {
  const ORIGIN = 'https://toolio.example'
  const target = (value: string | null | undefined) =>
    safeRedirectTarget(value, ORIGIN)

  test('keeps a same-origin path with its query and hash', () => {
    expect(target('/tools/wishlists')).toBe('/tools/wishlists')
    expect(target('/tools/itunes?name=a%20b#ergebnis')).toBe(
      '/tools/itunes?name=a%20b#ergebnis',
    )
  })

  test('accepts an absolute URL on the same origin as a path', () => {
    expect(target('https://toolio.example/account?x=1')).toBe('/account?x=1')
  })

  test('falls back home when there is no target', () => {
    expect(target(null)).toBe('/')
    expect(target(undefined)).toBe('/')
    expect(target('')).toBe('/')
  })

  test('refuses script and data URLs', () => {
    expect(target('javascript:alert(1)')).toBe('/')
    expect(target('JaVaScRiPt:alert(1)')).toBe('/')
    expect(target('  javascript:alert(1)')).toBe('/')
    expect(target('data:text/html,<script>alert(1)</script>')).toBe('/')
  })

  test('refuses other origins', () => {
    expect(target('https://evil.example/')).toBe('/')
    expect(target('http://toolio.example/')).toBe('/')
    expect(target('https://toolio.example:8443/')).toBe('/')
    expect(target('https://toolio.example.evil.example/')).toBe('/')
    expect(target('https://toolio.example@evil.example/')).toBe('/')
  })

  test('refuses protocol-relative URLs', () => {
    expect(target('//evil.example')).toBe('/')
    expect(target('///evil.example')).toBe('/')
    expect(target(' //evil.example')).toBe('/')
  })

  /** Browsers read `\` as `/`, making these protocol-relative in practice. */
  test('refuses backslashes', () => {
    expect(target('/\\evil.example')).toBe('/')
    expect(target('\\\\evil.example')).toBe('/')
    expect(target('/tools\\x')).toBe('/')
  })

  /** Browsers drop tabs and newlines, so `/\t/evil.example` becomes `//`. */
  test('refuses control characters', () => {
    expect(target('/\t/evil.example')).toBe('/')
    expect(target('/\n/evil.example')).toBe('/')
    expect(target('/tools\u0000')).toBe('/')
    expect(target('/tools\u007f')).toBe('/')
  })

  test('refuses non-web schemes', () => {
    expect(target('mailto:a@example.com')).toBe('/')
    expect(target('ftp://toolio.example/')).toBe('/')
    expect(target('blob:https://toolio.example/123')).toBe('/')
  })

  test('falls back home for a malformed target or origin', () => {
    expect(target('http://[::1')).toBe('/')
    expect(safeRedirectTarget('/tools', 'not an origin')).toBe('/')
  })

  /**
   * These parse as same-origin, but their normalised path starts with `//`,
   * which `location.href` would read as another host.
   */
  test('refuses paths that normalise to a protocol-relative URL', () => {
    expect(target('/safe/..//attacker.invalid/path')).toBe('/')
    expect(target('/safe/../..//attacker.invalid/path')).toBe('/')
    expect(target('/safe/%2e%2e//attacker.invalid/path')).toBe('/')
    expect(target('/safe/%2E%2E//attacker.invalid/path')).toBe('/')
    expect(target('/safe/.%2e//attacker.invalid/path')).toBe('/')
    expect(target('/./attacker.invalid/..//attacker.invalid')).toBe('/')
    expect(target('/.//attacker.invalid/path')).toBe('/')
    expect(target('https://toolio.example//attacker.invalid/path')).toBe('/')
    expect(target('https://toolio.example/a/..//attacker.invalid')).toBe('/')
    expect(target('https://toolio.example///attacker.invalid')).toBe('/')
  })

  test('keeps dot segments that stay on a single leading slash', () => {
    expect(target('/tools/../account')).toBe('/account')
    expect(target('/tools/%2e%2e/account?x=1#y')).toBe('/account?x=1#y')
  })

  /** The invariant the sign-in page relies on, whatever the input was. */
  test('only ever returns a path that resolves back to this origin', () => {
    const inputs = [
      '/tools/wishlists',
      '/tools/itunes?name=a%20b#ergebnis',
      'https://toolio.example/account?x=1',
      'tools/relative',
      '?only=query',
      '#only-hash',
      '/safe/..//attacker.invalid/path',
      '/safe/%2e%2e//attacker.invalid/path',
      'https://toolio.example//attacker.invalid/path',
      '//attacker.invalid',
      'https://attacker.invalid/',
      'javascript:alert(1)',
    ]

    for (const input of inputs) {
      const result = target(input)

      expect(result.startsWith('/')).toBe(true)
      expect(result.startsWith('//')).toBe(false)
      expect(new URL(result, ORIGIN).origin).toBe(ORIGIN)
    }
  })
})
