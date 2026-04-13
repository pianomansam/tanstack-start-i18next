/**
 * Cookie spec — verifies that the locale cookie is set, updated on language
 * switch, and that the cookie drives locale selection on reload.
 */
describe('Locale cookie behaviour', () => {
  describe('Cookie is set on first visit', () => {
    it('sets the i18next cookie when visiting the home page', () => {
      cy.visit('/')
      cy.getCookie('i18next').should('exist')
    })

    it('sets the cookie value to the default locale (en)', () => {
      cy.visit('/')
      cy.getCookie('i18next').its('value').should('eq', 'en')
    })
  })

  describe('Cookie updates when locale is switched', () => {
    it('updates the cookie to fr after switching to French', () => {
      cy.visit('/')
      cy.get('[data-testid="change-locale"]').click()
      cy.getCookie('i18next').its('value').should('eq', 'fr')
    })

    it('updates cookie back to en after switching to English again', () => {
      cy.visit('/')
      cy.get('[data-testid="change-locale"]').click() // → fr
      cy.get('[data-testid="change-locale"]').click() // → en
      cy.getCookie('i18next').its('value').should('eq', 'en')
    })
  })

  describe('Cookie drives locale on page reload', () => {
    it('reloads in French when cookie is fr', () => {
      cy.visit('/')
      cy.get('[data-testid="change-locale"]').click()
      cy.getCookie('i18next').its('value').should('eq', 'fr')
      cy.reload()
      cy.get('[data-testid="title"]').should('contain', 'Bienvenue')
    })

    it('reloads in English when cookie is en', () => {
      cy.visit('/')
      cy.reload()
      cy.get('[data-testid="title"]').should('contain', 'Welcome')
    })
  })

  describe('Cookie persists across navigation', () => {
    it('keeps fr cookie after navigating to About and back', () => {
      cy.visit('/')
      cy.get('[data-testid="change-locale"]').click()
      cy.get('[data-testid="nav-about"]').click()
      cy.getCookie('i18next').its('value').should('eq', 'fr')
      cy.get('[data-testid="nav-home"]').click()
      cy.getCookie('i18next').its('value').should('eq', 'fr')
    })
  })
})
