import type { ReactNode } from 'react'
import { useEffect } from 'react'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { getI18n } from 'react-i18next'
import type { I18nContext } from 'tanstack-start-i18next'
import { I18nProvider, I18nScript } from 'tanstack-start-i18next'

export const Route = createRootRouteWithContext<I18nContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'TanStack Start i18next Test App' },
    ],
  }),
})

function RootComponent() {
  // On the server: getI18n() returns the instance set by the middleware via initReactI18next.
  // On the client: returns the instance initialised in client.tsx before hydrateRoot.
  const i18n = getI18n()!

  // Signal to Cypress (and any other test tooling) that React has committed its
  // client-side render and event handlers are attached.  useEffect only fires on
  // the client, and only after the component tree has been committed to the DOM.
  useEffect(() => {
    document.body.dataset.hydrated = '1'
  }, [])

  return (
    <I18nProvider i18n={i18n}>
      <RootDocument>
        <Outlet />
      </RootDocument>
    </I18nProvider>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <I18nScript />
        <Scripts />
      </body>
    </html>
  )
}
