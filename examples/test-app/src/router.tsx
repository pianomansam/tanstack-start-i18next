import { createRouter } from '@tanstack/react-router'
import type { I18nContext } from 'tanstack-start-i18next'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    // Placeholder context — the real values are injected by createI18nMiddleware
    // on every request before any route renders.
    context: {} as I18nContext,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
