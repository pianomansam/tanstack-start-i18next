import type { InitOptions, i18n, Resource } from 'i18next'

export interface I18nDetectionConfig {
  /** Detection strategies in priority order. Default: ['path', 'cookie', 'header'] */
  order?: ('path' | 'cookie' | 'header')[]
  /** Cookie name for locale persistence. Default: 'i18next' */
  cookieName?: string
  /** URL path segment index containing the locale. Default: 0 (first segment) */
  pathIndex?: number
}

/**
 * Configuration for tanstack-start-i18next. Extends i18next's InitOptions so all
 * standard i18next options (fallbackLng, supportedLngs, defaultNS, interpolation,
 * debug, etc.) are available at the top level with correct types.
 *
 * Three properties are added on top of InitOptions:
 * - `loadTranslations` — how to load a namespace's translations for a given locale
 * - `detection`        — locale detection strategy configuration
 * - `plugins`          — i18next plugins to register via `.use()` before init
 *
 * Two InitOptions properties are omitted:
 * - `resources` — built internally from loadTranslations; do not set directly
 * - `lng`       — set per-request by middleware; not a static config value
 *
 * `ns` is narrowed from InitOptions' `string | string[]` to `string[]` so the
 * library can always iterate over it without normalization.
 */
export interface I18nConfig extends Omit<InitOptions, 'resources' | 'lng' | 'fallbackLng'> {
  /**
   * Locale to use when detection finds no supported match, and the i18next fallback
   * locale for missing translation keys. Narrowed to `string` (vs InitOptions' broader
   * union) so it can serve both roles unambiguously.
   */
  fallbackLng: string
  /**
   * Load translations for a given locale and namespace.
   * Called on the server during SSR and on the client for dynamic namespace loading.
   */
  loadTranslations: (
    locale: string,
    namespace: string,
  ) => Promise<Record<string, unknown>>
  /** Locale detection configuration */
  detection?: I18nDetectionConfig
  /**
   * i18next plugins to register via `.use()` before each instance is initialised.
   * Accepts anything that `i18n.use()` accepts — class-style plugins, object plugins,
   * or pre-instantiated modules.
   *
   * Both server and client instances receive these plugins, so plugins that only make
   * sense in one environment (e.g. an HTTP backend for save-missing) should guard
   * against the wrong runtime themselves, or be conditionally included here.
   *
   * @example
   * ```ts
   * import HttpBackend from 'i18next-http-backend'
   *
   * defineI18nConfig({
   *   plugins: [HttpBackend],
   *   backend: {
   *     addPath: '/api/i18n/add/{{lng}}/{{ns}}',
   *   },
   *   saveMissing: true,
   *   // ...
   * })
   * ```
   */
  plugins?: Array<Parameters<i18n['use']>[0]>
}

/** Normalize InitOptions['ns'] (string | string[] | undefined) to a string array */
export function normalizeNs(ns: InitOptions['ns']): string[] {
  if (!ns) return []
  return Array.isArray(ns) ? (ns as string[]) : [ns as string]
}

export interface I18nContext {
  /** The i18next instance for the current request (server) or session (client) */
  i18n: i18n
  /** The resolved locale for the current request */
  locale: string
  /** Serializable translation store to pass from server to client */
  i18nStore: Resource
}
