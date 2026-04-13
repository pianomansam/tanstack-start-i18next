import { describe, it, expect, vi, afterEach } from 'vitest'
import type { Resource } from 'i18next'
import { initClientI18n, hydrateI18n, I18N_STORE_ELEMENT_ID } from '../client'
import type { I18nConfig } from '../types'

// Pre-built stores that simulate what createServerI18nInstance returns
const EN_STORE: Resource = {
  en: {
    common: { title: 'Welcome', description: 'Hello' },
    home: { greeting: 'Hello!' },
  },
}

const FR_STORE: Resource = {
  fr: {
    common: { title: 'Bienvenue', description: 'Bonjour' },
  },
}

function makeConfig(overrides: Partial<I18nConfig> = {}): I18nConfig {
  return {
    supportedLngs:['en', 'fr'],
    fallbackLng: 'en',
    ns:['common', 'home'],
    defaultNS: 'common',
    loadTranslations: vi.fn(async () => ({})),
    ...overrides,
  }
}

describe('initClientI18n', () => {
  describe('instance initialisation', () => {
    it('returns an initialized i18next instance', async () => {
      const config = makeConfig()
      const instance = await initClientI18n(config, 'en', EN_STORE)
      expect(instance.isInitialized).toBe(true)
    })

    it('sets the correct active language', async () => {
      const config = makeConfig()
      const instance = await initClientI18n(config, 'fr', FR_STORE)
      expect(instance.language).toBe('fr')
    })

    it('uses config.defaultNS as the defaultNS', async () => {
      const config = makeConfig({ defaultNS: 'common' })
      const instance = await initClientI18n(config, 'en', EN_STORE)
      expect(instance.options.defaultNS).toBe('common')
    })

    it('falls back to first namespace in namespaces list when defaultNS is omitted', async () => {
      const config = makeConfig({ defaultNS: undefined, ns: ['home', 'common'] })
      const instance = await initClientI18n(config, 'en', EN_STORE)
      expect(instance.options.defaultNS).toBe('home')
    })

    it('sets fallbackLng from config.fallbackLng', async () => {
      const config = makeConfig({ fallbackLng: 'fr' })
      const instance = await initClientI18n(config, 'en', EN_STORE)
      // i18next normalises a string fallbackLng into an array internally
      expect(instance.options.fallbackLng).toContain('fr')
    })

    it('disables HTML escaping (React handles this itself)', async () => {
      const config = makeConfig()
      const instance = await initClientI18n(config, 'en', EN_STORE)
      expect(instance.options.interpolation?.escapeValue).toBe(false)
    })

    it('passes i18next options from config through to the instance', async () => {
      const config = makeConfig({ load: 'currentOnly' })
      const instance = await initClientI18n(config, 'en', EN_STORE)
      expect(instance.options.load).toBe('currentOnly')
    })
  })

  describe('namespace detection from store', () => {
    it('infers loaded namespaces from the store keys', async () => {
      // Store has 'common' and 'home' under 'en'
      const config = makeConfig()
      const instance = await initClientI18n(config, 'en', EN_STORE)
      expect(instance.hasLoadedNamespace('common')).toBe(true)
      expect(instance.hasLoadedNamespace('home')).toBe(true)
    })

    it('falls back to config.ns when store has no locale entry', async () => {
      // Store has 'fr' but we init as 'en' — no namespaces derivable
      const config = makeConfig({ ns: ['common'] })
      const instance = await initClientI18n(config, 'en', FR_STORE)
      // Should not crash; instance is still initialized
      expect(instance.isInitialized).toBe(true)
    })

    it('handles a store with a single namespace', async () => {
      const store: Resource = { en: { common: { hello: 'Hi' } } }
      const config = makeConfig()
      const instance = await initClientI18n(config, 'en', store)
      expect(instance.hasLoadedNamespace('common')).toBe(true)
    })
  })

  describe('translation correctness', () => {
    it('t() returns the correct value from the store', async () => {
      const config = makeConfig()
      const instance = await initClientI18n(config, 'en', EN_STORE)
      expect(instance.t('title')).toBe('Welcome')
    })

    it('t() returns French translations when locale is fr', async () => {
      const config = makeConfig()
      const instance = await initClientI18n(config, 'fr', FR_STORE)
      expect(instance.t('title')).toBe('Bienvenue')
    })

    it('t() resolves translations from a non-default namespace with ns option', async () => {
      const config = makeConfig()
      const instance = await initClientI18n(config, 'en', EN_STORE)
      expect(instance.t('greeting', { ns: 'home' })).toBe('Hello!')
    })

    it('handles interpolation correctly', async () => {
      const store: Resource = { en: { common: { greet: 'Hello, {{name}}!' } } }
      const config = makeConfig()
      const instance = await initClientI18n(config, 'en', store)
      expect(instance.t('greet', { name: 'World' })).toBe('Hello, World!')
    })
  })

  describe('hydration from server store (no async fetch)', () => {
    it('does not call loadTranslations — resources come from the store', async () => {
      const config = makeConfig()
      await initClientI18n(config, 'en', EN_STORE)
      // loadTranslations should never be called; client instance hydrates from store
      expect(config.loadTranslations).not.toHaveBeenCalled()
    })

    it('produces an instance consistent with the server-side store', async () => {
      // Simulate the exact store returned by createServerI18nInstance
      const store: Resource = {
        fr: {
          common: { title: 'Bienvenue', welcome: 'Bienvenue chez nous' },
        },
      }
      const config = makeConfig()
      const instance = await initClientI18n(config, 'fr', store)
      expect(instance.t('title')).toBe('Bienvenue')
      expect(instance.t('welcome')).toBe('Bienvenue chez nous')
    })
  })

  describe('isolated instances', () => {
    it('creates a fresh instance each time', async () => {
      const config = makeConfig()
      const a = await initClientI18n(config, 'en', EN_STORE)
      const b = await initClientI18n(config, 'fr', FR_STORE)
      expect(a).not.toBe(b)
      expect(a.language).toBe('en')
      expect(b.language).toBe('fr')
    })

    it('changing language on one instance does not affect another', async () => {
      const config = makeConfig()
      const a = await initClientI18n(config, 'en', EN_STORE)
      const b = await initClientI18n(config, 'en', EN_STORE)
      await a.changeLanguage('fr')
      expect(b.language).toBe('en')
    })
  })

  describe('synchronous initialisation (initAsync: false)', () => {
    it('instance is initialized after awaiting with pre-loaded resources', async () => {
      // initAsync: false ensures i18next resolves synchronously when resources are
      // already provided — the promise fulfills in the same tick, preventing hydration
      // mismatches when hydrateI18n is called before hydrateRoot.
      const config = makeConfig()
      const instance = await initClientI18n(config, 'en', EN_STORE)
      expect(instance.isInitialized).toBe(true)
      // Translations must be accessible immediately — no async resolution needed
      expect(instance.t('title')).toBe('Welcome')
    })
  })
})

// ─── helpers shared by hydrateI18n tests ──────────────────────────────────

function stubDocument(textContent: string | null) {
  vi.stubGlobal('document', {
    getElementById: vi.fn().mockReturnValue(
      textContent !== null ? { textContent } : null,
    ),
  })
}

describe('hydrateI18n', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('DOM reading', () => {
    it('reads the element identified by I18N_STORE_ELEMENT_ID', async () => {
      const getElementById = vi.fn().mockReturnValue(null)
      vi.stubGlobal('document', { getElementById })
      await hydrateI18n(makeConfig())
      expect(getElementById).toHaveBeenCalledWith(I18N_STORE_ELEMENT_ID)
    })

    it('I18N_STORE_ELEMENT_ID is __i18n_store__', () => {
      // The constant must match what I18nScript renders so server and client agree
      expect(I18N_STORE_ELEMENT_ID).toBe('__i18n_store__')
    })

    it('falls back to fallbackLng when the script element is missing', async () => {
      stubDocument(null)
      const instance = await hydrateI18n(makeConfig())
      expect(instance.language).toBe('en')
    })

    it('falls back to fallbackLng when textContent is empty', async () => {
      stubDocument('')
      const instance = await hydrateI18n(makeConfig())
      expect(instance.language).toBe('en')
    })

    it('falls back to an empty resource store when element is missing', async () => {
      stubDocument(null)
      const instance = await hydrateI18n(makeConfig())
      expect(instance.isInitialized).toBe(true)
    })
  })

  describe('initialisation from embedded store', () => {
    it('sets the locale from the embedded JSON', async () => {
      stubDocument(JSON.stringify({ locale: 'fr', resources: FR_STORE }))
      const instance = await hydrateI18n(makeConfig())
      expect(instance.language).toBe('fr')
    })

    it('loads translations from the embedded resources', async () => {
      stubDocument(JSON.stringify({ locale: 'fr', resources: FR_STORE }))
      const instance = await hydrateI18n(makeConfig())
      expect(instance.t('title')).toBe('Bienvenue')
    })

    it('loads English translations correctly', async () => {
      stubDocument(JSON.stringify({ locale: 'en', resources: EN_STORE }))
      const instance = await hydrateI18n(makeConfig())
      expect(instance.t('title')).toBe('Welcome')
      expect(instance.t('greeting', { ns: 'home' })).toBe('Hello!')
    })

    it('returns a fully initialized instance', async () => {
      stubDocument(JSON.stringify({ locale: 'en', resources: EN_STORE }))
      const instance = await hydrateI18n(makeConfig())
      expect(instance.isInitialized).toBe(true)
    })

    it('does not call loadTranslations — resources come from the embedded store', async () => {
      stubDocument(JSON.stringify({ locale: 'en', resources: EN_STORE }))
      const config = makeConfig()
      await hydrateI18n(config)
      expect(config.loadTranslations).not.toHaveBeenCalled()
    })
  })

  describe('respects config', () => {
    it('uses config.fallbackLng as the locale fallback when store locale is missing', async () => {
      stubDocument(JSON.stringify({ resources: FR_STORE })) // no locale key
      const instance = await hydrateI18n(makeConfig({ fallbackLng: 'en' }))
      expect(instance.language).toBe('en')
    })

    it('passes config options through to the underlying i18next instance', async () => {
      stubDocument(JSON.stringify({ locale: 'en', resources: EN_STORE }))
      const instance = await hydrateI18n(makeConfig({ load: 'currentOnly' }))
      expect(instance.options.load).toBe('currentOnly')
    })
  })
})

describe('plugin support (config.plugins)', () => {
  it('initialises without error when plugins is omitted', async () => {
    const config = makeConfig()
    const instance = await initClientI18n(config, 'en', EN_STORE)
    expect(instance.isInitialized).toBe(true)
  })

  it('initialises without error when plugins is an empty array', async () => {
    const config = makeConfig({ plugins: [] })
    const instance = await initClientI18n(config, 'en', EN_STORE)
    expect(instance.isInitialized).toBe(true)
  })

  it('accepts a 3rdParty plugin without throwing', async () => {
    const fakePlugin = {
      type: '3rdParty' as const,
      init: vi.fn(),
    }
    const config = makeConfig({ plugins: [fakePlugin] })
    const instance = await initClientI18n(config, 'en', EN_STORE)
    expect(instance.isInitialized).toBe(true)
  })

  it('does not pass plugins into i18next init options (no unknown option warning)', async () => {
    // plugins must be stripped from the options spread — i18next does not know this key
    const fakePlugin = { type: '3rdParty' as const, init: vi.fn() }
    const config = makeConfig({ plugins: [fakePlugin] })
    const instance = await initClientI18n(config, 'en', EN_STORE)
    // If plugins leaked into initOptions, i18next would store it; assert it did not
    expect((instance.options as Record<string, unknown>).plugins).toBeUndefined()
  })

  it('translations still resolve correctly when a plugin is registered', async () => {
    const fakePlugin = { type: '3rdParty' as const, init: vi.fn() }
    const config = makeConfig({ plugins: [fakePlugin] })
    const instance = await initClientI18n(config, 'en', EN_STORE)
    expect(instance.t('title')).toBe('Welcome')
  })
})
