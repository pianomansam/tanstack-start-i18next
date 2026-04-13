/**
 * SSR spec — verifies that translations are baked into server-rendered HTML,
 * not added by client-side JavaScript after hydration.
 * Uses cy.request() to get the raw HTML before any JS runs.
 */
describe('Server-side rendering', () => {
  describe('Default locale (en)', () => {
    it('SSR HTML contains the English title', () => {
      cy.request('/').its('body').should('include', 'Welcome')
    })

    it('SSR HTML contains the English greeting', () => {
      cy.request('/').its('body').should('include', 'Hello!')
    })

    it('SSR HTML contains the about page title in English', () => {
      cy.request('/about').its('body').should('include', 'About')
    })
  })

  describe('French locale via cookie', () => {
    it('SSR HTML contains French title when i18next cookie is fr', () => {
      cy.request({
        url: '/',
        headers: { Cookie: 'i18next=fr' },
      })
        .its('body')
        .should('include', 'Bienvenue')
    })

    it('SSR HTML contains French greeting when i18next cookie is fr', () => {
      cy.request({
        url: '/',
        headers: { Cookie: 'i18next=fr' },
      })
        .its('body')
        .should('include', 'Bonjour')
    })

    it('SSR HTML does NOT contain English title when locale is fr', () => {
      cy.request({
        url: '/',
        headers: { Cookie: 'i18next=fr' },
      })
        .its('body')
        .should('not.include', '>Welcome<')
        .and('include', 'Bienvenue')
    })

    it('SSR /about contains French about title when cookie is fr', () => {
      cy.request({
        url: '/about',
        headers: { Cookie: 'i18next=fr' },
      })
        .its('body')
        .should('include', 'propos')
    })
  })

  describe('French locale via Accept-Language header', () => {
    it('SSR HTML contains French title when Accept-Language is fr', () => {
      cy.request({
        url: '/',
        headers: { 'Accept-Language': 'fr,en;q=0.9' },
      })
        .its('body')
        .should('include', 'Bienvenue')
    })
  })

  describe('Unsupported locale falls back to default', () => {
    it('SSR HTML contains English title for an unsupported locale', () => {
      cy.request({
        url: '/',
        headers: { Cookie: 'i18next=ja' },
      })
        .its('body')
        .should('include', 'Welcome')
    })
  })

  describe('I18nScript — embedded i18n store', () => {
    it('SSR HTML contains the __i18n_store__ script element', () => {
      cy.request('/').its('body').should('include', '__i18n_store__')
    })

    it('__i18n_store__ contains valid JSON with locale and resources keys', () => {
      cy.request('/').its('body').then((body: string) => {
        const match = body.match(/<script[^>]+id="__i18n_store__"[^>]*>([^<]*)<\/script>/)
        expect(match).to.not.be.null
        const data = JSON.parse(match![1])
        expect(data).to.have.property('locale')
        expect(data).to.have.property('resources')
      })
    })

    it('__i18n_store__ embeds locale "en" for a default request', () => {
      cy.request('/').its('body').then((body: string) => {
        const match = body.match(/<script[^>]+id="__i18n_store__"[^>]*>([^<]*)<\/script>/)
        const data = JSON.parse(match![1])
        expect(data.locale).to.eq('en')
      })
    })

    it('__i18n_store__ embeds locale "fr" when cookie is fr', () => {
      cy.request({ url: '/', headers: { Cookie: 'i18next=fr' } }).its('body').then((body: string) => {
        const match = body.match(/<script[^>]+id="__i18n_store__"[^>]*>([^<]*)<\/script>/)
        const data = JSON.parse(match![1])
        expect(data.locale).to.eq('fr')
      })
    })

    it('__i18n_store__ includes translation resources for the active locale', () => {
      cy.request('/').its('body').then((body: string) => {
        const match = body.match(/<script[^>]+id="__i18n_store__"[^>]*>([^<]*)<\/script>/)
        const data = JSON.parse(match![1])
        expect(data.resources).to.have.property('en')
        expect(data.resources.en).to.have.property('common')
      })
    })
  })
})
