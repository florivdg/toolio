import { describe, expect, test } from 'bun:test'
import { isPublicPath, signInRedirect } from '@/lib/auth-access'

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

  test('lets the price cron endpoint through', () => {
    expect(isPublicPath('/api/itunes/update-prices')).toBe(true)
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
