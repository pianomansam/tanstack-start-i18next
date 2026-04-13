import React, { useEffect } from 'react'
import { I18nextProvider, getI18n } from 'react-i18next'
import type { i18n } from 'i18next'
import { I18N_STORE_ELEMENT_ID } from './client'

interface I18nProviderProps {
  i18n: i18n
  children: React.ReactNode
}

/**
 * Provides the i18next instance to the React component tree.
 * Wraps react-i18next's I18nextProvider.
 *
 * Usage in __root.tsx:
 * ```tsx
 * <I18nProvider i18n={i18nInstance}>
 *   <Outlet />
 * </I18nProvider>
 * ```
 */
export function I18nProvider({ i18n: i18nInstance, children }: I18nProviderProps) {
  return (
    <I18nextProvider i18n={i18nInstance}>
      {children}
    </I18nextProvider>
  )
}

/**
 * Embeds the current i18n state as JSON in the HTML for client-side hydration.
 * Place this inside `<body>` in your root route, before `<Scripts />`.
 *
 * On the client, `hydrateI18n()` reads this script tag to restore the locale
 * and translations without any additional network requests.
 *
 * ```tsx
 * // in __root.tsx <body>
 * <I18nScript />
 * <Scripts />
 * ```
 */
export function I18nScript() {
  const i18n = getI18n()
  const i18nJson = i18n
    ? JSON.stringify({ locale: i18n.language, resources: i18n.store.data })
    : 'null'

  // React's hydration-mismatch recovery (triggered in dev by TanStack Router's
  // injected stylesheet) inserts a fresh copy of this element alongside the
  // original server-rendered one.  Strip the id from any extras so the DOM
  // always has exactly one element findable as #__i18n_store__.  We rename
  // rather than removeChild to avoid disturbing any stale fiber references
  // React may hold to the server-rendered node.
  useEffect(() => {
    const all = document.querySelectorAll(`#${I18N_STORE_ELEMENT_ID}`)
    for (let i = 1; i < all.length; i++) {
      ;(all[i] as Element).removeAttribute('id')
    }
  }, [])

  return (
    <script
      id={I18N_STORE_ELEMENT_ID}
      type="application/json"
      suppressHydrationWarning
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: i18nJson }}
    />
  )
}
