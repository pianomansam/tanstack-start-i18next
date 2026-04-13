import { createStart } from '@tanstack/react-start'
import { createI18nMiddleware } from 'tanstack-start-i18next'
import { i18nConfig } from './i18n'

export const startInstance = createStart(() => ({
  requestMiddleware: [createI18nMiddleware(i18nConfig)],
}))
