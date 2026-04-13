# tanstack-start-i18next

**The easiest way to translate your TanStack Start apps.**

A monorepo containing `tanstack-start-i18next` — a thin layer on top of [`i18next`](https://i18next.com) and [`react-i18next`](https://react.i18next.com) that handles the TanStack Start-specific wiring: request middleware, per-request server instances, and server-to-client state serialization.

Standard `react-i18next` SSR support is based on generic hydration and is not sufficient for TanStack Start's server-first architecture. This library follows the same model as [`next-i18next`](https://next.i18next.com) and [`i18next-http-middleware`](https://github.com/i18next/i18next-http-middleware): **per-request i18next instances on the server**, with the resolved locale and loaded translations serialized into the router context and hydrated on the client.

## Monorepo Structure

```
tanstack-start-i18next/
├── packages/
│   └── tanstack-start-i18next/    # The main library package
│       ├── src/                    # Source files
│       ├── dist/                   # Built artifacts
│       └── README.md               # Full documentation
├── examples/
│   └── test-app/                   # E2E test application
├── public/                        # Shared public assets
├── src/                           # Shared source files
└── README.md                      # This file
```

## Quick Start

```bash
# Install the package
pnpm add tanstack-start-i18next i18next react-i18next

# Run the example app
pnpm dev --filter test-app

# Build the library
pnpm build
```

See the [package README](./packages/tanstack-start-i18next/README.md) for detailed setup instructions and API reference.

## Features

- **Server-Side Rendering (SSR)**: Per-request i18next instances avoid shared mutable state
- **Zero Hydration Mismatch**: Server-embedded translations hydrate synchronously on the client
- **Locale Detection**: Cookie → Accept-Language → URL path (customizable)
- **Namespace Splitting**: Load different namespaces per route
- **Language Switching**: Client-side locale changes with cookie persistence
- **i18next Plugins**: Support for save-missing, backends, and custom plugins
- **Remote Translations**: Cache-friendly loading from filesystem, CDN, or translation management systems

## Documentation

The complete documentation is in the package directory:

- [Setup Guide](./packages/tanstack-start-i18next/README.md#setup)
- [API Reference](./packages/tanstack-start-i18next/README.md#api-reference)
- [Config Options](./packages/tanstack-start-i18next/README.md#config-options)
- [The Trans Component](./packages/tanstack-start-i18next/README.md#the-trans-component)
- [Locale Detection](./packages/tanstack-start-i18next/README.md#locale-detection)
- [Namespace Splitting](./packages/tanstack-start-i18next/README.md#namespace-splitting-per-route)
- [Language Switching](./packages/tanstack-start-i18next/README.md#language-switching)
- [i18next Plugins](./packages/tanstack-start-i18next/README.md#i18next-plugins)
- [Remote Translation Files](./packages/tanstack-start-i18next/README.md#remote-translation-files)
- [Testing](./packages/tanstack-start-i18next/README.md#testing)

## Requirements

- Node.js 22+
- TanStack Start 1.167+
- React 18+
- i18next 23+
- react-i18next 13+

## License

MIT
