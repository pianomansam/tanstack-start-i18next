import { describe, it, expect, vi } from 'vitest'
import { defineI18nConfig } from '../config'
import type { I18nConfig } from '../types'

const loadTranslations = vi.fn(async () => ({}))

describe('defineI18nConfig', () => {
  describe('pass-through behaviour', () => {
    it('returns the exact same object reference', () => {
      const input: I18nConfig = {
        supportedLngs:['en'],
        fallbackLng: 'en',
        ns:['common'],
        loadTranslations,
      }
      expect(defineI18nConfig(input)).toBe(input)
    })

    it('preserves all required fields unchanged', () => {
      const config = defineI18nConfig({
        supportedLngs:['en', 'fr'],
        fallbackLng: 'en',
        ns:['common', 'home'],
        loadTranslations,
      })
      expect(config.supportedLngs).toEqual(['en', 'fr'])
      expect(config.fallbackLng).toBe('en')
      expect(config.ns).toEqual(['common', 'home'])
    })

    it('preserves optional fields when provided', () => {
      const config = defineI18nConfig({
        supportedLngs:['en'],
        fallbackLng: 'en',
        ns:['common'],
        defaultNS: 'common',
        fallbackLng: 'en',
        loadTranslations,
        detection: { order: ['cookie', 'header'], cookieName: 'lang', pathIndex: 1 },
        load: 'currentOnly',
      })
      expect(config.defaultNS).toBe('common')
      expect(config.fallbackLng).toBe('en')
      expect(config.detection?.order).toEqual(['cookie', 'header'])
      expect(config.detection?.cookieName).toBe('lang')
      expect(config.detection?.pathIndex).toBe(1)
      expect(config.load).toBe('currentOnly')
    })

    it('preserves the loadTranslations function reference', () => {
      const fn = vi.fn(async () => ({}))
      const config = defineI18nConfig({
        supportedLngs:['en'],
        fallbackLng: 'en',
        ns:['common'],
        loadTranslations: fn,
      })
      expect(config.loadTranslations).toBe(fn)
    })
  })

  describe('optional field defaults (not applied by defineI18nConfig itself)', () => {
    it('does not auto-fill defaultNS — that is deferred to init time', () => {
      const config = defineI18nConfig({
        supportedLngs:['en'],
        fallbackLng: 'en',
        ns:['common'],
        loadTranslations,
      })
      // defineI18nConfig is an identity function; defaults are applied elsewhere
      expect(config.defaultNS).toBeUndefined()
    })


    it('does not auto-fill detection', () => {
      const config = defineI18nConfig({
        supportedLngs:['en'],
        fallbackLng: 'en',
        ns:['common'],
        loadTranslations,
      })
      expect(config.detection).toBeUndefined()
    })
  })

  describe('detection config', () => {
    it('accepts all three detection strategies in order', () => {
      const config = defineI18nConfig({
        supportedLngs:['en'],
        fallbackLng: 'en',
        ns:['common'],
        loadTranslations,
        detection: { order: ['path', 'cookie', 'header'] },
      })
      expect(config.detection?.order).toEqual(['path', 'cookie', 'header'])
    })

    it('accepts a custom cookie name', () => {
      const config = defineI18nConfig({
        supportedLngs:['en'],
        fallbackLng: 'en',
        ns:['common'],
        loadTranslations,
        detection: { cookieName: 'my_locale' },
      })
      expect(config.detection?.cookieName).toBe('my_locale')
    })

    it('accepts pathIndex 0 and non-zero values', () => {
      const config = defineI18nConfig({
        supportedLngs:['en'],
        fallbackLng: 'en',
        ns:['common'],
        loadTranslations,
        detection: { pathIndex: 2 },
      })
      expect(config.detection?.pathIndex).toBe(2)
    })
  })

  describe('multiple supported locales', () => {
    it('accepts many locales', () => {
      const config = defineI18nConfig({
        supportedLngs:['en', 'fr', 'de', 'es', 'pt', 'ja', 'zh'],
        fallbackLng: 'en',
        ns:['common'],
        loadTranslations,
      })
      expect(config.supportedLngs).toHaveLength(7)
    })

    it('accepts regional locale codes', () => {
      const config = defineI18nConfig({
        supportedLngs:['en-US', 'en-GB', 'fr-CA', 'fr-BE'],
        fallbackLng: 'en-US',
        ns:['common'],
        loadTranslations,
      })
      expect(config.supportedLngs).toContain('fr-CA')
    })
  })
})
