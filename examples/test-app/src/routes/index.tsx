import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation, useLocale, useChangeLocale } from 'tanstack-start-i18next'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { t } = useTranslation('common')
  const locale = useLocale()
  const changeLocale = useChangeLocale()

  const isFr = locale === 'fr'

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 data-testid="title">{t('title')}</h1>
      <p data-testid="description">{t('description')}</p>
      <p data-testid="current-locale">{t('currentLocale', { locale })}</p>

      <hr style={{ margin: '1.5rem 0' }} />

      <h2 data-testid="greeting">{t('greeting')}</h2>
      <p data-testid="intro">{t('intro')}</p>

      <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <button
          data-testid="change-locale"
          onClick={() => changeLocale(isFr ? 'en' : 'fr')}
          style={{ padding: '0.5rem 1rem', fontSize: '1rem', cursor: 'pointer' }}
        >
          {isFr ? t('switchToEnglish') : t('switchToFrench')}
        </button>

        <Link
          to="/about"
          data-testid="nav-about"
          style={{ padding: '0.5rem 1rem', fontSize: '1rem', textDecoration: 'none', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          {t('goToAbout')}
        </Link>
      </div>
    </div>
  )
}
