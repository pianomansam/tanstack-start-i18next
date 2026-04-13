// Cypress support file — runs before every spec
// Add global custom commands or configuration here

// Clear the locale cookie before each test so tests are isolated
beforeEach(() => {
  cy.clearCookie('i18next')
})

// TanStack Router injects dev-mode stylesheet links on the client that are absent
// from the server-rendered HTML.  React 19 treats this as a hydration mismatch
// and schedules a full client re-render to recover.  Two consequences:
//
// 1. The uncaught hydration error would fail Cypress tests — suppress it.
// 2. React replaces all server DOM nodes, so any click that lands between the
//    `load` event and React's commit will hit a detached element whose onClick
//    is not yet wired up.  Waiting for a known React-rendered element to appear
//    (which re-queries the DOM after the commit) avoids this race.
Cypress.on('uncaught:exception', (err) => {
  if (
    err.message.includes('Hydration failed') ||
    err.message.includes('hydration') ||
    err.message.includes('server rendered HTML') ||
    err.message.includes('did not match')
  ) {
    return false
  }
})

// TanStack Router injects a dev-mode stylesheet absent from the server HTML.
// React 19 detects the mismatch and schedules a fresh client-side render.
// Until that fresh render commits, DOM elements are not wired to React event
// handlers and click() calls will silently do nothing.
//
// RootComponent sets data-hydrated="1" on <body> inside a useEffect, which
// React only fires after the component tree has been committed to the DOM.
// Waiting for that attribute guarantees the fresh render (and all event
// handler wiring) is complete before the test interacts with the page.
Cypress.Commands.overwrite('visit', (originalFn: (...args: unknown[]) => Cypress.Chainable, ...args: unknown[]) => {
  originalFn(...args)
  cy.get('body[data-hydrated="1"]', { timeout: 10000 })
})
