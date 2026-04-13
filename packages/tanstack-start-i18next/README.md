# tanstack-start-i18next

**The easiest way to translate your TanStack Start apps.**

`tanstack-start-i18next` is a thin layer on top of i18next and [react-i18next](https://react.i18next.com) that handles the TanStack Start-specific wiring — request middleware, per-request server instances, server-to-client state serialization — so you don't have to.

Standard `react-i18next` [SSR support](https://react.i18next.com/latest/ssr) is based on generic hydration and is not sufficient for TanStack Start's server-first architecture. This library follows the same model as [next-i18next](https://next.i18next.com) and [i18next-http-middleware](https://github.com/i18next/i18next-http-middleware): **per-request i18next instances on the server**, with the resolved locale and loaded translations serialized into the router context and hydrated on the client.

---

## Table of Contents

- [How It Works](#how-it-works)
- [Setup](#setup)
  - [1. Install](#1-install)
  - [2. Translation Files](#2-translation-files)
  - [3. Configuration](#3-configuration)
  - [4. Request Middleware](#4-request-middleware)
  - [5. Router Context](#5-router-context)
  - [6. Client Entry](#6-client-entry)
  - [7. Root Route](#7-root-route)
  - [8. Components and Pages](#8-components-and-pages)
- [The Trans Component](#the-trans-component)
- [Locale Detection](#locale-detection)
- [Namespace Splitting Per Route](#namespace-splitting-per-route)
- [Language Switching](#language-switching)
- [i18next Plugins](#i18next-plugins)
  - [Save-Missing Keys with i18next-http-backend](#save-missing-keys-with-i18next-http-backend)
  - [createAddMissingHandler](#createaddmissinghandler)
- [Remote Translation Files](#remote-translation-files)
- [Testing](#testing)
- [API Reference](#api-reference)
- [Config Options](#config-options)

---

## How It Works

1. **Per-request server instance** — On every SSR request, `createI18nMiddleware` creates a fresh `i18next` instance using `i18next.createInstance()`. This avoids shared mutable state between concurrent requests.
2. **Locale detection** — The middleware detects the user's locale from the request: cookie first, then `Accept-Language` header, then URL path segment. Falls back to `fallbackLng`.
3. **Router context** — The resolved `locale`, the `i18n` instance, and a serializable `i18nStore` (the loaded translation resources) are injected into the TanStack Router context via `next({ context: { ... } })`.
4. **Client hydration** — `I18nScript` embeds the resolved locale and translation resources as JSON in the server-rendered HTML. In the client entry, `hydrateI18n(config)` reads that JSON and initializes a matching i18next instance before React's `hydrateRoot` runs — no async fetch, no hydration mismatch.
5. **React integration** — `I18nProvider` wraps the app, making `useTranslation`, `Trans`, `useLocale`, and `useChangeLocale` available in all route components.

---

## Setup

### 1. Install

```bash
npm install tanstack-start-i18next i18next react-i18next
# or
pnpm add tanstack-start-i18next i18next react-i18next
```

### 2. Translation Files

Place JSON translation files in `public/locales/`:

```
public/
└── locales/
    ├── en/
    │   ├── common.json
    │   └── home.json
    └── fr/
        ├── common.json
        └── home.json
```

Example `public/locales/en/common.json`:

```json
{
  "title": "Welcome",
  "description": "Hello from TanStack Start!"
}
```

### 3. Configuration

Create `src/i18n.ts`:

```ts
import { defineI18nConfig } from 'tanstack-start-i18next'
import fs from 'node:fs/promises'
import path from 'node:path'

export const i18nConfig = defineI18nConfig({
  supportedLngs: ['en', 'fr'],
  fallbackLng: 'en',
  ns: ['common', 'home'],
  defaultNS: 'common',
  loadTranslations: async (locale, namespace) => {
    // On the server: read from the filesystem
    if (typeof window === 'undefined') {
      const filePath = path.join(
        process.cwd(),
        'public',
        'locales',
        locale,
        `${namespace}.json`,
      )
      const content = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(content)
    }
    // On the client: fetch from the public directory
    const res = await fetch(`/locales/${locale}/${namespace}.json`)
    return res.json()
  },
})
```

`loadTranslations` is intentionally user-provided. This gives you full flexibility: read from the filesystem, fetch from a CDN, import dynamically, or use any i18next backend. See [Remote Translation Files](#remote-translation-files) for CDN and caching patterns.

### 4. Request Middleware

Create `src/start.ts` (TanStack Start's global middleware entry point):

```ts
import { createStart } from '@tanstack/react-start'
import { createI18nMiddleware } from 'tanstack-start-i18next'
import { i18nConfig } from './i18n'

export const startInstance = createStart(() => ({
  requestMiddleware: [createI18nMiddleware(i18nConfig)],
}))
```

`createI18nMiddleware` runs on every request. It detects the locale, creates a per-request i18next instance, loads the default namespace translations, and injects `{ i18n, locale, i18nStore }` into the router context.

### 5. Router Context

Update `src/router.tsx` to tell TanStack Router the shape of the context:

```tsx
import { createRouter } from '@tanstack/react-router'
import type { I18nContext } from 'tanstack-start-i18next'
import { routeTree } from './routeTree.gen'

export function getRouter() {
  return createRouter({
    routeTree,
    scrollRestoration: true,
    // Placeholder — real values are injected by createI18nMiddleware on each request
    context: {} as I18nContext,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
```

### 6. Client Entry

Create (or update) `src/client.tsx` — the browser entry point that TanStack Start uses to hydrate the server-rendered HTML:

```tsx
import { StartClient } from '@tanstack/react-start/client'
import { StrictMode } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { hydrateI18n } from 'tanstack-start-i18next'
import { i18nConfig } from './i18n'

// Restore the locale + translations the server embedded in the HTML before
// React hydrates, so every useTranslation() call finds the correct state.
await hydrateI18n(i18nConfig)

hydrateRoot(
  document,
  <StrictMode>
    <StartClient />
  </StrictMode>,
)
```

`hydrateI18n` reads the `<script id="__i18n_store__">` element rendered by `I18nScript` (added in the next step), parses the embedded JSON, and initializes i18next synchronously before React's `hydrateRoot` runs. This ensures translations are available during the first render pass and prevents any hydration mismatch.

### 7. Root Route

Update `src/routes/__root.tsx` to wrap the app with `I18nProvider` and embed the i18n state with `I18nScript`:

```tsx
import type { ReactNode } from 'react'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { getI18n } from 'react-i18next'
import type { I18nContext } from 'tanstack-start-i18next'
import { I18nProvider, I18nScript } from 'tanstack-start-i18next'

export const Route = createRootRouteWithContext<I18nContext>()({
  component: RootComponent,
})

function RootComponent() {
  // getI18n() returns the instance set by the middleware (server) or by
  // hydrateI18n in client.tsx (client) — works correctly on both sides.
  const i18n = getI18n()!

  return (
    <I18nProvider i18n={i18n}>
      <RootDocument>
        <Outlet />
      </RootDocument>
    </I18nProvider>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <I18nScript />
        <Scripts />
      </body>
    </html>
  )
}
```

`I18nScript` renders a `<script type="application/json" id="__i18n_store__">` tag containing the current locale and all loaded translation resources. `hydrateI18n` reads this tag on the client to hydrate without any additional network requests.

> **Why `getI18n()` instead of `Route.useRouteContext()`?**
> The middleware injects the `i18n` instance into the router context server-side, but i18next instances are not serializable so they cannot cross the SSR boundary. `getI18n()` reads from the react-i18next global, which is populated by the middleware on the server and by `hydrateI18n` on the client — making it the correct source on both sides.

### 8. Components and Pages

Use `useTranslation` exactly as you would with react-i18next:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'tanstack-start-i18next'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { t } = useTranslation('common')
  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('description')}</p>
    </main>
  )
}
```

---

## The Trans Component

`<Trans>` is re-exported from `react-i18next` and works fully with this library — including SSR. Because `I18nProvider` wraps `I18nextProvider`, `Trans` automatically uses the correct i18next instance on both the server and the client.

Use `Trans` whenever your translation values need to contain inline HTML elements, React components, or interpolated JSX.

### Basic usage

```tsx
import { Trans } from 'tanstack-start-i18next'
```

Or directly from `react-i18next` — both import the same component.

### Natural language keying (no i18nKey)

You can omit `i18nKey` entirely. When you do, `Trans` uses the text content of its children as the lookup key:

```tsx
<Trans ns="common">Welcome</Trans>
```

i18next looks up the key `"Welcome"` in the `common` namespace and renders the translated value. If the key is missing it falls back to the literal children text. This pattern — known as natural language keying — lets you write readable JSX without inventing key names:

```json
// en/common.json — the English text is both the key and the value
{ "Welcome": "Welcome" }

// fr/common.json — same key, translated value
{ "Welcome": "Bienvenue" }
```

Interpolation works the same way:

```tsx
<Trans ns="common" values={{ count: 5 }}>
  {'You have {{count}} unread messages'}
</Trans>
```

```json
{ "You have {{count}} unread messages": "You have {{count}} unread messages" }
// fr:
{ "You have {{count}} unread messages": "Vous avez {{count}} messages non lus" }
```

> Note: the string must be wrapped in `{' '}` (a JSX expression) rather than written as raw JSX text when it contains `{{` — otherwise JSX parsers may mishandle the curly braces.

### Embedding HTML elements

Define your translation value with named component tags:

```json
// en/common.json
{
  "welcome": "Welcome to <bold>TanStack Start</bold> with <italic>i18next</italic>."
}
```

Then render it with `Trans`, mapping each tag name to a React element via the `components` prop. The element you provide is just the wrapper — its text content comes from the translation value, not from your JSX:

```tsx
<Trans
  i18nKey="welcome"
  ns="common"
  components={{
    bold: <strong />,
    italic: <em />,
  }}
/>
```

Output: `Welcome to <strong>TanStack Start</strong> with <em>i18next</em>.`

### Embedding links and interactive components

```json
{
  "visitDocs": "Read the <docsLink>i18next documentation</docsLink> to learn more."
}
```

```tsx
<Trans
  i18nKey="visitDocs"
  ns="common"
  components={{
    docsLink: (
      <a href="https://www.i18next.com" target="_blank" rel="noreferrer" />
    ),
  }}
/>
```

### Interpolation inside Trans

You can combine component tags with interpolation variables:

```json
{
  "greeting": "Hello, <bold>{{name}}</bold>! You have <count>{{count}} messages</count>."
}
```

```tsx
<Trans
  i18nKey="greeting"
  ns="common"
  values={{ name: 'Alice', count: 3 }}
  components={{
    bold: <strong />,
    count: <span style={{ color: 'red' }} />,
  }}
/>
```

### SSR behavior

`Trans` renders synchronously on the server using the translations already loaded by `createI18nMiddleware`. No additional data fetching or special setup is required — it works the same way `t()` does.

> For the full `Trans` API (plural forms, context, `tOptions`, etc.) see the [react-i18next Trans documentation](https://react.i18next.com/latest/trans-component).

---

## Locale Detection

By default, the middleware detects the locale in this order:

1. **Cookie** — reads the `i18next` cookie (set on previous visits or by `useChangeLocale`)
2. **`Accept-Language` header** — parses the browser's language preference
3. **URL path segment** — reads the first path segment (e.g., `/fr/about` → `fr`)

You can customize the order and cookie name in your config:

```ts
defineI18nConfig({
  // ...
  detection: {
    order: ['path', 'cookie', 'header'], // check URL path first
    cookieName: 'my_locale',             // custom cookie name
    pathIndex: 0,                        // which URL segment holds the locale
  },
})
```

The detected locale is always validated against `supportedLngs`. If no match is found, `fallbackLng` is used. The resolved locale is also written back into the cookie so subsequent requests skip header/path detection.

---

## Namespace Splitting Per Route

By default, only the `defaultNamespace` is loaded for every request. For routes that need additional namespaces, load them in the route's `beforeLoad`:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'tanstack-start-i18next'
import { createServerFn } from '@tanstack/react-start'
import { i18nConfig } from '../i18n'
import { createServerI18nInstance } from 'tanstack-start-i18next'

const loadDashboardTranslations = createServerFn({ method: 'GET' })
  .validator((locale: string) => locale)
  .handler(async ({ data: locale }) => {
    const { initialStore } = await createServerI18nInstance(
      i18nConfig,
      locale,
      ['dashboard'],
    )
    return initialStore
  })

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async ({ context }) => {
    const extra = await loadDashboardTranslations({ data: context.locale })
    // Merge the extra namespace into the i18n instance
    Object.entries(extra[context.locale] ?? {}).forEach(([ns, resources]) => {
      context.i18n.addResourceBundle(context.locale, ns, resources)
    })
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { t } = useTranslation('dashboard')
  return <h1>{t('title')}</h1>
}
```

---

## Language Switching

Use `useChangeLocale` to switch languages on the client. It updates the i18next instance and sets the locale cookie so the server uses the new locale on the next request:

```tsx
import { useLocale, useChangeLocale } from 'tanstack-start-i18next'

function LanguageSwitcher() {
  const locale = useLocale()
  const changeLocale = useChangeLocale()

  return (
    <div>
      <span>Current: {locale}</span>
      <button onClick={() => changeLocale('en')}>English</button>
      <button onClick={() => changeLocale('fr')}>Français</button>
    </div>
  )
}
```

After `changeLocale` is called, the cookie is updated. On the next full navigation or page reload, the server middleware picks up the cookie and renders in the new locale.

---

## i18next Plugins

`I18nConfig` accepts a `plugins` field — an array of i18next plugins registered via `.use()` before each instance is initialized. This is identical to the standard i18next plugin API and accepts any plugin that `i18n.use()` accepts: class-style plugins, object plugins, or pre-instantiated modules.

```ts
import { defineI18nConfig } from 'tanstack-start-i18next'
import SomePlugin from 'some-i18next-plugin'

export const i18nConfig = defineI18nConfig({
  // ...
  plugins: [SomePlugin],
})
```

Plugins are applied to **both server and client instances**. If a plugin only makes sense in one environment (e.g. an HTTP backend for save-missing), it should either guard against the wrong runtime internally, or be conditionally included:

```ts
plugins: typeof window !== 'undefined' ? [ClientOnlyPlugin] : [],
```

### Save-Missing Keys with i18next-http-backend

A common use of `plugins` is wiring up [`i18next-http-backend`](https://github.com/i18next/i18next-http-backend) to report missing translation keys to a server endpoint during development. When a `t()` call or `<Trans>` encounters a key that doesn't exist, i18next POSTs it to your `addPath` URL so you can persist it to your translation files.

#### 1. Install

```bash
pnpm add i18next-http-backend
```

#### 2. Configure

```ts
import { defineI18nConfig } from 'tanstack-start-i18next'
import HttpBackend from 'i18next-http-backend'

export const i18nConfig = defineI18nConfig({
  supportedLngs: ['en', 'fr'],
  fallbackLng: 'en',
  ns: ['common'],
  defaultNS: 'common',
  loadTranslations: async (locale, namespace) => {
    // loadTranslations still handles loading — i18next-http-backend is only
    // used here for its addPath (save-missing) capability
    if (typeof window === 'undefined') {
      const { default: fs } = await import('node:fs/promises')
      const { default: path } = await import('node:path')
      const filePath = path.join(process.cwd(), 'public', 'locales', locale, `${namespace}.json`)
      return JSON.parse(await fs.readFile(filePath, 'utf-8'))
    }
    const res = await fetch(`/locales/${locale}/${namespace}.json`)
    return res.json()
  },
  // Register the plugin so it's wired into every i18next instance
  plugins: [HttpBackend],
  // Standard i18next-http-backend options (passed through InitOptions)
  backend: {
    addPath: '/api/i18n/add/{{lng}}/{{ns}}',
  },
  saveMissing: true,
})
```

#### 3. Add the server-side route

Use `createAddMissingHandler` to create the endpoint that receives missing key reports. See [createAddMissingHandler](#createaddmissinghandler) below.

### createAddMissingHandler

`createAddMissingHandler` returns a framework-agnostic `(Request, params) => Promise<Response>` handler that receives missing key POSTs from `i18next-http-backend` (or any compatible client) and calls your `onMissingKey` callback for each key.

```ts
import { createAddMissingHandler } from 'tanstack-start-i18next'
import fs from 'node:fs/promises'
import path from 'node:path'

const handler = createAddMissingHandler({
  async onMissingKey(locale, namespace, key, fallbackValue) {
    const filePath = path.join(
      process.cwd(),
      'public',
      'locales',
      locale,
      `${namespace}.json`,
    )
    const translations = JSON.parse(await fs.readFile(filePath, 'utf-8'))
    if (!(key in translations)) {
      translations[key] = fallbackValue
      await fs.writeFile(filePath, JSON.stringify(translations, null, 2))
    }
  },
})
```

Wire it into a TanStack Start API route at the path your `addPath` template resolves to:

```ts
// src/routes/api/i18n/add.$lng.$ns.ts
import { createAPIFileRoute } from '@tanstack/react-start/api'
import { handler } from '../../../i18n-add-handler' // wherever you defined it

export const APIRoute = createAPIFileRoute('/api/i18n/add/$lng/$ns')({
  POST: ({ request, params }) => handler(request, params),
})
```

The handler:
- Reads `lng` and `ns` from the `params` object (URL path parameters)
- Parses the POST body as `{ [missingKey]: fallbackValue }`
- Calls `onMissingKey` for each entry
- Returns `204 No Content` on success, `400 Bad Request` if the body is malformed

> `createAddMissingHandler` is intentionally framework-agnostic — it works with any server that uses the Web `Request`/`Response` API.

---

## Remote Translation Files

`loadTranslations` works equally well with remote files. Because it is a plain `async` function, you can fetch from a CDN, a translation management system, or any HTTP endpoint — on both server and client.

### Basic remote fetch

```ts
export const i18nConfig = defineI18nConfig({
  supportedLngs: ['en', 'fr'],
  fallbackLng: 'en',
  ns: ['common'],
  loadTranslations: async (locale, namespace) => {
    const res = await fetch(
      `https://cdn.example.com/locales/${locale}/${namespace}.json`,
    )
    if (!res.ok) throw new Error(`Failed to load translations: ${res.status}`)
    return res.json()
  },
})
```

Node 18+ has native `fetch`, so this runs on the server without any additional dependencies.

### Adding an in-memory cache

Without a cache, every SSR request fetches from the remote URL. For high-traffic apps this adds latency and puts unnecessary load on the translation CDN. A simple module-level `Map` fixes this:

```ts
import { defineI18nConfig } from 'tanstack-start-i18next'

const translationCache = new Map<string, Record<string, unknown>>()

export const i18nConfig = defineI18nConfig({
  supportedLngs: ['en', 'fr'],
  fallbackLng: 'en',
  ns: ['common'],
  loadTranslations: async (locale, namespace) => {
    const key = `${locale}:${namespace}`

    const cached = translationCache.get(key)
    if (cached) return cached

    const res = await fetch(
      `https://cdn.example.com/locales/${locale}/${namespace}.json`,
    )
    if (!res.ok) throw new Error(`Failed to load translations: ${res.status}`)

    const data = await res.json()
    translationCache.set(key, data)
    return data
  },
})
```

The cache lives for the lifetime of the server process. On the first request for each `locale + namespace` combination the file is fetched; every subsequent request is served from memory.

### Cache invalidation

To expire cached translations (e.g., after a deploy or on a schedule), clear the cache map:

```ts
// Clear a single entry
translationCache.delete('fr:common')

// Clear everything
translationCache.clear()
```

For time-based expiry, store entries with a timestamp:

```ts
interface CacheEntry {
  data: Record<string, unknown>
  fetchedAt: number
}

const TTL_MS = 60 * 60 * 1000 // 1 hour
const translationCache = new Map<string, CacheEntry>()

loadTranslations: async (locale, namespace) => {
  const key = `${locale}:${namespace}`
  const entry = translationCache.get(key)

  if (entry && Date.now() - entry.fetchedAt < TTL_MS) {
    return entry.data
  }

  const res = await fetch(
    `https://cdn.example.com/locales/${locale}/${namespace}.json`,
  )
  if (!res.ok) throw new Error(`Failed to load translations: ${res.status}`)

  const data = await res.json()
  translationCache.set(key, { data, fetchedAt: Date.now() })
  return data
}
```

---

## Testing

### Unit tests

The library ships with [Vitest](https://vitest.dev) unit tests covering locale detection, the server instance factory, client hydration, config, and the add-missing handler. Run them from the repo root:

```bash
pnpm test
# or target the package directly
pnpm --filter tanstack-start-i18next test
```

### End-to-end tests (Cypress)

The [example app](examples/test-app) includes [Cypress](https://www.cypress.io) E2E specs that cover:

- **Locale switching** — visiting the home page in English, navigating to About, switching to French, verifying translated content, and switching back
- **SSR verification** — using `cy.request()` to confirm translations are baked into the server-rendered HTML (not added by client JavaScript), and that `__i18n_store__` is present with correct locale and resource data
- **Cookie behaviour** — cookie is set on first visit, updated when the locale changes, and drives locale selection on reload
- **Hydration** — `__i18n_store__` element is present in the live DOM with valid JSON, the embedded locale matches the rendered content, and translations are visible immediately with no flash

To run the E2E tests:

```bash
# 1. Start the example app dev server
pnpm dev --filter test-app

# 2. In a second terminal, run Cypress headlessly
pnpm cy:run --filter test-app

# Or open the interactive Cypress UI
pnpm cy:open --filter test-app
```

To run the dev server and Cypress together in a single command (requires the `start-server-and-test` dev dependency, already included):

```bash
pnpm test:e2e --filter test-app
```

---

## API Reference

### `tanstack-start-i18next` (main export)

| Export | Description |
|---|---|
| `defineI18nConfig(config)` | Type-safe config helper |
| `createI18nMiddleware(config)` | TanStack Start request middleware for locale detection and per-request i18next setup |
| `createServerI18nInstance(config, locale, namespaces)` | Create an isolated i18next instance with loaded translations (server-only) |
| `hydrateI18n(config)` | Read the embedded `__i18n_store__` script and initialize the client i18next instance before `hydrateRoot`. Use in `client.tsx`. |
| `initClientI18n(config, locale, store)` | Lower-level client initializer — use `hydrateI18n` unless you need to supply the locale/store manually |
| `I18nScript` | React component that renders `<script id="__i18n_store__">` with the current locale and resources. Place before `<Scripts />` in your root route. |
| `I18nProvider` | React context provider wrapping `react-i18next`'s `I18nextProvider` |
| `useTranslation` | Re-exported from `react-i18next` |
| `Trans` | Re-exported from `react-i18next`. Renders translation values that contain inline JSX components. Works on server and client. |
| `useLocale()` | Returns the current locale string |
| `useChangeLocale()` | Returns a function to change locale and persist it in a cookie |
| `createAddMissingHandler(config)` | Creates a `(Request, params) => Response` handler for the i18next `addPath` endpoint |
| `detectLocale(config, ctx)` | Lower-level locale detection (exposed for custom scenarios) |
| `I18nConfig` | TypeScript config type |
| `I18nContext` | TypeScript type for the router context shape (`{ i18n, locale, i18nStore }`) |
| `AddMissingConfig` | TypeScript type for `createAddMissingHandler` options |

---

## Config Options

| Option | Default | Description |
|---|---|---|
| `supportedLngs` | *required* | Allowlist of supported locale codes, e.g. `['en', 'fr']`. Pass `false` to allow all locales |
| `fallbackLng` | *required* | Locale used when detection finds no match **and** as the i18next fallback for missing translation keys. Narrowed to `string` so it can serve both roles |
| `ns` | *required* | All available translation namespaces, e.g. `['common', 'home']` |
| `defaultNS` | first in `namespaces` | Namespace loaded on every request and used when no namespace is specified in `t()` |
| `fallbackNS` | — | Namespace(s) to look in when a key is missing from the active namespace |
| `loadTranslations` | *required* | `(locale, namespace) => Promise<object>` — called server-side during SSR and client-side for dynamic namespace loading |
| `plugins` | `[]` | i18next plugins to register via `.use()` before each instance is initialized. Applied to both server and client instances. |
| `detection.order` | `['cookie', 'header']` | Detection strategies in priority order: `'path'`, `'cookie'`, `'header'` |
| `detection.cookieName` | `'i18next'` | Cookie name for locale persistence |
| `detection.pathIndex` | `0` | URL path segment index containing the locale (for `'path'` detection) |
| *(any `InitOptions` key)* | i18next defaults | `I18nConfig` extends i18next's `InitOptions`, so all standard i18next options (`debug`, `load`, `interpolation`, `backend`, `saveMissing`, `pluralSeparator`, etc.) are valid at the top level |
