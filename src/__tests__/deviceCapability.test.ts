import { describe, expect, it, vi, afterEach } from 'vitest'
import { detectLowEndDevice } from '../utils/deviceCapability'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('detectLowEndDevice', () => {
  it('returns false in SSR (no navigator)', () => {
    vi.stubGlobal('navigator', undefined)
    expect(detectLowEndDevice()).toBe(false)
  })

  it('returns true when hardwareConcurrency is 1', () => {
    vi.stubGlobal('navigator', { hardwareConcurrency: 1, userAgent: 'Mozilla/5.0' })
    expect(detectLowEndDevice()).toBe(true)
  })

  it('returns true when hardwareConcurrency is 2', () => {
    vi.stubGlobal('navigator', { hardwareConcurrency: 2, userAgent: 'Mozilla/5.0' })
    expect(detectLowEndDevice()).toBe(true)
  })

  it('returns false when hardwareConcurrency is 4 and desktop UA', () => {
    vi.stubGlobal('navigator', {
      hardwareConcurrency: 4,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    })
    expect(detectLowEndDevice()).toBe(false)
  })

  it('returns true when UA contains Mobi regardless of core count', () => {
    vi.stubGlobal('navigator', {
      hardwareConcurrency: 8,
      userAgent:
        'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 Mobile Safari/537.36 Mobi',
    })
    expect(detectLowEndDevice()).toBe(true)
  })

  it('returns true when UA contains Android', () => {
    vi.stubGlobal('navigator', {
      hardwareConcurrency: 8,
      userAgent: 'Mozilla/5.0 (Linux; Android 12; SM-G991B) AppleWebKit/537.36',
    })
    expect(detectLowEndDevice()).toBe(true)
  })

  it('returns true when UA contains iPhone', () => {
    vi.stubGlobal('navigator', {
      hardwareConcurrency: 6,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    })
    expect(detectLowEndDevice()).toBe(true)
  })

  it('returns true when UA contains iPad', () => {
    vi.stubGlobal('navigator', {
      hardwareConcurrency: 6,
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    })
    expect(detectLowEndDevice()).toBe(true)
  })
})
