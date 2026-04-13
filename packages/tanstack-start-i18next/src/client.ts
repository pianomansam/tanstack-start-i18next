import i18next, { type i18n as I18nInstance, type Resource } from 'i18next'
import { initReactI18next } from 'react-i18next'
import type { I18nConfig } from './types'
import { normalizeNs } from './types'

/** The element ID used to embed/read the server i18n state in the HTML. */
export const I18N_STORE_ELEMENT_ID = '__i18n_store__'

/**
 * Initialize an i18next instance on the client, hydrated from server state.
 * Uses the pre-loaded resources directly (no async backend fetch) to prevent
 * hydration mismatches.
 */
export async function initClientI18n(
  config: I18nConfig,
  initialLocale: string,
  initialStore: Resource,
): Promise<I18nInstance> {
  const { loadTranslations, detection, plugins, ns: _ns, ...initOptions } = config
  const instance = i18next.createInstance()

  // Determine namespaces from the store
  const namespaces = Object.keys(initialStore[initialLocale] ?? {})

  const chain = plugins
    ? plugins.reduce((i, plugin) => i.use(plugin), instance.use(initReactI18next))
    : instance.use(initReactI18next)
  await chain.init({
    ...initOptions,
    lng: initialLocale,
    ns: namespaces.length > 0 ? namespaces : normalizeNs(config.ns),
    defaultNS: config.defaultNS ?? normalizeNs(config.ns)[0],
    resources: initialStore,
    interpolation: { escapeValue: false, ...config.interpolation },
    // Ensures synchronous init when resources are pre-loaded, preventing
    // hydration mismatches if the caller does not await the returned promise.
    // (i18next v26 renamed initImmediate:false → initAsync:false)
    initAsync: false,
  })

  return instance
}

/**
 * Read the i18n state embedded by the server (`<I18nScript />`) and initialize
 * the global i18next instance before React hydrates.
 *
 * Call this in your client entry (client.tsx) before `hydrateRoot`:
 * ```ts
 * await hydrateI18n(i18nConfig)
 * hydrateRoot(document, <StrictMode><StartClient /></StrictMode>)
 * ```
 */
export async function hydrateI18n(config: I18nConfig): Promise<I18nInstance> {
  const scriptEl = document.getElementById(I18N_STORE_ELEMENT_ID)
  const i18nData = scriptEl ? JSON.parse(scriptEl.textContent || 'null') : null
  const locale: string = i18nData?.locale ?? config.fallbackLng
  const resources: Resource = i18nData?.resources ?? {}
  return initClientI18n(config, locale, resources)
}
