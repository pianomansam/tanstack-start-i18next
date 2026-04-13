import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'tanstack-start-i18next'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  const { t } = useTranslation('common')

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 data-testid="about-title">{t('aboutTitle')}</h1>
      <p data-testid="about-description">{t('aboutDescription')}</p>

      <div style={{ marginTop: '1.5rem' }}>
        <Link
          to="/"
          data-testid="nav-home"
          style={{ padding: '0.5rem 1rem', fontSize: '1rem', textDecoration: 'none', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          {t('backToHome')}
        </Link>
      </div>
    </div>
  )
}
