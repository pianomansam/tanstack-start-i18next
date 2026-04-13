// Configuration
export { defineI18nConfig } from './config'

// Types
export type { I18nConfig, I18nDetectionConfig, I18nContext } from './types'

// Server
export { createServerI18nInstance } from './server'
export { createI18nMiddleware } from './middleware'

// Client
export { initClientI18n, hydrateI18n } from './client'

// React
export { I18nProvider, I18nScript } from './provider'
export { useTranslation, useLocale, useChangeLocale } from './hooks'

// Detection (exposed for custom detection scenarios)
export { detectLocale } from './detection'
export type { DetectionContext } from './detection'
