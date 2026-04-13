/**
 * Locale switching spec — mirrors next-i18next's main Cypress spec.
 * Tests: default English display, navigation, locale switching, persistence across pages.
 */
describe('Locale switching', () => {
  describe('Home page — default locale (en)', () => {
    beforeEach(() => {
      cy.visit('/')
    })

    it('displays English title on home page', () => {
      cy.get('[data-testid="title"]').should('contain', 'Welcome')
    })

    it('displays English greeting', () => {
      cy.get('[data-testid="greeting"]').should('contain', 'Hello!')
    })

    it('shows the switch-to-French button', () => {
      cy.get('[data-testid="change-locale"]').should('contain', 'Switch to French')
    })

    it('shows a link to the about page', () => {
      cy.get('[data-testid="nav-about"]').should('be.visible')
    })
  })

  describe('Navigating to About page in English', () => {
    beforeEach(() => {
      cy.visit('/')
      cy.get('[data-testid="nav-about"]').click()
    })

    it('navigates to /about', () => {
      cy.location('pathname').should('eq', '/about')
    })

    it('displays English about title', () => {
      cy.get('[data-testid="about-title"]').should('contain', 'About')
    })

    it('shows the back-to-home link', () => {
      cy.get('[data-testid="nav-home"]').should('be.visible')
    })

    it('navigates back to home via link', () => {
      cy.get('[data-testid="nav-home"]').click()
      cy.location('pathname').should('eq', '/')
    })
  })

  describe('Switching to French on home page', () => {
    beforeEach(() => {
      cy.visit('/')
      cy.get('[data-testid="change-locale"]').click()
    })

    it('displays French title after switching', () => {
      cy.get('[data-testid="title"]').should('contain', 'Bienvenue')
    })

    it('displays French greeting after switching', () => {
      cy.get('[data-testid="greeting"]').should('contain', 'Bonjour')
    })

    it('shows the switch-to-English button after switching', () => {
      cy.get('[data-testid="change-locale"]').should('contain', 'anglais')
    })
  })

  describe('French locale persists on About page', () => {
    beforeEach(() => {
      cy.visit('/')
      cy.get('[data-testid="change-locale"]').click()
      cy.get('[data-testid="nav-about"]').click()
    })

    it('stays on /about in French', () => {
      cy.location('pathname').should('eq', '/about')
    })

    it('displays French about title', () => {
      cy.get('[data-testid="about-title"]').should('contain', 'propos')
    })
  })

  describe('Switching back to English from About page', () => {
    beforeEach(() => {
      // Start in French, navigate to about, come back, switch back to English
      cy.visit('/')
      cy.get('[data-testid="change-locale"]').click()
      cy.get('[data-testid="nav-about"]').click()
      cy.get('[data-testid="nav-home"]').click()
      cy.get('[data-testid="change-locale"]').click()
    })

    it('displays English title again', () => {
      cy.get('[data-testid="title"]').should('contain', 'Welcome')
    })
  })
})
