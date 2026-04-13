import { createMiddleware } from '@tanstack/react-start'
import {
  getRequestHeader,
  getCookie,
  setCookie,
  getRequestUrl,
} from '@tanstack/react-start/server'
import type { I18nConfig } from './types'
import { normalizeNs } from './types'
import { detectLocale } from './detection'
import { createServerI18nInstance } from './server'

/**
 * Create a TanStack Start request middleware that:
 * 1. Detects the user's locale from the request (path, cookie, header)
 * 2. Creates a per-request i18next instance with loaded translations
 * 3. Passes { i18n, locale, i18nStore } into the router context
 * 4. Persists the locale in a cookie
 *
 * Usage in src/start.ts:
 * ```ts
 * import { createStart } from '@tanstack/react-start'
 * import { createI18nMiddleware } from 'tanstack-start-i18next'
 * import { i18nConfig } from './i18n'
 *
 * export const startInstance = createStart(() => ({
 *   requestMiddleware: [createI18nMiddleware(i18nConfig)],
 * }))
 * ```
 */
export function createI18nMiddleware(config: I18nConfig) {
  const cookieName = config.detection?.cookieName ?? 'i18next'

  return createMiddleware().server(async ({ next }) => {
    const url = getRequestUrl().href
    const header = getRequestHeader('accept-language')
    const cookie = getCookie(cookieName)

    const locale = detectLocale(config, {
      url,
      cookie: cookie || undefined,
      header: header || undefined,
    })

    // Persist locale for subsequent requests
    setCookie(cookieName, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    })

    // Determine which namespaces to load initially
    const namespacesToLoad = normalizeNs(config.defaultNS || config.ns).slice(0, 1)

    const { i18nInstance, initialStore } = await createServerI18nInstance(
      config,
      locale,
      namespacesToLoad,
    )

    // Also load translations for all other supported locales so the client
    // has everything it needs for locale switching without extra network requests.
    const fullStore: import('i18next').Resource = { ...initialStore }
    if (Array.isArray(config.supportedLngs) && config.supportedLngs.length > 0) {
      const otherLocales = (config.supportedLngs as string[]).filter((l) => l !== locale)
      await Promise.all(
        otherLocales.flatMap((loc) =>
          namespacesToLoad.map(async (ns) => {
            try {
              const data = await config.loadTranslations(loc, ns)
              if (!fullStore[loc]) fullStore[loc] = {}
              fullStore[loc][ns] = data as Record<string, string>
              // Also add to the live instance so getI18n().store.data includes all locales
              i18nInstance.addResourceBundle(loc, ns, data, true, false)
            } catch {
              // Skip locales whose translation files are missing
            }
          }),
        ),
      )
    }

    return next({
      context: {
        i18n: i18nInstance,
        locale,
        i18nStore: fullStore,
      },
    })
  })
}
