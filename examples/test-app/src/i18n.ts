import { defineI18nConfig } from 'tanstack-start-i18next'
import fs from 'node:fs/promises'
import path from 'node:path'

export const i18nConfig = defineI18nConfig({
  supportedLngs: ['en', 'fr'],
  fallbackLng: 'en',
  ns: 'common',
  defaultNS: 'common',
  detection: {
    order: ['cookie', 'header'],
  },
  loadTranslations: async (locale, namespace) => {
    // On the server: read from filesystem
    if (typeof window === 'undefined') {
      const filePath = path.join(
        process.cwd(),
        'public',
        'locales',
        locale,
        `${namespace}.json`,
      )
      const content = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(content)
    }
    // On the client: fetch from public directory
    const res = await fetch(`/locales/${locale}/${namespace}.json`)
    return res.json()
  },
})
