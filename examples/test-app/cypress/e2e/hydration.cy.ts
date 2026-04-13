/**
 * Hydration spec — verifies that I18nScript embeds the correct server state and
 * that hydrateI18n restores it on the client without a translation flash.
 *
 * These tests sit at the intersection of the two new library primitives:
 *   - I18nScript  (server: renders <script id="__i18n_store__"> in the HTML)
 *   - hydrateI18n (client: reads that element and initialises i18next before React hydrates)
 */
describe('Client hydration', () => {
  describe('__i18n_store__ element in the live DOM', () => {
    it('is present after page load', () => {
      cy.visit('/')
      cy.get('script#__i18n_store__').should('exist')
    })

    it('has type application/json', () => {
      cy.visit('/')
      cy.get('script#__i18n_store__').should('have.attr', 'type', 'application/json')
    })

    it('contains valid JSON', () => {
      cy.visit('/')
      cy.get('script#__i18n_store__').then(($el) => {
        expect(() => JSON.parse($el.text())).not.to.throw()
      })
    })

    it('contains a locale key', () => {
      cy.visit('/')
      cy.get('script#__i18n_store__').then(($el) => {
        const data = JSON.parse($el.text())
        expect(data).to.have.property('locale')
      })
    })

    it('contains a resources key', () => {
      cy.visit('/')
      cy.get('script#__i18n_store__').then(($el) => {
        const data = JSON.parse($el.text())
        expect(data).to.have.property('resources')
      })
    })

    it('embeds locale "en" on a default visit', () => {
      cy.visit('/')
      cy.get('script#__i18n_store__').then(($el) => {
        const data = JSON.parse($el.text())
        expect(data.locale).to.eq('en')
      })
    })

    it('embeds translation resources for the active locale', () => {
      cy.visit('/')
      cy.get('script#__i18n_store__').then(($el) => {
        const data = JSON.parse($el.text())
        expect(data.resources).to.have.property('en')
        expect(data.resources.en).to.have.property('common')
      })
    })

    it('embeds locale "fr" after switching to French', () => {
      cy.visit('/')
      cy.get('[data-testid="change-locale"]').click()
      // Reload so the server re-renders with the fr cookie
      cy.reload()
      cy.get('script#__i18n_store__').then(($el) => {
        const data = JSON.parse($el.text())
        expect(data.locale).to.eq('fr')
      })
    })

    it('embeds French translation resources after locale switch + reload', () => {
      cy.visit('/')
      cy.get('[data-testid="change-locale"]').click()
      cy.reload()
      cy.get('script#__i18n_store__').then(($el) => {
        const data = JSON.parse($el.text())
        expect(data.resources).to.have.property('fr')
        expect(data.resources.fr).to.have.property('common')
      })
    })
  })

  describe('No translation flash on hydration', () => {
    it('English title is visible immediately on first paint (no flash)', () => {
      // Translations must be in the SSR HTML — hydrateI18n reads the embedded store
      // synchronously before React's hydrateRoot runs, so content is never absent.
      cy.visit('/')
      cy.get('[data-testid="title"]').should('contain', 'Welcome')
    })

    it('French title is visible immediately after reload in French', () => {
      cy.visit('/')
      cy.get('[data-testid="change-locale"]').click()
      cy.reload()
      cy.get('[data-testid="title"]').should('contain', 'Bienvenue')
    })

    it('content is stable — title does not change after hydration completes', () => {
      cy.visit('/')
      cy.get('[data-testid="title"]').should('contain', 'Welcome')
      // Wait for any async work and verify the value hasn't changed
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(500)
      cy.get('[data-testid="title"]').should('contain', 'Welcome')
    })
  })

  describe('Store is consistent with rendered content', () => {
    it('store locale matches visible content language (en)', () => {
      cy.visit('/')
      cy.get('script#__i18n_store__').then(($el) => {
        const { locale } = JSON.parse($el.text())
        expect(locale).to.eq('en')
      })
      cy.get('[data-testid="title"]').should('contain', 'Welcome')
    })

    it('store locale matches visible content language (fr) after reload', () => {
      cy.visit('/')
      cy.get('[data-testid="change-locale"]').click()
      cy.reload()
      cy.get('script#__i18n_store__').then(($el) => {
        const { locale } = JSON.parse($el.text())
        expect(locale).to.eq('fr')
      })
      cy.get('[data-testid="title"]').should('contain', 'Bienvenue')
    })
  })
})
