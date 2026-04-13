/**
 * Server-side handler for the i18next `addPath` endpoint.
 *
 * `i18next-http-backend` (and compatible plugins) POST missing translation keys
 * to an `addPath` URL such as `/api/i18n/add/{{lng}}/{{ns}}`.  This helper
 * creates a framework-agnostic `(Request, params) => Promise<Response>` handler
 * you can drop into any TanStack Start API route (or any other Web-API-compatible
 * server) to receive those reports and persist them however you like.
 *
 * @example TanStack Start API route
 * ```ts
 * // src/routes/api/i18n/add.$lng.$ns.ts
 * import { createAPIFileRoute } from '@tanstack/react-start/api'
 * import { createAddMissingHandler } from 'tanstack-start-i18next'
 * import fs from 'node:fs/promises'
 * import path from 'node:path'
 *
 * const handler = createAddMissingHandler({
 *   async onMissingKey(locale, namespace, key, fallbackValue) {
 *     const filePath = path.join(process.cwd(), 'public', 'locales', locale, `${namespace}.json`)
 *     const translations = JSON.parse(await fs.readFile(filePath, 'utf-8'))
 *     if (!(key in translations)) {
 *       translations[key] = fallbackValue
 *       await fs.writeFile(filePath, JSON.stringify(translations, null, 2))
 *     }
 *   },
 * })
 *
 * export const APIRoute = createAPIFileRoute('/api/i18n/add/$lng/$ns')({
 *   POST: ({ request, params }) => handler(request, params),
 * })
 * ```
 */

export interface AddMissingConfig {
  /**
   * Called once for each missing key in the POST body.
   *
   * @param locale       - The language code extracted from the URL (e.g. `'en'`)
   * @param namespace    - The i18next namespace extracted from the URL (e.g. `'common'`)
   * @param key          - The missing translation key (e.g. `'home.title'`)
   * @param fallbackValue - The fallback value sent by i18next (often an empty string)
   */
  onMissingKey: (
    locale: string,
    namespace: string,
    key: string,
    fallbackValue: string,
  ) => Promise<void>
}

/**
 * Create a handler for the i18next `addPath` endpoint.
 *
 * The handler expects:
 * - `lng` and `ns` to be available as URL path parameters (passed via `params`)
 * - a JSON request body of the shape `{ [missingKey]: fallbackValue }`
 *
 * It calls `config.onMissingKey` for every key in the body and returns a
 * `204 No Content` on success, or `400 Bad Request` if the body is not valid JSON.
 */
export function createAddMissingHandler(config: AddMissingConfig) {
  return async (
    request: Request,
    params: Record<string, string>,
  ): Promise<Response> => {
    const { lng, ns } = params

    let body: Record<string, string>
    try {
      body = await request.json()
    } catch {
      return new Response('Invalid JSON body', { status: 400 })
    }

    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
      return new Response('Body must be a JSON object', { status: 400 })
    }

    await Promise.all(
      Object.entries(body).map(([key, fallbackValue]) =>
        config.onMissingKey(lng, ns, key, String(fallbackValue ?? '')),
      ),
    )

    return new Response(null, { status: 204 })
  }
}
