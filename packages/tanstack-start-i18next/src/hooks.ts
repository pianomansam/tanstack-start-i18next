import { useTranslation as useI18nextTranslation } from 'react-i18next'

export { useTranslation } from 'react-i18next'

/**
 * Get the current locale from the i18next instance.
 */
export function useLocale(): string {
  const { i18n } = useI18nextTranslation()
  return i18n.language
}

/**
 * Returns a function to change the active locale.
 * Updates the i18next instance and persists the choice in a cookie.
 */
export function useChangeLocale(): (locale: string) => Promise<void> {
  const { i18n } = useI18nextTranslation()

  return async (locale: string) => {
    await i18n.changeLanguage(locale)
    // Persist in cookie for server-side detection on next request
    if (typeof document !== 'undefined') {
      document.cookie = `i18next=${locale};path=/;max-age=${60 * 60 * 24 * 365}`
    }
  }
}
