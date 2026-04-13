import i18next, { type i18n as I18nInstance, type Resource } from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { I18nConfig } from './types'
import { normalizeNs } from './types'

/**
 * Create an isolated i18next instance for a single server request.
 * Loads the specified namespaces for the given locale and returns
 * both the instance and a serializable store for client hydration.
 */
export async function createServerI18nInstance(
  config: I18nConfig,
  locale: string,
  namespaces: string[],
): Promise<{
  i18nInstance: I18nInstance
  initialStore: Resource
}> {
  // Load all requested namespaces in parallel
  const bundles = await Promise.all(
    namespaces.map(async (ns) => ({
      ns,
      data: await config.loadTranslations(locale, ns),
    })),
  )

  // Build the i18next resources object: { locale: { namespace: translations } }
  const resources: Resource = {
    [locale]: {},
  }
  for (const { ns, data } of bundles) {
    resources[locale][ns] = data as Record<string, string>
  }

  const { loadTranslations, detection, ns: _ns, ...initOptions } = config
  const instance = i18next.createInstance()
  await instance.use(initReactI18next).init({
    ...initOptions,
    lng: locale,
    ns: namespaces,
    defaultNS: config.defaultNS ?? normalizeNs(config.ns)[0],
    resources,
    interpolation: { escapeValue: false, ...config.interpolation },
  })

  return { i18nInstance: instance, initialStore: resources }
}
