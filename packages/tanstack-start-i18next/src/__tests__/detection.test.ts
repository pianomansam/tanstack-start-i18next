import { describe, it, expect } from 'vitest'
import { detectLocale } from '../detection'
import type { I18nConfig } from '../types'

// Minimal config factory — only the fields detectLocale needs
function makeConfig(
  overrides: Partial<I18nConfig> = {},
): I18nConfig {
  return {
    supportedLngs:['en', 'fr', 'de'],
    fallbackLng: 'en',
    ns: ['common'],
    loadTranslations: async () => ({}),
    ...overrides,
  }
}

// ─── parseAcceptLanguage (exercised via detectLocale with header strategy) ───

describe('detectLocale — Accept-Language header', () => {
  const config = makeConfig({ detection: { order: ['header'] } })

  it('returns fallbackLng when header is undefined', () => {
    expect(detectLocale(config, { url: '/', cookie: undefined, header: undefined })).toBe('en')
  })

  it('returns fallbackLng when header is empty string', () => {
    expect(detectLocale(config, { url: '/', cookie: undefined, header: '' })).toBe('en')
  })

  it('detects a simple single-language header', () => {
    expect(detectLocale(config, { url: '/', cookie: undefined, header: 'fr' })).toBe('fr')
  })

  it('picks the highest-quality language from a multi-value header', () => {
    // de;q=1.0 wins over en;q=0.8 and fr;q=0.5
    expect(detectLocale(config, { url: '/', cookie: undefined, header: 'en;q=0.8,de;q=1.0,fr;q=0.5' })).toBe('de')
  })

  it('treats a missing q value as 1.0', () => {
    // 'fr' has implicit q=1.0, en has q=0.9
    expect(detectLocale(config, { url: '/', cookie: undefined, header: 'fr,en;q=0.9' })).toBe('fr')
  })

  it('matches base language when region variant is detected (en-US → en)', () => {
    expect(detectLocale(config, { url: '/', cookie: undefined, header: 'en-US,de;q=0.5' })).toBe('en')
  })

  it('matches base language when full regional header like fr-CA → fr', () => {
    expect(detectLocale(config, { url: '/', cookie: undefined, header: 'fr-CA' })).toBe('fr')
  })

  it('falls back to fallbackLng when no supported language is found', () => {
    expect(detectLocale(config, { url: '/', cookie: undefined, header: 'ja,ko;q=0.5' })).toBe('en')
  })

  it('handles a full complex Accept-Language string', () => {
    // en-US (q=1) → matches 'en'
    expect(detectLocale(config, { url: '/', cookie: undefined, header: 'en-US,en;q=0.9,de-DE;q=0.8,de;q=0.7,fr;q=0.6' })).toBe('en')
  })
})

// ─── Cookie detection ──────────────────────────────────────────────────────

describe('detectLocale — cookie', () => {
  const config = makeConfig({ detection: { order: ['cookie'] } })

  it('returns fallbackLng when cookie is undefined', () => {
    expect(detectLocale(config, { url: '/', cookie: undefined, header: undefined })).toBe('en')
  })

  it('detects locale from a valid cookie', () => {
    expect(detectLocale(config, { url: '/', cookie: 'fr', header: undefined })).toBe('fr')
  })

  it('ignores cookie value that is not in supportedLngs', () => {
    expect(detectLocale(config, { url: '/', cookie: 'ja', header: undefined })).toBe('en')
  })

  it('matches base language from cookie (en-US → en)', () => {
    expect(detectLocale(config, { url: '/', cookie: 'en-US', header: undefined })).toBe('en')
  })

  it('matches regional locale when supported locales include the region', () => {
    const cfg = makeConfig({
      supportedLngs:['en-US', 'fr-CA'],
      fallbackLng: 'en-US',
      detection: { order: ['cookie'] },
    })
    expect(detectLocale(cfg, { url: '/', cookie: 'fr-CA', header: undefined })).toBe('fr-CA')
  })
})

// ─── Path detection ────────────────────────────────────────────────────────

describe('detectLocale — URL path', () => {
  const config = makeConfig({ detection: { order: ['path'], pathIndex: 0 } })

  it('returns fallbackLng when URL has no segments', () => {
    expect(detectLocale(config, { url: 'http://example.com/', cookie: undefined, header: undefined })).toBe('en')
  })

  it('detects locale from the first path segment', () => {
    expect(detectLocale(config, { url: 'http://example.com/fr/about', cookie: undefined, header: undefined })).toBe('fr')
  })

  it('detects locale from a relative URL', () => {
    expect(detectLocale(config, { url: '/de/page', cookie: undefined, header: undefined })).toBe('de')
  })

  it('ignores a path segment that is not in supportedLngs', () => {
    expect(detectLocale(config, { url: '/jp/home', cookie: undefined, header: undefined })).toBe('en')
  })

  it('reads from a custom pathIndex', () => {
    const cfg = makeConfig({ detection: { order: ['path'], pathIndex: 1 } })
    // /prefix/fr/page → segment at index 1 = 'fr'
    expect(detectLocale(cfg, { url: '/prefix/fr/page', cookie: undefined, header: undefined })).toBe('fr')
  })

  it('returns fallbackLng when pathIndex is beyond available segments', () => {
    const cfg = makeConfig({ detection: { order: ['path'], pathIndex: 5 } })
    expect(detectLocale(cfg, { url: '/en', cookie: undefined, header: undefined })).toBe('en')
  })
})

// ─── Detection order ───────────────────────────────────────────────────────

describe('detectLocale — detection order', () => {
  it('uses default order (path → cookie → header) when none specified', () => {
    // Path says 'fr', cookie says 'de', header says 'en'
    const config = makeConfig()
    const result = detectLocale(config, {
      url: '/fr/page',
      cookie: 'de',
      header: 'en',
    })
    // Default order is ['path', 'cookie', 'header'], so 'fr' wins
    expect(result).toBe('fr')
  })

  it('respects custom order: cookie before path', () => {
    const config = makeConfig({ detection: { order: ['cookie', 'path'] } })
    // Cookie says 'de', path says 'fr' — cookie wins
    expect(detectLocale(config, { url: '/fr/page', cookie: 'de', header: undefined })).toBe('de')
  })

  it('respects custom order: header before cookie', () => {
    const config = makeConfig({ detection: { order: ['header', 'cookie'] } })
    expect(detectLocale(config, { url: '/', cookie: 'de', header: 'fr' })).toBe('fr')
  })

  it('falls through to next strategy when current strategy yields no match', () => {
    const config = makeConfig({ detection: { order: ['path', 'cookie', 'header'] } })
    // Path has no locale segment, cookie has unsupported locale → header wins
    expect(detectLocale(config, { url: '/', cookie: 'ja', header: 'fr' })).toBe('fr')
  })

  it('falls through to next when path is empty', () => {
    const config = makeConfig({ detection: { order: ['path', 'cookie'] } })
    expect(detectLocale(config, { url: '/', cookie: 'fr', header: undefined })).toBe('fr')
  })

  it('returns fallbackLng when all strategies fail', () => {
    const config = makeConfig({ detection: { order: ['cookie', 'header', 'path'] } })
    expect(detectLocale(config, { url: '/unknown/path', cookie: 'ja', header: 'zh-CN' })).toBe('en')
  })
})

// ─── matchLocale — locale normalisation ────────────────────────────────────

describe('detectLocale — locale matching', () => {
  it('returns an exact match when supported', () => {
    const config = makeConfig({ detection: { order: ['cookie'] } })
    expect(detectLocale(config, { url: '/', cookie: 'de', header: undefined })).toBe('de')
  })

  it('resolves base language when regional variant is detected', () => {
    const config = makeConfig({ detection: { order: ['cookie'] } })
    // Cookie is 'fr-BE', 'fr' is in supportedLngs
    expect(detectLocale(config, { url: '/', cookie: 'fr-BE', header: undefined })).toBe('fr')
  })

  it('resolves regional locale when only a regional variant is supported', () => {
    const config = makeConfig({
      supportedLngs:['en-GB', 'de-AT'],
      fallbackLng: 'en-GB',
      detection: { order: ['cookie'] },
    })
    // 'de' base matches 'de-AT'
    expect(detectLocale(config, { url: '/', cookie: 'de', header: undefined })).toBe('de-AT')
  })

  it('returns fallbackLng when detected locale has no match at all', () => {
    const config = makeConfig({ detection: { order: ['cookie'] } })
    expect(detectLocale(config, { url: '/', cookie: 'zh', header: undefined })).toBe('en')
  })
})

// ─── defineI18nConfig defaults interaction ─────────────────────────────────

describe('detectLocale — fallbackLng fallback', () => {
  it('falls back to fallbackLng when all strategies are exhausted', () => {
    const config = makeConfig({ fallbackLng: 'de' })
    expect(detectLocale(config, { url: '/', cookie: undefined, header: undefined })).toBe('de')
  })

  it('uses the first supportedLocale as implicit fallback only if detection hits', () => {
    const config = makeConfig({
      supportedLngs:['fr', 'de'],
      fallbackLng: 'fr',
      detection: { order: ['cookie'] },
    })
    expect(detectLocale(config, { url: '/', cookie: 'de', header: undefined })).toBe('de')
  })
})
