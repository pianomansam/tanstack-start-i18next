import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createServerI18nInstance } from '../server'
import type { I18nConfig } from '../types'

// Fixture translations
const EN_COMMON = { title: 'Welcome', description: 'Hello' }
const FR_COMMON = { title: 'Bienvenue', description: 'Bonjour' }
const EN_HOME = { greeting: 'Hello!', intro: 'Welcome to our home page.' }

function makeConfig(overrides: Partial<I18nConfig> = {}): I18nConfig {
  return {
    supportedLngs:['en', 'fr'],
    fallbackLng: 'en',
    ns:['common', 'home'],
    defaultNS: 'common',
    loadTranslations: vi.fn(async (locale, namespace) => {
      if (locale === 'en' && namespace === 'common') return EN_COMMON
      if (locale === 'fr' && namespace === 'common') return FR_COMMON
      if (locale === 'en' && namespace === 'home') return EN_HOME
      return {}
    }),
    ...overrides,
  }
}

describe('createServerI18nInstance', () => {
  describe('i18next instance initialisation', () => {
    it('returns an initialized i18next instance', async () => {
      const config = makeConfig()
      const { i18nInstance } = await createServerI18nInstance(config, 'en', ['common'])
      expect(i18nInstance.isInitialized).toBe(true)
    })

    it('sets the correct language on the instance', async () => {
      const config = makeConfig()
      const { i18nInstance } = await createServerI18nInstance(config, 'fr', ['common'])
      expect(i18nInstance.language).toBe('fr')
    })

    it('sets the correct defaultNS from config', async () => {
      const config = makeConfig({ defaultNS: 'common' })
      const { i18nInstance } = await createServerI18nInstance(config, 'en', ['common'])
      expect(i18nInstance.options.defaultNS).toBe('common')
    })

    it('falls back to first namespace in list when defaultNS is omitted', async () => {
      const config = makeConfig({ defaultNS: undefined, ns: ['home', 'common'] })
      const { i18nInstance } = await createServerI18nInstance(config, 'en', ['home'])
      expect(i18nInstance.options.defaultNS).toBe('home')
    })

    it('uses config.fallbackLng as the i18next fallbackLng', async () => {
      const config = makeConfig({ fallbackLng: 'fr' })
      const { i18nInstance } = await createServerI18nInstance(config, 'en', ['common'])
      // i18next normalises a string fallbackLng into an array internally
      expect(i18nInstance.options.fallbackLng).toContain('fr')
    })

    it('disables HTML escape since React handles it', async () => {
      const config = makeConfig()
      const { i18nInstance } = await createServerI18nInstance(config, 'en', ['common'])
      expect(i18nInstance.options.interpolation?.escapeValue).toBe(false)
    })

    it('passes i18next options from config through to the instance', async () => {
      const config = makeConfig({ load: 'currentOnly' })
      const { i18nInstance } = await createServerI18nInstance(config, 'en', ['common'])
      expect(i18nInstance.options.load).toBe('currentOnly')
    })
  })

  describe('translation loading', () => {
    it('calls loadTranslations for each requested namespace', async () => {
      const config = makeConfig()
      await createServerI18nInstance(config, 'en', ['common', 'home'])
      expect(config.loadTranslations).toHaveBeenCalledWith('en', 'common')
      expect(config.loadTranslations).toHaveBeenCalledWith('en', 'home')
      expect(config.loadTranslations).toHaveBeenCalledTimes(2)
    })

    it('loads namespaces in parallel (all called, results merged)', async () => {
      const order: string[] = []
      const config = makeConfig({
        loadTranslations: vi.fn(async (locale, namespace) => {
          order.push(namespace)
          return { key: namespace }
        }),
      })
      await createServerI18nInstance(config, 'en', ['ns-a', 'ns-b', 'ns-c'])
      // All three should be called
      expect(config.loadTranslations).toHaveBeenCalledTimes(3)
      expect(order.sort()).toEqual(['ns-a', 'ns-b', 'ns-c'])
    })

    it('loads translations for the specified locale, not just the default', async () => {
      const config = makeConfig()
      await createServerI18nInstance(config, 'fr', ['common'])
      expect(config.loadTranslations).toHaveBeenCalledWith('fr', 'common')
      expect(config.loadTranslations).not.toHaveBeenCalledWith('en', 'common')
    })

    it('the t() function returns the correct translation', async () => {
      const config = makeConfig()
      const { i18nInstance } = await createServerI18nInstance(config, 'en', ['common'])
      expect(i18nInstance.t('title', { ns: 'common' })).toBe('Welcome')
    })

    it('returns French translations when locale is fr', async () => {
      const config = makeConfig()
      const { i18nInstance } = await createServerI18nInstance(config, 'fr', ['common'])
      expect(i18nInstance.t('title', { ns: 'common' })).toBe('Bienvenue')
    })

    it('handles multiple namespaces and resolves translations for each', async () => {
      const config = makeConfig()
      const { i18nInstance } = await createServerI18nInstance(config, 'en', ['common', 'home'])
      expect(i18nInstance.t('title', { ns: 'common' })).toBe('Welcome')
      expect(i18nInstance.t('greeting', { ns: 'home' })).toBe('Hello!')
    })

    it('handles interpolation correctly', async () => {
      const config = makeConfig({
        loadTranslations: async () => ({ greet: 'Hello, {{name}}!' }),
      })
      const { i18nInstance } = await createServerI18nInstance(config, 'en', ['common'])
      expect(i18nInstance.t('greet', { name: 'World' })).toBe('Hello, World!')
    })

    it('handles an empty namespace gracefully', async () => {
      const config = makeConfig({
        loadTranslations: async () => ({}),
      })
      const { i18nInstance } = await createServerI18nInstance(config, 'en', ['common'])
      expect(i18nInstance.isInitialized).toBe(true)
    })
  })

  describe('initialStore (serialisable resource object)', () => {
    it('returns a store keyed by locale', async () => {
      const config = makeConfig()
      const { initialStore } = await createServerI18nInstance(config, 'en', ['common'])
      expect(initialStore).toHaveProperty('en')
    })

    it('contains the loaded namespace data under the locale key', async () => {
      const config = makeConfig()
      const { initialStore } = await createServerI18nInstance(config, 'en', ['common'])
      expect(initialStore['en']['common']).toEqual(EN_COMMON)
    })

    it('contains all requested namespaces in the store', async () => {
      const config = makeConfig()
      const { initialStore } = await createServerI18nInstance(config, 'en', ['common', 'home'])
      expect(initialStore['en']).toHaveProperty('common')
      expect(initialStore['en']).toHaveProperty('home')
    })

    it('does not include locales other than the requested one', async () => {
      const config = makeConfig()
      const { initialStore } = await createServerI18nInstance(config, 'en', ['common'])
      expect(Object.keys(initialStore)).toEqual(['en'])
    })

    it('stores match the shape expected by initClientI18n (i18next resource format)', async () => {
      const config = makeConfig()
      const { initialStore } = await createServerI18nInstance(config, 'fr', ['common'])
      // Should be { fr: { common: { title: 'Bienvenue', ... } } }
      expect(initialStore).toEqual({
        fr: {
          common: FR_COMMON,
        },
      })
    })
  })

  describe('isolated instances', () => {
    it('creates a new instance each time (not a shared global)', async () => {
      const config = makeConfig()
      const { i18nInstance: a } = await createServerI18nInstance(config, 'en', ['common'])
      const { i18nInstance: b } = await createServerI18nInstance(config, 'fr', ['common'])
      expect(a).not.toBe(b)
      expect(a.language).toBe('en')
      expect(b.language).toBe('fr')
    })

    it('mutations to one instance do not affect another', async () => {
      const config = makeConfig()
      const { i18nInstance: a } = await createServerI18nInstance(config, 'en', ['common'])
      const { i18nInstance: b } = await createServerI18nInstance(config, 'en', ['common'])
      await a.changeLanguage('fr')
      expect(b.language).toBe('en')
    })
  })

  describe('plugin support (config.plugins)', () => {
    it('calls a 3rdParty plugin init when the instance is created', async () => {
      const pluginInit = vi.fn()
      const fakePlugin = {
        type: '3rdParty' as const,
        init: pluginInit,
      }
      const config = makeConfig({ plugins: [fakePlugin] })
      const { i18nInstance } = await createServerI18nInstance(config, 'en', ['common'])

      expect(i18nInstance.isInitialized).toBe(true)
      expect(pluginInit).toHaveBeenCalled()
    })

    it('calls all plugins when multiple are provided', async () => {
      const initA = vi.fn()
      const initB = vi.fn()
      const pluginA = { type: '3rdParty' as const, init: initA }
      const pluginB = { type: '3rdParty' as const, init: initB }

      const config = makeConfig({ plugins: [pluginA, pluginB] })
      await createServerI18nInstance(config, 'en', ['common'])

      expect(initA).toHaveBeenCalled()
      expect(initB).toHaveBeenCalled()
    })

    it('initialises without error when plugins is an empty array', async () => {
      const config = makeConfig({ plugins: [] })
      const { i18nInstance } = await createServerI18nInstance(config, 'en', ['common'])
      expect(i18nInstance.isInitialized).toBe(true)
    })

    it('initialises without error when plugins is omitted', async () => {
      const config = makeConfig()
      const { i18nInstance } = await createServerI18nInstance(config, 'en', ['common'])
      expect(i18nInstance.isInitialized).toBe(true)
    })

    it('translations still resolve correctly when plugins are present', async () => {
      const fakePlugin = { type: '3rdParty' as const, init: vi.fn() }
      const config = makeConfig({ plugins: [fakePlugin] })
      const { i18nInstance } = await createServerI18nInstance(config, 'en', ['common'])
      expect(i18nInstance.t('title', { ns: 'common' })).toBe('Welcome')
    })
  })
})
