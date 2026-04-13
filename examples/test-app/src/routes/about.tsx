import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation, Trans } from 'tanstack-start-i18next'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  const { t } = useTranslation('common')

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1 data-testid="about-title">{t('aboutTitle')}</h1>
      <p data-testid="about-description">{t('aboutDescription')}</p>

      {/* ── Trans examples ──────────────────────────────────────────────── */}
      <hr style={{ margin: '1.5rem 0' }} />
      <h2>{t('transHeading')}</h2>
      <p>{t('transIntro')}</p>

      {/*
        Natural language keying: no i18nKey prop. The children text "Welcome"
        is used as the lookup key directly. Switch to French to see it resolve
        to "Bienvenue" — same key, different locale.
      */}
      <p data-testid="trans-natural-key">
        <Trans ns="common">Welcome</Trans>
      </p>

      {/*
        Natural language keying with interpolation: the full sentence including
        the {{count}} placeholder is the key. Values are passed via the
        `values` prop just like with i18nKey.
      */}
      <p data-testid="trans-natural-interpolation">
        <Trans ns="common" values={{ count: 5 }}>
          {'You have {{count}} unread messages'}
        </Trans>
      </p>

      {/*
        Inline JSX components: the translation value contains named tags like
        <bold> and <italic>. Trans maps each tag name to the corresponding
        React element via the `components` prop.
      */}
      <p data-testid="trans-built-with">
        <Trans
          i18nKey="builtWith"
          ns="common"
          components={{
            bold: <strong />,
            italic: <em />,
          }}
        />
      </p>

      {/*
        Link component: the translation contains a <docsLink> tag that becomes
        an anchor. The text content inside the tag comes from the translation
        value, not from the JSX — the element passed here is just the wrapper.
      */}
      <p data-testid="trans-visit-docs">
        <Trans
          i18nKey="visitDocs"
          ns="common"
          components={{
            docsLink: (
              <a
                href="https://www.i18next.com"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'inherit' }}
              />
            ),
          }}
        />
      </p>

      <div style={{ marginTop: '1.5rem' }}>
        <Link
          to="/"
          data-testid="nav-home"
          style={{
            padding: '0.5rem 1rem',
            fontSize: '1rem',
            textDecoration: 'none',
            border: '1px solid #ccc',
            borderRadius: '4px',
          }}
        >
          {t('backToHome')}
        </Link>
      </div>
    </div>
  )
}
