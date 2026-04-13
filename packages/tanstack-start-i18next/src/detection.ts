import type { I18nConfig } from './types'

export interface DetectionContext {
  url: string
  cookie: string | undefined
  header: string | undefined
}

/**
 * Extract locale from a URL path segment.
 * e.g. "/fr/about" with pathIndex=0 yields "fr"
 */
function detectFromPath(url: string, pathIndex: number): string | undefined {
  try {
    const pathname = new URL(url, 'http://localhost').pathname
    const segments = pathname.split('/').filter(Boolean)
    return segments[pathIndex] || undefined
  } catch {
    return undefined
  }
}

/**
 * Parse the Accept-Language header and return the best matching locale.
 * e.g. "fr-FR,fr;q=0.9,en;q=0.8" yields "fr-FR" (or its base "fr")
 */
function parseAcceptLanguage(header: string | undefined): string | undefined {
  if (!header) return undefined

  const locales = header
    .split(',')
    .map((entry) => {
      const [locale, qualityStr] = entry.trim().split(';q=')
      const quality = qualityStr ? parseFloat(qualityStr) : 1.0
      return { locale: locale.trim(), quality }
    })
    .sort((a, b) => b.quality - a.quality)

  return locales[0]?.locale || undefined
}

/**
 * Normalize a locale string for matching against supported locales.
 * Tries exact match first, then base language (e.g. "en-US" -> "en").
 */
function matchLocale(
  detected: string,
  supportedLocales: readonly string[],
): string | undefined {
  // Exact match
  if (supportedLocales.includes(detected)) return detected

  // Base language match (e.g. "en-US" -> "en")
  const base = detected.split('-')[0]
  if (supportedLocales.includes(base)) return base

  // Check if any supported locale starts with the base
  return supportedLocales.find((l) => l.split('-')[0] === base)
}

/**
 * Detect the user's locale from the request context.
 * Runs through detection strategies in order, falling back to fallbackLng.
 */
export function detectLocale(
  config: I18nConfig,
  ctx: DetectionContext,
): string {
  const order = config.detection?.order ?? ['path', 'cookie', 'header']

  for (const strategy of order) {
    let detected: string | undefined

    switch (strategy) {
      case 'path':
        detected = detectFromPath(
          ctx.url,
          config.detection?.pathIndex ?? 0,
        )
        break
      case 'cookie':
        detected = ctx.cookie || undefined
        break
      case 'header':
        detected = parseAcceptLanguage(ctx.header)
        break
    }

    if (detected) {
      // supportedLngs: false means all locales are allowed
      if (config.supportedLngs === false) return detected
      const matched = matchLocale(detected, config.supportedLngs ?? [])
      if (matched) return matched
    }
  }

  return config.fallbackLng
}
