import { StartClient } from '@tanstack/react-start/client'
import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { hydrateI18n } from 'tanstack-start-i18next'
import { i18nConfig } from './i18n'

// Restore the locale + translations the server embedded in the HTML before
// React hydrates, so every useTranslation() call finds the correct state.
await hydrateI18n(i18nConfig)

hydrateRoot(
  document,
  <StrictMode>
    <StartClient />
  </StrictMode>,
)
